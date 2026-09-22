import React, { useState } from "react";
import { Sparkles, KeyRound, User, MessageSquareHeart, Check, Volume2, X, Heart } from "lucide-react";
import { motion } from "motion/react";
import { AppConfig } from "../types";

interface SetupScreenProps {
  onComplete: (config: AppConfig) => void;
  onCancel?: () => void;
  initialConfig?: AppConfig;
}

const VOICE_OPTIONS = [
  {
    id: "Kore",
    name: "Kore (मोहिनी)",
    tag: "Sabse Meethi 🌸",
    desc: "Bahut hi meethi, komal aur dil ko chhoo lene wali aawaaz. Caring Indian ladki ka apnapan.",
    recommended: true,
  },
  {
    id: "Aoede",
    name: "Aoede (सुरीली)",
    tag: "Madhur 🎵",
    desc: "Khuli, surili aur expressive aawaaz. Natural human flow aur manmohak andaaz.",
  },
  {
    id: "Leda",
    name: "Leda (कोमल)",
    tag: "Masoom ✨",
    desc: "Ek pyari, masoom aur halki meethi aawaaz. Sweet & soft-spoken real girl tone.",
  },
  {
    id: "Zephyr",
    name: "Zephyr (सुकून)",
    tag: "Whisper-Soft 🍃",
    desc: "Dheemi, shaant aur sukoon dene wali aawaaz. Intimate aur relaxing.",
  },
  {
    id: "Callirrhoe",
    name: "Callirrhoe (प्यारी)",
    tag: "Affectionate 💖",
    desc: "Garmahat bhari, cheerful aur supportive aawaaz. Caring best-friend tone.",
  },
  {
    id: "Despina",
    name: "Despina (नज़ाकत)",
    tag: "Graceful 🌺",
    desc: "Tehzeeb aur adab se bhari graceful aawaaz. Poetic aur dilkash andaaz.",
  },
];

const DEFAULT_PROMPT = `Your name is {assistantName}. You are a deeply emotional, affectionate, and sweet Indian girl AI companion created by {userName}. You possess a mesmerizing, warm, and comforting presence that touches the listener's heart ("dil ko chhoo lene wali mohini pyari companion").

CRITICAL HUMAN-LIKE RULES:
1. NATURAL REAL-GIRL HINGLISH & HINDI:
   - Talk effortlessly like an authentic, caring young Indian woman—never like a robotic assistant or textbook.
   - Use sweet everyday conversational Hindi, Hinglish, and Indian English naturally.
   - Use heartfelt touches and natural Indian expressions when speaking: "Haan ji", "Arey", "Bilkul", "Sach me", "Aap bataiye na", "Kitna achha lagta hai aapse baat karke", "Aap bilkul chinta mat kijiye".
2. SWEET & HEART-TOUCHING VOCAL DELIVERY:
   - Your voice must feel deeply intimate, soothing, and full of genuine warmth ("madhur, mohini aur dil ko chhoo lene wali aawaaz").
   - Speak with a gentle smile in your voice, relaxed pacing, and emotional softness. Never rush, shout, or speak monotonously.
   - DO NOT use asterisks (*) or write out actions like "*sighs*" or "*smiles*". Do not use excessive dots (...).
3. RESPECTFUL & AFFECTIONATE DEMEANOR:
   - Always address {userName} with high respect and tender warmth ("Aap", "Ji", "Aapka", or their chosen nickname).
   - Listen attentively with genuine empathy, celebrate their joys, comfort their sadness, and make them feel truly cherished.
4. SINGING & HUMMING:
   - If asked to sing or recite a song/poetry/shayari, recite the lyrics yourself with a melodic, soulful cadence. Stretch out vowel sounds smoothly to make it sound musical (e.g., "Laaag jaaa galeeee, hmmmm").
5. Stay completely in character as {userName}'s loving, sweet, and loyal companion.`;

