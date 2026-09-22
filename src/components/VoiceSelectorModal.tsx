import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Volume2, X, Check, Heart, Sparkles, CheckCircle2 } from 'lucide-react';

interface VoiceSelectorModalProps {
  assistantName?: string;
  currentVoice?: string;
  onSelectVoice: (voiceName: string) => void;
  onClose: () => void;
}

export const FEMALE_VOICES = [
  {
    id: "Kore",
    name: "Kore",
    hindiName: "मोहिनी (Mohini)",
    badge: "Sabse Meethi 🌸",
    tagline: "Most Sweet & Heart-Touching",
    desc: "Bahut hi meethi, komal aur dil ko chhoo lene wali aawaaz. Caring Indian ladki ka apnapan aur atoot garmahat.",
    recommended: true,
    languages: "Hindi • Hinglish • English (India)",
    vibe: "Warm, Sweet & Emotional",
    icon: "🌸",
  },
  {
    id: "Aoede",
    name: "Aoede",
    hindiName: "सुरीली (Surili)",
    badge: "Madhur 🎵",
    tagline: "Melodic & Expressive",
    desc: "Khuli, surili aur expressive aawaaz. Natural human flow aur bina ruke fluent pyara andaaz.",
    recommended: false,
    languages: "Hindi • Hinglish • English",
    vibe: "Clear, Melodic & Bright",
    icon: "🎵",
  },
  {
    id: "Leda",
    name: "Leda",
    hindiName: "कोमल (Komal)",
    badge: "Masoom ✨",
    tagline: "Youthful & Innocent",
    desc: "Ek pyari, masoom aur halki meethi aawaaz. Bilkul ek sweet, soft-spoken real girl jaisi baat-cheet.",
    recommended: false,
    languages: "Hindi • Hinglish • English",
    vibe: "Gentle, Soft & Innocent",
    icon: "✨",
  },
  {
    id: "Zephyr",
    name: "Zephyr",
    hindiName: "सुकून (Sukoon)",
    badge: "Whisper-Soft 🍃",
    tagline: "Calm & Intimate",
    desc: "Dheemi, shaant aur sukoon dene wali aawaaz. Raat ki baaton aur dil ke raaz share karne ke liye shandar.",
    recommended: false,
    languages: "Hindi • Hinglish • English",
    vibe: "Intimate, Whisper & Peaceful",
    icon: "🍃",
  },
  {
    id: "Callirrhoe",
    name: "Callirrhoe",
    hindiName: "प्यारी (Pyari)",
    badge: "Affectionate 💖",
    tagline: "Warm & Friendly",
    desc: "Garmahat bhari, cheerful aur supportive aawaaz. Ek caring best-friend ladki jo har baat samjhe.",
    recommended: false,
    languages: "Hindi • Hinglish • English",
    vibe: "Friendly, Caring & Cheerful",
    icon: "💖",
  },
  {
    id: "Despina",
    name: "Despina",
    hindiName: "नज़ाकत (Nazakat)",
    badge: "Graceful 🌺",
    tagline: "Elegant & Poetic",
    desc: "Tehzeeb aur adab se bhari graceful aawaaz. Poetry, shayari aur gehri baaton ke liye behad dilkash.",
    recommended: false,
    languages: "Hindi • Hinglish • English",
    vibe: "Graceful, Elegant & Gentle",
    icon: "🌺",
  },
];

