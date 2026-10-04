export interface UpdateItem {
  title: string;
  description: string;
  icon?: string;
}

export interface VersionInfo {
  version: string;
  buildNumber: string;
  lastUpdatedDate: string;
  lastUpdatedTime: string;
  releaseTitle: string;
  badge: string;
  whatsNew: UpdateItem[];
  previousUpdates?: {
    version: string;
    date: string;
    summary: string;
  }[];
}

export const APP_VERSION_INFO: VersionInfo = {
  version: "v2.5.0",
  buildNumber: "2026.10.04.1",
  lastUpdatedDate: "October 4, 2026",
  lastUpdatedTime: "09:25 PM IST",
  releaseTitle: "Smart Video Sync & Lightning Conversational Flow",
  badge: "Latest Stable 🚀",
  whatsNew: [
    {
      title: "Smart Video Playback Sync (स्मार्ट वीडियो सिंक)",
      description: "Background video ab sirf tabhi chalegi jab aap assistant se baat shuru karenge (active session). Assistant ke stop hone par video turant pause/stop ho jayegi.",
      icon: "🎥",
    },
    {
      title: "Zero-Latency Instant Replies (तुरंत जवाब बिना अटके)",
      description: "Thinking delay ko disable karke 250ms ultra-fast VAD turn taking activate kiya gaya hai, jisse 'Replying...' par bina bole phanse rehne ki samasya khatam ho gayi.",
      icon: "⚡",
    },
    {
      title: "100% Female Voice Lock (हमेशा मीठी फीमेल आवाज़)",
      description: "Kore (मोहिनी) aur Aoede (सुरीली) par strict female voice lock laga diya gaya hai. Ab Hindi, Hinglish ya English me kabhi bhi achanak male/robotic aawaaz nahi aayegi.",
      icon: "🌸",
    },
    {
      title: "Crystal Clear 16-bit PCM Audio Engine",
      description: "Audio chunks me residual byte alignment lagaya gaya hai jisse sound kabhi distort ya pitch drop nahi hoga aur baaton ka flow ekdum human jaisa natural rahega.",
      icon: "🎵",
    },
    {
      title: "Version & Update History Tracker (अपडेट और वर्ज़न ट्रैकर)",
      description: "Settings ke andar current version, update timing/date aur 'kya kya naya update hua' dekhne ka dedicated panel shuru kiya gaya hai.",
      icon: "📋",
    },
  ],
  previousUpdates: [
    {
      version: "v2.4.0",
      date: "September 29, 2026",
      summary: "Female voice sanitization, automatic Activity Detection tuning, and ErrorBoundary hardening.",
    },
    {
      version: "v2.0.0",
      date: "September 2026",
      summary: "Gemini 3.8 Live API bidirectional duplex audio, custom background video, and PWA support.",
    },
  ],
};
