import {
  executeVoiceToolCall,
  PendingWhatsAppVerification,
  VoiceToolExecutionResult,
} from "./voiceActions";

export interface ProcessedTextCommand {
  matched: boolean;
  result?: VoiceToolExecutionResult;
}

export function processCommand(
  command: string,
  pendingWhatsApp: PendingWhatsAppVerification | null = null
): ProcessedTextCommand {
  const raw = command.trim();
  const lowerCmd = raw.toLowerCase();

  // If a WhatsApp verification is currently pending, handle quick text confirmation or cancellation
  if (pendingWhatsApp) {
    if (/^(haan|han|yes|yep|yeah|sahi hai|theek hai|thik hai|confirm|bhej do|send|ok|okay)\b/i.test(lowerCmd)) {
      return {
        matched: true,
        result: executeVoiceToolCall(
          "confirm_and_open_whatsapp",
          {
            phoneNumber: pendingWhatsApp.digits,
            message: pendingWhatsApp.message,
            recipientName: pendingWhatsApp.recipientName,
          },
          pendingWhatsApp
        ),
      };
    }
    if (/^(nahi|no|cancel|mat bhejo|rehne do|stop)\b/i.test(lowerCmd)) {
      return {
        matched: true,
        result: executeVoiceToolCall("cancel_whatsapp_draft", {}, pendingWhatsApp),
      };
    }
  }

  // WhatsApp: always stage verification first (never bypass number verification)
  const waMatch =
    raw.match(
      /(?:send\s+(?:a\s+)?)?whatsapp\s+(?:message\s+)?to\s+([\d+\-\s]{10,18})\s+(?:saying|message|that|:)\s+(.+)$/i
    ) ||
    raw.match(
      /whatsapp\s+(?:pe|par)\s+([\d+\-\s]{10,18})\s+(?:ko)\s+(.+?)\s+(?:message\s+)?(?:bhejo|send\s*karo)$/i
    );
  if (waMatch) {
    return {
      matched: true,
      result: executeVoiceToolCall(
        "verify_whatsapp_number",
        {
          phoneNumber: waMatch[1].trim(),
          message: waMatch[2].trim(),
        },
        pendingWhatsApp
      ),
    };
  }

  // YouTube
  const ytMatch =
    raw.match(/^(?:play|search|chalao|suno)\s+(.+?)\s+(?:on|pe|par)\s+(?:youtube|yt)$/i) ||
    raw.match(/^(?:youtube|yt)\s+(?:pe|par)\s+(.+?)\s+(?:chalao|play|search|kholo)$/i) ||
    raw.match(/^(?:open|kholo)\s+(?:youtube|yt)$/i);
  if (ytMatch) {
    return {
      matched: true,
      result: executeVoiceToolCall(
        "open_youtube",
        { query: (ytMatch[1] || "").trim() },
        pendingWhatsApp
      ),
    };
  }

  // Spotify
  const spotifyMatch =
    raw.match(/^(?:play|search|chalao|suno)\s+(.+?)\s+(?:on|pe|par)\s+spotify$/i) ||
    raw.match(/^spotify\s+(?:pe|par)\s+(.+?)\s+(?:chalao|play|search|kholo)$/i) ||
    raw.match(/^(?:open|kholo)\s+spotify$/i);
  if (spotifyMatch) {
    return {
      matched: true,
      result: executeVoiceToolCall(
        "open_spotify",
        { query: (spotifyMatch[1] || "").trim() },
        pendingWhatsApp
      ),
    };
  }

  // Google Search
  const googleMatch =
    raw.match(/^(?:google|search)\s+(?:for\s+)?(.+?)(?:\s+on\s+google)?$/i) ||
    raw.match(/^google\s+(?:pe|par)\s+(.+?)\s+(?:search|dhundo|kholo)$/i);
  if (googleMatch && googleMatch[1]) {
    return {
      matched: true,
      result: executeVoiceToolCall(
        "google_search",
        { query: googleMatch[1].trim() },
        pendingWhatsApp
      ),
    };
  }

  // General website
  const openMatch = raw.match(/^(?:open|kholo)\s+([a-zA-Z0-9._\-\s]+)$/i);
  if (openMatch && openMatch[1]) {
    return {
      matched: true,
      result: executeVoiceToolCall(
        "open_website",
        { site: openMatch[1].trim() },
        pendingWhatsApp
      ),
    };
  }

  return { matched: false };
}
