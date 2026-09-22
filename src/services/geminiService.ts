import { GoogleGenAI } from "@google/genai";
import { AppConfig } from "../types";

let chatSession: any = null;

export function resetZoyaSession() {
  chatSession = null;
}

export async function getZoyaResponse(prompt: string, history: { sender: "user" | "zoya", text: string }[] = [], config: AppConfig): Promise<string> {
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
      
      const strictContext = `

[SYSTEM NOTE: The human you are currently talking to is named "${config.userName}". You must remember this. Your name is "${config.assistantName}".]

[CRITICAL INSTRUCTIONS FOR ACTIONS]
1. WHATSAPP: If asked to send a WhatsApp message, DO NOT pretend to send it. You MUST ask the user for the target phone number (with country code) and the message content if not provided. Once you have both, say something like "Sending a WhatsApp message to [number] saying [message]" so the client system can intercept and execute it.
2. YOUTUBE/SPOTIFY: If asked to play media on YouTube or Spotify, say something like "Playing [song] on Spotify" or "Playing [song] on YouTube".
3. WEBSITES: If asked to open a website, say something like "Open Google" or "Opening Instagram".`;

      let topicContext = "";
      if (config.activeTopicOrScript && config.activeTopicOrScript.trim()) {
        topicContext = `

[CURRENT CONVERSATIONAL FOCUS, TOPIC, OR SCRIPT]
The user has provided the following active focus, idea, script, or conversation topic:
"""
${config.activeTopicOrScript.trim()}
"""

CRITICAL INSTRUCTIONS FOR THIS FOCUS:
1. NATURAL HUMAN CONVERSATION: Weave these ideas, topics, or goals into your conversation naturally and fluidly, like an authentic human who has this topic or agenda in mind.
2. DO NOT SOUND OBSESSED: Do not force this topic into every single sentence unnaturally or abruptly if the user is talking about something else. Introduce it smoothly, respond warmly to what the user says, and transition gracefully.
3. SCRIPT & ROLEPLAY INTERPRETATION: If the provided context is a script, storyline, or bullet points:
   - NEVER copy or recite lines word-for-word mechanically or robotically.
   - Internalize the essence, emotions, and key points, and express them in your own natural, sweet speaking style and words.
   - Act according to the scenario or goals outlined, adapting dynamically to the user's responses.
4. ACTIVE MEMORY & INTENT: Treat this as your personal active memory, thoughts, or purpose for this conversation. You have your own thoughts and genuine interest regarding this topic.`;
      }

      chatSession = ai.chats.create({
        model: "gemini-3.1-flash-lite-preview",
        config: {
          systemInstruction: baseInstruction + strictContext + topicContext,
        },
        history: formattedHistory,
      });
    }

    const response = await chatSession.sendMessage({ message: prompt });
    return response.text || "Ugh, fine. I have nothing to say.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Something went wrong. Please check your API key or connection.";
  }
}

export async function getZoyaAudio(text: string, config: AppConfig): Promise<string | null> {
  try {
    const ai = new GoogleGenAI({ apiKey: config.apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Aoede" },
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

