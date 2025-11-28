import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * POST /api/feedback
 *
 * Body:
 * {
 *   lang?: "en" | "fr" | string,
 *   level?: "high" | "mid" | "low",
 *   theme?: string,
 *   career_stage?: "student" | "junior" | "mid" | "senior" | "manager" | "exec" | string,
 *   domain?: string,
 *   sub_domain?: string
 * }
 *
 * Behavior:
 * - Tries to fetch a contextual feedback (video + optional text) from nova_feedback_library
 *   filtered by:
 *     - lang
 *     - score_level (high/mid/low)
 *     - career_stage (optional)
 *     - domain (optional)
 *     - sub_domain (optional)
 *     - theme (optional)
 * - If an associated asset exists in nova_assets and status = "ready", returns its video_url.
 * - If no specific asset is found, falls back to nova_fallbacks (generic video per language).
 * - If no video is found at all, returns a text feedback only.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      lang = "en",
      level = "mid",
      theme,
      career_stage,
      domain,
      sub_domain,
    } = body || {};

    // 1. Build primary query on nova_feedback_library
    let query = supabaseAdmin
      .from("nova_feedback_library")
      .select("id, feedback_text, asset_id")
      .eq("lang", lang)
      .eq("score_level", level);

    if (career_stage) query = query.eq("career_stage", career_stage);
    if (domain) query = query.eq("domain", domain);
    if (sub_domain) query = query.eq("sub_domain", sub_domain);
    if (theme) query = query.eq("theme", theme);

    const { data, error } = await query.limit(5);
    if (error) {
      console.error("Feedback query error:", error);
      throw error;
    }

    let chosen: { id: string; feedback_text?: string | null; asset_id?: string | null } | null =
      null;

    if (data && data.length > 0) {
      // Pick one random feedback among candidates for more variety
      chosen = data[Math.floor(Math.random() * data.length)] as any;
    }

    // 2. If there is an asset_id, try to fetch the video asset from nova_assets
    let video_url: string | null = null;

    if (chosen?.asset_id) {
      const { data: asset, error: assetError } = await supabaseAdmin
        .from("nova_assets")
        .select("url, status")
        .eq("id", chosen.asset_id)
        .eq("status", "ready")
        .maybeSingle();

      if (assetError) {
        console.error("Asset query error:", assetError);
      }

      if (asset?.url) {
        video_url = asset.url;
      }
    }

    // 3. If no specific video, use a generic fallback video from nova_fallbacks
    if (!video_url) {
      const { data: fb, error: fbError } = await supabaseAdmin
        .from("nova_fallbacks")
        .select("url")
        .eq("lang", lang)
        .limit(1)
        .maybeSingle();

      if (fbError) {
        console.error("Fallback video query error:", fbError);
      }

      if (fb?.url) {
        video_url = fb.url;
      }
    }

    // 4. Text feedback only if no video was found
    const defaultText =
      level === "high"
        ? "Strong answer. Clear, structured and relevant. You can keep this level of clarity for the rest of the interview."
        : level === "low"
        ? "Your answer lacks structure and clarity. Try to focus on one key idea, give a concrete example, and conclude with a clear message."
        : "Decent answer, but it can be improved by adding more structure, one concrete example and a clearer conclusion.";

    const text = chosen?.feedback_text || defaultText;

    return NextResponse.json({
      ok: true,
      text: video_url ? null : text, // if a video is returned, text is hidden
      video_url,
    });
  } catch (e: any) {
    console.error("feedback error:", e);
    return NextResponse.json(
      {
        ok: false,
        text:
          "Thank you for your answer. Try to make your ideas clearer and more structured for the next question.",
        video_url: null,
      },
      { status: 200 }
    );
  }
}
