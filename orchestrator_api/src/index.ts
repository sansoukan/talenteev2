/**
 * Nova Engine — Orchestrateur V20 (Fallback Vidéo Intelligent + Séquence Fixe)
 * -------------------------------------------------------------------------------
 * ✅ q_0001 forcée
 * ✅ 5 questions domain=general
 * ✅ 7 questions diff=1, 5 diff=2, 5 diff=3
 * ✅ Cascade adaptative (si manque → prend dans niveau supérieur)
 * ✅ Fallback vidéo : si une question n’a pas de vidéo, on en tire une autre
 * ✅ Aucune répétition (via mémoire)
 * ✅ Mise à jour last_used_at
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/* ---------- Types ---------- */
interface Profile {
  id: string;
  segment: string | null;
  career_stage: string | null;
  goal: string | null;
  sub_domain: string | null;
}

/* ---------- Helpers ---------- */
const CAREER_FALLBACK: Record<string, string | null> = {
  student: "graduate",
  graduate: "professional",
  professional: "manager",
  manager: "exec",
  exec: null,
  other: "professional",
};

function getCareerFallback(current: string | null): string | null {
  if (!current) return null;
  return CAREER_FALLBACK[current] ?? null;
}

async function fetchQuestions(
  where: Record<string, any>,
  usedIds: string[],
  limit = 5
) {
  const base = supabaseAdmin
    .from("nova_questions")
    .select("*")
    .eq("is_active", true)
    .not("question_id", "in", `(${usedIds.join(",") || "'0'"})`);

  let q = base;
  Object.entries(where).forEach(([key, val]) => {
    if (Array.isArray(val)) q = q.contains(key, val);
    else if (val === null) q = q.is(key, null);
    else q = q.eq(key, val);
  });

  const { data } = await q.order("ordre_par_defaut", { ascending: true }).limit(limit);
  return data ?? [];
}

function filterWithVideo(questions: any[]): any[] {
  return questions.filter((q) => q.video_url_en || q.video_url_fr);
}

