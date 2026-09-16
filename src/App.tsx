import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2, Volume2, VolumeX, Keyboard, Send, Trash2, Video, Settings, MoreVertical, Edit3, Key, Download } from "lucide-react";
import { getZoyaResponse, getZoyaAudio, resetZoyaSession } from "./services/geminiService";
import { usePWAInstall } from "./hooks/usePWAInstall";
import { processCommand } from "./services/commandService";
import { LiveSessionManager } from "./services/liveService";
import Visualizer from "./components/Visualizer";
import PermissionModal from "./components/PermissionModal";
import SetupScreen from "./components/SetupScreen";
import { playPCM } from "./utils/audioUtils";
import { motion, AnimatePresence } from "motion/react";
import { AppConfig } from "./types";

type AppState = "idle" | "listening" | "processing" | "speaking";

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
  const [config, setConfig] = useState<AppConfig | null>(() => {
    const saved = localStorage.getItem("zoya_app_config");
    return saved ? JSON.parse(saved) : null;
  });

  const [appState, setAppState] = useState<AppState>("idle");
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem("zoya_chat_history");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse chat history", e);
      }
    }
    return [];
  });
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
    localStorage.setItem("zoya_chat_history", JSON.stringify(messages));
  }, [messages]);

  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (liveSessionRef.current) {
      liveSessionRef.current.isMuted = isMuted;
      liveSessionRef.current.volume = volume;
    }
  }, [isMuted, volume]);

  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string | null>(() => {
    return localStorage.getItem("zoya_video_bg") || null;
  });

  const liveSessionRef = useRef<LiveSessionManager | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, appState]);

  const handleConfigComplete = (newConfig: AppConfig) => {
    localStorage.setItem("zoya_app_config", JSON.stringify(newConfig));
    setConfig(newConfig);
    setShowSettings(false);
    resetZoyaSession();
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

    // 1. Check for browser commands
    const commandResult = processCommand(finalTranscript);

    let responseText = "";

    if (commandResult.isBrowserAction) {
      responseText = commandResult.action;
      setMessages((prev) => [...prev, { id: Date.now().toString() + "-z", sender: "zoya", text: responseText }]);
      
      if (!isMuted) {
        setAppState("speaking");
        const audioBase64 = await getZoyaAudio(responseText, config);
        if (audioBase64) {
          await playPCM(audioBase64, isMuted ? 0 : volume);
        }
      }

      setAppState("idle");

      setTimeout(() => {
        if (commandResult.url) {
          window.open(commandResult.url, "_blank");
        }
      }, 1500);
    } else {
      // 2. General Chit-Chat via Gemini
      responseText = await getZoyaResponse(finalTranscript, messagesRef.current, config);
      setMessages((prev) => [...prev, { id: Date.now().toString() + "-z", sender: "zoya", text: responseText }]);
      
      if (!isMuted) {
        setAppState("speaking");
        const audioBase64 = await getZoyaAudio(responseText, config);
        if (audioBase64) {
          await playPCM(audioBase64, isMuted ? 0 : volume);
        }
      }
      setAppState("idle");
    }
  }, [isMuted, volume, isSessionActive, config]);

  useEffect(() => {
    return () => {
      if (liveSessionRef.current) {
        liveSessionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = async () => {
    if (isSessionActive) {
      setIsSessionActive(false);
      if (liveSessionRef.current) {
        liveSessionRef.current.stop();
        liveSessionRef.current = null;
      }
      setAppState("idle");
      resetZoyaSession();
    } else {
      if (!config) return;
      try {
        setIsSessionActive(true);
        resetZoyaSession();
        
        const session = new LiveSessionManager(config);
        session.isMuted = isMuted;
        liveSessionRef.current = session;
        
        session.onStateChange = (state) => {
          setAppState(state);
        };
        
        session.onMessage = (sender, text) => {
          setMessages((prev) => [...prev, { id: Date.now().toString() + "-" + sender, sender, text }]);
        };
        
        session.onCommand = (url) => {
          setTimeout(() => {
            window.open(url, "_blank");
          }, 1000);
        };

        await session.start();
      } catch (e) {
        console.error("Failed to start session", e);
        setShowPermissionModal(true);
        setIsSessionActive(false);
        setAppState("idle");
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
      {showPermissionModal && (
        <PermissionModal 
          onClose={() => setShowPermissionModal(false)} 
        />
      )}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-[#181A22] p-8 border border-white/10 shadow-2xl flex flex-col items-center text-center gap-6">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-2">
              <Download size={32} className="text-cyan-400" />
            </div>
            <div>
              <h3 className="text-xl font-medium text-white mb-2">Install on iOS</h3>
              <p className="text-sm text-white/60 leading-relaxed">
                To install ZOYA on your iPhone or iPad:<br/><br/>
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
                To install ZOYA on your device:<br/><br/>
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
          {/* Menu Dropdown */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
              className="p-3 rounded-[14px] bg-[#181A22] hover:bg-[#252836] transition-colors border border-white/5 shadow-lg"
              title="Settings"
            >
              <Settings size={20} className="opacity-80 text-white" />
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-48 bg-[#181A22] border border-white/10 rounded-xl shadow-2xl py-1 z-50 overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button 
                    onClick={() => {
                      setMenuOpen(false);
                      setShowSettings(true);
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-white/90 hover:bg-white/5 transition-colors flex items-center gap-3"
                  >
                    <Edit3 size={16} className="text-orange-400" />
                    Personalised
                  </button>
                  <button 
                    onClick={() => {
                      setMenuOpen(false);
                      setShowSettings(true);
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-white/90 hover:bg-white/5 transition-colors flex items-center gap-3"
                  >
                    <Key size={16} className="text-violet-400" />
                    Your API Key
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
            src={videoSrc}
            autoPlay
            loop
            muted={true}
            playsInline
            className="absolute inset-0 w-full h-full object-cover opacity-40 blur-2xl scale-110"
          />
          {/* Main video layer contained */}
          <video 
            src={videoSrc}
            autoPlay
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
        <div className="absolute top-4 w-full flex justify-center z-20">
          <AnimatePresence>
            {appState === "processing" && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 text-cyan-400 text-sm md:text-base italic bg-black/60 px-4 py-2 rounded-full backdrop-blur-md"
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
                className="flex items-center gap-2 text-emerald-400 text-sm md:text-base italic bg-black/60 px-4 py-2 rounded-full backdrop-blur-md"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Listening...
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* The Card - Only show if NO video */}
        {!videoSrc && (
          <div className="w-full max-w-[400px] aspect-[4/5] rounded-[32px] bg-[#181A22] border border-white/5 shadow-2xl relative overflow-hidden flex items-center justify-center">
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
            {isSessionActive ? (
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
    </div>
  );
}
