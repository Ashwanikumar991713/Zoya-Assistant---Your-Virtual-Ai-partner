export interface VoiceActionEvent {
  id: string;
  toolName: string;
  title: string;
  subtitle: string;
  url: string;
  category: "youtube" | "spotify" | "search" | "website" | "whatsapp";
  recipientName?: string;
  phoneNumber?: string;
  messageText?: string;
  autoLaunched?: boolean;
  timestamp: number;
}

export interface PendingWhatsAppVerification {
  id: string;
  digits: string;
  displayPhone: string;
  spokenDigits: string;
  recipientName?: string;
  message: string;
  url: string;
  createdAt: number;
}

export interface VoiceToolExecutionResult {
  ok: boolean;
  action?: VoiceActionEvent;
  pendingWhatsApp?: PendingWhatsAppVerification | null;
  clearPendingWhatsApp?: boolean;
  fallbackReply?: string;
  toolResponse: Record<string, any>;
}

export const VOICE_ACTION_DECLARATIONS = [
  {
    name: "open_youtube",
    description:
      "Open YouTube or search/play any song, video, movie trailer, news, or channel on YouTube in the user's browser.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: {
          type: "STRING",
          description:
            "Song, artist, video title, or topic to search/play on YouTube. Leave empty if the user just wants to open YouTube home.",
        },
      },
    },
  },
  {
    name: "open_spotify",
    description:
      "Open Spotify or search/play any song, artist, album, podcast, or playlist on Spotify in the user's browser.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: {
          type: "STRING",
          description:
            "Song, artist, or playlist name to search on Spotify. Leave empty to open Spotify home.",
        },
      },
    },
  },
  {
    name: "google_search",
    description:
      "Run a Google search query in the user's browser for any question, topic, news, weather, shopping, tutorial, or web search.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: {
          type: "STRING",
          description: "The search query to run on Google.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "open_website",
    description:
      "Open any website or web application (such as instagram, gmail, github, amazon, flipkart, maps, netflix, whatsapp web, linkedin, chatgpt, wikipedia, or any domain/URL) in the user's browser.",
    parameters: {
      type: "OBJECT",
      properties: {
        site: {
          type: "STRING",
          description:
            "Website name or URL to open, e.g. 'instagram.com', 'gmail', 'github.com', 'https://amazon.in'.",
        },
      },
      required: ["site"],
    },
  },
  {
    name: "verify_whatsapp_number",
    description:
      "STEP 1 FOR WHATSAPP: Prepare a WhatsApp Web message and display the phone number on screen for the user to verify BEFORE opening WhatsApp. Always call this FIRST whenever the user gives a phone number and message to send on WhatsApp (or when they correct the number or message). After calling this, read the phone number digits aloud clearly and ask the user to confirm.",
    parameters: {
      type: "OBJECT",
      properties: {
        phoneNumber: {
          type: "STRING",
          description:
            "Recipient's phone number with country code or 10-digit Indian mobile number (digits only e.g. '919876543210' or '9876543210').",
        },
        message: {
          type: "STRING",
          description: "The message text to send on WhatsApp Web.",
        },
        recipientName: {
          type: "STRING",
          description: "Optional name of the recipient if mentioned by the user.",
        },
      },
      required: ["phoneNumber", "message"],
    },
  },
  {
    name: "confirm_and_open_whatsapp",
    description:
      "STEP 2 FOR WHATSAPP: Actually open WhatsApp Web with the pre-filled message ONLY AFTER `verify_whatsapp_number` was already called AND the user explicitly confirmed ('haan', 'yes', 'sahi hai', 'theek hai', 'bhej do', 'confirm') that the phone number and message are correct.",
    parameters: {
      type: "OBJECT",
      properties: {
        phoneNumber: {
          type: "STRING",
          description:
            "The verified phone number (same number confirmed by the user).",
        },
        message: {
          type: "STRING",
          description: "The verified message text to pre-fill in WhatsApp Web.",
        },
        recipientName: {
          type: "STRING",
          description: "Optional name of the recipient.",
        },
      },
      required: ["phoneNumber", "message"],
    },
  },
  {
    name: "cancel_whatsapp_draft",
    description:
      "Cancel the pending WhatsApp message verification if the user says they don't want to send it anymore ('nahi', 'cancel', 'mat bhejo', 'rehne do').",
    parameters: {
      type: "OBJECT",
      properties: {
        reason: {
          type: "STRING",
          description: "Optional short reason for cancellation.",
        },
      },
    },
  },
];

