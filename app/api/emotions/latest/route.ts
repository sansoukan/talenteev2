import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

/**
 * ======================================================
 *  🔵 /api/emotions/latest — Snapshot émotionnel V5
 * ------------------------------------------------------
 *  Renvoie :
 *   • le DERNIER enregistrement émotionnel de la session
 *   • filtré par session_id + question_id (optionnel)
 *
 *  Utilisé par :
 *   • NovaEngine_Playlist (PDF V5)
 *   • /api/memoire (emotions_snapshot)
 *   • Nova Report V5
 * ======================================================
 */

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams

    const session_id = sp.get("session_id")
    const question_id = sp.get("question_id")

    if (!session_id) {
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 })
    }

    // Base query
    let query = supabaseAdmin
      .from("nova_emotions")
      .select("*")
      .eq("session_id", session_id)
      .order("timestamp", { ascending: false })
      .limit(1)

    // Optional filter by question
    if (question_id) {
      query = query.eq("question_id", question_id)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json(
      data?.[0] || {
        stress: null,
        confidence: null,
        eye_contact: null,
        posture_score: null,
      },
    )
  } catch (e: any) {
    console.error("❌ emotions/latest error :", e)
    return NextResponse.json({ error: e.message ?? "Server error" }, { status: 500 })
  }
}

export const dynamic = "force-dynamic"
