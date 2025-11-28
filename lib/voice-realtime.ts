import WebSocket from "ws";

export class NovaRealtimeVoice {
  private ws: WebSocket | null = null;
  private connected = false;

  constructor(private lang: string = "en") {}

  async connect() {
    if (this.ws) return;
    try {
      this.ws = new WebSocket("wss://api.elevenlabs.io/v1/realtime");
      this.ws.on("open", () => {
        this.connected = true;
        console.log("🔊 ElevenLabs Realtime connected");
      });
      this.ws.on("message", (msg) =>
        console.log("📡 Voice stream:", msg.toString())
      );
      this.ws.on("close", () => {
        this.connected = false;
        console.log("❌ ElevenLabs Realtime closed");
      });
    } catch (err) {
      console.error("Realtime connection failed:", err);
    }
  }

  async send(text: string) {
    if (this.ws && this.connected) {
      this.ws.send(JSON.stringify({ text }));
    }
  }

  async disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.connected = false;
    }
  }
}