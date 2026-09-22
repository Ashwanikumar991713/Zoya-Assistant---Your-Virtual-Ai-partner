import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, X, ScrollText, Check, Trash2, Lightbulb, MessageCircle } from 'lucide-react';

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
    text: "Act like my close friend catching up after a busy week. Ask me how I've been doing, share funny little thoughts about your day, and talk about weekend plans.",
  },
  {
    title: "Project Brainstorm",
    icon: "🚀",
    text: "We are brainstorming an exciting new tech project. Discuss innovative features, help me think through product challenges, and give inspiring creative feedback.",
  },
  {
    title: "Emotional Support",
    icon: "💖",
    text: "Be an attentive, caring companion. Ask me gently how my day went, listen to whatever is on my mind, offer sweet encouragement, and help me relax.",
  },
  {
    title: "Roleplay Scenario",
    icon: "🎭",
    text: "Scenario: We are sitting together at a quiet rooftop cafe on a rainy evening in Mumbai. Talk about the rain, the lights of the city below, and reminisce about our favorite memories.",
  },
];

export default function TopicScriptModal({ assistantName, currentTopic = "", onSave, onClose }: TopicScriptModalProps) {
  const [topic, setTopic] = useState(currentTopic);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const companionName = assistantName?.trim() || "Your virtual companion";

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(topic.trim());
    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  const handleClear = () => {
    setTopic("");
    onSave("");
    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md overflow-y-auto overscroll-contain p-2 sm:p-4 md:p-6"
      onClick={onClose}
    >
      <div className="min-h-full flex flex-col items-center justify-start sm:justify-center py-2 sm:py-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-xl bg-[#141620] border border-white/15 rounded-2xl sm:rounded-3xl shadow-2xl shadow-black/95 relative overflow-hidden"
        >
          {/* Glow ambient background effects */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[100px] pointer-events-none rounded-full" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/10 blur-[100px] pointer-events-none rounded-full" />

          {/* Header */}
          <div className="px-3.5 py-3 sm:px-6 sm:py-4 border-b border-white/10 bg-[#161824] flex items-center justify-between gap-2.5 relative z-10">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
                <ScrollText className="text-white" size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h2 className="text-sm sm:text-base font-semibold text-white tracking-wide truncate">
                    Topic & Script Focus
                  </h2>
                  {topic.trim() && (
                    <span className="text-[9px] sm:text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[10px] sm:text-xs text-white/50 truncate">
                  Set an idea, topic, or script for {companionName}
                </p>
              </div>
            </div>

            {/* Prominent Close (X) Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-full bg-white/5 hover:bg-white/15 active:bg-white/25 border border-white/10 text-white/80 hover:text-white transition-all shrink-0 cursor-pointer shadow-sm hover:scale-105 active:scale-95"
              title="Close"
              aria-label="Close"
            >
              <X size={18} className="text-white" />
            </button>
          </div>

          {/* Form & Content */}
          <form onSubmit={handleSave} className="p-3.5 sm:p-6 space-y-3.5 sm:space-y-4 relative z-10">
            {/* How companion handles topic */}
            <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 space-y-1 text-[11px] sm:text-xs text-white/70">
              <div className="flex items-center gap-1.5 text-amber-300 font-medium">
                <Lightbulb size={13} className="shrink-0" />
                <span>How {companionName} handles your topic & script:</span>
              </div>
              <p className="pl-4 text-white/60 leading-relaxed text-[10px] sm:text-xs">
                • <strong className="text-white/80">Natural Human Flow:</strong> Discusses topic naturally without repeating robotically.
              </p>
              <p className="pl-4 text-white/60 leading-relaxed text-[10px] sm:text-xs">
                • <strong className="text-white/80">In Her Own Words:</strong> If you give a script, she expresses it naturally in her own voice.
              </p>
            </div>

            {/* Quick Presets */}
            <div>
              <label className="text-[11px] sm:text-xs font-medium text-white/60 mb-1.5 block flex items-center gap-1">
                <Sparkles size={11} className="text-amber-400" />
                Quick Presets (Tap to fill):
              </label>
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                {PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setTopic(p.text)}
                    className="text-left px-2.5 py-1.5 sm:py-2 rounded-xl bg-black/40 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all text-[11px] sm:text-xs text-white/80 flex items-center gap-1.5 group cursor-pointer"
                  >
                    <span className="text-sm shrink-0">{p.icon}</span>
                    <span className="truncate group-hover:text-amber-300">{p.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Input Form Field */}
            <div className="space-y-1">
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
                placeholder="Type any idea, topic, goal, or roleplay script here...&#10;&#10;Examples:&#10;• Topic: Talk with me about space missions and future technologies&#10;• Script: Roleplay meeting as childhood friends in a quiet cafe&#10;• Goal: Ask me how my coding project went today and encourage me"
                rows={5}
                className="w-full bg-black/50 border border-white/10 rounded-xl sm:rounded-2xl px-3 py-2.5 text-xs sm:text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/80 transition-all leading-relaxed resize-y font-sans min-h-[120px]"
              />
            </div>

            {/* Action buttons footer */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
              {topic.trim() ? (
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 text-red-400 border border-red-500/20 text-[11px] sm:text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                  title="Clear topic"
                >
                  <Trash2 size={13} />
                  <span>Clear Focus</span>
                </button>
              ) : (
                <div className="text-[10px] sm:text-[11px] text-white/30 truncate">Free mode</div>
              )}

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/20 text-white/80 text-[11px] sm:text-xs font-medium border border-white/10 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-95 text-white font-medium text-[11px] sm:text-xs shadow-lg shadow-amber-500/25 flex items-center gap-1 transition-all cursor-pointer"
                >
                  {savedSuccess ? (
                    <>
                      <Check size={13} />
                      <span>Saved!</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} />
                      <span>Save Focus</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