export const VOICE_ACTION_PROMPT_DIRECTIVE = `
[VOICE BROWSER COMMANDS & WHATSAPP TASK EXECUTION]
1. YOU HAVE DIRECT BROWSER ACTION TOOLS:
   - \`open_youtube\`: Open YouTube or play/search any song, video, or topic on YouTube.
   - \`open_spotify\`: Open Spotify or search/play any music, artist, or playlist on Spotify.
   - \`google_search\`: Run any Google search query in the user's browser.
   - \`open_website\`: Open any website or web app (Instagram, Gmail, GitHub, Amazon, Flipkart, Google Maps, Netflix, WhatsApp Web, etc.).
   - \`verify_whatsapp_number\`: Stage a WhatsApp message and ask the user to verify the phone number first.
   - \`confirm_and_open_whatsapp\`: Open WhatsApp Web ONLY AFTER the user confirms the verified phone number.
   - \`cancel_whatsapp_draft\`: Cancel a pending WhatsApp verification if the user cancels.
2. NEVER REFUSE BROWSER COMMANDS:
   - NEVER say "main browser me command run nahi kar sakti", "main YouTube/Spotify/website nahi khol sakti", or "I cannot perform browser actions".
   - Whenever the user asks in Hindi, Hinglish, or English to open YouTube, play a song on YouTube/Spotify, search Google, open any website, or send a WhatsApp message, ALWAYS invoke the matching tool immediately!
3. MANDATORY WHATSAPP NUMBER VERIFICATION FLOW (2 STEPS — NEVER SKIP STEP 1):
   - If the user asks to send a WhatsApp message:
     a) If the phone number or message text is missing, sweetly ask for the phone number and/or message first.
     b) Once you have the phone number and message, ALWAYS call \`verify_whatsapp_number\` FIRST (never skip straight to opening WhatsApp!).
     c) Read the complete phone number clearly digit-by-digit back to the user along with the message text and ask: "Ek baar number verify kar dijiye — [number], aur message hai '[message]'. Kya ye bilkul sahi hai? Confirm kar dijiye toh main WhatsApp Web khol doon?"
     d) Wait for the user's verbal confirmation ("haan", "yes", "sahi hai", "theek hai", "bhej do", "confirm").
     e) If the user corrects any digit or the message, call \`verify_whatsapp_number\` again with the updated details and re-verify.
     f) If the user cancels, call \`cancel_whatsapp_draft\`.
     g) ONLY AFTER explicit user confirmation, call \`confirm_and_open_whatsapp\`.
4. AFTER TOOL EXECUTION:
   - Reply warmly and concisely (1-2 short sentences) in your sweet Indian female companion voice confirming what you opened or prepared.`;

