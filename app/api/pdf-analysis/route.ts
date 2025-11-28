// 🚀 Nova PDF Analysis Engine V1 — GPT-5-Chat-Fast
export const runtime = "nodejs";
export const preferredRegion = "home";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

/**
 * POST /api/pdf-analysis
 * body: { sessionId }
 */
export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();
    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    // 1️⃣ Charger transcript et émotions
    const { data: session } = await supabaseAdmin
      .from("nova_sessions")
      .select("transcript_full")
      .eq("id", sessionId)
      .maybeSingle();

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const { data: emotions } = await supabaseAdmin
      .from("nova_emotions")
      .select("stress, confidence")
      .eq("session_id", sessionId);

    const transcript = session.transcript_full || "Aucun transcript disponible.";

    // 2️⃣ Prompt GPT ultra précis
    const prompt = `
Tu es Nova — experte comportementale RH.
Analyse ceci et renvoie STRICTEMENT un JSON valide.

TRANSCRIPT:
${transcript}

EMOTIONS:
${JSON.stringify(emotions || [])}

OBJECTIF:
Créer un résumé comportemental professionnel pour le PDF Nova.

FORMAT JSON EXACT À RESPECTER:

{
  "persona": {
    "type": "Analytique" | "Storyteller" | "Exécutant" | "Leader" | "Adaptatif",
    "strengths": [ "..." ],
    "risks": [ "..." ]
  },
  "emotional_graph": {
    "stress": [0-100],
    "confidence": [0-100]
  },
  "improved_pitch": "string",
  "micro_habits": [ "..." ],
  "answer_quality": {
    "clarity": 1-100,
    "depth": 1-100,
    "alignment_with_expected": 1-100,
    "summary": "string"
  }
}

Renvoie UNIQUEMENT ce JSON. Jamais d'introduction. Jamais de prose.
`;

    // 3️⃣ Appel GPT-5-Chat-Fast
    const completion = await openai.chat.completions.create({
      model: "gpt-5-chat-fast",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 900,
      temperature: 0.3,
    });

    const raw = completion.choices[0].message?.content?.trim() || "{}";

    // 4️⃣ Parse JSON proprement
    let parsed = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      // fallback : GPT a renvoyé du texte avec du code-block
      const cleaned = raw
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      parsed = JSON.parse(cleaned);
    }

    // 5️⃣ Stockage Supabase
    await supabaseAdmin
      .from("nova_pdf_analysis")
      .upsert({
        session_id: sessionId,
        analysis_json: parsed,
      });

    return NextResponse.json({ status: "ok", analysis: parsed });
  } catch (err: any) {
    console.error("❌ /api/pdf-analysis Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}