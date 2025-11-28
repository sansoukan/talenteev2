import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * /api/badges
 *
 * GET  ?user_id=... → retourne la liste des badges d’un utilisateur
 *
 * Exemple retour :
 * {
 *   "user_id": "...",
 *   "badges": [
 *     { "skill_improved": "Nova Performer", "score": 85, "created_at": "2025-09-01T12:00:00Z" },
 *     { "skill_improved": "Clarté orale", "score": 78, "created_at": "2025-08-15T09:00:00Z" }
 *   ]
 * }
 */

export async function GET(req: NextRequest) {
  try {
    const user_id = req.nextUrl.searchParams.get("user_id");
    if (!user_id) {
      return NextResponse.json({ error: "missing user_id" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("nova_certifications")
      .select("skill_improved, score, badge_url, created_at")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      user_id,
      badges: data ?? [],
    });
  } catch (e: any) {
    console.error("GET /api/badges error:", e);
    return NextResponse.json(
      { error: e?.message ?? "server_error" },
      { status: 500 }
    );
  }
}
