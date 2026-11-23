import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ExternalLink,
  X,
  CheckCircle2,
  Edit3,
  MessageCircle,
  Play,
  Music,
  Search,
  Globe,
  ShieldCheck,
} from "lucide-react";
import {
  VoiceActionEvent,
  PendingWhatsAppVerification,
  normalizePhoneDigits,
  formatPhoneForDisplay,
  formatPhoneForSpeech,
  buildWhatsAppUrl,
} from "../services/voiceActions";

interface VoiceActionOverlayProps {
  activeAction: VoiceActionEvent | null;
  pendingWhatsApp: PendingWhatsAppVerification | null;
  onDismissAction: () => void;
  onConfirmWhatsApp: (updated: PendingWhatsAppVerification) => void;
  onCancelWhatsApp: () => void;
  onUpdatePendingWhatsApp: (updated: PendingWhatsAppVerification) => void;
}

export default function VoiceActionOverlay({
  activeAction,
  pendingWhatsApp,
  onDismissAction,
  onConfirmWhatsApp,
  onCancelWhatsApp,
  onUpdatePendingWhatsApp,
}: VoiceActionOverlayProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editPhone, setEditPhone] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const [editError, setEditError] = useState("");

  useEffect(() => {
    if (pendingWhatsApp) {
      setEditPhone(pendingWhatsApp.displayPhone);
      setEditMessage(pendingWhatsApp.message);
      setEditError("");
      setIsEditing(false);
    }
  }, [pendingWhatsApp?.id, pendingWhatsApp?.digits, pendingWhatsApp?.message]);

  const handleSaveEdit = () => {
    if (!pendingWhatsApp) return;
    const digits = normalizePhoneDigits(editPhone);
    const trimmedMessage = editMessage.trim();
    if (digits.length < 10 || digits.length > 15) {
      setEditError("Kripya sahi 10-digit mobile number ya country code ke sath number daalein.");
      return;
    }
    if (!trimmedMessage) {
      setEditError("Message khali nahi ho sakta.");
      return;
    }
    const updated: PendingWhatsAppVerification = {
      ...pendingWhatsApp,
      digits,
      displayPhone: formatPhoneForDisplay(digits),
      spokenDigits: formatPhoneForSpeech(digits),
      message: trimmedMessage,
      url: buildWhatsAppUrl(digits, trimmedMessage),
    };
    onUpdatePendingWhatsApp(updated);
    setEditError("");
    setIsEditing(false);
  };

  const getCategoryMeta = (category: VoiceActionEvent["category"]) => {
    switch (category) {
      case "youtube":
        return {
          icon: <Play size={18} className="text-red-400 fill-red-400/20" />,
          border: "border-red-500/30",
          badgeBg: "bg-red-500/15 text-red-300",
          btnBg: "bg-red-500 hover:bg-red-600 text-white",
          label: "YouTube",
        };
      case "spotify":
        return {
          icon: <Music size={18} className="text-emerald-400" />,
          border: "border-emerald-500/30",
          badgeBg: "bg-emerald-500/15 text-emerald-300",
          btnBg: "bg-emerald-500 hover:bg-emerald-600 text-black font-semibold",
          label: "Spotify",
        };
      case "search":
        return {
          icon: <Search size={18} className="text-sky-400" />,
          border: "border-sky-500/30",
          badgeBg: "bg-sky-500/15 text-sky-300",
          btnBg: "bg-sky-500 hover:bg-sky-600 text-white",
          label: "Google",
        };
      case "whatsapp":
        return {
          icon: <MessageCircle size={18} className="text-green-400" />,
          border: "border-green-500/35",
          badgeBg: "bg-green-500/15 text-green-300",
          btnBg: "bg-green-500 hover:bg-green-600 text-black font-semibold",
          label: "WhatsApp Web",
        };
      default:
        return {
          icon: <Globe size={18} className="text-violet-400" />,
          border: "border-violet-500/30",
          badgeBg: "bg-violet-500/15 text-violet-300",
          btnBg: "bg-violet-500 hover:bg-violet-600 text-white",
          label: "Browser",
        };
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-28 md:bottom-32 z-40 flex flex-col items-center gap-3 px-4 pointer-events-none">
      <AnimatePresence mode="wait">
        {pendingWhatsApp && (
          <motion.div
            key={`wa-verify-${pendingWhatsApp.id}`}
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="pointer-events-auto w-full max-w-md rounded-2xl bg-[#141720]/95 backdrop-blur-xl border border-emerald-500/40 shadow-2xl shadow-emerald-950/50 p-4 text-left"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <ShieldCheck size={19} className="text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white leading-tight">
                    Verify WhatsApp Number
                  </h3>
                  <p className="text-[11px] text-emerald-300/80">
                    Bhejne se pehle number confirm karein
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title="Edit number or message"
                  >
                    <Edit3 size={15} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onCancelWhatsApp}
                  className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Cancel"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {isEditing ? (
              <div className="space-y-2.5 mb-3">
                <div>
                  <label className="block text-[11px] text-white/60 mb-1">
                    Phone Number (with country code or 10 digits)
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full rounded-xl bg-black/40 border border-white/15 px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-emerald-400"
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-white/60 mb-1">
                    WhatsApp Message
                  </label>
                  <textarea
                    rows={2}
                    value={editMessage}
                    onChange={(e) => setEditMessage(e.target.value)}
                    className="w-full rounded-xl bg-black/40 border border-white/15 px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-400 resize-none"
                    placeholder="Message text..."
                  />
                </div>
                {editError && (
                  <p className="text-xs text-rose-400">{editError}</p>
                )}
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditPhone(pendingWhatsApp.displayPhone);
                      setEditMessage(pendingWhatsApp.message);
                      setEditError("");
                      setIsEditing(false);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs text-white/70 hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    Cancel Edit
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-500 hover:bg-emerald-600 text-black transition-colors cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-black/35 border border-white/10 p-3 mb-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] uppercase tracking-wider text-white/45">
                    {pendingWhatsApp.recipientName
                      ? `To: ${pendingWhatsApp.recipientName}`
                      : "Recipient Number"}
                  </span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                    Pending Verify
                  </span>
                </div>
                <div className="text-lg font-mono font-semibold tracking-wide text-emerald-300">
                  {pendingWhatsApp.displayPhone}
                </div>
                <div className="text-xs text-white/85 bg-white/5 rounded-lg px-2.5 py-2 border border-white/5 break-words">
                  “{pendingWhatsApp.message}”
                </div>
              </div>
            )}

            {!isEditing && (
              <>
                <p className="text-[11px] text-white/55 mb-3">
                  Voice se bol kar confirm karein:{" "}
                  <span className="text-emerald-300 font-medium">
                    &ldquo;Haan, sahi hai&rdquo;
                  </span>{" "}
                  ya neeche button dabayein.
                </p>
                <div className="flex items-center gap-2">
                  <a
                    href={pendingWhatsApp.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onConfirmWhatsApp(pendingWhatsApp)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-xs transition-colors shadow-lg shadow-emerald-500/20"
                  >
                    <CheckCircle2 size={15} />
                    <span>Confirm & Open WhatsApp</span>
                    <ExternalLink size={13} />
                  </a>
                  <button
                    type="button"
                    onClick={onCancelWhatsApp}
                    className="py-2.5 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/75 text-xs font-medium border border-white/10 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {activeAction && !pendingWhatsApp && (
          <motion.div
            key={`voice-action-${activeAction.id}`}
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className={`pointer-events-auto w-full max-w-md rounded-2xl bg-[#141720]/95 backdrop-blur-xl border ${getCategoryMeta(activeAction.category).border} shadow-2xl p-3.5 flex items-center gap-3`}
          >
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
              {getCategoryMeta(activeAction.category).icon}
            </div>

            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-white truncate">
                  {activeAction.title}
                </p>
              </div>
              <p className="text-xs text-white/60 truncate">
                {activeAction.subtitle}
              </p>
              <p className="text-[10px] text-white/40 mt-0.5">
                Auto-open block ho toh Open button par tap karein
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <a
                href={activeAction.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors shadow-md ${getCategoryMeta(activeAction.category).btnBg}`}
              >
                <span>Open</span>
                <ExternalLink size={13} />
              </a>
              <button
                type="button"
                onClick={onDismissAction}
                className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Dismiss"
              >
                <X size={15} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
