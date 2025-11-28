// lib/voice-utils.ts
// ===============================================================
//  Nova Voice Utils — Dedicated WebSocket STT (CTO V4)
// ===============================================================
//
//  ✔ Compatible Ngrok, Render, Vercel
//  ✔ Zero conflict with Next.js
//  ✔ Same API you already use (onTranscript, onSilence, onSpeaking)
//  ✔ Just change WS_URL → REAL STT server (not Next.js)
// ===============================================================

let STT_WS: WebSocket | null = null;
let TRANSCRIPTION_ENABLED = false;

/* ---------------------------------------------------------------
   Disable transcription (cleanup)
---------------------------------------------------------------- */
export function disableNovaTranscription() {
  TRANSCRIPTION_ENABLED = false;

  if (STT_WS) {
    try {
      STT_WS.close();
    } catch {}
  }

  STT_WS = null;
}

/* ---------------------------------------------------------------
   Start realtime STT (MAIN FUNCTION)
---------------------------------------------------------------- */
export async function startNovaTranscription({
  sessionId,
  userId,
  onTranscript,
  onSilence,
  onSpeaking,
}: {
  sessionId: string;
  userId: string;
  onTranscript: (t: string) => void;
  onSilence: (m: any) => void;
  onSpeaking: () => void;
}) {
  disableNovaTranscription();
  TRANSCRIPTION_ENABLED = true;

  /* -------------------------------------------
     1. USE DEDICATED STT WS SERVER
  -------------------------------------------- */
  const WS_BASE = process.env.NEXT_PUBLIC_STT_WS_URL;

  if (!WS_BASE) {
    console.error("❌ ERROR: NEXT_PUBLIC_STT_WS_URL not set");
    return;
  }

  const WS_URL = `${WS_BASE}?session_id=${sessionId}&user_id=${userId}`;

  console.log("🔵 Connecting STT WebSocket:", WS_URL);

  /* -------------------------------------------
     2. CONNECT
  -------------------------------------------- */
  try {
    STT_WS = new WebSocket(WS_URL);
  } catch (e) {
    console.error("❌ Cannot create WebSocket:", e);
    return;
  }

  /* -------------------------------------------
     3. EVENTS
  -------------------------------------------- */
  STT_WS.onopen = () => {
    console.log("🔵 STT WebSocket connected");
  };

  STT_WS.onerror = (err) => {
    console.error("❌ STT WebSocket error:", err);
  };

  STT_WS.onclose = () => {
    console.warn("🔵 STT WebSocket closed");
  };

  STT_WS.onmessage = (event) => {
    let msg: any = null;

    try {
      msg = JSON.parse(event.data);
    } catch {
      console.warn("⚠️ Could not parse STT message:", event.data);
      return;
    }

    // Speaking detection
    if (msg.type === "input_audio_buffer.append") {
      onSpeaking();
    }

    // Incremental text
    if (msg.type === "response.output_text.delta") {
      if (msg.text) onTranscript(msg.text);
    }

    // Silence detected → Completed
    if (msg.type === "response.completed") {
      if (msg.metrics) onSilence(msg.metrics);
    }
  };
}

/* ---------------------------------------------------------------
   Stop transcription
---------------------------------------------------------------- */
export function stopNovaTranscription() {
  disableNovaTranscription();
}
