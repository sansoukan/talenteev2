// /src/app/api/engine/audio-question/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const ELEVEN_API_KEY = process.env.ELEVENLABS_API_KEY!;
const ELEVEN_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "nova_default_voice";
const ELEVEN_MODEL_ID = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";

/**
 * 🔊 audio-question
 * -----------------------------
 * INPUT:
 *   { question_id, text, lang }
 *
 * OUTPUT:
 *   { ok, audio_url, cached }
 *
 * Fonction :
 *   1. Vérifier si un audio est déjà généré (cache table + storage)
 *   2. Sinon → générer via ElevenLabs
 *   3. Upload MP3 dans bucket nova-audio
 *   4. Sauvegarde DB
 */
export async function POST(req: NextRequest) {
  try {
    const { question_id, text, lang } = await req.json();

    if (!question_id || !text || !lang) {
      return NextResponse.json(
        { error: "Missing question_id, text or lang" },
        { status: 400 }
      );
    }

    const normalizedLang = String(lang).trim().toLowerCase();

    /* ----------------------------------------------------------
     * 1️⃣ Vérification du cache (DB)
     * ---------------------------------------------------------- */
    const { data: existing, error: dbErr } = await supabaseAdmin
      .from("nova_question_audio")
      .select("audio_url")
      .eq("question_id", question_id)
      .eq("lang", normalizedLang)
      .maybeSingle();

    if (dbErr) {
      console.warn("⚠️ Error reading nova_question_audio:", dbErr.message);
    }

    if (existing?.audio_url) {
      console.log(`🎧 Cache HIT → ${question_id} [${normalizedLang}]`);
      return NextResponse.json({
        ok: true,
        audio_url: existing.audio_url,
        cached: true,
      });
    }

    console.log(`🎧 Cache MISS → génération ElevenLabs pour ${question_id} [${normalizedLang}]`);

    if (!ELEVEN_API_KEY) {
      console.error("❌ ELEVENLABS_API_KEY missing");
      return NextResponse.json({ error: "ELEVENLABS_API_KEY missing" }, { status: 500 });
    }

    /* ----------------------------------------------------------
     * 2️⃣ Génération ElevenLabs
     * ---------------------------------------------------------- */
    const ttsRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE_ID}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVEN_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: ELEVEN_MODEL_ID,
          voice_settings: {
            stability: 0.45,
            similarity_boost: 0.7,
          },
        }),
      }
    );

    if (!ttsRes.ok) {
      const err = await ttsRes.text();
      console.error("❌ ElevenLabs error:", err);
      return NextResponse.json({ error: "TTS generation failed" }, { status: 500 });
    }

    const audioBuffer = Buffer.from(await ttsRes.arrayBuffer());

    /* ----------------------------------------------------------
     * 3️⃣ Upload dans Storage
     * ---------------------------------------------------------- */
    const path = `${question_id}/${normalizedLang}.mp3`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("nova-audio")
      .upload(path, audioBuffer, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error("❌ Upload error:", uploadError.message);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    const { data: publicUrl } = supabaseAdmin.storage
      .from("nova-audio")
      .getPublicUrl(path);

    const audio_url = publicUrl.publicUrl;

    /* ----------------------------------------------------------
     * 4️⃣ Sauvegarde DB
     * ---------------------------------------------------------- */
    const { error: insertErr } = await supabaseAdmin
      .from("nova_question_audio")
      .insert({
        question_id,
        lang: normalizedLang,
        audio_url,
      });

    if (insertErr) {
      console.warn("⚠️ Insert nova_question_audio failed:", insertErr.message);
      // On continue, car le fichier est déjà dans Storage
    }

    console.log(`✅ Audio généré et stocké → ${audio_url}`);

    return NextResponse.json({
      ok: true,
      audio_url,
      cached: false,
    });
  } catch (err: any) {
    console.error("💥 audio-question fatal error:", err?.message || err);
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}