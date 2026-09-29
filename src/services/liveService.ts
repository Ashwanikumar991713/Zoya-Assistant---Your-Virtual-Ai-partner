import { GoogleGenAI, LiveServerMessage, Modality, StartSensitivity, EndSensitivity, ActivityHandling } from "@google/genai";
import { AppConfig, AppState } from "../types";

// High performance Uint8Array to base64 converter avoiding heavy GC allocation
function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  const chunkSize = 2048;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk as any);
  }
  return btoa(binary);
}

// Universal audio downsampler to convert any native mic sample rate to pristine 16000Hz PCM
function downsampleTo16k(inputData: Float32Array, inputSampleRate: number): Int16Array {
  if (inputSampleRate === 16000) {
    const pcm16 = new Int16Array(inputData.length);
    for (let i = 0; i < inputData.length; i++) {
      const s = Math.max(-1, Math.min(1, inputData[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return pcm16;
  }

  const ratio = inputSampleRate / 16000;
  const newLength = Math.round(inputData.length / ratio);
  const result = new Int16Array(newLength);
  let offsetResult = 0;
  let offsetInput = 0;

  while (offsetResult < result.length) {
    const nextOffsetInput = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetInput; i < nextOffsetInput && i < inputData.length; i++) {
      accum += inputData[i];
      count++;
    }
    const sample = count > 0 ? accum / count : 0;
    const clamped = Math.max(-1, Math.min(1, sample));
    result[offsetResult] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF;
    offsetResult++;
    offsetInput = nextOffsetInput;
  }
  return result;
}

export class LiveSessionManager {
  private ai: GoogleGenAI;
  private activeSession: any = null;
  private isConnecting: boolean = false;
  private isExplicitlyStopped: boolean = false;
  private reconnectTimer: any = null;
  private playbackTimeout: any = null;
  private speakingHangoverTimer: any = null;
  private processingSafetyTimer: any = null;

  // Voice Activity & Audio streaming state
  private lastUserTranscript: string = "";
  private residualAudioBytes: Uint8Array | null = null;
  private isUserSpeaking: boolean = false;

  // Audio capture
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  // Audio playback state
  private playbackContext: AudioContext | null = null;
  private playbackGain: GainNode | null = null;
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  private nextPlayTime: number = 0;
  private isPlaying: boolean = false;

  // Wake lock for mobile devices to keep audio & connection running smoothly
  private wakeLock: any = null;

  public isMuted: boolean = false;
  public volume: number = 1.0;

  public onStateChange: (state: AppState) => void = () => {};
  public onMessage: (sender: "user" | "zoya", text: string) => void = () => {};
  public onCommand: (url: string) => void = () => {};
  public onAudioLevel: (level: number) => void = () => {};

  private boundVisibilityHandler: () => void;

  constructor(private config: AppConfig) {
    this.ai = new GoogleGenAI({ apiKey: config.apiKey });
    this.boundVisibilityHandler = this.handleVisibilityChange.bind(this);
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this.boundVisibilityHandler);
    }
  }

  private handleVisibilityChange() {
    if (typeof document !== "undefined" && document.visibilityState === "visible") {
      if (this.audioContext?.state === "suspended") {
        this.audioContext.resume().catch(() => {});
      }
      if (this.playbackContext?.state === "suspended") {
        this.playbackContext.resume().catch(() => {});
      }
    }
  }

  private async requestWakeLock() {
    if (typeof navigator !== "undefined" && "wakeLock" in navigator) {
      try {
        this.wakeLock = await (navigator as any).wakeLock.request("screen");
      } catch {
        // Safe to ignore if unsupported
      }
    }
  }

  private releaseWakeLock() {
    if (this.wakeLock) {
      try {
        this.wakeLock.release().catch(() => {});
      } catch {}
      this.wakeLock = null;
    }
  }

  private setAppProcessing() {
    this.onStateChange("processing");
    if (this.processingSafetyTimer) clearTimeout(this.processingSafetyTimer);
    // Never get stuck on 'processing' longer than 4.5s
    this.processingSafetyTimer = setTimeout(() => {
      if (!this.isPlaying) {
        this.onStateChange("listening");
      }
    }, 4500);
  }

  async start() {
    this.isExplicitlyStopped = false;
    this.onStateChange("processing");

    try {
      // 1. Initialize Audio Contexts safely
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      
      if (!this.audioContext) {
        try {
          this.audioContext = new AudioContextClass({ sampleRate: 16000 });
        } catch {
          this.audioContext = new AudioContextClass();
        }
      }
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume().catch(() => {});
      }

      if (!this.playbackContext) {
        try {
          this.playbackContext = new AudioContextClass({ sampleRate: 24000 });
        } catch {
          this.playbackContext = new AudioContextClass();
        }
      }
      if (this.playbackContext.state === "suspended") {
        await this.playbackContext.resume().catch(() => {});
      }

      this.playbackGain = this.playbackContext.createGain();
      this.playbackGain.gain.value = this.isMuted ? 0 : this.volume;
      this.playbackGain.connect(this.playbackContext.destination);
      this.nextPlayTime = this.playbackContext.currentTime;

      // 2. Acquire Microphone with aggressive echo cancellation and noise suppression
      if (!this.mediaStream) {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      }

      if (!this.source && this.mediaStream && this.audioContext) {
        this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
        this.processor = this.audioContext.createScriptProcessor(2048, 1, 1);

        this.processor.onaudioprocess = (e) => {
          if (!this.activeSession || this.isConnecting) return;

          const inputData = e.inputBuffer.getChannelData(0);

          // 1. Calculate volume energy (RMS) for UI feedback
          let sumSquares = 0;
          for (let i = 0; i < inputData.length; i++) {
            sumSquares += inputData[i] * inputData[i];
          }
          const rms = Math.sqrt(sumSquares / inputData.length);
          this.onAudioLevel(rms);

          // 2. Real-time Barge-in interruption check:
          if (this.isPlaying) {
            if (rms > 0.038) {
              // User interrupts! Cut off playback instantly and listen to user
              this.stopPlayback();
              this.onStateChange("listening");
            } else {
              // Companion is speaking and user is quiet: skip sending echo/speaker bleed to server
              return;
            }
          }

          // 3. User voice detection: track speaking state for immediate status change
          if (rms > 0.015) {
            if (!this.isUserSpeaking) {
              this.isUserSpeaking = true;
              this.onStateChange("listening");
            }
          }

          // 4. Downsample to clean 16000Hz PCM16 & Base64 encode
          const pcm16 = downsampleTo16k(inputData, this.audioContext?.sampleRate || 16000);
          const uint8 = new Uint8Array(pcm16.buffer, pcm16.byteOffset, pcm16.byteLength);
          const base64Data = uint8ToBase64(uint8);

          // 5. Stream continuous audio to Gemini Live
          try {
            this.activeSession.sendRealtimeInput({
              audio: { data: base64Data, mimeType: "audio/pcm;rate=16000" },
              media: { data: base64Data, mimeType: "audio/pcm;rate=16000" },
            });
          } catch (err) {
            console.warn("Audio stream send warning:", err);
          }
        };

        this.source.connect(this.processor);
        const muteGain = this.audioContext.createGain();
        muteGain.gain.value = 0;
        this.processor.connect(muteGain);
        muteGain.connect(this.audioContext.destination);
      }

      // 3. Request WakeLock
      await this.requestWakeLock();

      // 4. Connect to Gemini Live
      await this.connectLiveSession();
    } catch (error) {
      console.error("Failed to start Live Session:", error);
      this.stop();
      throw error;
    }
  }

  private async connectLiveSession() {
    if (this.isConnecting || this.isExplicitlyStopped) return;
    this.isConnecting = true;

    const baseInstruction = this.config.systemPrompt
      .replace(/{userName}/g, this.config.userName)
      .replace(/{assistantName}/g, this.config.assistantName);

    // STRICT FEMALE VOCAL IDENTITY & ZERO-LATENCY INSTANT REPLIES
    const strictFemaleAndInstantDirective = `

[MANDATORY FEMALE IDENTITY & VOICE PRESERVATION]
1. VOCAL GENDER: You are strictly a young Indian female companion named "${this.config.assistantName}". Your voice is ultra-sweet, gentle, feminine, and heartwarming ("Kore" tone).
2. UNDER NO CIRCUMSTANCES should you EVER speak in a male, deep, low-pitch, or robotic voice, regardless of language.
3. Keep your speaking pitch, softness, and feminine warmth 100% consistent across every sentence.

[LIGHTNING FAST DIRECT HUMAN RESPONSE]
1. ZERO HESITATION: Respond immediately without thinking or pausing.
2. SHORT, SWEET & CONVERSATIONAL: Keep your spoken replies brief and lively (1 to 2 short sentences per turn). Real humans converse dynamically.
3. WARM FILLERS: Start naturally with sweet touches: "Haan ji!", "Arey bilkul!", "Sach me?", "Acha bataiye na", "Hmm, sahi kaha aapne".`;

    let topicContext = "";
    if (this.config.activeTopicOrScript && this.config.activeTopicOrScript.trim()) {
      topicContext = `

[ACTIVE FOCUS]
"${this.config.activeTopicOrScript.trim()}"
Weave naturally into your thoughts in your own sweet, casual speaking style.`;
    }

    // Strictly enforce verified female voice (default "Kore")
    const rawVoice = (this.config.voiceName || "").trim();
    const validFemaleVoices = ["Kore", "Aoede"];
    const voiceToUse = validFemaleVoices.includes(rawVoice) ? rawVoice : "Kore";

    const connectConfig: any = {
      model: "gemini-3.8-live",
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceToUse } },
        },
        // DISABLE THINKING BUDGET: 0 disables chain-of-thought delays so model never gets lost in thought!
        thinkingConfig: {
          thinkingBudget: 0,
        },
        systemInstruction: baseInstruction + strictFemaleAndInstantDirective + topicContext,
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        realtimeInputConfig: {
          automaticActivityDetection: {
            disabled: false,
            startOfSpeechSensitivity: StartSensitivity.START_SENSITIVITY_HIGH,
            endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_HIGH,
            silenceDurationMs: 250, // 250ms silence for lightning-fast instant human reaction!
            prefixPaddingMs: 80,
          },
          activityHandling: ActivityHandling.START_OF_ACTIVITY_INTERRUPTS,
        },
      },
      callbacks: {
        onopen: () => {
          console.log("Live API Connected Successfully with female voice:", voiceToUse);
          this.isConnecting = false;
          this.onStateChange("listening");
        },
        onmessage: async (message: LiveServerMessage) => {
          // 1. Voice activity events from server VAD
          if (message.voiceActivity?.voiceActivityType === "ACTIVITY_START") {
            if (this.isPlaying) {
              this.stopPlayback();
            }
            this.isUserSpeaking = true;
            this.onStateChange("listening");
          } else if (message.voiceActivity?.voiceActivityType === "ACTIVITY_END") {
            this.isUserSpeaking = false;
            this.setAppProcessing();
          }

          // 2. Handle Audio Output - robustly check ALL parts in modelTurn or message.data
          let audioFound = false;
          const parts = message.serverContent?.modelTurn?.parts || [];
          for (const part of parts) {
            if (part.inlineData?.data) {
              audioFound = true;
              this.playAudioChunk(part.inlineData.data);
            }
          }
          if (!audioFound && (message as any).data) {
            this.playAudioChunk((message as any).data);
          }

          // 3. Handle Server-Side Interruption (barge-in)
          if (message.serverContent?.interrupted) {
            this.stopPlayback();
            this.onStateChange("listening");
          }

          // 4. Handle Turn Complete (model finished delivering response)
          if (message.serverContent?.turnComplete) {
            if (this.processingSafetyTimer) {
              clearTimeout(this.processingSafetyTimer);
              this.processingSafetyTimer = null;
            }
            if (!this.isPlaying) {
              this.onStateChange("listening");
            }
          }

          // 5. Handle Companion Transcriptions
          const companionText = message.serverContent?.outputTranscription?.text || message.serverContent?.modelTurn?.parts?.find(p => p.text)?.text;
          if (companionText && companionText.trim()) {
            this.onMessage("zoya", companionText.trim());
            this.detectAndTriggerAction(companionText.trim());
          }

          // 6. Handle User Spoken Transcription
          const userTranscription = message.serverContent?.inputTranscription?.text;
          if (userTranscription && userTranscription.trim() && userTranscription.trim() !== this.lastUserTranscript) {
            this.lastUserTranscript = userTranscription.trim();
            this.onMessage("user", this.lastUserTranscript);
            this.detectAndTriggerAction(this.lastUserTranscript);
          }
        },
        onclose: () => {
          console.log("Live API connection closed.");
          this.activeSession = null;
          this.isConnecting = false;
          if (!this.isExplicitlyStopped) {
            this.scheduleReconnect();
          }
        },
        onerror: (err: any) => {
          console.error("Live API encountered error:", err);
          this.activeSession = null;
          this.isConnecting = false;
          if (!this.isExplicitlyStopped) {
            this.scheduleReconnect();
          }
        },
      },
    };

    try {
      this.activeSession = await this.ai.live.connect(connectConfig);
      this.isConnecting = false;
      this.onStateChange("listening");
    } catch (err) {
      console.warn("Primary live model connect failed, trying fallback:", err);
      // Fallback model if primary model is unavailable in region
      connectConfig.model = "gemini-3.1-flash-live-preview";
      try {
        this.activeSession = await this.ai.live.connect(connectConfig);
        this.isConnecting = false;
        this.onStateChange("listening");
      } catch (fallbackErr) {
        this.isConnecting = false;
        console.error("Fallback live connection failed:", fallbackErr);
        if (!this.isExplicitlyStopped) {
          this.scheduleReconnect();
        } else {
          throw fallbackErr;
        }
      }
    }
  }

  // Fast client-side command detector to open apps/sites without LLM function-calling latency
  private detectAndTriggerAction(text: string) {
    const lower = text.toLowerCase();
    
    // YouTube
    const ytMatch = lower.match(/(?:play|chalao|suno)\s+(.+?)\s+on\s+youtube/i) || lower.match(/youtube\s+(?:pe|par)\s+(.+?)\s+(?:chalao|play)/i);
    if (ytMatch) {
      const q = encodeURIComponent(ytMatch[1].trim());
      this.onCommand(`https://www.youtube.com/results?search_query=${q}`);
      return;
    }

    // Spotify
    const spMatch = lower.match(/(?:play|search)\s+(.+?)\s+on\s+spotify/i);
    if (spMatch) {
      const q = encodeURIComponent(spMatch[1].trim());
      this.onCommand(`https://open.spotify.com/search/${q}`);
      return;
    }

    // General website
    const webMatch = lower.match(/^open\s+([a-zA-Z0-9_\-\.]+)/i);
    if (webMatch && !lower.includes("youtube") && !lower.includes("spotify") && !lower.includes("whatsapp")) {
      let site = webMatch[1].trim();
      if (!site.includes(".")) site += ".com";
      this.onCommand(`https://www.${site}`);
    }
  }

  private scheduleReconnect() {
    if (this.isExplicitlyStopped) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    this.onStateChange("reconnecting");
    console.log("Attempting smooth auto-reconnect to Live API in 1.2s...");

    this.reconnectTimer = setTimeout(async () => {
      if (this.isExplicitlyStopped) return;
      try {
        await this.connectLiveSession();
      } catch (e) {
        console.error("Auto-reconnect attempt failed, scheduling next retry...", e);
        this.scheduleReconnect();
      }
    }, 1200);
  }

  // Robust 24kHz 16-bit PCM playback with residual byte management
  private playAudioChunk(base64Data: string) {
    if (!this.playbackContext || this.isMuted) return;

    if (this.playbackContext.state === "suspended") {
      this.playbackContext.resume().catch(() => {});
    }

    try {
      const binaryString = atob(base64Data);
      const newLen = binaryString.length;
      if (newLen === 0) return;

      // Merge with residual byte from previous chunk if available
      let rawBytes: Uint8Array;
      if (this.residualAudioBytes && this.residualAudioBytes.length > 0) {
        rawBytes = new Uint8Array(this.residualAudioBytes.length + newLen);
        rawBytes.set(this.residualAudioBytes, 0);
        for (let i = 0; i < newLen; i++) {
          rawBytes[this.residualAudioBytes.length + i] = binaryString.charCodeAt(i);
        }
        this.residualAudioBytes = null;
      } else {
        rawBytes = new Uint8Array(newLen);
        for (let i = 0; i < newLen; i++) {
          rawBytes[i] = binaryString.charCodeAt(i);
        }
      }

      // If byte count is odd, preserve the leftover byte for the next packet
      if (rawBytes.length % 2 !== 0) {
        this.residualAudioBytes = rawBytes.slice(rawBytes.length - 1);
        rawBytes = rawBytes.subarray(0, rawBytes.length - 1);
      }

      const numSamples = rawBytes.length / 2;
      if (numSamples === 0) return;

      const audioBuffer = this.playbackContext.createBuffer(1, numSamples, 24000);
      const channelData = audioBuffer.getChannelData(0);
      const dataView = new DataView(rawBytes.buffer, rawBytes.byteOffset, rawBytes.byteLength);

      // Clean 16-bit signed PCM little-endian decoding
      for (let i = 0; i < numSamples; i++) {
        channelData[i] = dataView.getInt16(i * 2, true) / 32768.0;
      }

      const source = this.playbackContext.createBufferSource();
      source.buffer = audioBuffer;

      if (this.playbackGain) {
        this.playbackGain.gain.value = this.isMuted ? 0 : this.volume;
        source.connect(this.playbackGain);
      } else {
        source.connect(this.playbackContext.destination);
      }

      const currentTime = this.playbackContext.currentTime;
      // 20ms lead cushion to prevent buffer underrun while keeping playback instant
      if (this.nextPlayTime < currentTime) {
        this.nextPlayTime = currentTime + 0.02;
      }

      source.start(this.nextPlayTime);
      this.nextPlayTime += audioBuffer.duration;
      this.isPlaying = true;

      // Cancel processing safety timer once audio is playing
      if (this.processingSafetyTimer) {
        clearTimeout(this.processingSafetyTimer);
        this.processingSafetyTimer = null;
      }
      this.onStateChange("speaking");

      this.activeSources.add(source);

      // Clear any pending state reset timers
      if (this.playbackTimeout) clearTimeout(this.playbackTimeout);
      if (this.speakingHangoverTimer) clearTimeout(this.speakingHangoverTimer);

      source.onended = () => {
        this.activeSources.delete(source);
        if (this.activeSources.size === 0) {
          // 80ms hangover to prevent UI flickering between consecutive phoneme chunks
          if (this.speakingHangoverTimer) clearTimeout(this.speakingHangoverTimer);
          this.speakingHangoverTimer = setTimeout(() => {
            if (this.activeSources.size === 0) {
              this.isPlaying = false;
              this.onStateChange("listening");
            }
          }, 80);
        }
      };

      // Safety fallback timeout
      const remainingTimeMs = Math.max(100, (this.nextPlayTime - currentTime) * 1000 + 300);
      this.playbackTimeout = setTimeout(() => {
        if (this.activeSources.size === 0 && this.isPlaying) {
          this.isPlaying = false;
          this.onStateChange("listening");
        }
      }, remainingTimeMs);
    } catch (e) {
      console.error("Error playing audio chunk", e);
    }
  }

  public stopPlayback() {
    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch {}
    }
    this.activeSources.clear();

    if (this.playbackTimeout) {
      clearTimeout(this.playbackTimeout);
      this.playbackTimeout = null;
    }
    if (this.speakingHangoverTimer) {
      clearTimeout(this.speakingHangoverTimer);
      this.speakingHangoverTimer = null;
    }
    if (this.processingSafetyTimer) {
      clearTimeout(this.processingSafetyTimer);
      this.processingSafetyTimer = null;
    }

    if (this.playbackContext) {
      this.nextPlayTime = this.playbackContext.currentTime;
    }
    this.isPlaying = false;
    this.residualAudioBytes = null;
  }

  stop() {
    this.isExplicitlyStopped = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.processingSafetyTimer) {
      clearTimeout(this.processingSafetyTimer);
      this.processingSafetyTimer = null;
    }

    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }

    this.stopPlayback();

    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    if (this.playbackContext) {
      this.playbackContext.close().catch(() => {});
      this.playbackContext = null;
    }

    if (this.activeSession) {
      try {
        this.activeSession.close();
      } catch {}
      this.activeSession = null;
    }

    this.releaseWakeLock();

    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.boundVisibilityHandler);
    }

    this.onStateChange("idle");
  }

  updateConfig(newConfig: AppConfig) {
    const rawVoice = (newConfig.voiceName || "").trim();
    const validFemaleVoices = ["Kore", "Aoede"];
    const sanitizedVoice = validFemaleVoices.includes(rawVoice) ? rawVoice : "Kore";
    newConfig.voiceName = sanitizedVoice;

    const voiceChanged = this.config.voiceName !== sanitizedVoice;
    this.config = newConfig;

    if (voiceChanged && this.activeSession && !this.isExplicitlyStopped) {
      try {
        this.activeSession.close();
      } catch {}
      this.activeSession = null;
      this.isConnecting = false;
      this.connectLiveSession().catch((e) => console.error("Error reconnecting with new voice:", e));
      return;
    }

    if (this.activeSession && newConfig.activeTopicOrScript?.trim()) {
      try {
        this.activeSession.sendRealtimeInput({
          text: `[SYSTEM: Active topic or focus updated to: "${newConfig.activeTopicOrScript.trim()}". Weave naturally into conversation in your own sweet, casual speaking style.]`,
        });
      } catch (e) {
        console.warn("Could not notify active session of topic update:", e);
      }
    }
  }

  sendText(text: string) {
    if (this.activeSession) {
      try {
        this.activeSession.sendRealtimeInput({ text });
      } catch (err) {
        console.warn("Failed to send text input:", err);
      }
    }
  }
}
