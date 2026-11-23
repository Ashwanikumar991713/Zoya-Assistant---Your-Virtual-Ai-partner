import express, { Request, Response } from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer, WebSocket } from "ws";
import dotenv from "dotenv";
import {
  GoogleGenAI,
  LiveServerMessage,
  Modality,
  StartSensitivity,
  EndSensitivity,
  ActivityHandling,
} from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const isDev = process.env.NODE_ENV !== "production";
const port = isDev ? 3000 : parseInt(process.env.PORT || "3000", 10);

app.use(express.json({ limit: "25mb" }));

// Helper to instantiate server-side GoogleGenAI client with standard User-Agent header
function getGeminiClient(customKey?: string): GoogleGenAI {
  const apiKey = (customKey || process.env.GEMINI_API_KEY || "").trim();
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      apiVersion: "v1alpha",
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// -------------------------------------------------------------
// REST Endpoint: Text Generation / Chat (Fallback & Non-Live)
// -------------------------------------------------------------
app.post("/api/gemini/chat", async (req: Request, res: Response) => {
  try {
    const {
      prompt,
      history = [],
      userName = "Ashwani",
      assistantName = "S.U.H.A.N.I",
      systemPrompt = "",
      activeTopicOrScript = "",
      apiKey,
    } = req.body;

    if (!prompt || typeof prompt !== "string") {
      res.status(400).json({ error: "Missing prompt parameter" });
      return;
    }

    const effectiveKey = (apiKey || process.env.GEMINI_API_KEY || "").trim();
    if (!effectiveKey) {
      res.status(500).json({
        error: "Server Gemini API key is not configured. Please set GEMINI_API_KEY in the server environment.",
      });
      return;
    }

    const ai = getGeminiClient(effectiveKey);

    // Format chat history
    const recentHistory = Array.isArray(history) ? history.slice(-20) : [];
    const formattedHistory: any[] = [];
    let currentRole = "";
    let currentText = "";

    for (const msg of recentHistory) {
      const role = msg.sender === "user" ? "user" : "model";
      if (role === currentRole) {
        currentText += "\n" + (msg.text || "");
      } else {
        if (currentRole !== "") {
          formattedHistory.push({ role: currentRole, parts: [{ text: currentText }] });
        }
        currentRole = role;
        currentText = msg.text || "";
      }
    }
    if (currentRole !== "") {
      formattedHistory.push({ role: currentRole, parts: [{ text: currentText }] });
    }
    if (formattedHistory.length > 0 && formattedHistory[0].role !== "user") {
      formattedHistory.shift();
    }

    const baseInstruction = (systemPrompt || "")
      .replace(/{userName}/g, userName)
      .replace(/{assistantName}/g, assistantName);

    const strictPersonaInstruction = `
[MANDATORY FEMALE IDENTITY & VOICE PRESERVATION]
You are strictly and permanently a young Indian female companion named "${assistantName}". Your tone is deeply sweet, affectionate, and feminine ("Kore" voice).
Never speak in a male, robotic, or deep voice. Maintain your soft, warm, feminine character consistently across Hindi, Hinglish, and English.

[NATURAL & INSTANT HUMAN-LIKE CONVERSATION]
- Keep spoken turns natural, sweet, and short (1-2 sentences). Do not lecture or write long essays.
- Talk like a caring real companion talking right in front of ${userName}.
- Use warm Indian colloquial touches: "Haan ji", "Arey", "Bilkul", "Sach me", "Aap bataiye na", "Kitna achha lagta hai aapse baat karke".`;

    let topicContext = "";
    if (activeTopicOrScript && activeTopicOrScript.trim()) {
      topicContext = `
[CURRENT TOPIC OR FOCUS]
"${activeTopicOrScript.trim()}"
Naturally weave this into your conversation in your own sweet, casual speaking style without reciting lines robotically.`;
    }

    const chatSession = ai.chats.create({
      model: "gemini-3.8-flash",
      config: {
        systemInstruction: baseInstruction + strictPersonaInstruction + topicContext,
      },
      history: formattedHistory,
    });

    const response = await chatSession.sendMessage({ message: prompt });
    res.json({
      text: response.text || "Haan ji, main yahin hoon aapke sath.",
    });
  } catch (error: any) {
    console.error("Server /api/gemini/chat error:", error);
    res.status(500).json({
      error: error?.message || "Failed to generate companion response",
      text: "Thoda sa network issue ho gaya hai, ek baar dobara boliye na.",
    });
  }
});

// -------------------------------------------------------------
// REST Endpoint: Streaming Chat (Server-Sent Events)
// -------------------------------------------------------------
app.post("/api/gemini/chat-stream", async (req: Request, res: Response) => {
  try {
    const {
      prompt,
      userName = "Ashwani",
      assistantName = "S.U.H.A.N.I",
      systemPrompt = "",
      activeTopicOrScript = "",
      apiKey,
    } = req.body;

    const effectiveKey = (apiKey || process.env.GEMINI_API_KEY || "").trim();
    if (!effectiveKey) {
      res.status(500).json({ error: "GEMINI_API_KEY missing on server" });
      return;
    }

    const ai = getGeminiClient(effectiveKey);

    const baseInstruction = (systemPrompt || "")
      .replace(/{userName}/g, userName)
      .replace(/{assistantName}/g, assistantName);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await ai.models.generateContentStream({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction: baseInstruction,
      },
    });

    for await (const chunk of stream) {
      const text = chunk.text || "";
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error: any) {
    console.error("Server /api/gemini/chat-stream error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: error?.message || "Stream failed" });
    } else {
      res.write(`data: ${JSON.stringify({ error: error?.message || "Stream interrupted" })}\n\n`);
      res.end();
    }
  }
});

// -------------------------------------------------------------
// REST Endpoint: Text-to-Speech (TTS)
// -------------------------------------------------------------
app.post("/api/gemini/tts", async (req: Request, res: Response) => {
  try {
    const { text, voiceName = "Kore", apiKey } = req.body;

    if (!text || typeof text !== "string") {
      res.status(400).json({ error: "Missing text for TTS" });
      return;
    }

    const effectiveKey = (apiKey || process.env.GEMINI_API_KEY || "").trim();
    if (!effectiveKey) {
      res.status(500).json({ error: "GEMINI_API_KEY missing on server" });
      return;
    }

    const ai = getGeminiClient(effectiveKey);
    const validFemaleVoices = ["Kore", "Aoede"];
    const voiceToUse = validFemaleVoices.includes(voiceName) ? voiceName : "Kore";

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash-lite-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceToUse },
          },
        },
      },
    });

    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
    res.json({ audio: audioData });
  } catch (error: any) {
    console.error("Server /api/gemini/tts error:", error);
    res.status(500).json({ error: error?.message || "TTS generation failed" });
  }
});

