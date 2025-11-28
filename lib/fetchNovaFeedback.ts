"use client";

import { supabase } from "./supabaseClient";

/**
 * fetchNovaFeedback V4
 * ------------------------------------
 * Intelligent textual fallback feedback.
 * Does NOT return videos (only text).
 *
 * Priority:
 * 1) Match by lang + score_level + career_stage + domain + sub_domain
 * 2) Match by lang + score_level + career_stage
 * 3) Match by lang + score_level
 * 4) Default feedback text (English)
 */

export async function fetchNovaFeedback({
  lang = "en",
  scoreLevel = "mid",
  career_stage,
  domain,
  sub_domain,
  theme,
}: {
  lang?: string;
  scoreLevel?: "high" | "mid" | "low";
  career_stage?: string | null;
  domain?: string | null;
  sub_domain?: string | null;
  theme?: string | null;
}): Promise<{ level: string; text: string; source: string }> {
  try {
    // 1️⃣ Base query
    let query = supabase
      .from("nova_feedback_library")
      .select("feedback_text")
      .eq("lang", lang)
      .eq("score_level", scoreLevel);

    // 2️⃣ Optional filters based on user profile
    if (career_stage) query = query.eq("career_stage", career_stage);
    if (domain) query = query.eq("domain", domain);
    if (sub_domain) query = query.eq("sub_domain", sub_domain);
    if (theme) query = query.eq("theme", theme);

    // 3️⃣ Execute query
    const { data, error } = await query;
    if (error) throw error;

    // 4️⃣ Strict match
    if (data && data.length > 0) {
      const random = data[Math.floor(Math.random() * data.length)];
      return {
        level: scoreLevel,
        text: random.feedback_text,
        source: "library_strict",
      };
    }

    // 5️⃣ Fallback: remove domain/subdomain/theme
    const { data: fallbackLevel } = await supabase
      .from("nova_feedback_library")
      .select("feedback_text")
      .eq("lang", lang)
      .eq("score_level", scoreLevel)
      .eq("career_stage", career_stage ?? "")
      .limit(5);

    if (fallbackLevel && fallbackLevel.length > 0) {
      const random = fallbackLevel[Math.floor(Math.random() * fallbackLevel.length)];
      return {
        level: scoreLevel,
        text: random.feedback_text,
        source: "library_partial",
      };
    }

    // 6️⃣ Fallback: score_level only
    const { data: fallbackBasic } = await supabase
      .from("nova_feedback_library")
      .select("feedback_text")
      .eq("lang", lang)
      .eq("score_level", scoreLevel);

    if (fallbackBasic && fallbackBasic.length > 0) {
      const random = fallbackBasic[Math.floor(Math.random() * fallbackBasic.length)];
      return {
        level: scoreLevel,
        text: random.feedback_text,
        source: "library_score_only",
      };
    }

    // 7️⃣ Ultimate fallback
    return {
      level: scoreLevel,
      text: defaultFeedback(scoreLevel),
      source: "default",
    };
  } catch (e) {
    console.error("fetchNovaFeedback error:", e);
    return {
      level: scoreLevel,
      text: defaultFeedback(scoreLevel),
      source: "default_error",
    };
  }
}

function defaultFeedback(level: "high" | "mid" | "low") {
  const en = {
    high:
      "Strong answer. Clear structure, good examples, and convincing delivery.",
    mid:
      "Decent answer. Try adding one concrete example and a clearer structure.",
    low:
      "Your answer lacked clarity. Try focusing on one key idea and giving a simple real-life example.",
  };
  return en[level];
}
