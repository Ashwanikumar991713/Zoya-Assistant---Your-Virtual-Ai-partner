import React, { useState, useEffect } from "react";
import { 
  Cpu, 
  Sparkles, 
  Calendar, 
  Clock, 
  X, 
  History, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Radio, 
  Terminal, 
  RefreshCw,
  ArrowRight,
  ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { APP_VERSION_INFO } from "../version";
import { checkServerForUpdates, reloadAndApplyUpdate, UpdateCheckResult } from "../services/updateService";

interface SpecificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SpecificationModal({ isOpen, onClose }: SpecificationModalProps) {
  const [activeTab, setActiveTab] = useState<"version" | "specs" | "history">("version");
  const [expandedHistory, setExpandedHistory] = useState<string | null>(APP_VERSION_INFO.version);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null);

  // Auto-check live updates in background when modal is opened
  useEffect(() => {
    if (isOpen) {
      handleCheckForUpdates();
    }
  }, [isOpen]);

  const handleCheckForUpdates = async () => {
    setIsCheckingUpdate(true);
    try {
      const res = await checkServerForUpdates();
      setUpdateResult(res);
    } catch {
      // ignore
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-2xl max-h-[92vh] flex flex-col bg-[#12141F] border border-cyan-500/25 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-1/4 w-72 h-32 bg-cyan-500/15 blur-3xl pointer-events-none rounded-full" />
        <div className="absolute top-0 left-1/4 w-72 h-32 bg-violet-500/10 blur-3xl pointer-events-none rounded-full" />

        {/* Modal Header */}
        <div className="shrink-0 px-5 py-4 border-b border-white/10 flex items-center justify-between relative z-10 bg-[#161826]/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/30 flex items-center justify-center text-cyan-300 shadow-md">
              <Cpu size={20} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  Specification & Version Details
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold">
                  {APP_VERSION_INFO.version}
                </span>
              </div>
              <p className="text-[11px] text-white/50">
                सिस्टम विनिर्देश, ऑटोमेटेड वर्ज़न पाइपलाइन एवं अपडेट रिकॉर्ड
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="shrink-0 px-5 pt-3 pb-2 border-b border-white/5 flex gap-2 bg-[#141624]">
          <button
            onClick={() => setActiveTab("version")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "version"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent"
            }`}
          >
            <Sparkles size={14} className={activeTab === "version" ? "text-cyan-400" : ""} />
            <span>Version & What's New</span>
          </button>

          <button
            onClick={() => setActiveTab("specs")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "specs"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent"
            }`}
          >
            <Terminal size={14} className={activeTab === "specs" ? "text-cyan-400" : ""} />
            <span>System Specifications</span>
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "history"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent"
            }`}
          >
            <History size={14} className={activeTab === "history" ? "text-cyan-400" : ""} />
            <span>Version History ({APP_VERSION_INFO.versionHistory.length})</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-white/90">
          
          {/* TAB 1: VERSION & WHAT'S NEW */}
          {activeTab === "version" && (
            <div className="space-y-4">

              {/* Live Update Bar */}
              <div className="bg-[#181C2B] border border-white/10 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                    <RefreshCw size={15} className={isCheckingUpdate ? "animate-spin" : ""} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white">
                        {updateResult?.status === "update-available" ? "🎉 New Live Update Available!" : "Live Auto-Update Pipeline"}
                      </span>
                      {updateResult?.checkedAt && (
                        <span className="text-[10px] text-white/40">
                          Checked at {updateResult.checkedAt}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-white/60">
                      {updateResult?.status === "update-available"
                        ? `Live version ${updateResult.latestVersion} is deployed. Reload to apply.`
                        : "App is running latest verified build. Automatically tracks code deployments."}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {updateResult?.status === "update-available" ? (
                    <button
                      onClick={reloadAndApplyUpdate}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-600/30"
                    >
                      <span>Reload & Apply</span>
                      <ArrowRight size={13} />
                    </button>
                  ) : (
                    <button
                      onClick={handleCheckForUpdates}
                      disabled={isCheckingUpdate}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 text-cyan-300 border border-cyan-500/30 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw size={12} className={isCheckingUpdate ? "animate-spin" : ""} />
                      <span>{isCheckingUpdate ? "Checking..." : "Check for Updates"}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Primary Release Hero Card */}
              <div className="bg-gradient-to-br from-[#191D2E] via-[#141724] to-[#0F111B] border border-cyan-500/30 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
                        {APP_VERSION_INFO.version}
                      </span>
                      <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        {APP_VERSION_INFO.badge}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                        {APP_VERSION_INFO.channel}
                      </span>
                    </div>
                    <div className="text-xs sm:text-sm font-medium text-white/80 mt-1">
                      {APP_VERSION_INFO.releaseTitle}
                    </div>
                  </div>

                  <div className="self-start sm:self-auto bg-black/40 border border-white/5 px-3 py-2 rounded-xl text-right">
                    <div className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Build ID</div>
                    <div className="font-mono text-xs text-cyan-300">{APP_VERSION_INFO.buildNumber}</div>
                  </div>
                </div>

                {/* Date & Time Badges */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                  <div className="flex items-center gap-3 bg-black/40 border border-white/5 p-3 rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-pink-400 shrink-0">
                      <Calendar size={16} />
                    </div>
                    <div>
                      <div className="text-[10px] text-white/40 leading-none mb-1">Last Update Date</div>
                      <div className="text-xs sm:text-sm font-semibold text-white">
                        {APP_VERSION_INFO.lastUpdatedDate}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-black/40 border border-white/5 p-3 rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                      <Clock size={16} />
                    </div>
                    <div>
                      <div className="text-[10px] text-white/40 leading-none mb-1">Last Update Time</div>
                      <div className="text-xs sm:text-sm font-semibold text-white font-mono">
                        {APP_VERSION_INFO.lastUpdatedTime}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* What's New In This Version */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-cyan-300">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-cyan-400" />
                    <span>What's New in {APP_VERSION_INFO.version} (इस अपडेट के मुख्य बदलाव):</span>
                  </div>
                  <span className="text-[11px] text-white/40 font-mono font-normal">
                    {APP_VERSION_INFO.whatsNew.length} Features Added
                  </span>
                </div>

                <div className="space-y-2">
                  {APP_VERSION_INFO.whatsNew.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-black/30 border border-white/5 hover:border-cyan-500/30 p-3 rounded-xl transition-all space-y-1 group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-white group-hover:text-cyan-200 transition-colors">
                          <span className="text-base shrink-0">{item.icon || "✨"}</span>
                          <span>{item.title}</span>
                        </div>
                        {item.tag && (
                          <span className="text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-white/5 text-white/60 border border-white/10 shrink-0">
                            {item.tag}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/70 leading-relaxed pl-6">
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SYSTEM SPECIFICATIONS */}
          {activeTab === "specs" && (
            <div className="space-y-4">
              <div className="text-xs text-white/50 leading-relaxed">
                यह असिस्टेंट वास्तविक समय में अत्याधुनिक जेमिनी मल्टीमॉडल लाइव आर्किटेक्चर एवं शून्य-लेटेंसी ऑडियो पाइपलाइन पर संचालित होता है:
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {APP_VERSION_INFO.specifications.map((spec, idx) => (
                  <div
                    key={idx}
                    className="bg-gradient-to-br from-[#161826] to-[#12131F] border border-white/5 hover:border-cyan-500/30 p-3.5 rounded-xl space-y-1.5 transition-colors shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-white/50 font-medium uppercase tracking-wider">
                        {spec.label}
                      </span>
                      {spec.badge && (
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/25">
                          {spec.badge}
                        </span>
                      )}
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-white">
                      {spec.value}
                    </div>
                    <div className="text-[11px] text-white/60 leading-relaxed">
                      {spec.detail}
                    </div>
                  </div>
                ))}
              </div>

              {/* Status and Environment Diagnostics */}
              <div className="bg-black/40 border border-white/10 rounded-xl p-3.5 space-y-2">
                <div className="text-[11px] font-semibold text-white/70 flex items-center gap-2">
                  <Radio size={14} className="text-emerald-400" />
                  <span>Live System Diagnostics & Status</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="bg-white/5 p-2 rounded-lg">
                    <span className="text-white/40 block text-[10px]">Environment</span>
                    <span className="text-emerald-300 font-medium">Production Live</span>
                  </div>
                  <div className="bg-white/5 p-2 rounded-lg">
                    <span className="text-white/40 block text-[10px]">Release System</span>
                    <span className="text-cyan-300 font-medium">Automated Pipeline</span>
                  </div>
                  <div className="bg-white/5 p-2 rounded-lg">
                    <span className="text-white/40 block text-[10px]">VAD Latency</span>
                    <span className="text-amber-300 font-medium font-mono">250ms Trigger</span>
                  </div>
                  <div className="bg-white/5 p-2 rounded-lg">
                    <span className="text-white/40 block text-[10px]">Video Sync Hook</span>
                    <span className="text-pink-300 font-medium">Active (Idle Safe)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: COMPLETE VERSION HISTORY */}
          {activeTab === "history" && (
            <div className="space-y-3">
              <div className="text-xs text-white/50">
                हर अपडेट पर वर्ज़न नंबर, रिलीज़ दिनांक और बदलाव का पूरा इतिहास:
              </div>

              <div className="space-y-2.5">
                {APP_VERSION_INFO.versionHistory.map((hist) => {
                  const isCurrent = hist.version === APP_VERSION_INFO.version;
                  const isExpanded = expandedHistory === hist.version;

                  return (
                    <div
                      key={hist.version}
                      className={`border rounded-xl transition-all overflow-hidden ${
                        isCurrent
                          ? "bg-[#181B2C] border-cyan-500/40 shadow-lg"
                          : "bg-black/30 border-white/5"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedHistory(isExpanded ? null : hist.version)}
                        className="w-full p-3.5 text-left flex items-center justify-between gap-3 hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="text-sm font-bold text-white font-mono">
                            {hist.version}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                              Current Active
                            </span>
                          )}
                          <span className="text-xs text-white/80 font-medium">
                            {hist.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[11px] text-white/40 hidden sm:inline">
                            {hist.date}
                          </span>
                          {isExpanded ? <ChevronUp size={16} className="text-white/60" /> : <ChevronDown size={16} className="text-white/60" />}
                        </div>
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="px-3.5 pb-3.5 pt-1 border-t border-white/5 space-y-2 bg-black/20"
                          >
                            <div className="flex items-center justify-between text-[10px] text-white/40 pt-1">
                              <span>Build: <span className="font-mono text-cyan-300">{hist.build}</span></span>
                              <span>Released on {hist.date} at {hist.time}</span>
                            </div>

                            <ul className="space-y-1.5 pt-1">
                              {hist.changes.map((ch, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-xs text-white/70">
                                  <CheckCircle2 size={13} className="text-cyan-400 mt-0.5 shrink-0" />
                                  <span>{ch}</span>
                                </li>
                              ))}
                            </ul>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="shrink-0 bg-[#161826] border-t border-white/10 px-5 py-3 flex items-center justify-between text-xs text-white/50">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Automated Build Pipeline Active</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white font-medium text-xs transition-colors cursor-pointer"
          >
            Close Details
          </button>
        </div>

      </motion.div>
    </div>
  );
}
