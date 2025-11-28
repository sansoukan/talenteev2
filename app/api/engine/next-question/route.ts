import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const { session_id, current_step = 0 } = await req.json();

    if (!session_id)
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 });

    // 1️⃣ Charger la session utilisateur
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("nova_sessions")
      .select("*")
      .eq("id", session_id)
      .single();

    if (sessionError || !session)
      return NextResponse.json({ error: "Session not found" }, { status: 404 });

    const { type_entretien, user_id, lang = "fr", domain, career_stage } = session;

    // 2️⃣ Si c’est une étude de cas
    if (["case_study", "strategic_case"].includes(type_entretien)) {
      const { data: caseData, error: caseError } = await supabaseAdmin
        .from("nova_case_library")
        .select("*")
        .eq("lang", lang)
        .eq("is_active", true)
        .ilike("theme", `%${domain ?? "strategy"}%`)
        .contains("role_targets", [career_stage])
        .limit(1)
        .maybeSingle();

      if (caseError || !caseData) {
        console.warn("⚠️ No matching case found");
        return NextResponse.json({
          action: "COMPLETE",
          message: "No suitable case study found.",
        });
      }

      // 🧠 Liste des questions (Q1→Q5 dynamiques selon la langue)
      const prefix = `question_${lang}`;
      const videoPrefix = `video_q${lang}`;
      const questions = [1, 2, 3, 4, 5]
        .map((i) => ({
          text: caseData[`${prefix}_${i}`],
          video: caseData[`${videoPrefix}_${i}`],
        }))
        .filter((q) => q.text);

      // 📄 Annexes (docs latéraux)
      const annexes = caseData.annexes || [];

      // 🔹 Étape actuelle
      if (current_step === 0) {
        return NextResponse.json({
          action: "CASE_INTRO",
          case_id: caseData.id,
          intro_text: caseData[`intro_${lang}`],
          intro_video: caseData[`video_intro_${lang}`],
          annexes,
          data_block: caseData.data_block_json,
          expected_outcome: caseData.expected_outcome,
          case_theme: caseData.theme,
        });
      }

      if (current_step > 0 && current_step <= questions.length) {
        const q = questions[current_step - 1];
        return NextResponse.json({
          action: "CASE_STEP",
          case_id: caseData.id,
          step_index: current_step,
          question_text: q.text,
          video_url: q.video,
          annexes,
          case_theme: caseData.theme,
        });
      }

      return NextResponse.json({
        action: "COMPLETE",
        message: "Case study complete. Preparing feedback...",
      });
    }

    // 3️⃣ Sinon — Entretien classique
    const { data: questions, error: qErr } = await supabaseAdmin
      .from("nova_questions")
      .select("id, question_fr, question_en, question_es, tags, theme, role, video_url_fr, video_url_en, video_url_es")
      .eq("is_active", true)
      .limit(1)
      .order("random()");

    if (qErr || !questions?.length) {
      return NextResponse.json({
        action: "COMPLETE",
        message: "No more questions available.",
      });
    }

    const q = questions[0];
    const qText =
      lang === "fr"
        ? q.question_fr
        : lang === "es"
        ? q.question_es
        : q.question_en;

    const video_url =
      lang === "fr"
        ? q.video_url_fr
        : lang === "es"
        ? q.video_url_es
        : q.video_url_en;

    return NextResponse.json({
      action: "QUESTION",
      question_id: q.id,
      question_text: qText,
      video_url,
      tags: q.tags,
      theme: q.theme,
      role: q.role,
    });
  } catch (e: any) {
    console.error("❌ next-question error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}