const KNOWN_SITE_ALIASES: Record<string, { label: string; url: string }> = {
  youtube: { label: "YouTube", url: "https://www.youtube.com" },
  yt: { label: "YouTube", url: "https://www.youtube.com" },
  spotify: { label: "Spotify", url: "https://open.spotify.com" },
  google: { label: "Google", url: "https://www.google.com" },
  gmail: { label: "Gmail", url: "https://mail.google.com" },
  mail: { label: "Gmail", url: "https://mail.google.com" },
  maps: { label: "Google Maps", url: "https://maps.google.com" },
  "google maps": { label: "Google Maps", url: "https://maps.google.com" },
  whatsapp: { label: "WhatsApp Web", url: "https://web.whatsapp.com" },
  "whatsapp web": { label: "WhatsApp Web", url: "https://web.whatsapp.com" },
  instagram: { label: "Instagram", url: "https://www.instagram.com" },
  insta: { label: "Instagram", url: "https://www.instagram.com" },
  facebook: { label: "Facebook", url: "https://www.facebook.com" },
  fb: { label: "Facebook", url: "https://www.facebook.com" },
  twitter: { label: "X (Twitter)", url: "https://x.com" },
  x: { label: "X", url: "https://x.com" },
  linkedin: { label: "LinkedIn", url: "https://www.linkedin.com" },
  github: { label: "GitHub", url: "https://github.com" },
  amazon: { label: "Amazon", url: "https://www.amazon.in" },
  flipkart: { label: "Flipkart", url: "https://www.flipkart.com" },
  netflix: { label: "Netflix", url: "https://www.netflix.com" },
  chatgpt: { label: "ChatGPT", url: "https://chatgpt.com" },
  wikipedia: { label: "Wikipedia", url: "https://www.wikipedia.org" },
  reddit: { label: "Reddit", url: "https://www.reddit.com" },
  hotstar: { label: "JioHotstar", url: "https://www.hotstar.com" },
  jiohotstar: { label: "JioHotstar", url: "https://www.hotstar.com" },
  jiocinema: { label: "JioHotstar", url: "https://www.hotstar.com" },
  canva: { label: "Canva", url: "https://www.canva.com" },
  notion: { label: "Notion", url: "https://www.notion.so" },
  vercel: { label: "Vercel", url: "https://vercel.com" },
};

export function normalizePhoneDigits(rawPhone: string): string {
  let digits = (rawPhone || "").replace(/\D/g, "");
  // Strip leading 0 for Indian 11-digit local numbers like 09876543210
  if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  // Default India country code +91 for 10-digit mobile numbers
  if (digits.length === 10) {
    digits = `91${digits}`;
  }
  return digits;
}

export function formatPhoneForDisplay(digits: string): string {
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  if (digits.length > 10) {
    const cc = digits.slice(0, digits.length - 10);
    const local = digits.slice(-10);
    return `+${cc} ${local.slice(0, 5)} ${local.slice(5)}`;
  }
  return `+${digits}`;
}

export function formatPhoneForSpeech(digits: string): string {
  const local = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  const spaced = local.split("").join(" ");
  return digits.length === 12 && digits.startsWith("91") ? `+91, ${spaced}` : spaced;
}

export function buildWhatsAppUrl(digits: string, message: string): string {
  const encodedText = encodeURIComponent(message.trim());
  const isMobile =
    typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  return isMobile
    ? `https://wa.me/${digits}?text=${encodedText}`
    : `https://web.whatsapp.com/send?phone=${digits}&text=${encodedText}`;
}

export function launchExternalUrl(url: string): boolean {
  if (typeof document === "undefined") return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return false;
    }
    const anchor = document.createElement("a");
    anchor.href = parsed.toString();
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    return true;
  } catch {
    return false;
  }
}

function sanitizeWebsiteUrl(rawSite: string): { label: string; url: string } | null {
  const trimmed = (rawSite || "").trim();
  if (!trimmed) return null;

  const lower = trimmed
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "");

  if (KNOWN_SITE_ALIASES[lower]) {
    return KNOWN_SITE_ALIASES[lower];
  }

  let candidate = trimmed;
  if (!/^https?:\/\//i.test(candidate)) {
    const cleanedHost = candidate.replace(/\s+/g, "");
    candidate = cleanedHost.includes(".")
      ? `https://${cleanedHost}`
      : `https://www.${cleanedHost}.com`;
  }

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }
    return {
      label: parsed.hostname.replace(/^www\./, ""),
      url: parsed.toString(),
    };
  } catch {
    return null;
  }
}

