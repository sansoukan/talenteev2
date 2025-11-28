"use client";

import { supabase } from "@/lib/supabaseClient"; // client-side supabase
import type { User } from "@supabase/supabase-js";

/**
 * fetchFeedback
 * -------------------------
 * Fetches an adapted feedback (video or text) from the Nova API.
 *
 * Params:
 * - user: Supabase authenticated user (user.id required)
 * - lang: "en" | "fr" | ...
 * - level: "high" | "mid" | "low"
 * - theme?: string
 *
 * Automatically injects:
 * - career_stage
 * - domain
 * - sub_domain
 *
 * Returns:
 * { ok: boolean, text: string|null, video_url: string|null }
 */

export async function fetchFeedback({
  user,
  lang = "en",
  level = "mid",
  theme,
}: {
  user: User;
  lang?: string;
  level?: "high" | "mid" | "low";
  theme?: string;
}) {
  try {
    if (!user?.id) {
      console.error("fetchFeedback → missing user.id");
      throw new Error("Missing user ID");
    }

    // 1️⃣ Load user profile (career_stage, domain, sub_domain)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("career_stage, domain, sub_domain")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.warn("fetchFeedback → profile fetch error:", profileError);
    }

    // 2️⃣ Build request payload
    const payload = {
      lang,
      level,
      theme,
      career_stage: profile?.career_stage || null,
      domain: profile?.domain || null,
      sub_domain: profile?.sub_domain || null,
    };

    // 3️⃣ Call the backend API
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    return {
      ok: data.ok,
      text: data.text || null,
      video_url: data.video_url || null,
      profile,
    };
  } catch (err) {
    console.error("fetchFeedback error:", err);
    return {
      ok: false,
      text:
        "Thank you for your answer. Try to structure your message with one idea, one example, one conclusion.",
      video_url: null,
      profile: null,
    };
  }
}
