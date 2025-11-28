import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

/**
 * 🌍 fetchInterviewQuestions — V7 Multilingual
 * ----------------------------------------------------------
 * 🔥 Envoie toutes les colonnes nécessaires pour audio-only :
 *    - question_en, question_fr, question_es, …
 *    - text_en, text_fr, text_es, …
 *    - audio_prompt_en, audio_prompt_fr, …
 *
 * 🎯 Sélection multi-niveaux :
 *    sub_domain → domain → general → fallback final
 *
 * 🧠 Compatible avec simulation_mode (video/audio)
 */

export async function fetchInterviewQuestions({
  segment,
  career_stage,
  domain,
  sub_domain,
  option,
}: {
  segment: string;
  career_stage?: string | null;
  domain: string;
  sub_domain?: string | null;
  option: string;
}) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    const normalizedStage =
      segment === "operational" ? "other" : normalizeStage(career_stage || "");
    const safeDomain = domain || "general";
    const safeSub = sub_domain || null;

    /* =======================================================
       🔥 Colonnes multilingues à renvoyer
       ======================================================= */
    const FULL_SELECT = `
      *,
      question_en, question_fr, question_es, question_it, question_de, question_zh, question_ko,
      text_en, text_fr, text_es, text_it, text_de, text_zh, text_ko,
      audio_prompt_en, audio_prompt_fr, audio_prompt_es, audio_prompt_it, audio_prompt_de, audio_prompt_zh, audio_prompt_ko,
      video_url_en, video_url_fr, video_url_es
    `;

    /* =======================================================
       1️⃣ TENTATIVE PRINCIPALE : domain + sub_domain
       ======================================================= */
    let query = supabase
      .from("nova_questions")
      .select(FULL_SELECT)
      .eq("is_active", true)
      .contains("segment", [segment])
      .contains("career_target", [normalizedStage])
      .eq("type", option)
      .limit(30);

    if (safeSub) {
      query = query.or(`sub_domain.eq.${safeSub},sub_domain.is.null`);
    }

    const { data: primary, error: err1 } = await query.eq("domain", safeDomain);

    if (err1) throw err1;
    if (primary && primary.length > 0) return primary;

    /* =======================================================
       2️⃣ Fallback : domain sans sub_domain
       ======================================================= */
    const { data: noSub, error: err2 } = await supabase
      .from("nova_questions")
      .select(FULL_SELECT)
      .eq("is_active", true)
      .contains("segment", [segment])
      .contains("career_target", [normalizedStage])
      .eq("domain", safeDomain)
      .eq("type", option)
      .limit(30);

    if (err2) throw err2;
    if (noSub && noSub.length > 0) return noSub;

    /* =======================================================
       3️⃣ Fallback : domain = general
       ======================================================= */
    const { data: general, error: err3 } = await supabase
      .from("nova_questions")
      .select(FULL_SELECT)
      .eq("is_active", true)
      .contains("segment", [segment])
      .contains("career_target", [normalizedStage])
      .eq("domain", "general")
      .eq("type", option)
      .limit(30);

    if (err3) throw err3;
    if (general && general.length > 0) return general;

    /* =======================================================
       4️⃣ Fallback ultime (n’importe quelle question active)
       ======================================================= */
    const { data: any, error: err4 } = await supabase
      .from("nova_questions")
      .select(FULL_SELECT)
      .eq("is_active", true)
      .contains("segment", [segment])
      .eq("type", option)
      .limit(20);

    if (err4) throw err4;
    return any || [];
  } catch (err) {
    console.error("❌ Error in fetchInterviewQuestions:", err);
    return [];
  }
}

/* ==================================
   Helpers
   ================================== */
function normalizeStage(stage: string) {
  if (!stage) return "graduate";
  const s = stage.toLowerCase();
  if (s === "mid") return "professional";
  if (s === "exec" || s === "executive") return "manager";
  if (["student", "graduate"].includes(s)) return "graduate";
  if (["manager", "leader"].includes(s)) return "manager";
  if (["professional", "employee"].includes(s)) return "professional";
  return s;
}