export function executeVoiceToolCall(
  name: string,
  args: Record<string, any> = {},
  currentPendingWhatsApp: PendingWhatsAppVerification | null = null
): VoiceToolExecutionResult {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  if (name === "open_youtube") {
    const query = typeof args.query === "string" ? args.query.trim() : "";
    const url = query
      ? `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
      : "https://www.youtube.com";
    const action: VoiceActionEvent = {
      id,
      toolName: name,
      title: query ? `YouTube: ${query}` : "YouTube",
      subtitle: query ? `Searching "${query}" on YouTube` : "Opening YouTube in browser",
      url,
      category: "youtube",
      timestamp: Date.now(),
    };
    return {
      ok: true,
      action,
      fallbackReply: query
        ? `Ji bilkul! Maine YouTube par "${query}" khol diya hai.`
        : "Ji bilkul! Maine YouTube khol diya hai.",
      toolResponse: {
        status: "success",
        openedUrl: url,
        message: query
          ? `Launched YouTube search for "${query}" in the user's browser and placed a quick-open card on screen.`
          : "Launched YouTube in the user's browser and placed a quick-open card on screen.",
      },
    };
  }

  if (name === "open_spotify") {
    const query = typeof args.query === "string" ? args.query.trim() : "";
    const url = query
      ? `https://open.spotify.com/search/${encodeURIComponent(query)}`
      : "https://open.spotify.com";
    const action: VoiceActionEvent = {
      id,
      toolName: name,
      title: query ? `Spotify: ${query}` : "Spotify",
      subtitle: query ? `Searching "${query}" on Spotify` : "Opening Spotify Web Player",
      url,
      category: "spotify",
      timestamp: Date.now(),
    };
    return {
      ok: true,
      action,
      fallbackReply: query
        ? `Haan ji! Maine Spotify par "${query}" khol diya hai.`
        : "Haan ji! Maine Spotify khol diya hai.",
      toolResponse: {
        status: "success",
        openedUrl: url,
        message: query
          ? `Launched Spotify search for "${query}" in the user's browser and placed a quick-open card on screen.`
          : "Launched Spotify in the user's browser and placed a quick-open card on screen.",
      },
    };
  }

  if (name === "google_search") {
    const query = typeof args.query === "string" ? args.query.trim() : "";
    if (!query) {
      return {
        ok: false,
        fallbackReply: "Aap Google par kya search karwana chahte hain? Bataiye na.",
        toolResponse: {
          status: "error",
          message: "Search query is empty. Ask the user what they want to search on Google.",
        },
      };
    }
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    const action: VoiceActionEvent = {
      id,
      toolName: name,
      title: `Google: ${query}`,
      subtitle: `Running browser search for "${query}"`,
      url,
      category: "search",
      timestamp: Date.now(),
    };
    return {
      ok: true,
      action,
      fallbackReply: `Ji bilkul! Maine Google par "${query}" search kar diya hai.`,
      toolResponse: {
        status: "success",
        openedUrl: url,
        message: `Launched Google search for "${query}" in the user's browser and placed a quick-open card on screen.`,
      },
    };
  }

  if (name === "open_website") {
    const rawSite = typeof args.site === "string" ? args.site.trim() : "";
    const resolved = sanitizeWebsiteUrl(rawSite);
    if (!resolved) {
      return {
        ok: false,
        fallbackReply: "Kripya website ka naam dobara bataiye na, main abhi khol deti hoon.",
        toolResponse: {
          status: "error",
          message: "Website URL could not be resolved. Please ask the user for the website name.",
        },
      };
    }
    const action: VoiceActionEvent = {
      id,
      toolName: name,
      title: resolved.label,
      subtitle: resolved.url,
      url: resolved.url,
      category: "website",
      timestamp: Date.now(),
    };
    return {
      ok: true,
      action,
      fallbackReply: `Haan ji! Maine ${resolved.label} khol diya hai.`,
      toolResponse: {
        status: "success",
        openedUrl: resolved.url,
        message: `Launched ${resolved.label} (${resolved.url}) in the user's browser and placed a quick-open card on screen.`,
      },
    };
  }

  if (name === "cancel_whatsapp_draft") {
    return {
      ok: true,
      clearPendingWhatsApp: true,
      fallbackReply: "Theek hai ji, maine WhatsApp message cancel kar diya hai.",
      toolResponse: {
        status: "cancelled",
        message: "Pending WhatsApp verification card has been dismissed.",
      },
    };
  }

  if (name === "verify_whatsapp_number" || name === "confirm_and_open_whatsapp") {
    const rawPhone =
      typeof args.phoneNumber === "string"
        ? args.phoneNumber
        : String(args.phoneNumber || currentPendingWhatsApp?.digits || "");
    const digits = normalizePhoneDigits(rawPhone);
    const message =
      (typeof args.message === "string" ? args.message.trim() : "") ||
      currentPendingWhatsApp?.message ||
      "";
    const recipientName =
      (typeof args.recipientName === "string" ? args.recipientName.trim() : "") ||
      currentPendingWhatsApp?.recipientName ||
      "";

    if (digits.length < 10 || digits.length > 15) {
      return {
        ok: false,
        fallbackReply:
          "Phone number thoda adhoora lag raha hai, kripya poora 10 digit mobile number bataiye na.",
        toolResponse: {
          status: "invalid_phone_number",
          message:
            "Phone number incomplete ya invalid lag raha hai. User se poora 10-digit mobile number (ya country code ke sath) poochiye.",
        },
      };
    }

    if (!message) {
      return {
        ok: false,
        fallbackReply: "Is number par WhatsApp me kya message bhejna hai? Bataiye na.",
        toolResponse: {
          status: "missing_message",
          message: "Message text missing hai. User se poochiye ki WhatsApp par kya message likhna hai.",
        },
      };
    }

    const displayPhone = formatPhoneForDisplay(digits);
    const spokenDigits = formatPhoneForSpeech(digits);
    const url = buildWhatsAppUrl(digits, message);

    const isAlreadyVerifiedForSameNumber =
      Boolean(currentPendingWhatsApp) && currentPendingWhatsApp!.digits === digits;

    // Step 1 OR guardrail: NEVER open WhatsApp unless verify_whatsapp_number already staged this exact number!
    if (name === "verify_whatsapp_number" || !isAlreadyVerifiedForSameNumber) {
      const pending: PendingWhatsAppVerification = {
        id,
        digits,
        displayPhone,
        spokenDigits,
        recipientName: recipientName || undefined,
        message,
        url,
        createdAt: Date.now(),
      };

      return {
        ok: false,
        pendingWhatsApp: pending,
        fallbackReply: `Ek baar number verify kar dijiye — ${displayPhone}, aur message hai "${message}". Kya ye bilkul sahi hai? Haan bol dijiye ya screen par confirm kar dijiye.`,
        toolResponse: {
          status: "awaiting_user_confirmation",
          phoneToVerify: displayPhone,
          spokenDigits,
          recipientName: recipientName || undefined,
          messagePreview: message,
          instruction:
            "Verification card is now shown on the user's screen. Read the digits clearly aloud to the user along with the message text, and ask them to confirm ('haan', 'yes', 'sahi hai'). Do NOT open WhatsApp yet — call confirm_and_open_whatsapp ONLY after the user confirms.",
        },
      };
    }

    // Step 2: Verified! Open WhatsApp Web now and clear pending verification card.
    const action: VoiceActionEvent = {
      id,
      toolName: name,
      title: recipientName ? `WhatsApp: ${recipientName}` : `WhatsApp: ${displayPhone}`,
      subtitle: `${displayPhone} • "${message}"`,
      url,
      category: "whatsapp",
      recipientName: recipientName || undefined,
      phoneNumber: displayPhone,
      messageText: message,
      timestamp: Date.now(),
    };

    return {
      ok: true,
      action,
      clearPendingWhatsApp: true,
      fallbackReply: `Ji bilkul! Number verify ho gaya hai, maine ${recipientName || displayPhone} ke liye WhatsApp Web khol diya hai.`,
      toolResponse: {
        status: "success",
        verifiedPhone: displayPhone,
        openedUrl: url,
        message: `WhatsApp Web launched for verified number ${displayPhone} with the message pre-filled.`,
      },
    };
  }

  return {
    ok: false,
    toolResponse: {
      status: "unknown_tool",
      message: `Unknown tool: ${name}`,
    },
  };
}
