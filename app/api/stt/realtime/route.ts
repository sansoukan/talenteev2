// app/api/stt/realtime/route.ts
import { NextRequest } from "next/server";
import { OpenAI } from "openai";

// IMPORTANT : Node.js runtime obligatoire pour WebSockets en local
export const config = {
  runtime: "nodejs",
};

export default async function handler(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id") || "no-session";
  const userId = searchParams.get("user_id") || "anonymous";

  // WebSocket mandatory
  if (req.headers.get("upgrade") !== "websocket") {
    return new Response("Expected WebSocket", { status: 400 });
  }

  // Upgrade HTTP → WS
  const [clientSocket, serverSocket] = Object.values(
    new WebSocketPair(),
  ) as [WebSocket, WebSocket];

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
  });

  // Connect to OpenAI Realtime API
  const aiSocket = openai.realtime.connect({
    model: "gpt-4o-realtime-preview",
    modalities: ["audio", "text"],
    voice: "alloy",
    instructions: "You are Nova's realtime transcription STT engine.",
  });

  // Client connected
  serverSocket.addEventListener("open", () => {
    console.log("🔊 STT WebSocket connected:", { sessionId, userId });
    serverSocket.send(JSON.stringify({ type: "connected" }));
  });

  // Bridge client → OpenAI
  serverSocket.addEventListener("message", (event) => {
    aiSocket.send(event.data);
  });

  serverSocket.addEventListener("close", () => {
    console.log("🔇 STT client closed");
    aiSocket.close();
  });

  // Bridge OpenAI → client
  aiSocket.addEventListener("message", (event: any) => {
    serverSocket.send(event.data);
  });

  // WebSocket upgrade response
  return new Response(null, {
    status: 101,
    webSocket: clientSocket,
  });
}