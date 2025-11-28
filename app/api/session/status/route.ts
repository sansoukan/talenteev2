import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * GET /api/session/status?id=...
 * -> { id, user_id, type, niveau, lang, is_premium, started_at, ended_at,
 *      duration, status, can_resume, user_role,
 *      credits_sessions, credits_total, is_freemium_used }
 */
export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "missing id" }, { status: 400 });
    }

    // 1. Get session
    const { data, error } = await supabaseAdmin
      .from("nova_sessions")
      .select("id,user_id,type,niveau,lang,is_premium,started_at,ended_at,duration")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    // 2. Get user role + credits
    let user_role: string | null = null;
    let credits_sessions: number | null = null;
    let credits_total: number | null = null;   // ✅ new
    let is_freemium_used: boolean | null = null;

    if (data.user_id) {
      // role
      const { data: urow, error: uErr } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", data.user_id)
        .maybeSingle();
      if (!uErr) {
        user_role = urow?.role ?? "user";
      }

      // credits
      const { data: cRow, error: cErr } = await supabaseAdmin
        .from("nova_credits")
        .select("credits_sessions,credits_total,is_freemium_used")
        .eq("user_id", data.user_id)
        .maybeSingle();
      if (!cErr && cRow) {
        credits_sessions = cRow.credits_sessions ?? 0;
        credits_total = cRow.credits_total ?? 0;   // ✅ new
        is_freemium_used = cRow.is_freemium_used ?? false;
      }
    }

    // 3. Compute duration
    let duration = data.duration;
    if (!duration && data.started_at && data.ended_at) {
      duration = Math.round(
        (new Date(data.ended_at).getTime() - new Date(data.started_at).getTime()) / 60000
      );
    }

    const status = data.ended_at ? "ended" : "active";
    const can_resume = status === "active";

    return NextResponse.json({
      ...data,
      duration,
      status,
      can_resume,
      user_role,
      credits_sessions,
      credits_total,      // ✅ now included in response
      is_freemium_used,
    });
  } catch (e: any) {
    console.error("session/status error:", e);
    return NextResponse.json(
      { error: e?.message ?? "server_error" },
      { status: 500 }
    );
  }
}
