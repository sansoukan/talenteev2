import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * /api/emotions
 * -------------
 * POST → Enregistre une nouvelle émotion
 * GET  → Retourne les émotions récentes (pour orchestrateur)
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, session_id } = body || {};

    if (!user_id || !session_id)
      return NextResponse.json(
        { error: "Missing user_id or session_id" },
        { status: 400 }
      );

    const insertRow: Record<string, any> = {
      user_id,
      session_id,
      question_id: body.question_id ?? null,
      eye_contact: clamp01(body.eye_contact),
      smiles: nonNegativeInt(body.smiles),
      hesitations: nonNegativeInt(body.hesitations),
      tone: typeof body.tone === "string" ? body.tone : null,
      posture_score: clamp01(body.posture_score),
      stress: clamp01(body.stress),
      confidence: clamp01(body.confidence),
      posture:
        typeof body.posture === "string" && body.posture.length <= 32
          ? body.posture
          : null,
      expressions:
        typeof body.expressions === "object" && body.expressions !== null
          ? body.expressions
          : null,
      source: typeof body.source === "string" ? body.source : "client",
      timestamp: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("nova_emotions")
      .insert(insertRow)
      .select("id, timestamp, stress, confidence, posture_score, tone")
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, ...data });
  } catch (e: any) {
    console.error("❌ emotions/POST error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/emotions?session_id=...
 * → Retourne les dernières émotions enregistrées pour une session
 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const session_id = sp.get("session_id");

    if (!session_id)
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from("nova_emotions")
      .select(
        "id, timestamp, stress, confidence, posture_score, eye_contact, tone, posture"
      )
      .eq("session_id", session_id)
      .order("timestamp", { ascending: true })
      .limit(30);

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      count: data?.length ?? 0,
      items: data ?? [],
    });
  } catch (e: any) {
    console.error("❌ emotions/GET error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

/** Utilitaires */
function clamp01(v: any): number | null {
  return typeof v === "number" && isFinite(v) && v >= 0 && v <= 1 ? v : null;
}
function nonNegativeInt(v: any): number | null {
  return Number.isInteger(v) && v >= 0 ? v : null;
}