/***********************************************************************
 🔥 NOVA ENGINE — ORCHESTRATE V36 (CTO GOOGLE, FULL FIX)
 Objectifs :
 - INIT_Q1 propre (questions: [q1])
 - Correction askedIds (ignore UUID, nettoie invalides)
 - nextQuestions alignées avec FlowController V3
 - Normalisation vidéo object → string
 - Format FINAL strict pour NovaEngine_Playlist
************************************************************************/

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/* ----------------------------------------------------------
 * Helper — Normalize video fields
 * ---------------------------------------------------------- */
function normalizeQuestion(q: any): any {
  if (!q) return q;
  const clone = { ...q };
  for (const k of Object.keys(clone)) {
    if (typeof clone[k] === "object" && clone[k]?.url) {
      clone[k] = clone[k].url;
    }
  }
  return clone;
}

/* ----------------------------------------------------------
 * CAREER PYRAMIDS
 * ---------------------------------------------------------- */
const PYRAMID_ELITE = {
  exec: ["exec", "manager", "professional", "graduate", "student"],
  manager: ["manager", "professional", "graduate", "student"],
  professional: ["professional", "graduate", "student"],
  graduate: ["graduate", "student"],
  student: ["student"],
};

const PYRAMID_OP = {
  op_supervisor: ["op_supervisor", "op_experienced", "op_junior", "op_entry"],
  op_experienced: ["op_experienced", "op_junior", "op_entry"],
  op_junior: ["op_junior", "op_entry"],
  op_entry: ["op_entry"],
};

const DIFF_CASCADE = {
  1: [1, 2, 3],
  2: [2, 1, 3],
  3: [3, 2, 1],
};

const DOMAIN_FALLBACK: Record<string, string[]> = {
  marketing: ["general"],
  sales: ["general"],
  finance: ["general"],
  consulting: ["general"],
  tech: ["general"],
  hr: ["general"],
  legal: ["general"],
  product: ["general"],
  ops: ["general"],
  supply_chain: ["general"],
  production: ["general"],
  accounting: ["general"],
  banking: ["general"],
  general: ["general"],
};

/* ----------------------------------------------------------
 * MAIN ORCHESTRATOR
 * ---------------------------------------------------------- */