/* ---------- Main orchestrator ---------- */
export async function POST(req: NextRequest) {
  try {
    const { session_id } = await req.json();
    if (!session_id)
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 });

    // 1️⃣ Charger session + profil
    const { data: session, error: sesErr } = await supabaseAdmin
      .from("nova_sessions")
      .select(
        "*, profiles!inner(id, segment, career_stage, goal, sub_domain, goal_type)"
      )
      .eq("id", session_id)
      .single();

    if (sesErr || !session)
      return NextResponse.json({ error: "Session not found" }, { status: 404 });

    const profile = session.profiles as Profile;
    const segment = profile.segment || "elite";
    const stage =
      segment === "operational"
        ? "other"
        : (profile?.career_stage ?? "graduate").toLowerCase();
    const domain = (profile?.goal ?? "general").toLowerCase();
    const subDomain = (profile?.sub_domain ?? null)?.toLowerCase();

    console.log("🎯 Profil détecté :", { segment, stage, domain, subDomain });

    // 2️⃣ Lire la mémoire des questions déjà posées
    const { data: memory } = await supabaseAdmin
      .from("nova_memory")
      .select("question_id")
      .eq("session_id", session_id);

    const askedIds = (memory ?? []).map((m) => m.question_id).filter(Boolean);

    /* ======================================================
     🔹 Première question forcée (q_0001)
     ====================================================== */
    if (!askedIds.length) {
      console.log("🟢 Première question forcée → q_0001");
      const { data: q1 } = await supabaseAdmin
        .from("nova_questions")
        .select("*")
        .eq("question_id", "q_0001")
        .eq("is_active", true)
        .maybeSingle();

      if (!q1)
        return NextResponse.json({ error: "Question q_0001 not found" }, { status: 404 });

      await supabaseAdmin
        .from("nova_questions")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", q1.id);

      return NextResponse.json({
        action: "INIT_Q1",
        session_id,
        question: q1,
      });
    }

    /* ======================================================
     🔹 Séquence complète (avec fallback vidéo)
     ====================================================== */
    const ordered: any[] = [];

    // ---------- Bloc général (5 questions)
    let general = await fetchQuestions(
      {
        domain: "general",
        segment: [segment],
        career_target: [stage],
        difficulty: [1, 2, 3],
      },
      askedIds,
      5
    );

    // ✅ Fallback vidéo
    if (general?.length) {
      const valid = filterWithVideo(general);
      const missing = 5 - valid.length;
      if (missing > 0) {
        console.warn(`⚠️ ${missing} general questions sans vidéo → fallback`);
        const replacements = await fetchQuestions(
          {
            domain: "general",
            segment: [segment],
            career_target: [stage],
            difficulty: [1, 2, 3],
          },
          askedIds.concat(valid.map((q) => q.question_id)),
          missing
        );
        general = [...valid, ...filterWithVideo(replacements)];
      } else {
        general = valid;
      }
    }

    ordered.push(...(general ?? []));
    console.log(`🧩 Bloc général : ${ordered.length} questions`);

    // ---------- Difficultés planifiées
    const plan = [
      { level: 1, count: 7 },
      { level: 2, count: 5 },
      { level: 3, count: 5 },
    ];

    let used = [...askedIds, ...ordered.map((q) => q.question_id)];

    for (let i = 0; i < plan.length; i++) {
      const { level, count } = plan[i];
      const remainingLevels = plan.slice(i + 1);

      console.log(`🎯 Tirage difficulté ${level} (${count} questions)`);

      let set = await fetchQuestions(
        {
          domain,
          sub_domain: subDomain,
          segment: [segment],
          career_target: [stage],
          difficulty: level,
        },
        used,
        count
      );

      // ✅ Filtrer les questions avec vidéo
      set = filterWithVideo(set);
      let missing = count - (set?.length || 0);

      // 🔁 Si insuffisant → compléter avec niveaux supérieurs
      if (missing > 0 && remainingLevels.length) {
        for (const r of remainingLevels) {
          console.log(`⚠️ Manque ${missing} questions → tirage à diff ${r.level}`);
          const supplement = await fetchQuestions(
            {
              domain,
              sub_domain: subDomain,
              segment: [segment],
              career_target: [stage],
              difficulty: r.level,
            },
            used.concat(set.map((q) => q.question_id)),
            missing
          );
          const validSupp = filterWithVideo(supplement);
          if (validSupp.length) {
            set.push(...validSupp);
            missing = count - set.length;
            if (missing <= 0) break;
          }
        }
      }

      ordered.push(...(set ?? []));
      used = used.concat(set.map((q) => q.question_id));
      console.log(`✅ Difficulté ${level} finale : ${set?.length || 0} questions`);
    }

    // 3️⃣ Mise à jour last_used_at
    if (ordered.length) {
      const ids = ordered.map((q) => q.id);
      await supabaseAdmin
        .from("nova_questions")
        .update({ last_used_at: new Date().toISOString() })
        .in("id", ids);
    }

    // 4️⃣ Sauvegarde séquence complète
    await supabaseAdmin
      .from("nova_sessions")
      .update({
        questions: ordered,
        total_questions: ordered.length,
        duration_target: 20 * 60, // 20 min
      })
      .eq("id", session_id);

    console.log(`✅ Séquence générée (${ordered.length} questions)`);

    return NextResponse.json({
      action: "INIT_SEQUENCE",
      session_id,
      total_questions: ordered.length,
      duration_target: 20 * 60,
      questions: ordered.map((q) => ({
        id: q.id,
        question_id: q.question_id,
        difficulty: q.difficulty,
        domain: q.domain,
        sub_domain: q.sub_domain,
        segment: q.segment,
        career_target: q.career_target,
        video_url_en: q.video_url_en,
        video_url_fr: q.video_url_fr,
      })),
    });
  } catch (err: any) {
    console.error("❌ Orchestrator error:", err);
    return NextResponse.json(
      { error: err.message ?? "Server error" },
      { status: 500 }
    );
  }
}
