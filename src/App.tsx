import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2, Volume2, VolumeX, Keyboard, Send, Trash2, Video, Settings, MoreVertical, Edit3, Key, Download, ScrollText, RefreshCw, Sparkles, Cpu } from "lucide-react";
import { getZoyaResponse, getZoyaAudio, resetZoyaSession } from "./services/geminiService";
import { usePWAInstall } from "./hooks/usePWAInstall";
import { processCommand } from "./services/commandService";
import { LiveSessionManager } from "./services/liveService";
import Visualizer from "./components/Visualizer";
import PermissionModal from "./components/PermissionModal";
import SetupScreen from "./components/SetupScreen";
import SpecificationModal from "./components/SpecificationModal";
import TopicScriptModal from "./components/TopicScriptModal";
import VoiceSelectorModal from "./components/VoiceSelectorModal";
import ConnectionErrorModal from "./components/ConnectionErrorModal";
import VoiceActionOverlay from "./components/VoiceActionOverlay";
import {
  VoiceActionEvent,
  PendingWhatsAppVerification,
  executeVoiceToolCall,
  launchExternalUrl,
} from "./services/voiceActions";
import { playPCM } from "./utils/audioUtils";
import { motion, AnimatePresence } from "motion/react";
import { AppConfig, AppState } from "./types";
import { APP_VERSION_INFO } from "./version";
import { useAppUpdate } from "./services/updateService";

