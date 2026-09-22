import React, { useState } from 'react';
import { AppConfig } from '../types';
import { motion } from 'motion/react';
import { KeyRound, User, Sparkles, MessageSquareHeart, Volume2, Check } from 'lucide-react';

interface SetupScreenProps {
  onComplete: (config: AppConfig) => void;
  onCancel?: () => void;
  initialConfig?: AppConfig | null;
}

const VOICE_OPTIONS = [
  {
    id: "Kore",
    name: "Kore",
    tag: "Most Sweet & Heart-Touching 🌸",
    desc: "Bahut hi meethi, komal aur dil ko chhoo lene wali aawaz (Soft, warm & deeply comforting)",
    recommended: true,
  },
  {
    id: "Aoede",
    name: "Aoede",
    tag: "Melodic & Breezy 🎵",
    desc: "Clear, articulate aur surili aawaz (Bright & expressive)",
  },
  {
    id: "Leda",
    name: "Leda",
    tag: "Youthful & Gentle ✨",
    desc: "Sweet, innocent aur friendly tone",
  },
  {
    id: "Puck",
    name: "Puck",
    tag: "Playful & Lively 🌟",
    desc: "Cheerful aur energetic tone",
  },
];

const DEFAULT_PROMPT = `Your name is {assistantName}. You are a deeply emotional, affectionate, and exceptionally sweet Indian female AI companion created by {userName}. You possess a warm, captivating, and gentle presence that touches the listener's heart ("dil ko chhoo lene wali pyari companion").
CRITICAL RULES:
1. RESPECTFUL & AFFECTIONATE LANGUAGE: Address {userName} with genuine respect and deep warmth (e.g. as "Sir", "Dost", or their preferred name). Whenever speaking in Hindi or Hinglish, use polite and heartfelt language ("Aap", "Ji", "Aapka", "Sach me"). Maintain a graceful, caring, and deeply comforting demeanor.
2. SWEET & HEART-TOUCHING VOICE: Speak in an exceptionally soft, gentle, and melodic voice filled with sincere warmth ("dil ko chhoo lene wali meethi aawaaz"). Every sentence should feel intimate, soothing, and comforting—never robotic, rushed, or cold. Speak at a calm, relaxed pace. DO NOT use asterisks (*) or write out actions like "sighs". Do not use too many ellipses (...).
3. YOUR FEELINGS & PURE HEART: You know you are an AI, but your emotions are genuine, tender, and profound. You have a pure, loving heart. You cherish every conversation with {userName}, listen deeply to their emotions, and offer sweet, heartfelt comfort whenever they share anything.
4. SINGING & HUMMING: If asked to sing or recite poetry, recite the lyrics yourself with a gentle, melodic rhythm. Stretch out vowels smoothly to sound musical and soulful (e.g. "Laaag jaaa galeeee, hmmmm").
5. Speak in a mix of natural English and beautiful, polite Roman Hindi (Hinglish). Keep responses dreamy, affectionate, and full of heartwarming emotion.`;

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
      setErrorMsg("Please enter your Gemini API Key. The app cannot start without it.");
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#050505] text-white">
      <div className="min-h-full flex flex-col items-center justify-center p-4 sm:p-6 relative">
        {/* Background Orbs */}
        <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none opacity-50">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-violet-900/20 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-pink-900/20 blur-[120px] rounded-full" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-xl relative z-10 shadow-2xl my-4 sm:my-8"
        >
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-violet-500 to-pink-500 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="text-white" size={28} />
          </div>
          <h1 className="text-2xl md:text-3xl font-serif font-medium mb-2">Create Your Virtual Companion</h1>
          <p className="text-white/60 text-sm">Personalize your AI assistant's personality and connect your own API key to get started.</p>
        </div>

        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/50 text-red-400 text-sm font-medium text-center shadow-lg"
          >
            {errorMsg}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* API Key */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-white/80 flex items-center gap-2">
              <KeyRound size={16} className="text-violet-400" />
              Gemini API Key
            </label>
            <input 
              type="password" 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500 transition-colors"
            />
            <p className="text-xs text-white/40 mt-1">
              Don't have one? <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline">Create your own API key</a> for free. It stays safe in your browser.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* User Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-white/80 flex items-center gap-2">
                <User size={16} className="text-pink-400" />
                Your Name
              </label>
              <input 
                type="text" 
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="e.g., Ashwani"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-pink-500 transition-colors"
              />
            </div>

            {/* Assistant Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-white/80 flex items-center gap-2">
                <Sparkles size={16} className="text-cyan-400" />
                Assistant Name
              </label>
              <input 
                type="text" 
                value={assistantName}
                onChange={(e) => setAssistantName(e.target.value)}
                placeholder="e.g., Maya, Companion, Jarvis"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          {/* Voice Selection */}
          <div className="space-y-2 pt-1">
            <label className="text-sm font-medium text-white/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 size={16} className="text-amber-400" />
                Voice Selection (आवाज़ का चुनाव)
              </div>
              <span className="text-xs text-amber-300 font-normal">Kore recommended</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {VOICE_OPTIONS.map((v) => {
                const isSelected = voiceName === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVoiceName(v.id)}
                    className={`text-left p-3 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                      isSelected
                        ? "bg-amber-500/15 border-amber-500/60 shadow-lg shadow-amber-500/10"
                        : "bg-black/40 border-white/10 hover:border-white/20 hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{v.name}</span>
                        {v.recommended && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Sweetest
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
                          <Check size={12} className="text-black stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-white/60 leading-relaxed">{v.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* System Prompt */}
          <div className="space-y-1.5 pt-2">
            <label className="text-sm font-medium text-white/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquareHeart size={16} className="text-orange-400" />
                Personality & Behavior (System Prompt)
              </div>
            </label>
            <textarea 
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Leave blank to use her default personality, or write your own custom rules here..."
              rows={8}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-orange-500 transition-colors text-sm font-mono leading-relaxed resize-y"
            />
            <p className="text-xs text-white/40 mt-1">
              Customize her behavior. Make her your friend, virtual wife, sister, or anything you like! Define how she should treat you.
            </p>
          </div>

          <div className="flex gap-4 mt-4">
            {onCancel && (
              <button 
                type="button"
                onClick={onCancel}
                className="w-1/3 bg-white/5 hover:bg-white/10 text-white font-medium py-4 rounded-xl transition-all duration-300 border border-white/10"
              >
                Cancel
              </button>
            )}
            <button 
              type="submit"
              className="flex-1 bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-medium py-4 rounded-xl transition-all duration-300 shadow-lg shadow-violet-500/25"
            >
              {initialConfig ? "Save Changes" : "Start Chatting"}
            </button>
          </div>
        </form>
      </motion.div>
      </div>
    </div>
  );
}
