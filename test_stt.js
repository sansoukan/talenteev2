// test_stt_v2.js
import fs from "fs";
import fetch from "node-fetch";
import FormData from "form-data";
import { execSync } from "child_process";

const AUDIO_FILE = "./voice_test.wav";
const CONVERTED_FILE = "./voice_test_pcm16.wav";
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const DEEPGRAM_KEY = process.env.DEEPGRAM_API_KEY;

// 1️⃣ Convertit le fichier en PCM16
console.log("🎛 Conversion en WAV PCM16...");
execSync(`ffmpeg -y -i "${AUDIO_FILE}" -ac 1 -ar 16000 -acodec pcm_s16le "${CONVERTED_FILE}"`);
console.log("✅ Conversion terminée :", CONVERTED_FILE);

// 2️⃣ Test OpenAI Whisper
async function testWhisper() {
  console.log("🎧 Envoi du fichier à Whisper...");
  const fd = new FormData();
  fd.append("file", fs.createReadStream(CONVERTED_FILE));
  fd.append("model", "whisper-1");

  const resp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_KEY}` },
    body: fd,
  });

  const raw = await resp.text();
  console.log("🧾 Réponse Whisper :", raw);

  if (!resp.ok) {
    console.error("❌ Whisper error:", raw);
    return null;
  }

  try {
    const json = JSON.parse(raw);
    return json.text?.trim() || "";
  } catch {
    return null;
  }
}

// 3️⃣ Test Deepgram en fallback
async function testDeepgram() {
  console.log("🎧 Envoi du fichier à Deepgram...");
  const buffer = fs.readFileSync(CONVERTED_FILE);
  const resp = await fetch("https://api.deepgram.com/v1/listen", {
    method: "POST",
    headers: {
      Authorization: `Token ${DEEPGRAM_KEY}`,
      "Content-Type": "audio/wav",
    },
    body: buffer,
  });
  const raw = await resp.text();
  console.log("🧾 Réponse Deepgram :", raw);
}

// Exécution
(async () => {
  const whisperText = await testWhisper();
  if (whisperText) {
    console.log("✅ Whisper →", whisperText);
  } else {
    console.log("⚠️ Whisper vide → tentative Deepgram...");
    await testDeepgram();
  }
})();