import { NextRequest, NextResponse } from "next/server";
import { Buffer } from "buffer";

export const runtime = "nodejs";

/**
 * ======================================================
 *  🎧 Nova STT Proxy — Whisper + Deepgram fallback (V10)
 * ------------------------------------------------------
 *  POST multipart/form-data { file: File, provider?: "openai"|"deepgram" }
 * ======================================================
 */
export async function POST(req: NextRequest) {
  try {
    const provider = (req.nextUrl.searchParams.get("provider") ?? "openai") as
      | "openai"
      | "deepgram";

    const form = await req.formData();
    const audio = (form.get("file") || form.get("audio")) as File | null;

    // 1️⃣ Vérifications initiales
    if (!audio) {
      console.warn("❌ /api/stt → aucun fichier reçu");
      return NextResponse.json({ error: "Audio file is missing" }, { status: 400 });
    }

    if (!audio.type?.startsWith("audio/")) {
      console.warn("❌ /api/stt → type MIME invalide:", audio.type);
      return NextResponse.json({ error: "Invalid audio type" }, { status: 400 });
    }

    if (audio.size < 2000) {
      console.warn("⚠️ /api/stt → fichier audio trop petit:", audio.size, "bytes");
      return NextResponse.json({ error: "Audio too short or empty" }, { status: 400 });
    }

    console.log(
      `🎧 /api/stt → Fichier reçu (${audio.name || "recording.webm"})`,
      audio.type,
      `${Math.round(audio.size / 1024)}KB`
    );

    let text = "";
    let language: string | null = null;
    let confidence: number | null = null;
    let usedProvider: "openai" | "deepgram" | null = null;

    // 2️⃣ Implémentations internes
    async function tryOpenAI() {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error("OPENAI_API_KEY missing");

      const endpoint = "https://api.openai.com/v1/audio/transcriptions";
      const body = new FormData();
      body.append("file", audio);
      body.append("model", "whisper-1");
      body.append("response_format", "json");

      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body,
      });

      if (!resp.ok) {
        const errText = await resp.text();
        console.error("❌ Whisper STT response:", errText);
        throw new Error(errText);
      }

      const json = await resp.json();
      text = json.text ?? "";
      language = json.language ?? "unknown";
      usedProvider = "openai";
    }

    async function tryDeepgram() {
      const dgKey = process.env.DEEPGRAM_API_KEY;
      if (!dgKey) throw new Error("DEEPGRAM_API_KEY missing");

      const buf = Buffer.from(await audio.arrayBuffer());
      const resp = await fetch("https://api.deepgram.com/v1/listen", {
        method: "POST",
        headers: {
          Authorization: `Token ${dgKey}`,
          "Content-Type": audio.type || "application/octet-stream",
        },
        body: buf,
      });

      if (!resp.ok) {
        const errText = await resp.text();
        console.error("❌ Deepgram STT response:", errText);
        throw new Error(errText);
      }

      const json = await resp.json();
      text = json.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";
      confidence = json.results?.channels?.[0]?.alternatives?.[0]?.confidence ?? null;
      language = json.results?.channels?.[0]?.detected_language ?? "unknown";
      usedProvider = "deepgram";
    }

    // 3️⃣ Execution principale avec fallback
    try {
      if (provider === "deepgram") {
        await tryDeepgram();
      } else {
        await tryOpenAI();
      }
    } catch (err) {
      console.warn("⚠️ Whisper STT failed, fallback to Deepgram:", err);
      try {
        await tryDeepgram();
      } catch (deepErr) {
        console.error("❌ Deepgram fallback failed:", deepErr);
        throw deepErr;
      }
    }

    // 4️⃣ Post-traitement
    const trimmed = text.trim();
    if (!trimmed) {
      console.warn("🤔 Aucun texte détecté (silence ou inaudible).");
    }

    console.log(`✅ STT OK [${usedProvider}] → "${trimmed}"`);
    return NextResponse.json({
      provider: usedProvider,
      text: trimmed,
      language,
      confidence,
      size_bytes: audio.size,
    });
  } catch (e: any) {
    console.error("💥 STT global error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}