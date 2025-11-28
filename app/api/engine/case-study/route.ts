import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Nova Engine – Case Study Orchestrator v4
 * ----------------------------------------
 * 🔹 Filtrage intelligent selon profil (domain, stage)
 * 🔹 Pondération IA (tags, skills, séniorité)
 * 🔹 Séquence structurée : Intro → Q1–Q5 → Feedback
 */
export async function POST(req: NextRequest) {
  try {
    const { session_id, user_id, current_step = 0 } = await req.json();
    if (!session_id || !user_id)
      return NextResponse.json({ error: "Missing session_id or user_id" }, { status: 400 });

    // 1️⃣ Charger la session
    const { data: session, error: sesErr } = await supabaseAdmin
      .from("nova_sessions")
      .select("*, lang, type_entretien, domain, career_stage, case_id")
      .eq("id", session_id)
      .single();

    if (sesErr || !session)
      return NextResponse.json({ error: "Session not found" }, { status: 404 });

    const lang = session.lang ?? "en";
    const domain = (session.domain ?? "").toLowerCase();
    const careerStage = (session.career_stage ?? "graduate").toLowerCase();

    // 2️⃣ Profil CV pour affiner le choix
    const { data: cvProfile } = await supabaseAdmin
      .from("nova_cv_profiles")
      .select("domain_focus, seniority, tags, skills")
      .eq("user_id", user_id)
      .maybeSingle();

    const cvDomain = cvProfile?.domain_focus?.toLowerCase() || domain;
    const cvStage = cvProfile?.seniority?.toLowerCase() || careerStage;
    const cvTags = (cvProfile?.tags ?? []).map((t) => t.toLowerCase());
    const cvSkills = (cvProfile?.skills ?? []).map((s) => s.toLowerCase());

    // 3️⃣ Sélection du cas si pas encore lié
    let selectedCase: any = null;
    if (!session.case_id) {
      const { data: cases, error: caseErr } = await supabaseAdmin
        .from("nova_case_library")
        .select("id, theme, tags, role_targets, expected_scope, intro_en, intro_fr, intro_es, video_intro_en, video_intro_fr, annexes, data_block_json")
        .eq("is_active", true)
        // 🔹 Préfiltrage profil
        .or(`theme.eq.${cvDomain},theme.is.null`)
        .or(`role_targets.cs.{${cvStage}},role_targets.is.null`)
        .limit(50);

      if (caseErr) throw caseErr;
      if (!cases?.length)
        return NextResponse.json({ error: "No case available" }, { status: 404 });

      // 🧮 Scoring pondéré
      const scored = cases.map((c) => {
        let score = 1;
        if (c.theme?.toLowerCase() === cvDomain) score += 1.2;
        if ((c.role_targets ?? []).includes(cvStage)) score += 0.8;
        if ((c.tags ?? []).some((t: string) => cvTags.includes(t))) score += 0.5;
        if ((c.tags ?? []).some((t: string) => cvSkills.includes(t))) score += 0.3;
        return { ...c, weight: score };
      });

      const totalWeight = scored.reduce((sum, c) => sum + c.weight, 0);
      const rand = Math.random() * totalWeight;
      let acc = 0;
      selectedCase = scored.find((c) => (acc += c.weight) >= rand) || scored[0];

      // 💾 Sauvegarder le cas choisi
      await supabaseAdmin.from("nova_sessions").update({ case_id: selectedCase.id }).eq("id", session_id);
    } else {
      const { data: caseData } = await supabaseAdmin
        .from("nova_case_library")
        .select("*")
        .eq("id", session.case_id)
        .maybeSingle();
      selectedCase = caseData;
    }

    if (!selectedCase)
      return NextResponse.json({ error: "Failed to select case study" }, { status: 404 });

    // 4️⃣ Mapper les champs selon la langue
    const prefix = lang === "fr" ? "fr" : lang === "es" ? "es" : "en";
    const qFields = Array.from({ length: 5 }, (_, i) => `question_${i + 1}_${prefix}`);
    const vFields = Array.from({ length: 5 }, (_, i) => `video_q${i + 1}_${prefix}`);

    // 5️⃣ Étape 0 → introduction
    if (current_step === 0) {
      return NextResponse.json({
        action: "CASE_INTRO",
        case_id: selectedCase.id,
        theme: selectedCase.theme,
        question_text:
          selectedCase[`intro_${prefix}`] ??
          "Let's begin with your case introduction.",
        video_url: selectedCase[`video_intro_${prefix}`] ?? null,
        annexes: selectedCase.annexes ?? [],
        data_block: selectedCase.data_block_json ?? {},
      });
    }

    // 6️⃣ Étape suivante (Q1 → Q5)
    const qIndex = current_step - 1;
    if (qIndex < qFields.length && selectedCase[qFields[qIndex]]) {
      return NextResponse.json({
        action: "CASE_STEP",
        case_id: selectedCase.id,
        step_index: current_step,
        theme: selectedCase.theme,
        question_text: selectedCase[qFields[qIndex]],
        video_url: selectedCase[vFields[qIndex]] ?? null,
        annexes: selectedCase.annexes ?? [],
        data_block: selectedCase.data_block_json ?? {},
      });
    }

    // 7️⃣ Fin du cas
    await supabaseAdmin
      .from("nova_sessions")
      .update({ status: "awaiting_feedback" })
      .eq("id", session_id);

    return NextResponse.json({
      action: "COMPLETE",
      message: "Case study completed. Nova is preparing your feedback...",
    });
  } catch (err: any) {
    console.error("❌ case-study error:", err);
    return NextResponse.json({ error: err.message ?? "Server error" }, { status: 500 });
  }
}