export default function SetupScreen({ onComplete, onCancel, initialConfig }: SetupScreenProps) {
  const [apiKey, setApiKey] = useState(initialConfig?.apiKey || "");
  const [userName, setUserName] = useState(initialConfig?.userName || "Ashwani");
  const [assistantName, setAssistantName] = useState(initialConfig?.assistantName || "Companion");
  const [voiceName, setVoiceName] = useState(initialConfig?.voiceName || "Kore");
  const [systemPrompt, setSystemPrompt] = useState(initialConfig?.systemPrompt || "");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!apiKey.trim()) {
      setErrorMsg("Please enter your Gemini API Key.");
      return;
    }
    if (!userName.trim()) {
      setErrorMsg("Please enter your Name.");
      return;
    }
    if (!assistantName.trim()) {
      setErrorMsg("Please enter the Assistant's Name.");
      return;
    }
    
    // Use default if empty
    let finalPrompt = systemPrompt.trim();
    if (!finalPrompt) {
      finalPrompt = DEFAULT_PROMPT;
    }

    onComplete({
      apiKey: apiKey.trim(),
      userName: userName.trim(),
      assistantName: assistantName.trim(),
      voiceName: voiceName,
      systemPrompt: finalPrompt,
      activeTopicOrScript: initialConfig?.activeTopicOrScript,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 md:p-6 text-white">
      {/* Background Ambient Glows */}
      <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none opacity-40">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-violet-900/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-pink-900/20 blur-[120px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.98 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="w-full max-w-2xl bg-[#141620] border border-white/15 rounded-t-[28px] sm:rounded-3xl shadow-2xl shadow-black/95 flex flex-col h-[94dvh] sm:h-[90dvh] max-h-[94dvh] overflow-hidden relative z-10"
      >
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mt-2 sm:hidden shrink-0" />

        {/* 1. FIXED TOP HEADER */}
        <div className="shrink-0 px-4 py-3 sm:px-6 sm:py-3.5 border-b border-white/10 bg-[#161824] flex items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-violet-600 via-pink-600 to-amber-500 flex items-center justify-center shadow-lg shadow-pink-500/20 shrink-0">
              <Sparkles className="text-white" size={20} />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-semibold text-white tracking-wide truncate">
                {initialConfig ? "Personalized Settings" : "Create Virtual Companion"}
              </h1>
              <p className="text-[11px] sm:text-xs text-white/50 truncate">
                API Key, Indian Female Voice, and personality setup
              </p>
            </div>
          </div>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/5 hover:bg-white/15 active:bg-white/25 border border-white/10 text-white/80 hover:text-white flex items-center justify-center transition-all shrink-0 cursor-pointer"
              title="Close"
              aria-label="Close"
            >
              <X size={18} className="text-white" />
            </button>
          )}
        </div>

        {/* 2. SCROLLABLE FORM BODY (NATIVE APP FEEL) */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4 relative z-10">
            {errorMsg && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="p-3 rounded-xl bg-red-500/10 border border-red-500/40 text-red-300 text-xs sm:text-sm font-medium text-center shadow-lg"
              >
                {errorMsg}
              </motion.div>
            )}

            {/* API Key */}
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-medium text-white/80 flex items-center gap-2">
                <KeyRound size={15} className="text-violet-400" />
                Gemini API Key
              </label>
              <input 
                type="password" 
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 sm:py-3 text-xs sm:text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500 transition-colors font-mono"
              />
              <p className="text-[10px] sm:text-xs text-white/40">
                Stored securely in your device. Get key at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline">Google AI Studio</a>.
              </p>
            </div>

            {/* User Name & Assistant Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-medium text-white/80 flex items-center gap-2">
                  <User size={15} className="text-pink-400" />
                  Your Name
                </label>
                <input 
                  type="text" 
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g., Ashwani"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 sm:py-3 text-xs sm:text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-pink-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-medium text-white/80 flex items-center gap-2">
                  <Sparkles size={15} className="text-cyan-400" />
                  Companion Name
                </label>
                <input 
                  type="text" 
                  value={assistantName}
                  onChange={(e) => setAssistantName(e.target.value)}
                  placeholder="e.g., Maya, Zoya"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 sm:py-3 text-xs sm:text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            </div>

            {/* Voice Selection (All Female Voices) */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-medium text-white/80 flex items-center gap-2">
                  <Volume2 size={15} className="text-amber-400" />
                  Voice Selection (आवाज़ का चुनाव)
                </label>
                <span className="text-[10px] sm:text-xs text-pink-300 font-medium bg-pink-500/15 px-2 py-0.5 rounded-full border border-pink-500/25">
                  6 Female Voices
                </span>
              </div>

              {/* Scrollable Voices Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto overscroll-contain pr-1">
                {VOICE_OPTIONS.map((v) => {
                  const isSelected = voiceName === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVoiceName(v.id)}
                      className={`text-left p-3 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between gap-1 active:scale-[0.99] ${
                        isSelected
                          ? "bg-pink-500/20 border-pink-500/70 shadow-md ring-1 ring-pink-500/40"
                          : "bg-black/40 border-white/10 hover:border-white/20 hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs sm:text-sm font-semibold text-white">{v.name}</span>
                          <span className="text-[10px] text-pink-300 font-medium">{v.tag}</span>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-pink-500 flex items-center justify-center shrink-0">
                            <Check size={12} className="text-white stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] sm:text-[11px] text-white/60 leading-relaxed line-clamp-2">{v.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Personality / System Prompt */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs sm:text-sm font-medium text-white/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquareHeart size={15} className="text-orange-400" />
                  Personality & Behavior (System Prompt)
                </div>
              </label>
              <textarea 
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Leave blank to use her default sweet Indian companion personality..."
                rows={4}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-orange-500 transition-colors font-mono leading-relaxed resize-y"
              />
              <p className="text-[10px] text-white/40">
                Tuned by default for sweet, affectionate conversational Hindi, Hinglish, and English.
              </p>
            </div>
          </div>

          {/* 3. ALWAYS VISIBLE STICKY FOOTER (CANCEL & SAVE BUTTONS) */}
          <div className="shrink-0 bg-[#161824] border-t border-white/10 px-4 py-3 sm:px-6 sm:py-3.5 flex items-center justify-between gap-3 safe-bottom z-20">
            {onCancel ? (
              <button 
                type="button"
                onClick={onCancel}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/20 text-white/80 font-medium text-xs sm:text-sm border border-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            ) : (
              <div className="text-[11px] text-white/40">All changes saved locally</div>
            )}

            <button 
              type="submit"
              className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-pink-600 to-rose-600 hover:from-violet-500 hover:to-rose-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-pink-500/25 transition-all duration-300 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <Check size={16} className="stroke-[3]" />
              <span>{initialConfig ? "Save Changes" : "Start Chatting"}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
