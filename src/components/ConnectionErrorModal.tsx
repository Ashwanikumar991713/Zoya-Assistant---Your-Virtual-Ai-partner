import React from "react";
import { motion } from "motion/react";
import { AlertCircle, RefreshCw, MessageSquare, Key, Settings } from "lucide-react";

interface ConnectionErrorModalProps {
  error: {
    message: string;
    isFatal?: boolean;
    reason?: string;
  } | null;
  onClose: () => void;
  onOpenSettings: () => void;
  onRetry: () => void;
  onOpenTextChat?: () => void;
  assistantName?: string;
}

export default function ConnectionErrorModal({
  error,
  onClose,
  onOpenSettings,
  onRetry,
  onOpenTextChat,
  assistantName = "Assistant",
}: ConnectionErrorModalProps) {
  if (!error) return null;

  const isKeyOrConfigIssue =
    error.isFatal ||
    (error.message || "").toLowerCase().includes("api key") ||
    (error.reason || "").toLowerCase().includes("api key") ||
    (error.message || "").toLowerCase().includes("missing");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-md bg-[#141622] border border-red-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden text-center"
      >
        {/* Top ambient glow */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-500 via-amber-500 to-rose-500" />
        <div className="absolute top-[-40px] right-[-40px] w-36 h-36 bg-red-500/15 blur-3xl pointer-events-none rounded-full" />

        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto mb-4 text-red-400 shadow-lg shadow-red-500/10">
          <AlertCircle size={30} />
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-white mb-1.5 tracking-wide">
          {isKeyOrConfigIssue ? "API Key / Server Config" : "Connection Notice (कनेक्शन सूचना)"}
        </h3>

        <p className="text-xs text-white/50 mb-4">
          {assistantName} Live Server से कनेक्ट नहीं हो पा रही है
        </p>

        {/* Error message card */}
        <div className="bg-black/50 border border-white/10 rounded-2xl p-4 text-left space-y-2 mb-5">
          <p className="text-xs sm:text-sm text-white/90 leading-relaxed">
            {error.message}
          </p>

          {error.reason && (
            <div className="pt-2 border-t border-white/5 flex items-start gap-1.5 text-[11px] text-white/40 font-mono break-all">
              <span className="text-red-400 shrink-0 font-semibold">Server:</span>
              <span>{error.reason}</span>
            </div>
          )}
        </div>

        {/* Helper instruction */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-left mb-6 text-[11px] text-white/70 leading-relaxed">
          💡 <strong>सुझाव:</strong> अगर सर्वर पर API Key सेट नहीं है, तो <strong>"Open Settings"</strong> दबाकर अपनी Gemini API Key paste करें, या <strong>"Retry Connection"</strong> दबाएं।
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 w-full">
          <div className="flex items-center gap-2 w-full">
            <button
              onClick={() => {
                onClose();
                onRetry();
              }}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-cyan-600/25 active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw size={16} />
              <span>Retry</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenSettings();
              }}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-pink-600/25 active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Settings size={16} />
              <span>Settings</span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full">
            {onOpenTextChat && (
              <button
                onClick={() => {
                  onClose();
                  onOpenTextChat();
                }}
                className="flex-1 py-2.5 px-3 bg-white/10 hover:bg-white/15 text-white/80 hover:text-white font-medium text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <MessageSquare size={14} className="text-cyan-400" />
                <span>Text Chat</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="flex-1 py-2.5 px-3 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white font-medium text-xs rounded-xl transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
