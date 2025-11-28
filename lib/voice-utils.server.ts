/**
 * Nova Voice Utils (Server-Side)
 * ----------------------------------------
 * 🔊 Synthèse vocale : ElevenLabs
 * 🎧 Transcription audio : Deepgram
 * ⚙️ Utilisé uniquement dans les routes API (Node.js)
 */

import fs from "fs";
import path from "path";
import { createClient } from "@deepgram/sdk";

const ELEVENLABS_KEY =
  process.env.ELEVENLABS_API_KEY || process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || "";
const ELEVENLABS_VOICE_ID =
  process.env.ELEVENLABS_VOICE_ID || "nova_voice_en";
const DEEPGRAM_KEY = process.env.DEEPGRAM_API_KEY || "";

/* ============================================================
   🧠 1️⃣ Synthèse vocale — ElevenLabs
   ============================================================ */
export async function speak(
  text: string,
  lang: "fr" | "en" = "en",
  voiceId?: string
): Promise<string | null> {
  try {
    if (!ELEVENLABS_KEY) {
      console.warn("⚠️ Missing ELEVENLABS_API_KEY. Fallback console output.");
      console.log("🗣️", text);
      return null;
    }

    const chosenVoice =
      voiceId ||
      (lang === "fr"
        ? process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID_FR || "21m00Tcm4TlvDq8ikWAM"
        : process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID_EN || "EXAVITQu4vr4xnSDxMaL");

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${chosenVoice}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs API Error: ${await response.text()}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const tmpDir = path.join(process.cwd(), "tmp");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

    const filePath = path.join(tmpDir, `nova_voice_${Date.now()}.mp3`);
    fs.writeFileSync(filePath, buffer);
    console.log(`✅ Voice generated: ${filePath}`);
    return filePath;
  } catch (err) {
    console.error("❌ speak() error:", err);
    return null;
  }
}

/* ============================================================
   🎧 2️⃣ Transcription — Deepgram (verrouillée)
   ============================================================ */
let ALLOW_STT = true; // par défaut autorisé côté API moteur

export function enableServerSTT() {
  ALLOW_STT = true;
}

export function disableServerSTT() {
  ALLOW_STT = false;
}

export async function transcribeAudio(filePath: string): Promise<string> {
  try {
    if (!ALLOW_STT) {
      console.warn("🚫 STT blocked — chat mic disabled on server.");
      return "";
    }

    if (!DEEPGRAM_KEY) {
      console.warn("⚠️ Missing DEEPGRAM_API_KEY, returning empty transcript.");
      return "";
    }

    const deepgram = createClient(DEEPGRAM_KEY);
    const audioBuffer = fs.readFileSync(filePath);

    const { result } = await deepgram.listen.prerecorded.transcribeFile(audioBuffer, {
      model: "nova-2",
      language: "fr",
      smart_format: true,
    });

    const transcript =
      result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
    console.log("🎧 Transcription:", transcript);
    return transcript;
  } catch (err) {
    console.error("❌ transcribeAudio() error:", err);
    return "";
  }
}

/* ============================================================
   🧹 3️⃣ Clean temporary files
   ============================================================ */
export function cleanTempFiles() {
  try {
    const tmpDir = path.join(process.cwd(), "tmp");
    if (!fs.existsSync(tmpDir)) return;
    const files = fs.readdirSync(tmpDir);
    for (const file of files) {
      if (file.endsWith(".mp3")) {
        fs.unlinkSync(path.join(tmpDir, file));
      }
    }
    console.log("🧹 Temporary audio files cleaned.");
  } catch (err) {
    console.error("❌ cleanTempFiles() failed:", err);
  }
}