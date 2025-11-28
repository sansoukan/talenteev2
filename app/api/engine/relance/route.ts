import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/* ============================================================
   🌍 MULTILINGUAL VOICE MAP
============================================================ */
const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY!;
const ELEVEN_MODEL = "eleven_multilingual_v2";

const VOICES: Record<string,string> = {
  en: process.env.NOVA_VOICE_EN || "nova_en",
  fr: process.env.NOVA_VOICE_FR || "nova_fr",
  es: process.env.NOVA_VOICE_ES || "nova_es",
  it: process.env.NOVA_VOICE_IT || "nova_it",
  de: process.env.NOVA_VOICE_DE || "nova_de",
  zh: process.env.NOVA_VOICE_ZH || "nova_zh",
  ko: process.env.NOVA_VOICE_KO || "nova_ko"
};

/* ============================================================
   🌍 RELANCE INTROS
============================================================ */
const RELANCE_INTROS: Record<string,string[]> = {
  en: ["Let me reframe this.", "Think it through with me.", "Try this angle.", "Here’s another way."],
  fr: ["Laissez-moi reformuler.", "Réfléchissons ensemble.", "Voici un autre angle.", "Essayez cette approche."],
  es: ["Déjame reformularlo.", "Piénsalo conmigo.", "Prueba este enfoque.", "Aquí otra perspectiva."],
  it: ["Lascia che riformuli.", "Pensiamoci insieme.", "Prova questo angolo.", "Ecco un’altra via."],
  de: ["Lassen Sie mich das umformulieren.", "Denken wir darüber nach.", "Betrachten wir diesen Ansatz.", "Eine weitere Perspektive."],
  zh: ["让我换一种表达。", "我们一起想想。", "可以从这个角度试试。", "还有这种思路。"],
  ko: ["다르게 표현해볼게요.", "같이 생각해봐요.", "이 관점을 시도해보세요.", "이렇게도 볼 수 있어요."]
};

const RELANCE_FALLBACK: Record<string,string> = {
  en: "Let me put it another way.",
  fr: "Laissez-moi vous le reformuler autrement.",
  es: "Déjame expresarlo de otra forma.",
  it: "Lascia che lo dica diversamente.",
  de: "Lassen Sie mich das anders formulieren.",
  zh: "让我换一种说法。",
  ko: "다른 방식으로 설명해볼게요."
};

/* ============================================================
   🧠 GENERATE RELANCE TEXT (GPT-FREE VERSION)
============================================================ */
function generateRelanceText(q: string, a: string, lang: string, firstname?: string|null) {
  const L = lang.toLowerCase();
  const list = RELANCE_INTROS[L] || RELANCE_INTROS["en"];
  const intro = list[Math.floor(Math.random() * list.length)];
  const fallback = RELANCE_FALLBACK[L] || RELANCE_FALLBACK["en"];

  const namePart = firstname ? `${firstname}, ` : "";
  return `${namePart}${intro} ${fallback}`.trim();
}

/* ============================================================
   🔍 CACHE CHECK
============================================================ */
async function getCachedAudio(question_id: string, lang: string) {
  const { data } = await supabaseAdmin
    .from("nova_relances_audio")
    .select("audio_url")
    .eq("question_id", question_id)
    .eq("lang", lang)
    .maybeSingle();

  return data?.audio_url || null;
}

/* ============================================================
   💾 SAVE AUDIO IN CACHE
============================================================ */
async function saveAudio(question_id: string, lang: string, audio_url: string) {
  await supabaseAdmin
    .from("nova_relances_audio")
    .insert({ question_id, lang, audio_url });
}

/* ============================================================
   🔊 ELEVENLABS TTS
============================================================ */
async function generateTTS(text: string, lang: string, question_id: string) {
  const voice = VOICES[lang] || VOICES["en"];
  const path = `relances/${question_id}_${lang}.mp3`;

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVEN_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text,
          model_id: ELEVEN_MODEL,
          voice_settings: {
            stability: 0.45,
            similarity_boost: 0.7
          }
        })
      }
    );

    if (!res.ok) return null;

    const buffer = Buffer.from(await res.arrayBuffer());

    const { error } = await supabaseAdmin.storage
      .from("nova-audio")
      .upload(path, buffer, {
        contentType: "audio/mpeg",
        upsert: true
      });

    if (error) {
      console.error("❌ Upload error:", error);
      return null;
    }

    const { data: publicUrl } = await supabaseAdmin.storage
      .from("nova-audio")
      .getPublicUrl(path);

    return publicUrl.publicUrl;
  } catch (err) {
    console.error("❌ TTS error:", err);
    return null;
  }
}

/* ============================================================
   🚀 MAIN ROUTE — RELANCE V4
============================================================ */
export async function POST(req: NextRequest) {
  try {
    const {
      session_id,
      question_id,
      question_text,
      user_answer_text,
      lang = "en",
      firstname = null
    } = await req.json();

    if (!session_id || !question_id) {
      return NextResponse.json(
        { error: "Missing session_id or question_id" },
        { status: 400 }
      );
    }

    const L = lang.toLowerCase();

    /* 1️⃣ TEXT */
    const relance_text = generateRelanceText(
      question_text || "",
      user_answer_text || "",
      L,
      firstname
    );

    /* 2️⃣ CACHE */
    const cachedAudio = await getCachedAudio(question_id, L);
    if (cachedAudio) {
      return NextResponse.json({
        ok: true,
        relance_text,
        audio_url: cachedAudio,
        cached: true
      });
    }

    /* 3️⃣ GENERATE TTS */
    const audio_url = await generateTTS(relance_text, L, question_id);

    if (audio_url) {
      await saveAudio(question_id, L, audio_url);
    }

    return NextResponse.json({
      ok: true,
      relance_text,
      audio_url,
      cached: false
    });
  } catch (err) {
    console.error("❌ relance error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}