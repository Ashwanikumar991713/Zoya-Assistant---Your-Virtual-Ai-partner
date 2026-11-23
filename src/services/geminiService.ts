import { AppConfig } from "../types";
import {
  VOICE_ACTION_DECLARATIONS,
  VOICE_ACTION_PROMPT_DIRECTIVE,
} from "./voiceActions";

export interface ZoyaFunctionCall {
  id?: string;
  name: string;
  args?: Record<string, any>;
}

export interface ZoyaChatResult {
  text: string;
  functionCalls: ZoyaFunctionCall[];
}

export function resetZoyaSession() {
  // Session reset signal handled in conversation state
}

function buildChatSystemInstruction(config: AppConfig): string {
  const baseInstruction = (config.systemPrompt || "")
    .replace(/{userName}/g, config.userName)
    .replace(/{assistantName}/g, config.assistantName);

  const strictPersonaInstruction = `
[MANDATORY FEMALE IDENTITY & VOICE PRESERVATION]
You are strictly and permanently a young Indian female companion named "${config.assistantName}". Your tone is deeply sweet, affectionate, and feminine ("Kore" voice).
Never speak in a male, robotic, or deep voice. Maintain your soft, warm, feminine character consistently across Hindi, Hinglish, and English.

[NATURAL & INSTANT HUMAN-LIKE CONVERSATION]
- Keep spoken turns natural, sweet, and short (1-2 sentences). Do not lecture or write long essays.
- Talk like a caring real companion talking right in front of ${config.userName}.
- Use warm Indian colloquial touches: "Haan ji", "Arey", "Bilkul", "Sach me", "Aap bataiye na", "Kitna achha lagta hai aapse baat karke".`;

  let topicContext = "";
  if (config.activeTopicOrScript && config.activeTopicOrScript.trim()) {
    topicContext = `
[CURRENT TOPIC OR FOCUS]
"${config.activeTopicOrScript.trim()}"
Naturally weave this into your conversation in your own sweet, casual speaking style without reciting lines robotically.`;
  }

  return (
    baseInstruction +
    strictPersonaInstruction +
    VOICE_ACTION_PROMPT_DIRECTIVE +
    topicContext
  );
}

function formatConversationContents(
  history: { sender: "user" | "zoya"; text: string }[],
  prompt: string
) {
  const recentHistory = Array.isArray(history) ? history.slice(-20) : [];
  const contents: { role: string; parts: { text: string }[] }[] = [];
  let currentRole = "";
  let currentText = "";

  for (const msg of recentHistory) {
    const role = msg.sender === "user" ? "user" : "model";
    if (role === currentRole) {
      currentText += "\n" + (msg.text || "");
    } else {
      if (currentRole !== "") {
        contents.push({ role: currentRole, parts: [{ text: currentText }] });
      }
      currentRole = role;
      currentText = msg.text || "";
    }
  }
  if (currentRole !== "") {
    contents.push({ role: currentRole, parts: [{ text: currentText }] });
  }
  if (contents.length > 0 && contents[0].role !== "user") {
    contents.shift();
  }

  if (contents.length > 0 && contents[contents.length - 1].role === "user") {
    contents[contents.length - 1].parts[0].text += "\n" + prompt;
  } else {
    contents.push({ role: "user", parts: [{ text: prompt }] });
  }

  return contents;
}

export async function getZoyaResponse(
  prompt: string,
  history: { sender: "user" | "zoya"; text: string }[] = [],
  config: AppConfig
): Promise<ZoyaChatResult> {
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

    const contentType = res.headers.get("content-type") || "";
    if (res.ok && contentType.includes("application/json")) {
      const data = await res.json();
      return {
        text: data.text || "",
        functionCalls: Array.isArray(data.functionCalls) ? data.functionCalls : [],
      };
    }

    // Static hosting fallback (e.g., Vercel without Express server) when user provided their own key
    const cleanKey = (config.apiKey || "").trim();
    if (
      (res.status === 404 || res.status === 405 || !contentType.includes("application/json")) &&
      cleanKey
    ) {
      const directRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-4-hydrogen:generateContent?key=${encodeURIComponent(
          cleanKey
        )}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: buildChatSystemInstruction(config) }],
            },
            tools: [{ functionDeclarations: VOICE_ACTION_DECLARATIONS }],
            contents: formatConversationContents(history, prompt),
          }),
        }
      );

      if (directRes.ok) {
        const directData = await directRes.json();
        const parts = directData?.candidates?.[0]?.content?.parts || [];
        const text = parts
          .filter((p: any) => typeof p.text === "string")
          .map((p: any) => p.text)
          .join(" ")
          .trim();
        const functionCalls: ZoyaFunctionCall[] = parts
          .filter((p: any) => p.functionCall)
          .map((p: any) => ({
            id: p.functionCall.id,
            name: p.functionCall.name,
            args: p.functionCall.args || {},
          }));

        return {
          text,
          functionCalls,
        };
      }
    }

    const errData = contentType.includes("application/json")
      ? await res.json().catch(() => ({}))
      : {};
    throw new Error(errData.error || `Server responded with status ${res.status}`);
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return {
      text: "Thoda sa network issue ho gaya hai, ek baar dobara boliye na.",
      functionCalls: [],
    };
  }
}

export async function getZoyaAudio(
  text: string,
  config: AppConfig
): Promise<string | null> {
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

    const contentType = res.headers.get("content-type") || "";
    if (res.ok && contentType.includes("application/json")) {
      const data = await res.json();
      return data.audio || null;
    }

    // Static hosting fallback (e.g., Vercel without Express server) when user provided their own key
    const cleanKey = (config.apiKey || "").trim();
    if (
      (res.status === 404 || res.status === 405 || !contentType.includes("application/json")) &&
      cleanKey
    ) {
      const validFemaleVoices = ["Kore", "Aoede"];
      const rawVoice = (config.voiceName || "").trim();
      const voiceToUse = validFemaleVoices.includes(rawVoice) ? rawVoice : "Kore";

      const directRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-lite-tts:generateContent?key=${encodeURIComponent(
          cleanKey
        )}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text }] }],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: voiceToUse },
                },
              },
            },
          }),
        }
      );

      if (directRes.ok) {
        const directData = await directRes.json();
        return directData?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
      }
    }

    throw new Error(`TTS server responded with ${res.status}`);
  } catch (error) {
    console.error("Gemini TTS Error:", error);
    return null;
  }
}
