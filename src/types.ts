export interface AppConfig {
  apiKey: string;
  userName: string;
  assistantName: string;
  systemPrompt: string;
}

export type AppState = "idle" | "listening" | "processing" | "speaking" | "reconnecting";
