import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * POST /api/relance
 * Body: { user_id, session_id, question_id?, reason?, niveau?, lang?, theme? }
 * - Logs in nova_analytics
 * - Picks a relance from nova_relances
 * - Falls back to generic video or text
 */
export async function POST(req: NextRequest) {
  try {
    const { user_id, session_id, question_id, reason, niveau, lang, theme } =
      await req.json();

    if (!user_id || !session_id) {
      return NextResponse.json(
        { error: "Missing user_id or session_id" },
        { status: 400 }
      );
    }

    const language = lang ?? "en";

    // 1. Log event
    await supabaseAdmin.from("nova_analytics").insert({
      user_id,
      session_id,
      event_type: "auto_relance",
      event_data: {
        question_id: question_id ?? null,
        reason: reason ?? "other",
        niveau: niveau ?? null,
        theme: theme ?? null,
      },
    });

    // 2. Look for active relance
    let query = supabaseAdmin.from("nova_relances").select("*").eq("is_active", true);
    if (niveau) query = query.eq("niveau", niveau);
    if (theme) query = query.eq("theme", theme);

    const { data: relances, error: relErr } = await query.limit(10);
    if (relErr) throw relErr;

    let chosen: any = null;
    if (relances && relances.length > 0) {
      chosen = relances[Math.floor(Math.random() * relances.length)];
    }

    // 3. Video URL if available
    let video_url =
      chosen?.[`video_url_${language}`] ??
      chosen?.video_url_en ??
      chosen?.video_url_fr ??
      null;

    // 4. Fallback to generic video
    if (!video_url) {
      const { data: fb } = await supabaseAdmin
        .from("nova_fallbacks")
        .select("url")
        .eq("lang", language)
        .limit(1)
        .maybeSingle();

      if (fb?.url) video_url = fb.url;
    }

    // 5. Text fallback
    const text =
      chosen?.[`relance_text_${language}`] ??
      chosen?.relance_text_en ??
      chosen?.relance_text_fr ??
      "Can you please give a more concrete example?";

    return NextResponse.json({
      ok: true,
      text,
      video_url,
    });
  } catch (e: any) {
    console.error("relance error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
