import { motion } from "motion/react";

type VisualizerState = "idle" | "listening" | "processing" | "speaking";

interface VisualizerProps {
  state: VisualizerState;
}

export default function Visualizer({ state }: VisualizerProps) {
  // Config for the rings
  const getSpeed = () => {
    switch (state) {
      case "listening": return 2;
      case "processing": return 1;
      case "speaking": return 0.5;
      default: return 8; // idle
    }
  };

  const getCoreGlow = () => {
    switch (state) {
      case "listening": return "shadow-[0_0_80px_rgba(16,185,129,0.6)] bg-emerald-500"; // Greenish
      case "processing": return "shadow-[0_0_100px_rgba(6,182,212,0.8)] bg-cyan-400"; // Cyan
      case "speaking": return "shadow-[0_0_120px_rgba(236,72,153,0.8)] bg-pink-500"; // Pink
      default: return "shadow-[0_0_60px_rgba(59,130,246,0.4)] bg-blue-500"; // Dim blue
    }
  };

  const corePulse = () => {
    if (state === "speaking") return { scale: [1, 1.2, 0.9, 1.1, 1], transition: { duration: 0.5, repeat: Infinity } };
    if (state === "processing") return { scale: [0.95, 1.05, 0.95], transition: { duration: 0.8, repeat: Infinity } };
    if (state === "listening") return { scale: [1, 1.05, 1], transition: { duration: 1.5, repeat: Infinity } };
    return { scale: [1, 1.02, 1], transition: { duration: 4, repeat: Infinity } };
  };

  const speed = getSpeed();

  return (
    <div className="w-full h-full flex items-center justify-center relative [perspective:1000px]">
      {/* Outer subtle boundary circle */}
      <div className="absolute w-[280px] h-[280px] md:w-[350px] md:h-[350px] rounded-full border border-white/5" />

      {/* 3D Atom Container */}
      <div className="relative w-[240px] h-[240px] md:w-[300px] md:h-[300px] flex items-center justify-center [transform-style:preserve-3d]">
        
        {/* Ring 1 - Cyan */}
        <motion.div
          animate={{ rotateZ: 360 }}
          transition={{ duration: speed * 1.5, repeat: Infinity, ease: "linear" }}
          className="absolute w-full h-full rounded-full border-[3px] border-cyan-400/80 shadow-[0_0_15px_rgba(6,182,212,0.5)]"
          style={{ transform: "rotateX(75deg) rotateY(25deg)", transformStyle: "preserve-3d" }}
        />

        {/* Ring 2 - Red/Pink */}
        <motion.div
          animate={{ rotateZ: -360 }}
          transition={{ duration: speed * 1.8, repeat: Infinity, ease: "linear" }}
          className="absolute w-full h-full rounded-full border-[3px] border-pink-500/80 shadow-[0_0_15px_rgba(236,72,153,0.5)]"
          style={{ transform: "rotateX(75deg) rotateY(-45deg)", transformStyle: "preserve-3d" }}
        />

        {/* Ring 3 - Green/Emerald */}
        <motion.div
          animate={{ rotateZ: 360 }}
          transition={{ duration: speed * 2, repeat: Infinity, ease: "linear" }}
          className="absolute w-full h-full rounded-full border-[3px] border-emerald-400/80 shadow-[0_0_15px_rgba(52,211,153,0.5)]"
          style={{ transform: "rotateX(75deg) rotateY(85deg)", transformStyle: "preserve-3d" }}
        />

        {/* Ring 4 - Subtle White/Silver for extra depth */}
        <motion.div
          animate={{ rotateZ: -360 }}
          transition={{ duration: speed * 2.5, repeat: Infinity, ease: "linear" }}
          className="absolute w-[115%] h-[115%] rounded-full border-[1px] border-white/20"
          style={{ transform: "rotateX(80deg) rotateY(0deg)", transformStyle: "preserve-3d" }}
        />

        {/* Core Sphere */}
        <motion.div
          animate={corePulse()}
          className={`absolute w-[100px] h-[100px] md:w-[120px] md:h-[120px] rounded-full z-10 transition-colors duration-500 ease-in-out ${getCoreGlow()}`}
          style={{
            background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8) 0%, ${state === 'idle' ? '#1d4ed8' : 'transparent'} 40%, rgba(0,0,0,0.8) 100%)`,
          }}
        >
          {/* Inner core lighting effect */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/20 to-white/60 opacity-50" />
        </motion.div>
      </div>
    </div>
  );
}
