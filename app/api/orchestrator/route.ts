import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { buildDecisionPayload } from "@/lib/NovaPromptRouter";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

/** Détection de demande de répétition */
function isRepeatRequest(msg?: string): boolean {
  if (!msg) return false;
  const m = msg.toLowerCase().trim();
  return (
    m.includes("repeat") ||
    m.includes("répète") ||
    m.includes("répéter") ||
    m.includes("j’ai pas compris") ||
    m.includes("tu peux redire") ||
    m.includes("please say again") ||
    m.includes("can you repeat") ||
    m.includes("pardon")
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, session_id, scenario, time_left_sec, history, message } = body;

    // 🟢 0️⃣ Gestion spéciale : demande de répétition
    if (isRepeatRequest(message)) {
      console.log("🔁 Repeat request detected");
      const { data: last } = await supabaseAdmin
        .from("nova_memory")
        .select("question_id, question_text")
        .eq("session_id", session_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (last) {
        return NextResponse.json({
          action: "REPEAT",
          question_id: last.question_id,
          text: last.question_text,
          message: "Repeating last question as requested.",
        });
      }

      return NextResponse.json({
        action: "INFO",
        message: "No previous question found to repeat.",
      });
    }

    // 🔹 1️⃣ Charger analyse CV/Offre si dispo
    let analysis: any = null;
    if (session_id) {
      const { data } = await supabaseAdmin
        .from("nova_analysis")
        .select("result_text")
        .eq("session_id", session_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data?.result_text) {
        try {
          analysis = JSON.parse(data.result_text);
        } catch {
          analysis = { raw: data.result_text };
        }
      }
    }

    // 🔹 2️⃣ Charger le profil utilisateur
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("career_stage, domain, goal, goal_type")
      .eq("id", user_id)
      .maybeSingle();

    // 🔹 3️⃣ Construire payload enrichi pour GPT
    const payload = buildDecisionPayload({
      user_id,
      session_id,
      scenario,
      time_left_sec,
      history,
      analysis,
      profile,
    });

    // 🔹 4️⃣ Premium gate
    if ((scenario.niveau === "2" || scenario.niveau === "3") && time_left_sec <= 0) {
      return NextResponse.json({
        action: "SYNTHESIS",
        id: "premium_gate",
        premium_gate: true,
        fallback: false,
        analysis,
      });
    }

    // 🔹 5️⃣ Appel GPT orchestrateur
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Tu es Nova, recruteur virtuel.
Analyse candidat: ${JSON.stringify(analysis ?? {})}.
Profil: ${JSON.stringify(profile ?? {})}.
Ta mission : renvoyer un JSON strict avec :
{
  "action": "QUESTION" | "RELANCE" | "FEEDBACK" | "SYNTHESIS",
  "id": string,
  "fallback": boolean,
  "premium_gate": boolean
}`,
        },
        { role: "user", content: JSON.stringify(payload) },
      ],
      temperature: 0.4,
    });

    let decision: any = {};
    try {
      decision = JSON.parse(completion.choices[0].message?.content ?? "{}");
    } catch {
      decision = {
        action: "QUESTION",
        id: "fallback_q1",
        fallback: true,
        premium_gate: false,
      };
    }

    // 🔹 6️⃣ Fallback → sélection aléatoire
    if (decision.fallback || !decision.id) {
      const { data: questions } = await supabaseAdmin
        .from("nova_questions")
        .select("id")
        .eq("is_active", true)
        .eq("type", profile?.goal ?? scenario.type)
        .contains("career_target", [profile?.career_stage])
        .contains("domain_target", [profile?.domain])
        .limit(10);

      if (questions?.length) {
        const random = Math.floor(Math.random() * questions.length);
        decision.id = questions[random].id;
        decision.fallback = false;
      } else {
        decision.id = "generic_fallback_q1";
        decision.fallback = true;
      }
    }

    // 🔹 7️⃣ Update "last_used_at"
    if (decision.id && !decision.fallback) {
      await supabaseAdmin
        .from("nova_questions")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", decision.id);
    }

    return NextResponse.json({ ...decision, analysis, profile });
  } catch (e: any) {
    console.error("💥 orchestrator error:", e);
    return NextResponse.json(
      {
        action: "QUESTION",
        id: "hard_fallback",
        fallback: true,
        premium_gate: false,
      },
      { status: 200 }
    );
  }
}