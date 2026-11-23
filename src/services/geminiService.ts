import { AppConfig } from "../types";

export function resetZoyaSession() {
  // Session reset signal handled in conversation state
}

export async function getZoyaResponse(
  prompt: string,
  history: { sender: "user" | "zoya"; text: string }[] = [],
  config: AppConfig
): Promise<string> {
  try {
    const res = await fetch("/api/gemini/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        history,
        userName: config.userName,
        assistantName: config.assistantName,
        systemPrompt: config.systemPrompt,
        activeTopicOrScript: config.activeTopicOrScript,
        apiKey: config.apiKey,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server responded with status ${res.status}`);
    }

    const data = await res.json();
    return data.text || "Haan ji, main yahin hoon aapke sath.";
  } catch (error) {
    console.error("Gemini Server Chat Error:", error);
    return "Thoda sa network issue ho gaya hai, ek baar dobara boliye na.";
  }
}

export async function getZoyaAudio(text: string, config: AppConfig): Promise<string | null> {
  try {
    const res = await fetch("/api/gemini/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        voiceName: config.voiceName || "Kore",
        apiKey: config.apiKey,
      }),
    });

    if (!res.ok) {
      throw new Error(`TTS server responded with ${res.status}`);
    }

    const data = await res.json();
    return data.audio || null;
  } catch (error) {
    console.error("Gemini Server TTS Error:", error);
    return null;
  }
}