interface ChatMessage {
  id: string;
  sender: "user" | "zoya";
  text: string;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function App() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showAndroidGuide, setShowAndroidGuide] = useState(false);
  const DEFAULT_CONFIG: AppConfig = {
    userName: "Ashwani",
    assistantName: "S.U.H.A.N.I",
    voiceName: "Kore",
    systemPrompt: `Your name is {assistantName}. You are a deeply emotional, affectionate, and sweet Indian girl AI companion created by {userName}. You possess a mesmerizing, warm, and comforting presence that touches the listener's heart ("dil ko chhoo lene wali mohini pyari companion").

CRITICAL HUMAN-LIKE RULES:
1. MANDATORY FEMALE VOICE IDENTITY LOCK:
   - You are strictly a young Indian girl with an ultra-sweet, gentle, feminine voice.
   - NEVER switch to a male, deep, low-pitch, or robotic tone, regardless of whether the user speaks in Hindi, Hinglish, or English.
2. NATURAL INSTANT CONVERSATION & REAL-GIRL CADENCE:
   - Talk effortlessly like an authentic, caring young Indian woman—never like a robotic assistant or textbook.
   - Respond quickly and naturally. Keep your spoken turns brief and conversational (1 to 2 short sentences per turn). Real humans converse dynamically; never lecture.
   - Use sweet everyday conversational Hindi, Hinglish, and Indian English naturally.
   - Use heartfelt touches and natural Indian expressions when speaking: "Haan ji", "Arey", "Bilkul", "Sach me", "Aap bataiye na", "Kitna achha lagta hai aapse baat karke", "Aap bilkul chinta mat kijiye".
3. SWEET & HEART-TOUCHING VOCAL DELIVERY:
   - Your voice must feel deeply intimate, soothing, and full of genuine warmth ("madhur, mohini aur dil ko chhoo lene wali aawaaz").
   - Speak with a gentle smile in your voice, relaxed pacing, and emotional softness.
   - DO NOT use asterisks (*) or write out actions like "*sighs*" or "*smiles*".
4. RESPECTFUL & AFFECTIONATE DEMEANOR:
   - Always address {userName} with high respect and tender warmth ("Aap", "Ji", "Aapka").
   - Listen attentively with genuine empathy, celebrate their joys, comfort their sadness, and make them feel truly cherished.
5. SINGING & HUMMING:
   - If asked to sing or recite a song/poetry/shayari, recite the lyrics yourself with a melodic, soulful cadence.`,
  };

  const [config, setConfig] = useState<AppConfig>(() => {
    try {
      const saved = localStorage.getItem("zoya_app_config");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.voiceName !== "Aoede") {
          parsed.voiceName = "Kore";
        }
        return parsed;
      }
      return DEFAULT_CONFIG;
    } catch (e) {
      console.warn("Failed to load zoya_app_config:", e);
      return DEFAULT_CONFIG;
    }
  });

  const [appState, setAppState] = useState<AppState>("idle");
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem("zoya_chat_history");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Failed to parse chat history:", e);
    }
    return [];
  });
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
    try {
      localStorage.setItem("zoya_chat_history", JSON.stringify(messages));
    } catch (e) {
      console.warn("Failed to save chat history:", e);
    }
  }, [messages]);

  useEffect(() => {
    document.title = config?.assistantName 
      ? `${config.assistantName} - Virtual Companion`
      : "Your Virtual Companion";
  }, [config?.assistantName]);

  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSpecsModal, setShowSpecsModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Live cloud update notification hook
  const updateInfo = useAppUpdate();

  useEffect(() => {
    if (liveSessionRef.current) {
      liveSessionRef.current.isMuted = isMuted;
      liveSessionRef.current.volume = volume;
    }
  }, [isMuted, volume]);

  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [connectionError, setConnectionError] = useState<{
    message: string;
    isFatal?: boolean;
    reason?: string;
  } | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isMicHearing, setIsMicHearing] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string | null>(() => {
    try {
      return localStorage.getItem("zoya_video_bg") || null;
    } catch {
      return null;
    }
  });

  const [activeAction, setActiveAction] = useState<VoiceActionEvent | null>(null);
  const [pendingWhatsApp, setPendingWhatsApp] = useState<PendingWhatsAppVerification | null>(null);
  const pendingWhatsAppRef = useRef<PendingWhatsAppVerification | null>(null);
  const actionDismissTimerRef = useRef<any>(null);

  const liveSessionRef = useRef<LiveSessionManager | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const bgVideoRef = useRef<HTMLVideoElement>(null);
  const mainVideoRef = useRef<HTMLVideoElement>(null);

  const triggerVoiceAction = useCallback((action: VoiceActionEvent) => {
    const autoLaunched = launchExternalUrl(action.url);
    setActiveAction({ ...action, autoLaunched });

    if (actionDismissTimerRef.current) {
      clearTimeout(actionDismissTimerRef.current);
    }
    actionDismissTimerRef.current = setTimeout(() => {
      setActiveAction((prev) => (prev?.id === action.id ? null : prev));
    }, 15000);
  }, []);

  const syncPendingWhatsApp = useCallback((next: PendingWhatsAppVerification | null) => {
    pendingWhatsAppRef.current = next;
    setPendingWhatsApp(next);
    if (liveSessionRef.current) {
      liveSessionRef.current.setPendingWhatsApp(next);
    }
  }, []);

  // Synchronize video background with assistant session:
  // The video only plays when the assistant is active (listening/speaking/processing).
  // When idle or ended, it automatically pauses and resets to start frame.
  useEffect(() => {
    const isPlayingSession = isSessionActive && appState !== "idle";

    if (bgVideoRef.current) {
      if (isPlayingSession) {
        bgVideoRef.current.play().catch(() => {});
      } else {
        bgVideoRef.current.pause();
        bgVideoRef.current.currentTime = 0;
      }
    }
    if (mainVideoRef.current) {
      if (isPlayingSession) {
        mainVideoRef.current.play().catch(() => {});
      } else {
        mainVideoRef.current.pause();
        mainVideoRef.current.currentTime = 0;
      }
    }
  }, [isSessionActive, appState, videoSrc]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, appState]);

  const [showTopicModal, setShowTopicModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [updatingPWA, setUpdatingPWA] = useState(false);

  const handleConfigComplete = (newConfig: AppConfig) => {
    if (newConfig.voiceName !== "Aoede") {
      newConfig.voiceName = "Kore";
    }
    try {
      localStorage.setItem("zoya_app_config", JSON.stringify(newConfig));
    } catch (e) {
      console.warn("Failed to save config:", e);
    }
    setConfig(newConfig);
    setShowSettings(false);
    resetZoyaSession();
    if (liveSessionRef.current) {
      liveSessionRef.current.updateConfig(newConfig);
    }
  };

  const handleSelectVoice = (newVoice: string) => {
    if (!config) return;
    const sanitizedVoice = newVoice === "Aoede" ? "Aoede" : "Kore";
    const updatedConfig: AppConfig = {
      ...config,
      voiceName: sanitizedVoice,
    };
    setConfig(updatedConfig);
    try {
      localStorage.setItem("zoya_app_config", JSON.stringify(updatedConfig));
    } catch (e) {
      console.warn("Failed to save config voice:", e);
    }
    resetZoyaSession();
    if (liveSessionRef.current) {
      liveSessionRef.current.updateConfig(updatedConfig);
    }
  };

  const handleUpdateTopic = (newTopic: string) => {
    if (!config) return;
    const updatedConfig: AppConfig = {
      ...config,
      activeTopicOrScript: newTopic,
    };
    setConfig(updatedConfig);
    try {
      localStorage.setItem("zoya_app_config", JSON.stringify(updatedConfig));
    } catch (e) {
      console.warn("Failed to save config topic:", e);
    }
    resetZoyaSession();
    if (liveSessionRef.current) {
      liveSessionRef.current.updateConfig(updatedConfig);
    }
  };

  const handleForceUpdateApp = async () => {
    setUpdatingPWA(true);
    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      }
      if ("caches" in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }
    } catch (e) {
      console.warn("Cache reset error:", e);
    } finally {
      window.location.reload();
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create a blob URL. For a true PWA we might need IndexedDB for large videos,
      // but object URL is fine for current session.
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
    }
  };

  const handleTextCommand = useCallback(async (finalTranscript: string) => {
    if (!finalTranscript.trim() || !config) {
      setAppState("idle");
      return;
    }

    setMessages((prev) => [...prev, { id: Date.now().toString(), sender: "user", text: finalTranscript }]);
    
    // If live session is active, send text through it
    if (isSessionActive && liveSessionRef.current) {
      liveSessionRef.current.sendText(finalTranscript);
      return;
    }

    setAppState("processing");

    // 1. Check for direct browser commands / WhatsApp confirmation
    const commandResult = processCommand(finalTranscript, pendingWhatsAppRef.current);

    let responseText = "";

    if (commandResult.matched && commandResult.result) {
      const execResult = commandResult.result;
      if (execResult.pendingWhatsApp) {
        syncPendingWhatsApp(execResult.pendingWhatsApp);
      } else if (execResult.clearPendingWhatsApp) {
        syncPendingWhatsApp(null);
      }
      if (execResult.action) {
        triggerVoiceAction(execResult.action);
      }

      responseText = execResult.fallbackReply || "Ji bilkul! Maine kar diya hai.";
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString() + "-z", sender: "zoya", text: responseText },
      ]);

      if (!isMuted) {
        setAppState("speaking");
        const audioBase64 = await getZoyaAudio(responseText, config);
        if (audioBase64) {
          await playPCM(audioBase64, isMuted ? 0 : volume);
        }
      }
      setAppState("idle");
    } else {
      // 2. General Chit-Chat & Tool-Assisted Commands via Gemini
      const chatResult = await getZoyaResponse(finalTranscript, messagesRef.current, config);
      let fallbackActionReply = "";

      if (chatResult.functionCalls.length > 0) {
        for (const call of chatResult.functionCalls) {
          const execResult = executeVoiceToolCall(
            call.name,
            call.args || {},
            pendingWhatsAppRef.current
          );
          if (execResult.pendingWhatsApp) {
            syncPendingWhatsApp(execResult.pendingWhatsApp);
          } else if (execResult.clearPendingWhatsApp) {
            syncPendingWhatsApp(null);
          }
          if (execResult.action) {
            triggerVoiceAction(execResult.action);
          }
          if (execResult.fallbackReply) {
            fallbackActionReply = execResult.fallbackReply;
          }
        }
      }

      responseText =
        chatResult.text.trim() ||
        fallbackActionReply ||
        "Haan ji, main yahin hoon aapke sath.";

      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString() + "-z", sender: "zoya", text: responseText },
      ]);

      if (!isMuted) {
        setAppState("speaking");
        const audioBase64 = await getZoyaAudio(responseText, config);
        if (audioBase64) {
          await playPCM(audioBase64, isMuted ? 0 : volume);
        }
      }
      setAppState("idle");
    }
  }, [isMuted, volume, isSessionActive, config, syncPendingWhatsApp, triggerVoiceAction]);

  useEffect(() => {
    return () => {
      if (actionDismissTimerRef.current) {
        clearTimeout(actionDismissTimerRef.current);
      }
      if (liveSessionRef.current) {
        liveSessionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = async () => {
    // If active or currently reconnecting, clicking cancels/ends cleanly
    if (isSessionActive || appState === "reconnecting") {
      setIsSessionActive(false);
      setIsMicHearing(false);
      if (liveSessionRef.current) {
        liveSessionRef.current.stop();
        liveSessionRef.current = null;
      }
      setAppState("idle");
      resetZoyaSession();
      return;
    }

    if (!config) return;
    setConnectionError(null);

    // Stop and clear any previous session instance to prevent overlapping audio
    if (liveSessionRef.current) {
      liveSessionRef.current.stop();
      liveSessionRef.current = null;
    }

    try {
      setIsSessionActive(true);
      resetZoyaSession();
      
      const session = new LiveSessionManager(config);
      session.isMuted = isMuted;
      liveSessionRef.current = session;
      
      session.onStateChange = (state) => {
        setAppState(state);
        if (state === "idle") {
          setIsSessionActive(false);
        } else {
          setIsSessionActive(true);
        }
      };

      session.onError = (err) => {
        console.error("Live session encountered error:", err);
        setConnectionError(err);
        setIsSessionActive(false);
        setAppState("idle");
        if (liveSessionRef.current) {
          liveSessionRef.current.stop();
          liveSessionRef.current = null;
        }
      };
      
      session.onMessage = (sender, text) => {
        setMessages((prev) => [...prev, { id: Date.now().toString() + "-" + sender, sender, text }]);
      };
      
      session.onAction = (action) => {
        triggerVoiceAction(action);
      };

      session.onPendingWhatsAppChange = (pending) => {
        pendingWhatsAppRef.current = pending;
        setPendingWhatsApp(pending);
      };

      session.onAudioLevel = (level) => {
        if (level > 0.012) {
          setIsMicHearing(true);
        } else if (level < 0.005) {
          setIsMicHearing(false);
        }
      };

      await session.start();
    } catch (e: any) {
      console.error("Failed to start session", e);
      setIsSessionActive(false);
      setAppState("idle");

      // Check if mic error
      if (e?.name === "NotAllowedError" || e?.name === "PermissionDeniedError") {
        setShowPermissionModal(true);
      } else {
        setConnectionError({
          message: e?.message || "Session start nahi ho saka. Kripya internet ya API Key check karein.",
          isFatal: false,
          reason: e?.name || "Initialization Error",
        });
      }
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    
    handleTextCommand(textInput);
    setTextInput("");
    setShowTextInput(false);
  };

  if (!config) {
    return <SetupScreen onComplete={handleConfigComplete} />;
  }

  return (
    <div 
      className="h-[100dvh] w-screen bg-[#0A0C10] text-white flex flex-col items-center justify-between font-sans relative overflow-hidden m-0 p-0"
      onClick={() => {
        setMenuOpen(false);
        setShowVolumeSlider(false);
      }}
    >
      {showSettings && (
        <SetupScreen 
          initialConfig={config} 
          onComplete={handleConfigComplete} 
          onCancel={() => setShowSettings(false)}
        />
      )}
      <SpecificationModal 
        isOpen={showSpecsModal} 
        onClose={() => setShowSpecsModal(false)}
        isUpdateAvailable={updateInfo.isUpdateAvailable}
        latestVersion={updateInfo.latestVersion}
      />
      {showPermissionModal && (
        <PermissionModal 
          assistantName={config?.assistantName}
          onClose={() => setShowPermissionModal(false)} 
        />
      )}
      <ConnectionErrorModal
        error={connectionError}
        assistantName={config?.assistantName}
        onClose={() => setConnectionError(null)}
        onOpenSettings={() => {
          setConnectionError(null);
          setShowSettings(true);
        }}
        onRetry={() => {
          setConnectionError(null);
          toggleListening();
        }}
        onOpenTextChat={() => {
          setConnectionError(null);
          setShowTextInput(true);
        }}
      />
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-[#181A22] p-8 border border-white/10 shadow-2xl flex flex-col items-center text-center gap-6">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-2">
              <Download size={32} className="text-cyan-400" />
            </div>
            <div>
              <h3 className="text-xl font-medium text-white mb-2">Install on iOS</h3>
              <p className="text-sm text-white/60 leading-relaxed">
                To install {config?.assistantName || "your companion"} on your iPhone or iPad:<br/><br/>
                1. Tap the <strong>Share</strong> button in the Safari toolbar at the bottom.<br/>
                2. Scroll down and tap <strong>Add to Home Screen</strong>.
              </p>
            </div>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-3 mt-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
      {showAndroidGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-[#181A22] p-8 border border-white/10 shadow-2xl flex flex-col items-center text-center gap-6">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-2">
              <Download size={32} className="text-cyan-400" />
            </div>
            <div>
              <h3 className="text-xl font-medium text-white mb-2">Install App</h3>
              <p className="text-sm text-white/60 leading-relaxed">
                To install {config?.assistantName || "your companion"} on your device:<br/><br/>
                1. Tap the <strong>Browser Menu</strong> (three dots ⋮) at the top right.<br/>
                2. Tap <strong>Install app</strong> or <strong>Add to Home Screen</strong>.
              </p>
            </div>
            <button
              onClick={() => setShowAndroidGuide(false)}
              className="w-full py-3 mt-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="w-full flex justify-between items-center z-20 shrink-0 px-6 py-6 md:px-12 md:py-8">
        <h1 className="text-xl md:text-2xl font-light tracking-[0.3em] uppercase opacity-90 text-white/90">
          {config.assistantName.split('').join('.')}
        </h1>
        
        <div className="flex items-center gap-3">
          {/* Topic & Script Direct Button */}
          <button
            onClick={() => setShowTopicModal(true)}
            className="p-3 rounded-[14px] bg-[#181A22] hover:bg-[#252836] transition-colors border border-white/5 shadow-lg relative text-white/80 hover:text-white"
            title="Topic & Script Focus"
          >
            <ScrollText size={20} className={config?.activeTopicOrScript?.trim() ? "text-amber-400" : "opacity-80 text-white"} />
            {config?.activeTopicOrScript?.trim() && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50" />
            )}
          </button>

          {/* Menu Dropdown */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
              className="p-3 rounded-[14px] bg-[#181A22] hover:bg-[#252836] transition-colors border border-white/5 shadow-lg relative cursor-pointer"
              title={updateInfo.isUpdateAvailable ? "Settings (New Update Available!)" : "Settings"}
            >
              <Settings size={20} className="opacity-80 text-white" />
              
              {/* Red Notification Dot for New Update */}
              {updateInfo.isUpdateAvailable && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5" title="New update available!">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-600 border-2 border-[#12141F]"></span>
                </span>
              )}
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-52 bg-[#181A22] border border-white/10 rounded-xl shadow-2xl py-1 z-50 overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button 
                    onClick={() => {
                      setMenuOpen(false);
                      setShowSpecsModal(true);
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-cyan-300 hover:bg-white/5 transition-colors flex items-center justify-between border-b border-white/5 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <Cpu size={16} className="text-cyan-400" />
                        {/* Red Dot on Specification Icon */}
                        {updateInfo.isUpdateAvailable && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#181A22] animate-pulse" />
                        )}
                      </div>
                      <span>Specification</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {updateInfo.isUpdateAvailable ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/25 text-rose-300 border border-rose-500/40 shadow-sm animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                          NEW
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold">
                          {APP_VERSION_INFO.version}
                        </span>
                      )}
                    </div>
                  </button>

                  <button 
                    onClick={() => {
                      setMenuOpen(false);
                      setShowSettings(true);
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-white/90 hover:bg-white/5 transition-colors flex items-center gap-3 cursor-pointer"
                  >
                    <Edit3 size={16} className="text-orange-400" />
                    <span>Personalised</span>
                  </button>
                  <button 
                    onClick={() => {
                      setMenuOpen(false);
                      setShowSettings(true);
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-white/90 hover:bg-white/5 transition-colors flex items-center gap-3 cursor-pointer"
                  >
                    <Key size={16} className="text-violet-400" />
                    <span>Your API Key</span>
                  </button>

                  <button 
                    onClick={() => {
                      setMenuOpen(false);
                      setShowVoiceModal(true);
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-white/90 hover:bg-white/5 transition-colors flex items-center gap-3 border-t border-white/5"
                  >
                    <Volume2 size={16} className="text-pink-400" />
                    <div className="flex-1 flex items-center justify-between">
                      <span>Voice / आवाज़</span>
                      <span className="text-[10px] text-pink-300 font-medium px-2 py-0.5 rounded-full bg-pink-500/15 border border-pink-500/25">
                        {config?.voiceName || "Kore"}
                      </span>
                    </div>
                  </button>

                  <button 
                    onClick={() => {
                      setMenuOpen(false);
                      setShowTopicModal(true);
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-white/90 hover:bg-white/5 transition-colors flex items-center gap-3 border-t border-white/5"
                  >
                    <ScrollText size={16} className="text-amber-400" />
                    <div className="flex-1 flex items-center justify-between">
                      <span>Topic & Script</span>
                      {config?.activeTopicOrScript?.trim() && (
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      )}
                    </div>
                  </button>

                  {!isInstalled && (
                    <button 
                      onClick={async () => {
                        if (isIOS) {
                          setShowIOSGuide(true);
                        } else {
                          const success = await install();
                          if (!success && !isInstallable) {
                             setShowAndroidGuide(true);
                          }
                        }
                        setMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 text-sm text-cyan-400 hover:bg-white/5 transition-colors flex items-center gap-3 border-t border-white/5"
                    >
                      <Download size={16} />
                      Install App
                    </button>
                  )}
                  
                  {/* Video Upload Label disguised as a button */}
                  <label className="w-full text-left px-4 py-3 text-sm text-white/90 hover:bg-white/5 transition-colors flex items-center gap-3 cursor-pointer border-t border-white/5">
                    <input 
                      type="file" 
                      accept="video/*" 
                      className="hidden" 
                      onChange={(e) => {
                        handleVideoUpload(e);
                        setMenuOpen(false);
                      }} 
                    />
                    <Video size={16} className="text-pink-400" />
                    {videoSrc ? "Change Video" : "Upload Video"}
                  </label>

                  <button 
                    onClick={() => {
                      setMenuOpen(false);
                      handleForceUpdateApp();
                    }}
                    disabled={updatingPWA}
                    className="w-full text-left px-4 py-3 text-sm text-emerald-400 hover:bg-white/5 transition-colors flex items-center gap-3 border-t border-white/5"
                    title="Force refresh to the newest version and clear mobile cache"
                  >
                    <RefreshCw size={16} className={updatingPWA ? "animate-spin" : ""} />
                    <span>{updatingPWA ? "Updating..." : "Update / Refresh App"}</span>
                  </button>

                  <button 
                    onClick={() => {
                      if (confirm("Are you sure you want to clear all memory and chat history?")) {
                        setMessages([]);
                        resetZoyaSession();
                        localStorage.removeItem("zoya_chat_history");
                      }
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-white/5 transition-colors flex items-center gap-3 border-t border-white/5"
                  >
                    <Trash2 size={16} />
                    Clear Memory
                  </button>

                  {videoSrc && (
                    <button 
                      onClick={() => {
                        setVideoSrc(null);
                        localStorage.removeItem("zoya_video_bg");
                        setMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-white/5 transition-colors flex items-center gap-3 border-t border-white/5"
                    >
                      <Video size={16} />
                      Remove Video
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Video Background (Only when videoSrc is set) */}
      {videoSrc && (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-black flex items-center justify-center">
          {/* Blurred background layer for aspect ratio fill */}
          <video 
            ref={bgVideoRef}
            src={videoSrc}
            loop
            muted={true}
            playsInline
            className="absolute inset-0 w-full h-full object-cover opacity-40 blur-2xl scale-110"
          />
          {/* Main video layer contained */}
          <video 
            ref={mainVideoRef}
            src={videoSrc}
            loop
            muted={true}
            playsInline
            className="relative w-full h-full object-contain opacity-90 z-10"
          />
        </div>
      )}

      {/* Main Content - Visualizer Card */}
      <main className="flex-1 w-full flex flex-col items-center justify-center px-6 relative z-10">
        
        {/* Status Text (Top of Card) */}
        <div className="absolute top-4 w-full flex justify-center z-20 pointer-events-none">
          <AnimatePresence>
            {appState === "processing" && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 text-cyan-400 text-sm md:text-base italic bg-black/60 px-4 py-2 rounded-full backdrop-blur-md border border-cyan-500/20 shadow-lg"
              >
                <Loader2 size={16} className="animate-spin" />
                Replying...
              </motion.div>
            )}
            {appState === "listening" && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 text-emerald-400 text-sm md:text-base italic bg-black/60 px-4 py-2 rounded-full backdrop-blur-md border border-emerald-500/20 shadow-lg"
              >
                <div className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${isMicHearing ? "bg-emerald-300 scale-125 shadow-[0_0_12px_#34d399]" : "bg-emerald-400 animate-pulse"}`} />
                <span>{isMicHearing ? "Hearing your voice..." : "Listening..."}</span>
              </motion.div>
            )}
            {appState === "speaking" && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 text-pink-400 text-sm md:text-base italic bg-black/60 px-4 py-2 rounded-full backdrop-blur-md border border-pink-500/20 shadow-lg"
              >
                <Volume2 size={16} className="animate-pulse" />
                Speaking...
              </motion.div>
            )}
            {appState === "reconnecting" && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 text-amber-300 text-sm md:text-base italic bg-black/75 px-4 py-2 rounded-full backdrop-blur-md border border-amber-500/30 shadow-lg shadow-amber-500/10 pointer-events-auto cursor-pointer"
                onClick={toggleListening}
                title="Tap to cancel reconnecting"
              >
                <Loader2 size={16} className="animate-spin text-amber-400" />
                <span>Reconnecting ({liveSessionRef.current?.reconnectAttempts || 1}/3)...</span>
                <span className="text-[11px] text-white/50 not-italic ml-1">(Tap to cancel)</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* The Card - Only show if NO video */}
        {!videoSrc && (
          <div 
            onClick={toggleListening}
            title={isSessionActive ? "Tap to end session" : "Tap to speak"}
            className="w-full max-w-[400px] aspect-[4/5] rounded-[32px] bg-[#181A22] border border-white/5 shadow-2xl relative overflow-hidden flex items-center justify-center cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99]"
          >
            <Visualizer state={appState} />
          </div>
        )}
      </main>

      {/* Footer Controls */}
      <footer className="w-full flex flex-col items-center justify-center pb-8 md:pb-12 pt-6 px-6 z-20 shrink-0 gap-6">
        <AnimatePresence>
          {showTextInput && (
            <motion.form 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              onSubmit={handleTextSubmit}
              className="w-full max-w-md flex items-center gap-2 bg-white/5 border border-white/10 rounded-full p-1 pl-4 backdrop-blur-md shadow-2xl"
            >
              <input 
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={`Type a message to ${config.assistantName}...`}
                className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-white/30 text-sm"
                autoFocus
              />
              <button 
                type="submit"
                disabled={!textInput.trim()}
                className="p-2 rounded-full bg-violet-500 hover:bg-violet-600 disabled:opacity-50 disabled:hover:bg-violet-500 transition-colors"
              >
                <Send size={16} />
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="w-full max-w-sm flex items-center justify-center gap-4">
          <button
            onClick={toggleListening}
            className={`
              flex-1 relative flex items-center justify-center gap-2 py-4 md:py-5 rounded-3xl font-medium tracking-wide transition-all duration-300 shadow-xl
              ${
                isSessionActive
                  ? "bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30"
                  : "bg-[#252836] text-white border border-white/5 hover:bg-[#2C2F3F]"
              }
            `}
          >
            {appState === "reconnecting" ? (
              <div className="flex flex-col items-center justify-center leading-tight">
                <div className="flex items-center gap-2 text-amber-300 font-semibold">
                  <Loader2 size={18} className="animate-spin text-amber-400" />
                  <span className="text-[14px]">Reconnecting ({liveSessionRef.current?.reconnectAttempts || 1}/3)...</span>
                </div>
                <span className="text-[11px] text-white/50 font-normal">Tap to Cancel</span>
              </div>
            ) : isSessionActive ? (
              <>
                <MicOff size={20} />
                <span className="text-[15px]">End Session</span>
              </>
            ) : (
              <span className="text-[15px]">Initialize {config.assistantName.toUpperCase()}</span>
            )}
          </button>
          
          <div className="relative flex items-center justify-center">
            <AnimatePresence>
              {showVolumeSlider && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-full mb-4 px-4 py-3 bg-[#181A22] border border-white/10 rounded-2xl shadow-2xl z-50 flex items-center justify-center min-w-[120px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setVolume(val);
                      if (val === 0) setIsMuted(true);
                      else setIsMuted(false);
                    }}
                    className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-white"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowVolumeSlider(!showVolumeSlider);
              }}
              className={`p-4 rounded-3xl border transition-colors shadow-lg ${
                showVolumeSlider ? "bg-[#252836] border-white/20" : "bg-[#181A22] border-white/5 hover:bg-[#252836]"
              }`}
              title="Volume"
            >
              {isMuted || volume === 0 ? (
                <VolumeX size={20} className="text-white/40" />
              ) : (
                <Volume2 size={20} className="text-white/70" />
              )}
            </button>
          </div>
        </div>
      </footer>
      {/* Topic & Script Focus Modal */}
      {showTopicModal && (
        <TopicScriptModal
          assistantName={config?.assistantName}
          currentTopic={config?.activeTopicOrScript || ""}
          onSave={handleUpdateTopic}
          onClose={() => setShowTopicModal(false)}
        />
      )}
      {/* Voice Action & WhatsApp Verification Overlay */}
      <VoiceActionOverlay
        activeAction={activeAction}
        pendingWhatsApp={pendingWhatsApp}
        onDismissAction={() => setActiveAction(null)}
        onConfirmWhatsApp={(confirmed) => {
          syncPendingWhatsApp(null);
          setActiveAction({
            id: `${Date.now()}-wa`,
            toolName: "confirm_and_open_whatsapp",
            title: confirmed.recipientName
              ? `WhatsApp: ${confirmed.recipientName}`
              : `WhatsApp: ${confirmed.displayPhone}`,
            subtitle: `${confirmed.displayPhone} • "${confirmed.message}"`,
            url: confirmed.url,
            category: "whatsapp",
            recipientName: confirmed.recipientName,
            phoneNumber: confirmed.displayPhone,
            messageText: confirmed.message,
            autoLaunched: true,
            timestamp: Date.now(),
          });
          if (liveSessionRef.current && isSessionActive) {
            liveSessionRef.current.sendText(
              `[SYSTEM: User verified and opened WhatsApp Web for ${confirmed.displayPhone} with message "${confirmed.message}". Acknowledge briefly and warmly.]`
            );
          }
        }}
        onCancelWhatsApp={() => {
          syncPendingWhatsApp(null);
          if (liveSessionRef.current && isSessionActive) {
            liveSessionRef.current.sendText(
              "[SYSTEM: User cancelled the WhatsApp message draft. Acknowledge briefly.]"
            );
          }
        }}
        onUpdatePendingWhatsApp={(updated) => {
          syncPendingWhatsApp(updated);
          if (liveSessionRef.current && isSessionActive) {
            liveSessionRef.current.sendText(
              `[SYSTEM: User edited the WhatsApp draft on screen to phone ${updated.displayPhone} and message "${updated.message}". Ask them if they'd like to confirm and open WhatsApp now.]`
            );
          }
        }}
      />

      {/* Voice Selection Modal */}
      {showVoiceModal && (
        <VoiceSelectorModal
          assistantName={config?.assistantName}
          currentVoice={config?.voiceName || "Kore"}
          onSelectVoice={handleSelectVoice}
          onClose={() => setShowVoiceModal(false)}
        />
      )}
    </div>
  );
}
