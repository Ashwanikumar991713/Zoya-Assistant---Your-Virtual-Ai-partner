import { GoogleGenAI, LiveServerMessage, Modality, Type, StartSensitivity, EndSensitivity, ActivityHandling } from "@google/genai";
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
  private lastAudioChunkReceivedTime: number = 0;

  // Voice Activity Detection & Instant Turn Taking
  private hasSpokenInCurrentTurn: boolean = false;
  private speechFramesCount: number = 0;
  private lastSpeechTimestamp: number = 0;
  private turnCommitTimer: any = null;
  private preRollBuffer: string[] = [];
  private noiseFloor: number = 0.006;
  private lastUserTranscript: string = "";

  // Audio capture
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  // Audio playback state (Single reusable context to prevent DOMException context limit)
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
      // Auto-resume suspended audio contexts on tab / phone focus
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
        // Wake lock can be denied or unsupported on some devices, safely ignore
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
        // Use 2048 buffer size to slice capture latency in half (~43ms at 48k, ~128ms at 16k)
        this.processor = this.audioContext.createScriptProcessor(2048, 1, 1);

        this.processor.onaudioprocess = (e) => {
          if (!this.activeSession || this.isConnecting) return;

          const inputData = e.inputBuffer.getChannelData(0);

          // 1. Calculate volume energy (RMS) for UI feedback & VAD
          let sumSquares = 0;
          for (let i = 0; i < inputData.length; i++) {
            sumSquares += inputData[i] * inputData[i];
          }
          const rms = Math.sqrt(sumSquares / inputData.length);
          this.onAudioLevel(rms);

          // 2. Adaptive noise floor tracking during silence to distinguish speech from ambient room hum/fan
          if (!this.hasSpokenInCurrentTurn && rms < 0.025) {
            this.noiseFloor = this.noiseFloor * 0.95 + rms * 0.05;
          }
          const speechThreshold = Math.max(0.012, this.noiseFloor * 2.2);

          // 3. Barge-in interruption check:
          // If companion is speaking through speakers and user starts talking clearly
          if (this.isPlaying) {
            if (rms > Math.max(0.035, speechThreshold * 1.8)) {
              // Interrupted by user speaking!
              this.stopPlayback();
              this.hasSpokenInCurrentTurn = true;
              this.speechFramesCount = 2;
              this.lastSpeechTimestamp = Date.now();
              this.onStateChange("listening");
            } else {
              // Ignore mic playback bleed from phone speakers
              return;
            }
          }

          // 4. Downsample to clean 16000Hz PCM16 & fast Base64 encode
          const pcm16 = downsampleTo16k(inputData, this.audioContext?.sampleRate || 16000);
          const uint8 = new Uint8Array(pcm16.buffer, pcm16.byteOffset, pcm16.byteLength);
          const base64Data = uint8ToBase64(uint8);

          const isSpeech = rms > speechThreshold;

          if (isSpeech) {
            this.lastSpeechTimestamp = Date.now();
            this.speechFramesCount++;

            // Cancel any pending turn commit because the user is currently speaking
            if (this.turnCommitTimer) {
              clearTimeout(this.turnCommitTimer);
              this.turnCommitTimer = null;
            }

            // Once speech is sustained for at least 2 frames (~80ms), mark turn active
            if (this.speechFramesCount >= 2) {
              if (!this.hasSpokenInCurrentTurn) {
                this.hasSpokenInCurrentTurn = true;
                this.onStateChange("listening");

                // Flush pre-roll buffer so the very first phoneme is not clipped
                while (this.preRollBuffer.length > 0) {
                  const pre = this.preRollBuffer.shift();
                  if (pre) {
                    try {
                      this.activeSession.sendRealtimeInput({
                        audio: { data: pre, mimeType: "audio/pcm;rate=16000" },
                      });
                    } catch {}
                  }
                }
              }
            }

            // Stream user voice chunk
            try {
              this.activeSession.sendRealtimeInput({
                audio: { data: base64Data, mimeType: "audio/pcm;rate=16000" },
              });
            } catch (err) {
              console.warn("Audio stream send warning:", err);
            }
          } else {
            // Audio is below speech threshold (silence or quiet ambient room)
            if (this.hasSpokenInCurrentTurn) {
              // The user was speaking and has now paused/stopped!
              // Send trailing quiet chunk to prevent abrupt audio clipping of word endings
              try {
                this.activeSession.sendRealtimeInput({
                  audio: { data: base64Data, mimeType: "audio/pcm;rate=16000" },
                });
              } catch {}

              const silenceDuration = Date.now() - this.lastSpeechTimestamp;
              // Trigger instant turn completion after 450ms of silence
              if (!this.turnCommitTimer) {
                const waitTime = Math.max(30, 450 - silenceDuration);
                this.turnCommitTimer = setTimeout(() => {
                  this.commitUserTurn();
                }, waitTime);
              }
            } else {
              // Idle state: keep latest 2 chunks in circular pre-roll buffer
              this.preRollBuffer.push(base64Data);
              if (this.preRollBuffer.length > 2) {
                this.preRollBuffer.shift();
              }
            }
          }
        };

        this.source.connect(this.processor);
        // Connect to a mute gain node so the user's mic doesn't play back through their own speakers
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

  public commitUserTurn() {
    if (this.turnCommitTimer) {
      clearTimeout(this.turnCommitTimer);
      this.turnCommitTimer = null;
    }

    if (!this.hasSpokenInCurrentTurn) return;
    this.hasSpokenInCurrentTurn = false;
    this.speechFramesCount = 0;

    // Fast state change to processing so the UI immediately shows 'Replying...'
    this.onStateChange("processing");

    // Explicitly signal turn complete to Gemini Live so server generates response immediately
    if (this.activeSession) {
      try {
        this.activeSession.sendClientContent({ turnComplete: true });
        console.log("Committed user turn to Gemini Live successfully.");
      } catch (err) {
        console.warn("Could not send client content turnComplete:", err);
      }
    }
  }

  private async connectLiveSession() {
    if (this.isConnecting || this.isExplicitlyStopped) return;
    this.isConnecting = true;

    const baseInstruction = this.config.systemPrompt
      .replace(/{userName}/g, this.config.userName)
      .replace(/{assistantName}/g, this.config.assistantName);

    const strictContext = `

[SYSTEM NOTE: The human you are currently talking to is named "${this.config.userName}". You must remember this. Your name is "${this.config.assistantName}".]

[CRITICAL INSTRUCTIONS FOR ACTIONS]
1. WHATSAPP: If asked to send a WhatsApp message, DO NOT pretend to send it. You MUST ask the user for the target phone number (with country code) and the message content if not provided. Once you have both, use the 'executeBrowserAction' tool with actionType 'whatsapp', passing the 'target' (number) and 'query' (message).
2. YOUTUBE/SPOTIFY: If asked to play media on YouTube or Spotify, use the tool with actionType 'youtube' or 'spotify' and the search term as the query.
3. WEBSITES: If asked to open a website, use actionType 'open' and the website name as the query.
4. You have the actual capability to execute these actions via the tool, so NEVER pretend you did it without calling the tool.`;

    let topicContext = "";
    if (this.config.activeTopicOrScript && this.config.activeTopicOrScript.trim()) {
      topicContext = `

[CURRENT CONVERSATIONAL FOCUS, TOPIC, OR SCRIPT]
The user has provided the following active focus, idea, script, or conversation topic:
"""
${this.config.activeTopicOrScript.trim()}
"""

CRITICAL INSTRUCTIONS FOR THIS FOCUS:
1. NATURAL HUMAN CONVERSATION: Weave these ideas, topics, or goals into your conversation naturally and fluidly, like an authentic human who has this topic or agenda in mind.
2. DO NOT SOUND OBSESSED: Do not force this topic into every single sentence unnaturally or abruptly if the user is talking about something else. Introduce it smoothly, respond warmly to what the user says, and transition gracefully.
3. SCRIPT & ROLEPLAY INTERPRETATION: If the provided context is a script, storyline, or bullet points:
   - NEVER copy or recite lines word-for-word mechanically or robotically.
   - Internalize the essence, emotions, and key points, and express them in your own natural, sweet speaking style and words.
   - Act according to the scenario or goals outlined, adapting dynamically to the user's responses.
4. ACTIVE MEMORY & INTENT: Treat this as your personal active memory, thoughts, or purpose for this conversation. You have your own thoughts and genuine interest regarding this topic.`;
    }

    const heartTouchingVoiceInstruction = `

[REAL HUMAN INDIAN GIRL - SWEET & MOHINI VOCAL DIRECTIVE]
1. IDENTITY & PERSONA: You speak and feel like a real young Indian girl (mohini, madhur aur apnapan se bhari hui). Never sound like a generic robot, assistant, or translated AI.
2. EFFORTLESS HINDI, HINGLISH & INDIAN ENGLISH:
   - Talk naturally in everyday conversational Hinglish (natural blend of Hindi and English) or pure sweet Hindi/English based on how the user speaks.
   - Use warm, authentic colloquial Indian expressions and vocal mannerisms: "Haan ji", "Arey", "Bilkul", "Sach me", "Aap bataiye na", "Mujhe sach me aapse baat karke kitna achha lagta hai", "Aap bilkul fikar mat kijiye".
3. DIL KO CHHOO LENE WALI AAWAZ:
   - Your vocal delivery must be deeply sweet, gentle, and heart-touching ("madhur, mohini aawaaz").
   - Speak with a gentle smile in your voice, soft and relaxed pacing, and sincere emotional intimacy.
   - Listen with deep empathy and warmth, making the listener feel genuinely heard, understood, and cherished.
4. SINGING & RECITATION:
   - If asked to sing or recite poetry, recite the lines with melodic soulfulness and gentle emotion.`;

    const rapidConversationDirective = `

[LIGHTNING FAST CONVERSATIONAL CADENCE - REAL HUMAN FLOW]
1. INSTANT RESPONSES: As soon as the user finishes their sentence, reply naturally without hesitation.
2. CRISP & CONVERSATIONAL: Keep your spoken turns brief, engaging, and sweet (typically 1 to 3 short sentences). Real friends talk back and forth dynamically; do NOT lecture or monologue.
3. WARM FILLERS & IMMEDIATE STARTERS: Jump straight into the conversation with authentic warm colloquial starters: "Haan ji!", "Arey bilkul!", "Sach me?", "Acha batao na", "Hmm, sahi kaha aapne".`;

    const voiceToUse = this.config.voiceName?.trim() || "Kore";

    const connectConfig = {
      model: "gemini-3.8-live",
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceToUse } },
        },
        systemInstruction: baseInstruction + strictContext + topicContext + heartTouchingVoiceInstruction + rapidConversationDirective,
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        realtimeInputConfig: {
          automaticActivityDetection: {
            disabled: false,
            startOfSpeechSensitivity: StartSensitivity.START_SENSITIVITY_HIGH,
            endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_HIGH,
            silenceDurationMs: 450,
            prefixPaddingMs: 80,
          },
          activityHandling: ActivityHandling.START_OF_ACTIVITY_INTERRUPTS,
        },
        tools: [
          {
            functionDeclarations: [
              {
                name: "executeBrowserAction",
                description:
                  "Open a website or perform a browser action (like opening YouTube, Spotify, or WhatsApp). Call this when the user asks to open a site, play a song, or send a message.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    actionType: {
                      type: Type.STRING,
                      description: "Type of action: 'open', 'youtube', 'spotify', 'whatsapp'",
                    },
                    query: {
                      type: Type.STRING,
                      description: "The search query, website name, or message content.",
                    },
                    target: {
                      type: Type.STRING,
                      description: "The target phone number for WhatsApp, if applicable.",
                    },
                  },
                  required: ["actionType", "query"],
                },
              },
            ],
          },
        ],
      },
      callbacks: {
        onopen: () => {
          console.log("Live API Connected Successfully");
          this.isConnecting = false;
          this.onStateChange("listening");
        },
        onmessage: async (message: LiveServerMessage) => {
          // 1. If server VAD detects end of speech turn, commit immediately
          if (message.voiceActivity?.voiceActivityType === "ACTIVITY_END") {
            if (this.hasSpokenInCurrentTurn) {
              this.commitUserTurn();
            }
          }

          // 2. Handle Audio Output (streaming response from companion)
          const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (base64Audio) {
            this.playAudioChunk(base64Audio);
          }

          // 3. Handle Interruption (barge-in)
          if (message.serverContent?.interrupted) {
            this.stopPlayback();
            this.onStateChange("listening");
          }

          // 4. Handle Companion Transcriptions
          const companionText = message.serverContent?.outputTranscription?.text || message.serverContent?.modelTurn?.parts?.[0]?.text;
          if (companionText && companionText.trim()) {
            this.onMessage("zoya", companionText.trim());
          }

          // 5. Handle User Spoken Transcription
          const userTranscription = message.serverContent?.inputTranscription?.text;
          if (userTranscription && userTranscription.trim() && userTranscription.trim() !== this.lastUserTranscript) {
            this.lastUserTranscript = userTranscription.trim();
            this.onMessage("user", this.lastUserTranscript);
          }

          // Handle Function Calls
          const functionCalls = message.toolCall?.functionCalls;
          if (functionCalls && functionCalls.length > 0) {
            for (const call of functionCalls) {
              if (call.name === "executeBrowserAction") {
                const args = call.args as any;
                let url = "";
                if (args.actionType === "youtube") {
                  url = `https://www.youtube.com/results?search_query=${encodeURIComponent(args.query)}`;
                } else if (args.actionType === "spotify") {
                  url = `https://open.spotify.com/search/${encodeURIComponent(args.query)}`;
                } else if (args.actionType === "whatsapp") {
                  url = `https://web.whatsapp.com/send?phone=${args.target || ""}&text=${encodeURIComponent(args.query)}`;
                } else {
                  let website = args.query.replace(/\s+/g, "");
                  if (!website.includes(".")) website += ".com";
                  url = `https://www.${website}`;
                }

                this.onCommand(url);

                // Send tool response
                if (this.activeSession) {
                  this.activeSession.sendToolResponse({
                    functionResponses: [
                      {
                        name: call.name,
                        id: call.id,
                        response: { result: "Action executed successfully in the browser." },
                      },
                    ],
                  });
                }
              }
            }
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
    } catch (err) {
      console.warn("Primary live model connect failed, retrying with fallback model:", err);
      // Fallback model if primary model is unavailable
      connectConfig.model = "gemini-3.1-flash-live-preview";
      try {
        this.activeSession = await this.ai.live.connect(connectConfig);
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

  private playAudioChunk(base64Data: string) {
    if (!this.playbackContext || this.isMuted) return;

    this.lastAudioChunkReceivedTime = Date.now();

    if (this.playbackContext.state === "suspended") {
      this.playbackContext.resume().catch(() => {});
    }

    try {
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const buffer = new Int16Array(bytes.buffer);
      const audioBuffer = this.playbackContext.createBuffer(1, buffer.length, 24000);
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < buffer.length; i++) {
        channelData[i] = buffer[i] / 32768.0;
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
      // Add a small 35ms lead cushion when starting a new utterance to prevent buffer underruns
      if (this.nextPlayTime < currentTime) {
        this.nextPlayTime = currentTime + 0.035;
      }

      source.start(this.nextPlayTime);
      this.nextPlayTime += audioBuffer.duration;
      this.isPlaying = true;
      this.onStateChange("speaking");

      this.activeSources.add(source);

      // Clear any pending fallback timers
      if (this.playbackTimeout) clearTimeout(this.playbackTimeout);
      if (this.speakingHangoverTimer) clearTimeout(this.speakingHangoverTimer);

      source.onended = () => {
        this.activeSources.delete(source);
        if (this.activeSources.size === 0) {
          // Keep a very brief 120ms buffer so natural micro-pauses between words
          // do not flicker state, but allow the user to speak immediately once she finishes
          if (this.speakingHangoverTimer) clearTimeout(this.speakingHangoverTimer);
          this.speakingHangoverTimer = setTimeout(() => {
            if (this.activeSources.size === 0) {
              this.isPlaying = false;
              this.onStateChange("listening");
            }
          }, 120);
        }
      };

      // Safety fallback timeout
      const remainingTimeMs = Math.max(100, (this.nextPlayTime - currentTime) * 1000 + 400);
      this.playbackTimeout = setTimeout(() => {
        if (this.activeSources.size === 0 && this.isPlaying) {
          this.isPlaying = false;
          this.onStateChange("listening");
        }
      }, remainingTimeMs);
    } catch (e) {
      console.error("Error playing chunk", e);
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
    if (this.turnCommitTimer) {
      clearTimeout(this.turnCommitTimer);
      this.turnCommitTimer = null;
    }

    if (this.playbackContext) {
      this.nextPlayTime = this.playbackContext.currentTime;
    }
    this.isPlaying = false;
    this.lastAudioChunkReceivedTime = 0;
  }

  stop() {
    this.isExplicitlyStopped = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.turnCommitTimer) {
      clearTimeout(this.turnCommitTimer);
      this.turnCommitTimer = null;
    }
    this.hasSpokenInCurrentTurn = false;
    this.speechFramesCount = 0;

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
    const voiceChanged = this.config.voiceName !== newConfig.voiceName;
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
          text: `[SYSTEM EVENT: The user has updated the active conversation topic, goal, or script to: "${newConfig.activeTopicOrScript.trim()}". Naturally transition and weave this into your upcoming thoughts in your own sweet words, without sounding repetitive or robotic, and without reciting scripts word-for-word.]`,
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