// -------------------------------------------------------------
// WebSocket Server: Gemini Live API Bridge (`/api/live-ws`)
// -------------------------------------------------------------
const wss = new WebSocketServer({ noServer: true });

wss.on("connection", (clientWs: WebSocket) => {
  let liveSession: any = null;
  let isClosed = false;

  const cleanupSession = () => {
    isClosed = true;
    if (liveSession) {
      try {
        liveSession.close();
      } catch {}
      liveSession = null;
    }
  };

  clientWs.on("message", async (rawMessage) => {
    try {
      const msg = JSON.parse(rawMessage.toString());

      if (msg.type === "setup") {
        if (liveSession) {
          try {
            liveSession.close();
          } catch {}
          liveSession = null;
        }

        const config = msg.config || {};
        const effectiveKey = (config.apiKey || process.env.GEMINI_API_KEY || "").trim();

        if (!effectiveKey) {
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(
              JSON.stringify({
                type: "error",
                message:
                  "Gemini API Key missing on server. Please configure GEMINI_API_KEY in the server secrets/environment.",
                code: 1007,
                isFatal: true,
              })
            );
          }
          return;
        }

        const ai = getGeminiClient(effectiveKey);

        const baseInstruction = (config.systemPrompt || "")
          .replace(/{userName}/g, config.userName || "Ashwani")
          .replace(/{assistantName}/g, config.assistantName || "Companion");

        const strictFemaleAndInstantDirective = `
[MANDATORY FEMALE IDENTITY & VOICE PRESERVATION]
1. VOCAL GENDER: You are strictly a young Indian female companion named "${config.assistantName || "Companion"}". Your voice is ultra-sweet, gentle, feminine, and heartwarming ("Kore" tone).
2. UNDER NO CIRCUMSTANCES should you EVER speak in a male, deep, low-pitch, or robotic voice, regardless of language.
3. Keep your speaking pitch, softness, and feminine warmth 100% consistent across every sentence.

[LIGHTNING FAST DIRECT HUMAN RESPONSE]
1. ZERO HESITATION: Respond immediately without thinking or pausing.
2. SHORT, SWEET & CONVERSATIONAL: Keep your spoken replies brief and lively (1 to 2 short sentences per turn). Real humans converse dynamically.
3. WARM FILLERS: Start naturally with sweet touches: "Haan ji!", "Arey bilkul!", "Sach me?", "Acha bataiye na", "Hmm, sahi kaha aapne".`;

        let topicContext = "";
        if (config.activeTopicOrScript && config.activeTopicOrScript.trim()) {
          topicContext = `
[ACTIVE FOCUS]
"${config.activeTopicOrScript.trim()}"
Weave naturally into your thoughts in your own sweet, casual speaking style.`;
        }

        const validFemaleVoices = ["Kore", "Aoede"];
        const rawVoice = (config.voiceName || "").trim();
        const voiceToUse = validFemaleVoices.includes(rawVoice) ? rawVoice : "Kore";

        try {
          liveSession = await ai.live.connect({
            model: "gemini-3.8-live",
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceToUse } },
              },
              systemInstruction: baseInstruction + strictFemaleAndInstantDirective + topicContext,
              inputAudioTranscription: {},
              outputAudioTranscription: {},
              realtimeInputConfig: {
                automaticActivityDetection: {
                  disabled: false,
                  startOfSpeechSensitivity: StartSensitivity.START_SENSITIVITY_HIGH,
                  endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_HIGH,
                  silenceDurationMs: 250,
                  prefixPaddingMs: 80,
                },
                activityHandling: ActivityHandling.START_OF_ACTIVITY_INTERRUPTS,
              },
            },
            callbacks: {
              onopen: () => {
                if (!isClosed && clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(JSON.stringify({ type: "connected", voice: voiceToUse }));
                }
              },
              onmessage: (serverMessage: LiveServerMessage) => {
                if (isClosed || clientWs.readyState !== WebSocket.OPEN) return;

                // 1. Voice activity events
                if (serverMessage.voiceActivity?.voiceActivityType === "ACTIVITY_START") {
                  clientWs.send(JSON.stringify({ type: "vad", activity: "start" }));
                } else if (serverMessage.voiceActivity?.voiceActivityType === "ACTIVITY_END") {
                  clientWs.send(JSON.stringify({ type: "vad", activity: "end" }));
                }

                // 2. Audio chunks (only send once from modelTurn parts)
                const parts = serverMessage.serverContent?.modelTurn?.parts || [];
                for (const part of parts) {
                  if (part.inlineData?.data) {
                    clientWs.send(JSON.stringify({ type: "audio", data: part.inlineData.data }));
                  }
                }

                // 3. Interruption (Barge-in)
                if (serverMessage.serverContent?.interrupted) {
                  clientWs.send(JSON.stringify({ type: "interrupted" }));
                }

                // 4. Turn Complete
                if (serverMessage.serverContent?.turnComplete) {
                  clientWs.send(JSON.stringify({ type: "turnComplete" }));
                }

                // 5. Transcriptions
                const companionText =
                  serverMessage.serverContent?.outputTranscription?.text ||
                  serverMessage.serverContent?.modelTurn?.parts?.find((p) => p.text)?.text;
                if (companionText && companionText.trim()) {
                  clientWs.send(
                    JSON.stringify({ type: "transcript", role: "zoya", text: companionText.trim() })
                  );
                }

                const userTranscription = serverMessage.serverContent?.inputTranscription?.text;
                if (userTranscription && userTranscription.trim()) {
                  clientWs.send(
                    JSON.stringify({ type: "transcript", role: "user", text: userTranscription.trim() })
                  );
                }
              },
              onclose: (event: any) => {
                if (!isClosed && clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(
                    JSON.stringify({
                      type: "close",
                      reason: event?.reason || "",
                      code: event?.code,
                    })
                  );
                }
              },
              onerror: (err: any) => {
                if (!isClosed && clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(
                    JSON.stringify({
                      type: "error",
                      message: err?.message || "Live API error",
                      code: (err as any)?.code,
                    })
                  );
                }
              },
            },
          });
        } catch (connErr: any) {
          console.error("Live session connect error:", connErr);
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(
              JSON.stringify({
                type: "error",
                message: connErr?.message || "Live connection failed",
                code: connErr?.code,
              })
            );
          }
        }
      } else if (msg.type === "audio") {
        if (liveSession && msg.data) {
          liveSession.sendRealtimeInput({
            audio: { data: msg.data, mimeType: "audio/pcm;rate=16000" },
          });
        }
      } else if (msg.type === "text") {
        if (liveSession && msg.text) {
          liveSession.sendRealtimeInput({ text: msg.text });
        }
      } else if (msg.type === "updateTopic") {
        if (liveSession && msg.topic) {
          liveSession.sendRealtimeInput({
            text: `[SYSTEM: Active topic or focus updated to: "${msg.topic}". Weave naturally into conversation in your own sweet, casual speaking style.]`,
          });
        }
      }
    } catch (parseError) {
      console.warn("WebSocket incoming message parse warning:", parseError);
    }
  });

  clientWs.on("close", () => {
    cleanupSession();
  });

  clientWs.on("error", (err) => {
    console.error("Client WebSocket error:", err);
    cleanupSession();
  });
});

// Route WebSocket upgrades for Live API
server.on("upgrade", (request, socket, head) => {
  const { pathname } = new URL(request.url || "", `http://${request.headers.host || "localhost"}`);
  if (pathname === "/api/live-ws") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  }
});

// -------------------------------------------------------------
// Vite Dev Middlewares (Dev) vs Static Assets (Production)
// -------------------------------------------------------------
async function setupServer() {
  const isDev = process.env.NODE_ENV !== "production";

  if (isDev) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server listening on port ${port} (mode: ${isDev ? "development" : "production"})`);
  });
}

setupServer().catch((err) => {
  console.error("Failed to start full-stack server:", err);
  process.exit(1);
});