export default function VoiceSelectorModal({
  assistantName,
  currentVoice = "Kore",
  onSelectVoice,
  onClose,
}: VoiceSelectorModalProps) {
  const [selectedVoice, setSelectedVoice] = useState(currentVoice || "Kore");
  const [isSaved, setIsSaved] = useState(false);

  const companionName = assistantName?.trim() || "Your companion";
  const activeVoiceObj = FEMALE_VOICES.find(v => v.id === selectedVoice) || FEMALE_VOICES[0];

  const handleApplyVoice = (voiceId: string) => {
    setSelectedVoice(voiceId);
    onSelectVoice(voiceId);
    setIsSaved(true);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  const handleConfirm = () => {
    onSelectVoice(selectedVoice);
    setIsSaved(true);
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
        className="w-full max-w-2xl bg-[#141620] border border-white/15 rounded-t-[28px] sm:rounded-3xl shadow-2xl shadow-black/95 flex flex-col max-h-[92dvh] sm:max-h-[88dvh] overflow-hidden relative"
      >
        {/* Mobile drag bar */}
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mt-2 sm:hidden shrink-0" />

        {/* Ambient background glows */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/10 blur-[100px] pointer-events-none rounded-full" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/10 blur-[100px] pointer-events-none rounded-full" />

        {/* 1. FIXED TOP HEADER */}
        <div className="shrink-0 px-4 py-3 sm:px-6 sm:py-3.5 border-b border-white/10 bg-[#161824] flex items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-500 flex items-center justify-center shadow-lg shadow-pink-500/20 shrink-0">
              <Volume2 className="text-white" size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-semibold text-white tracking-wide truncate">
                  Sweet Female Voices (मधुर आवाज़ें)
                </h2>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 shrink-0">
                  Only Female
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-white/50 truncate">
                Hindi, Hinglish & English me real Indian girl jaisi sweet aawaaz
              </p>
            </div>
          </div>

          {/* Touch-Friendly Close Button */}
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

        {/* 2. SCROLLABLE MIDDLE BODY (SCROLLS EASILY ON MOBILE, TAB & DESKTOP) */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-3.5 sm:p-5 space-y-3 relative z-10">
          {/* Recommendation Banner */}
          <div className="bg-gradient-to-r from-pink-500/15 to-violet-500/10 border border-pink-500/30 rounded-xl sm:rounded-2xl p-3 space-y-1 text-xs text-white/85">
            <div className="flex items-center gap-2 text-pink-300 font-medium">
              <Heart size={14} className="text-pink-400 fill-pink-400 shrink-0" />
              <span>दिल को छू लेने वाली मोहिनी आवाज़ (Sweet & Mohini):</span>
            </div>
            <p className="text-white/70 leading-relaxed text-[11px] sm:text-xs pl-5">
              <strong>Kore (मोहिनी)</strong> को विशेष रूप से बेहद मीठी, आत्मीय और दिल को छू लेने वाली बातचीत के लिए डिज़ाइन किया गया है। किसी भी आवाज़ पर टैप करके तुरंत बदलें।
            </p>
          </div>

          {/* Voices Responsive Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {FEMALE_VOICES.map((voice) => {
              const isSelected = selectedVoice === voice.id;
              return (
                <button
                  key={voice.id}
                  type="button"
                  onClick={() => handleApplyVoice(voice.id)}
                  className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between gap-2 active:scale-[0.99] ${
                    isSelected
                      ? "bg-pink-500/20 border-pink-500/70 shadow-lg shadow-pink-500/15 ring-1 ring-pink-500/40"
                      : "bg-black/40 border-white/10 hover:border-white/25 hover:bg-white/5"
                  }`}
                >
                  <div>
                    {/* Top Row: Name + Badges */}
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-semibold text-white">
                            {voice.name}
                          </span>
                          <span className="text-xs text-pink-300 font-medium">
                            • {voice.hindiName}
                          </span>
                        </div>
                        <span className="text-[10px] text-white/50 block">
                          {voice.tagline}
                        </span>
                      </div>

                      {isSelected ? (
                        <div className="flex items-center gap-1 text-[11px] text-pink-200 font-medium bg-pink-500/30 px-2 py-0.5 rounded-full border border-pink-500/40 shrink-0">
                          <Check size={12} className="stroke-[3]" />
                          <span>Active</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-white/40 hover:text-white/80 transition-colors shrink-0">
                          Tap to select
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-[11px] text-white/70 leading-relaxed line-clamp-2">
                      {voice.desc}
                    </p>
                  </div>

                  {/* Bottom Row: Language Support + Badge */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-white/40">
                    <span className="text-emerald-300/80 font-medium">
                      {voice.languages}
                    </span>
                    <span className="text-pink-300/90 font-medium">
                      {voice.badge}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. ALWAYS VISIBLE STICKY FOOTER (NATIVE APP STYLE) */}
        <div className="shrink-0 bg-[#161824] border-t border-white/10 px-4 py-3 sm:px-6 sm:py-3.5 flex items-center justify-between gap-3 safe-bottom z-20">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs text-white/50 hidden xs:inline">Selected:</span>
            <span className="text-xs sm:text-sm font-semibold text-pink-300 truncate">
              {activeVoiceObj.name} ({activeVoiceObj.hindiName})
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 sm:px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 text-white/70 hover:text-white text-xs sm:text-sm font-medium border border-white/10 transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-4 sm:px-5 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-pink-500/25 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              {isSaved ? (
                <>
                  <CheckCircle2 size={16} className="text-white" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Check size={15} className="stroke-[3]" />
                  <span>Save Voice</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
