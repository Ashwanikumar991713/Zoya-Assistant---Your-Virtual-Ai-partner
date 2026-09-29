import { GoogleGenAI } from "@google/genai";
import { AppConfig } from "../types";

let chatSession: any = null;

export function resetZoyaSession() {
  chatSession = null;
}

export async function getZoyaResponse(
  prompt: string,
  history: { sender: "user" | "zoya"; text: string }[] = [],
  config: AppConfig
): Promise<string> {
  try {
    const ai = new GoogleGenAI({ apiKey: config.apiKey });

    if (!chatSession) {
      const recentHistory = history.slice(-20);

      let formattedHistory: any[] = [];
      let currentRole = "";
      let currentText = "";

      for (const msg of recentHistory) {
        const role = msg.sender === "user" ? "user" : "model";
        if (role === currentRole) {
          currentText += "\n" + msg.text;
        } else {
          if (currentRole !== "") {
            formattedHistory.push({ role: currentRole, parts: [{ text: currentText }] });
          }
          currentRole = role;
          currentText = msg.text;
        }
      }
      if (currentRole !== "") {
        formattedHistory.push({ role: currentRole, parts: [{ text: currentText }] });
      }

      if (formattedHistory.length > 0 && formattedHistory[0].role !== "user") {
        formattedHistory.shift();
      }

      const baseInstruction = config.systemPrompt
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

      chatSession = ai.chats.create({
        model: "gemini-3.8-flash",
        config: {
          systemInstruction: baseInstruction + strictPersonaInstruction + topicContext,
        },
        history: formattedHistory,
      });
    }

    const response = await chatSession.sendMessage({ message: prompt });
    return response.text || "Haan ji, main yahin hoon aapke sath.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Thoda sa network issue ho gaya hai, ek baar dobara boliye na.";
  }
}

export async function getZoyaAudio(text: string, config: AppConfig): Promise<string | null> {
  try {
    const ai = new GoogleGenAI({ apiKey: config.apiKey });
    const rawVoice = (config.voiceName || "").trim();
    const validFemaleVoices = ["Kore", "Aoede"];
    const voiceToUse = validFemaleVoices.includes(rawVoice) ? rawVoice : "Kore";

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash-lite-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceToUse },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
}