export async function POST(req: Request) {
  try {
    const { session_id } = await req.json();

    if (!session_id) {
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
    }

    /* 1️⃣ Charger session + profil utilisateur */
    const { data: session } = await supabaseAdmin
      .from("nova_sessions")
      .select(
        `
          *,
          profiles:profiles!inner(
            id, prenom, segment, career_stage, domain, sub_domain
          )
        `
      )
      .eq("id", session_id)
      .maybeSingle();

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const profile = session.profiles;

    const user_id = session.user_id;
    const firstname = profile?.prenom || null;

    const lang = session.lang || "en";
    const simulation_mode =
      session.simulation_mode || (lang === "en" ? "video" : "audio");

    const domain = profile.domain || "general";

    /* Nettoyage subdomain */
    const rawSub = profile.sub_domain;
    const subDomain =
      rawSub && typeof rawSub === "string" && rawSub.trim() !== ""
        ? rawSub.trim()
        : null;

    const segment = profile.segment;
    const isOperational = segment === "operational";

    const primaryCareerTarget = isOperational
      ? profile.career_stage || "op_entry"
      : profile.career_stage || "student";

    const pyramid = isOperational
      ? PYRAMID_OP[primaryCareerTarget] || ["op_entry"]
      : PYRAMID_ELITE[primaryCareerTarget] || ["student"];

    /* ----------------------------------------------------------
     * 2️⃣ Charger memory et filtrer VRAIS question_id (PATCH)
     * ---------------------------------------------------------- */
    const { data: mem } = await supabaseAdmin
      .from("nova_memory")
      .select("question_id")
      .eq("user_id", user_id);

    let askedIds =
      (mem || [])
        .map((m) => m.question_id)
        .filter(
          (id: string) =>
            typeof id === "string" &&
            id.startsWith("q_") &&
            /^[a-zA-Z0-9_]+$/.test(id)
        ) || [];

    // 🔥 Nettoyage + suppression doublons
    askedIds = Array.from(new Set(askedIds.filter(Boolean)));

    console.log("🧹 askedIds filtrés:", askedIds);

    /* ----------------------------------------------------------
     * 3️⃣ INIT_Q1 propre
     * ---------------------------------------------------------- */
    if (!askedIds.length && !session.detail?.init_q1_sent) {
      const { data: q1 } = await supabaseAdmin
        .from("nova_questions")
        .select("*")
        .eq("question_id", "q_0001")
        .eq("is_active", true)
        .maybeSingle();

      const q1Norm = normalizeQuestion(q1);

      await supabaseAdmin
        .from("nova_sessions")
        .update({
          detail: { ...(session.detail || {}), init_q1_sent: true },
          questions: [q1Norm],
          total_questions: 1,
        })
        .eq("id", session_id);

      return NextResponse.json({
        action: "INIT_Q1",
        session_id,
        user_id,
        lang,
        simulation_mode,
        firstname,
        type_entretien: session.type_entretien,

        // ✔ TOUJOURS LISTE
        questions: [q1Norm],
        total_questions: 1,

        // ✔ Compat FlowController
        question: q1Norm,
      });
    }

    /* ----------------------------------------------------------
     * 4️⃣ Sélection générale
     * ---------------------------------------------------------- */
    async function fetchQuestions({
      domain,
      subDomain,
      difficulties,
      careerTargets,
      usedIds,
      limit,
    }: any) {
      const safeUsed = usedIds.length
        ? usedIds.map((x: string) => `'${x}'`).join(",")
        : "'0'";

      let q = supabaseAdmin
        .from("nova_questions")
        .select(
          `
            id, question_id, domain, sub_domain, difficulty,
            career_target, probability,
            question_en, question_fr,
            video_url_en, video_url_fr,
            audio_prompt_en, audio_prompt_fr,
            text_en, text_fr
          `
        )
        .eq("is_active", true)
        .not("question_id", "in", `(${safeUsed})`);

      q = q.eq("domain", domain);

      if (subDomain) q = q.eq("sub_domain", subDomain);
      if (difficulties?.length) q = q.in("difficulty", difficulties);
      if (careerTargets?.length) q = q.contains("career_target", careerTargets);

      const { data } = await q
        .order("probability", { ascending: false })
        .limit(limit);

      return (data || []).map(normalizeQuestion);
    }

    /* ----------------------------------------------------------
     * 5️⃣ Construction séquence finale
     * ---------------------------------------------------------- */
    const finalQuestions: any[] = [];
    let used = [...askedIds];

    /* --- GENERAL (12 questions max) --- */
    for (const lvl of [1, 2, 3]) {
      const set = await fetchQuestions({
        domain: "general",
        subDomain: null,
        difficulties: DIFF_CASCADE[lvl],
        careerTargets: pyramid,
        usedIds: used,
        limit: 4,
      });

      finalQuestions.push(...set);
      used.push(...set.map((q) => q.question_id));
    }

    /* --- DOMAIN-SPECIFIC --- */
    const DIFF_PLAN = [
      { lvl: 1, count: 7 },
      { lvl: 2, count: 5 },
      { lvl: 3, count: 5 },
    ];

    for (const block of DIFF_PLAN) {
      let left = block.count;

      const primary = await fetchQuestions({
        domain,
        subDomain,
        difficulties: DIFF_CASCADE[block.lvl],
        careerTargets: pyramid,
        usedIds: used,
        limit: left,
      });

      finalQuestions.push(...primary);
      used.push(...primary.map((q) => q.question_id));
      left -= primary.length;

      if (left > 0) {
        for (const fbDomain of DOMAIN_FALLBACK[domain] || ["general"]) {
          if (left <= 0) break;

          const extra = await fetchQuestions({
            domain: fbDomain,
            subDomain: null,
            difficulties: DIFF_CASCADE[block.lvl],
            careerTargets: pyramid,
            usedIds: used,
            limit: left,
          });

          finalQuestions.push(...extra);
          used.push(...extra.map((q) => q.question_id));
          left -= extra.length;
        }
      }
    }

    /* ----------------------------------------------------------
     * 6️⃣ delete internal UUIDs
     * ---------------------------------------------------------- */
    finalQuestions.forEach((q) => {
      delete q.id;
    });

    /* ----------------------------------------------------------
     * 7️⃣ Save sequence into session
     * ---------------------------------------------------------- */
    await supabaseAdmin
      .from("nova_sessions")
      .update({
        questions: finalQuestions,
        total_questions: finalQuestions.length,
        duration_target: 20 * 60,
      })
      .eq("id", session_id);

    /* ----------------------------------------------------------
     * 8️⃣ Return FINAL payload (NovaEngine-ready)
     * ---------------------------------------------------------- */
    return NextResponse.json({
      action: "INIT_SEQUENCE",
      session_id,
      user_id,
      lang,
      firstname,
      simulation_mode,
      type_entretien: session.type_entretien,

      questions: finalQuestions,
      total_questions: finalQuestions.length,
    });
  } catch (err: any) {
    console.error("❌ Orchestrate V36 Error:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}