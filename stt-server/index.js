// stt-server/index.js
// ===============================================================
// 🔵 Nova STT WebSocket Server — Stable CTO Version
// ===============================================================

import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";

const PORT = process.env.STT_PORT || 3030;

const app = express();
app.use(cors());

app.get("/", (req, res) => {
  res.send("Nova STT WebSocket server running");
});

const server = app.listen(PORT, () => {
  console.log(`🔵 STT server listening on port ${PORT}`);
});

// WebSocket server
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("🔵 Client connected to STT WebSocket");

  ws.on("message", (msgBuff) => {
    const text = msgBuff.toString();

    // Simule une transcription : renvoie un delta
    ws.send(JSON.stringify({
      type: "response.output_text.delta",
      text: text
    }));

    // Simule un speaking event
    ws.send(JSON.stringify({
      type: "input_audio_buffer.append"
    }));

    // Simule un silence final
    ws.send(JSON.stringify({
      type: "response.completed",
      metrics: { silence: true }
    }));
  });

  ws.on("close", () => {
    console.log("🔵 Client disconnected");
  });
});
