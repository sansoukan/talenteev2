import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Nova RH – API Anti-GPT V4
 * --------------------------
 * Analyse multimodale : texte + signaux audio/visuels
 * Évalue la probabilité que la réponse provienne d'un humain
 * et la qualité comportementale (authenticité, confiance, engagement).
 */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: NextRequest) {
  const start = Date.now();

  try {
    const { session_id, user_id, text, emotions } = await req.json();

    if (!session_id || !user_id) {
      return NextResponse.json(
        { error: "Missing session_id or user_id" },
        { status: 400 }
      );
    }

    // 🧩 Sécurisation des données reçues
    const safeText = text?.slice(0, 1500) || "";
    const e = emotions || {};

    // 1️⃣ Construction du prompt d’analyse multimodale
    const prompt = `
Tu es un expert en détection d'authenticité humaine dans des entretiens vidéo.
Analyse la réponse suivante et les signaux observés.

Texte de la réponse :
"${safeText || "Aucune transcription fournie"}"

Signaux observés :
- Émotion dominante : ${e.emotion || "inconnue"}
- Confiance de l'émotion : ${e.confidence ?? "?"}
- Posture : ${e.posture_score ?? "?"}/100
- Direction du regard : ${e.gaze_direction || "?"}
- Contact visuel : ${e.eye_contact ?? "?"}%
- Stabilité du regard : ${e.gaze_stability ?? "?"}%
- Stress estimé : ${e.stress ?? "?"}

Analyse :
- Une voix ou posture très régulière sans hésitations suggère une IA.
- Trop de fluidité ou de perfection = IA probable.
- Micro-hésitations, respiration, pauses naturelles = humain.
- Une posture stable mais regard trop fixe = lecture d’un texte.
- L’absence d’émotions détectables = IA ou ton neutre.
- Combiner tous ces signaux pour estimer la probabilité d’un humain réel.

Format de sortie strict JSON :
{
  "human_likelihood": 0-100,
  "authenticity_score": 0-100,
  "confidence_score": 0-100,
  "engagement_score": 0-100,
  "reasoning": "phrase courte expliquant ton évaluation"
}
    `;

    // 2️⃣ Appel GPT (modèle rapide & fiable)
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.25,
    });

    const content = completion.choices[0]?.message?.content?.trim() || "{}";
    let parsed: any;

    try {
      parsed = JSON.parse(content);
    } catch {
      console.warn("⚠️ GPT non-JSON output, fallback activé");
      parsed = {
        human_likelihood: 50,
        authenticity_score: 50,
        confidence_score: 50,
        engagement_score: 50,
        reasoning: "Fallback automatique : format incorrect.",
      };
    }

    // 3️⃣ Insertion dans Supabase (table nova_emotions)
    await supabaseAdmin.from("nova_emotions").insert({
      session_id,
      user_id,
      source: "gpt",
      authenticity_score: parsed.authenticity_score,
      confidence: parsed.confidence_score,
      posture_score: e.posture_score ?? null,
      eye_contact: e.eye_contact ?? null,
      gaze_direction: e.gaze_direction ?? null,
      gaze_stability: e.gaze_stability ?? null,
      tone: e.emotion ?? null,
      stress: e.stress ?? null,
      reasoning: parsed.reasoning,
      created_at: new Date().toISOString(),
    });

    // 4️⃣ Mise à jour de la session globale (synthetic_risk)
    const syntheticRisk = 1 - (parsed.authenticity_score ?? 50) / 100;
    await supabaseAdmin
      .from("nova_sessions")
      .update({ synthetic_risk: syntheticRisk })
      .eq("id", session_id);

    const duration = ((Date.now() - start) / 1000).toFixed(2);

    return NextResponse.json({
      ok: true,
      ...parsed,
      duration,
      message: "✅ Authenticity analysis completed",
    });
  } catch (err: any) {
    console.error("❌ Anti-GPT Error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}