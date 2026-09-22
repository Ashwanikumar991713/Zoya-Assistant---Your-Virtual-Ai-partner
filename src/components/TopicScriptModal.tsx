import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, X, ScrollText, Check, Trash2, Lightbulb, MessageCircle, CheckCircle2 } from 'lucide-react';

interface TopicScriptModalProps {
  assistantName?: string;
  currentTopic?: string;
  onSave: (newTopic: string) => void;
  onClose: () => void;
}

const PRESETS = [
  {
    title: "Friendly Catch-up",
    icon: "☕",
    text: "Act like my close friend catching up after a busy day. Ask me how I've been doing in Hindi/Hinglish, share sweet little thoughts, and chat comfortably.",
  },
  {
    title: "Sweet Encouragement",
    icon: "💖",
    text: "Be an affectionate, caring companion. Ask me gently how my day went, listen warmly to whatever is on my mind, offer sweet comfort, and help me relax.",
  },
  {
    title: "Project Brainstorm",
    icon: "🚀",
    text: "We are brainstorming an exciting tech project together. Discuss innovative features, help me think through product challenges, and give inspiring creative feedback.",
  },
  {
    title: "Late Night Heart-to-Heart",
    icon: "🌙",
    text: "Scenario: We are having a relaxed late-night chat. Speak in a soothing, gentle voice, share poetic thoughts, and talk about dreams, music, and peace.",
  },
];

export default function TopicScriptModal({ assistantName, currentTopic = "", onSave, onClose }: TopicScriptModalProps) {
  const [topic, setTopic] = useState(currentTopic);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const companionName = assistantName?.trim() || "Your virtual companion";

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSave(topic.trim());
    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 350);
  };

  const handleClear = () => {
    setTopic("");
    onSave("");
    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 350);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 md:p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.98 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-[#141620] border border-white/15 rounded-t-[28px] sm:rounded-3xl shadow-2xl shadow-black/95 flex flex-col max-h-[92dvh] sm:max-h-[88dvh] overflow-hidden relative"
      >
        {/* Mobile drag indicator */}
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mt-2 sm:hidden shrink-0" />

        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[100px] pointer-events-none rounded-full" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/10 blur-[100px] pointer-events-none rounded-full" />

        {/* 1. FIXED TOP HEADER */}
        <div className="shrink-0 px-4 py-3 sm:px-6 sm:py-3.5 border-b border-white/10 bg-[#161824] flex items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
              <ScrollText className="text-white" size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h2 className="text-sm sm:text-base font-semibold text-white tracking-wide truncate">
                  Topic & Script Focus
                </h2>
                {topic.trim() && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                    Active
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-white/50 truncate">
                Set a conversation idea, script, or focus for {companionName}
              </p>
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/5 hover:bg-white/15 active:bg-white/25 border border-white/10 text-white/80 hover:text-white flex items-center justify-center transition-all shrink-0 cursor-pointer shadow-sm hover:scale-105 active:scale-95"
            title="Close"
            aria-label="Close"
          >
            <X size={18} className="text-white" />
          </button>
        </div>

        {/* 2. SCROLLABLE MIDDLE CONTENT */}
        <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto overscroll-contain p-3.5 sm:p-5 space-y-3.5 relative z-10">
            {/* Quick Inspiration Pills */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-white/60 flex items-center gap-1">
                <Lightbulb size={13} className="text-amber-400" />
                Quick Suggestions (Tap to load)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PRESETS.map((preset, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setTopic(preset.text)}
                    className="text-left p-2.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors flex items-start gap-2 cursor-pointer group"
                  >
                    <span className="text-base select-none shrink-0 group-hover:scale-110 transition-transform">
                      {preset.icon}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-white group-hover:text-amber-300 transition-colors">
                        {preset.title}
                      </div>
                      <div className="text-[10px] text-white/40 line-clamp-1">
                        {preset.text}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Topic Input Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] sm:text-xs text-white/60">
                <label className="flex items-center gap-1 font-medium text-white/80">
                  <MessageCircle size={13} className="text-amber-400" />
                  Active Focus / Script / Notes
                </label>
                <span className="text-[10px] sm:text-[11px] text-white/40">{topic.length} characters</span>
              </div>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Type any idea, topic, goal, or roleplay script here...&#10;&#10;Examples:&#10;• Topic: Talk with me about your favorite Hindi songs and memories&#10;• Script: Roleplay meeting as childhood friends in a quiet cafe&#10;• Goal: Ask me how my coding project went today and encourage me"
                rows={5}
                className="w-full bg-black/50 border border-white/10 rounded-xl sm:rounded-2xl px-3.5 py-3 text-xs sm:text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/80 transition-all leading-relaxed resize-y font-sans min-h-[120px]"
              />
            </div>
          </div>

          {/* 3. ALWAYS VISIBLE STICKY FOOTER */}
          <div className="shrink-0 bg-[#161824] border-t border-white/10 px-4 py-3 sm:px-6 sm:py-3.5 flex items-center justify-between gap-2 safe-bottom z-20">
            {topic.trim() ? (
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 text-red-400 border border-red-500/20 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                title="Clear topic"
              >
                <Trash2 size={13} />
                <span>Clear</span>
              </button>
            ) : (
              <div className="text-[11px] text-white/40">Free conversation mode</div>
            )}

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 sm:px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/20 text-white/70 hover:text-white text-xs sm:text-sm font-medium border border-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 sm:px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-95 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-amber-500/25 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {savedSuccess ? (
                  <>
                    <CheckCircle2 size={15} className="text-white" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>Save Focus</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
