const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function computeSrcHash() {
  const hash = crypto.createHash('sha256');
  const srcDir = path.resolve(__dirname, '../src');

  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    // Sort to guarantee deterministic hash
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && !entry.name.endsWith('version.ts') && !entry.name.endsWith('releases.json')) {
        const content = fs.readFileSync(fullPath);
        hash.update(entry.name);
        hash.update(content);
      }
    }
  }

  walk(srcDir);
  return hash.digest('hex').slice(0, 8);
}

function bumpPatchVersion(versionStr) {
  const clean = (versionStr || 'v2.6.1').replace(/^v/, '');
  const parts = clean.split('.').map(n => parseInt(n, 10) || 0);
  while (parts.length < 3) parts.push(0);
  parts[2] += 1;
  return `v${parts[0]}.${parts[1]}.${parts[2]}`;
}

function generate() {
  const releasesPath = path.resolve(__dirname, '../src/data/releases.json');
  const buildStatePath = path.resolve(__dirname, '../.build-state.json');
  const packageJsonPath = path.resolve(__dirname, '../package.json');

  let state = { lastHash: '', version: 'v2.6.1', buildCount: 1 };
  if (fs.existsSync(buildStatePath)) {
    try {
      state = JSON.parse(fs.readFileSync(buildStatePath, 'utf8'));
    } catch (e) {
      // fallback
    }
  }

  const srcHash = computeSrcHash();
  const isForceBump = process.argv.includes('--bump');
  const hasCodeChanged = isForceBump || (state.lastHash && state.lastHash !== srcHash);

  let currentVersion = state.version || 'v2.6.1';
  let buildCount = state.buildCount || 1;

  if (hasCodeChanged) {
    currentVersion = bumpPatchVersion(currentVersion);
    buildCount += 1;
    console.log(`[AutoVersion] Code change detected (hash: ${state.lastHash} -> ${srcHash}). Auto-bumping version to ${currentVersion}`);
  } else {
    console.log(`[AutoVersion] No code changes detected. Maintaining version ${currentVersion} (hash: ${srcHash})`);
  }

  const now = new Date();
  const dateOptions = { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Kolkata' };
  const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' };
  
  const currentDate = now.toLocaleDateString('en-US', dateOptions);
  const currentTime = now.toLocaleTimeString('en-US', timeOptions) + ' IST';
  const dateCompact = now.toISOString().slice(0, 10).replace(/-/g, '.');
  const buildId = `${dateCompact}.${buildCount}-${srcHash}`;

  // Read / update releases.json
  let releases = [];
  if (fs.existsSync(releasesPath)) {
    try {
      releases = JSON.parse(fs.readFileSync(releasesPath, 'utf8'));
    } catch (e) {}
  }

  // Find or insert the currentVersion in releases ledger
  let existingIndex = releases.findIndex(r => r.version === currentVersion);
  if (existingIndex === -1) {
    // Add new release at the top
    const newReleaseEntry = {
      version: currentVersion,
      build: buildId,
      date: currentDate,
      time: currentTime,
      title: "Automated Release & Live Synchronization Update",
      badge: "Latest Live 🚀",
      channel: "Production Release",
      whatsNew: [
        {
          title: "Automated Version Engine (ऑटो-वर्ज़न इंक्रीमेंट)",
          description: `कोड में नए बदलाव होते ही सिस्टम स्वतः वर्ज़न को ${currentVersion} पर अपडेट करता है।`,
          icon: "🚀",
          tag: "Auto-Build"
        },
        {
          title: "Clean Minimal UI (क्लीन मेन स्क्रीन)",
          description: "मेन स्क्रीन को बिना किसी अनावश्‍यक बैज के क्लीन और फ़ास्ट रखा गया है।",
          icon: "✨",
          tag: "UI/UX"
        },
        {
          title: "Instant Live Updates (लाइव अपडेट चेकर)",
          description: "Specification में Check for Updates बटन से नए वर्ज़न तुरंत डिटेक्ट और रीलोड होते हैं।",
          icon: "🔄",
          tag: "Live"
        }
      ],
      changes: [
        `Automated version increment to ${currentVersion} on code build`,
        `Build timestamp updated to ${currentTime} on ${currentDate}`,
        `Content hash generated: ${srcHash}`
      ]
    };
    releases.unshift(newReleaseEntry);
  } else {
    // Update existing release with newest build, time and date
    releases[existingIndex].build = buildId;
    releases[existingIndex].date = currentDate;
    releases[existingIndex].time = currentTime;
  }

  // Update releases.json
  fs.writeFileSync(releasesPath, JSON.stringify(releases, null, 2), 'utf8');

  // Update .build-state.json
  state.lastHash = srcHash;
  state.version = currentVersion;
  state.buildCount = buildCount;
  fs.writeFileSync(buildStatePath, JSON.stringify(state, null, 2), 'utf8');

  // Update package.json version
  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      pkg.version = currentVersion.replace(/^v/, '');
      fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2), 'utf8');
    } catch (e) {}
  }

  const latest = releases[0];

  const specifications = [
    {
      label: "AI Model & Engine",
      value: "Gemini Live Multimodal API",
      detail: "Ultra-fast bidirectional streaming via WebSocket (RFC 6455)",
      badge: "Realtime"
    },
    {
      label: "Audio Streaming Architecture",
      value: "16-bit Linear PCM AudioWorklet",
      detail: "16,000 Hz input sampling, 24,000 Hz high-fidelity Float32 output",
      badge: "Full-Duplex"
    },
    {
      label: "Latency & Response Budget",
      value: "Zero-Lag (Budget = 0)",
      detail: "Thinking delay completely bypassed for instantaneous natural conversation",
      badge: "Instant"
    },
    {
      label: "Voice Persona Lock",
      value: "100% Locked Female Voice",
      detail: "Strict female timbre lock on Kore (मोहिनी), Aoede (सुरीली) and Leda",
      badge: "Sweet Tone"
    },
    {
      label: "Background Media Sync",
      value: "Session-Bound Lifecycle",
      detail: "Video runs strictly while assistant is active; pauses & resets on idle",
      badge: "Smart Sync"
    },
    {
      label: "Turn-Taking & Interruption",
      value: "250ms Fast VAD Engine",
      detail: "Adaptive Voice Activity Detection with natural conversational barge-in",
      badge: "Adaptive"
    }
  ];

  const buildMeta = {
    version: latest.version,
    buildNumber: latest.build,
    commitHash: srcHash,
    buildTimestamp: now.toISOString(),
    lastUpdatedDate: latest.date,
    lastUpdatedTime: latest.time,
    releaseTitle: latest.title,
    badge: latest.badge || "Latest Live 🚀",
    channel: latest.channel || "Production Release",
    environment: "Cloud Production (Live)",
    whatsNew: latest.whatsNew || [],
    specifications,
    versionHistory: releases.map(r => ({
      version: r.version,
      build: r.build,
      date: r.date,
      time: r.time,
      title: r.title,
      changes: r.changes || []
    }))
  };

  // 1. Write public/build-meta.json
  const publicDir = path.resolve(__dirname, '../public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  const publicMetaPath = path.join(publicDir, 'build-meta.json');
  fs.writeFileSync(publicMetaPath, JSON.stringify(buildMeta, null, 2), 'utf8');

  // 2. Write src/version.ts
  const versionTsContent = `// Automatically generated by scripts/generate-build-info.cjs
// DO NOT EDIT MANUALLY - This file is automatically synchronized on build and live deployment.

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
  buildTimestamp: string;
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

export const APP_VERSION_INFO: VersionInfo = ${JSON.stringify(buildMeta, null, 2)};
`;

  const versionTsPath = path.resolve(__dirname, '../src/version.ts');
  fs.writeFileSync(versionTsPath, versionTsContent, 'utf8');

  console.log(`[AutoVersion] Successfully published version ${buildMeta.version} (${buildMeta.buildNumber})`);
}

generate();
