export interface UpdateItem {
  title: string;
  description: string;
  icon?: string;
  tag?: string;
}

export interface SpecificationItem {
  label: string;
  value: string;
  detail: string;
  badge?: string;
}

export interface VersionHistoryItem {
  version: string;
  build: string;
  date: string;
  time: string;
  title: string;
  changes: string[];
}

export interface VersionInfo {
  version: string;
  buildNumber: string;
  commitHash: string;
  environment: string;
  lastUpdatedDate: string;
  lastUpdatedTime: string;
  releaseTitle: string;
  badge: string;
  channel: string;
  specifications: SpecificationItem[];
  whatsNew: UpdateItem[];
  versionHistory: VersionHistoryItem[];
}

export const APP_VERSION_INFO: VersionInfo = {
  version: "v2.6.0",
  buildNumber: "2026.10.04.2-prod",
  commitHash: "rel-a982f4",
  environment: "Cloud Production (Live)",
  lastUpdatedDate: "October 4, 2026",
  lastUpdatedTime: "10:50 PM IST",
  releaseTitle: "Dedicated System Specification Engine & Decoupled Personalization",
  badge: "Live Stable 🚀",
  channel: "Production Release",
  specifications: [
    {
      label: "AI Model & Engine",
      value: "Gemini Live Multimodal API",
      detail: "Ultra-fast bidirectional streaming via WebSocket (RFC 6455)",
      badge: "Realtime",
    },
    {
      label: "Audio Streaming Architecture",
      value: "16-bit Linear PCM AudioWorklet",
      detail: "16,000 Hz input sampling, 24,000 Hz high-fidelity Float32 output",
      badge: "Full-Duplex",
    },
    {
      label: "Latency & Response Budget",
      value: "Zero-Lag (Budget = 0)",
      detail: "Thinking delay completely bypassed for instantaneous natural conversation",
      badge: "Instant",
    },
    {
      label: "Voice Persona Lock",
      value: "100% Locked Female Voice",
      detail: "Strict female timbre lock on Kore (मोहिनी), Aoede (सुरीली) and Leda",
      badge: "Sweet Tone",
    },
    {
      label: "Background Media Sync",
      value: "Session-Bound Lifecycle",
      detail: "Video runs strictly while assistant is active; pauses & resets on idle",
      badge: "Smart Sync",
    },
    {
      label: "Turn-Taking & Interruption",
      value: "250ms Fast VAD Engine",
      detail: "Adaptive Voice Activity Detection with natural conversational barge-in",
      badge: "Adaptive",
    },
  ],
  whatsNew: [
    {
      title: "Isolated System Specification Section (अलग स्पेसिफिकेशन सेक्शन)",
      description: "Personalised Settings ko ekdum clean kar diya gaya hai. Version, update timings aur technical details ab kewal aur kewal is dedicated 'Specification & Updates' section me hain.",
      icon: "🎯",
      tag: "Architectural",
    },
    {
      title: "Real-time Semantic Version Progression (वास्तविक वर्ज़न वृद्धि)",
      description: "Version ko v2.5.0 se badha kar v2.6.0 kar diya gaya hai (Build 2026.10.04.2). Har naye update aur feature par version realistically badhta rahega.",
      icon: "📈",
      tag: "Core",
    },
    {
      title: "Background Video Lifecycle Synchronization (वीडियो सिंक फिक्स)",
      description: "Upload ki gayi video ab bewajah loop me nahi chalegi. Jab aap assistant ko bolne ke liye start karenge tabhi video start hogi, aur assistant band hone par video turant pause ho jayegi.",
      icon: "🎥",
      tag: "Media",
    },
    {
      title: "Zero-Wait Instant Voice Flow (तुरंत बिना अटके रिप्लाई)",
      description: "Thinking budget ko 0 karke 250ms VAD activate kiya hai jisse assistant 'Replying...' par bina aawaaz ke phasa nahi rahega.",
      icon: "⚡",
      tag: "Performance",
    },
    {
      title: "Permanent Female Voice Tone Guarantee",
      description: "Hindi aur Hinglish me kabhi bhi purush ya robotic aawaaz me shift nahi hoga.",
      icon: "🌸",
      tag: "Voice",
    },
  ],
  versionHistory: [
    {
      version: "v2.6.0",
      build: "2026.10.04.2-prod",
      date: "October 4, 2026",
      time: "10:50 PM IST",
      title: "Dedicated Specification Section & Decoupled Personalization",
      changes: [
        "Removed version details from Personalised Settings modal",
        "Created dedicated 'Specification & Version' section in menu & header",
        "Implemented realistic semantic version progression (v2.6.0)",
        "Added comprehensive Technical System Specifications overview",
      ],
    },
    {
      version: "v2.5.0",
      build: "2026.10.04.1-prod",
      date: "October 4, 2026",
      time: "09:25 PM IST",
      title: "Smart Video Sync & Lightning Conversational Flow",
      changes: [
        "Smart Background video playback synchronized strictly to assistant active session",
        "Thinking delay bypassed (thinkingBudget: 0) for zero-wait speech output",
        "Continuous 16-bit PCM Audio Chunk alignment to eliminate sound distortion",
        "Female voice persona lock for Kore and Aoede",
      ],
    },
    {
      version: "v2.4.0",
      build: "2026.09.29.3-prod",
      date: "September 29, 2026",
      time: "07:15 PM IST",
      title: "Female Voice Safeguard & Activity Detection Tuning",
      changes: [
        "Voice sanitization and persona enforcement",
        "Activity Handling tuning with 250ms VAD trigger",
        "ErrorBoundary stability improvements",
      ],
    },
    {
      version: "v2.0.0",
      build: "2026.09.20.1-prod",
      date: "September 20, 2026",
      time: "03:40 PM IST",
      title: "Gemini Live API Bidirectional Audio & Custom Video Backgrounds",
      changes: [
        "Integration of Gemini 3.8 Live API WebSocket",
        "Custom video wallpaper upload and loop canvas",
        "Progressive Web App installation capabilities",
      ],
    },
    {
      version: "v1.0.0",
      build: "2026.09.01.1-prod",
      date: "September 1, 2026",
      time: "12:00 PM IST",
      title: "Initial AI Companion Assistant Release",
      changes: [
        "Foundational conversational assistant interface",
        "Audio visualization and customizable prompt personas",
      ],
    },
  ],
};
