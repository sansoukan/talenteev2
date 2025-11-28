import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * POST /api/relance/log
 * Body:
 * {
 *   user_id: string,
 *   session_id: string,
 *   question_id?: string | null,
 *   reason: "silence" | "timeout" | "other"
 * }
 * → Logs a relance event in nova_analytics
 */
export async function POST(req: NextRequest) {
  try {
    const { user_id, session_id, question_id, reason } = await req.json();

    if (!user_id || !session_id) {
      return NextResponse.json(
        { error: "Missing user_id or session_id" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin.from("nova_analytics").insert({
      user_id,
      session_id,
      event_type: "relance_log",
      event_data: {
        question_id: question_id ?? null,
        reason: reason ?? "other",
      },
      created_at: new Date().toISOString(),
    });

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("relance/log error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
