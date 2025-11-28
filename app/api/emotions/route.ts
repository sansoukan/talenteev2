import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

/**
 * =======================================================
 *  🧠 /api/emotions — Stockage émotions audio/visuel (V5)
 * -------------------------------------------------------
 *  Stocke :
 *   - eye_contact, smiles, hesitations
 *   - words_per_min, pauses, tone
 *   - stress, confidence
 *   - posture_score, posture
 *   - gaze_stability, gaze_direction
 *   - authenticity_score
 *   - expressions (jsonb)
 *   - raw_data (brut)
 *
 *  Fusion : si deux signaux arrivent dans la même seconde
 *           → fusion intelligente voice + facial
 * =======================================================
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const { user_id, session_id } = body || {}

    if (!user_id || !session_id) {
      return NextResponse.json({ error: "Missing user_id or session_id" }, { status: 400 })
    }

    /** ------------------------------
     * Normalisation des champs
     * ------------------------------*/
    const row: Record<string, any> = {
      user_id,
      session_id,
      // 🔗 Lien vers question_id (obligatoire)
      question_id: body.question_id ?? null,

      // Audio & rythme
      words_per_min: intOrNull(body.words_per_min),
      hesitations: intOrNull(body.hesitations),
      pauses_count: intOrNull(body.pauses_count),

      // Emotion & tonalité
      tone: strOrNull(body.tone),
      stress: clamp01(body.stress),
      confidence: clamp01(body.confidence),
      authenticity_score: clamp01(body.authenticity_score),

      // Visuel / posture
      eye_contact: clamp01(body.eye_contact),
      smile: clamp01(body.smile),
      smiles: intOrNull(body.smiles),
      posture: strOrNull(body.posture),
      posture_score: clamp01(body.posture_score),
      gaze_stability: clamp01(body.gaze_stability),
      gaze_direction: strOrNull(body.gaze_direction),

      // Expressions faciales
      expressions: typeof body.expressions === "object" ? body.expressions : null,

      // Données brutes envoyées par le client/analyzer
      raw_data: typeof body.raw_data === "object" ? body.raw_data : null,

      // Meta
      source: body.source ?? "client",
      timestamp: new Date().toISOString(),
    }

    if (!row.question_id) row.question_id = null

    /** ---------------------------------------------------
     * 🔍 Fusion intelligente (voice + facial)
     * On fusionne un signal si :
     *   - même session
     *   - même question_id (si fourni)
     *   - même seconde (granularité 1s)
     * ---------------------------------------------------*/
    const timeKey = row.timestamp.slice(0, 19) // YYYY-MM-DDTHH:mm:ss

    const qFilter = body.question_id ? `eq.question_id.${body.question_id}` : "not.is.null" // Permet fallback si pas de question_id

    const { data: existing } = await supabaseAdmin
      .from("nova_emotions")
      .select("*")
      .eq("session_id", session_id)
      .lte("timestamp", `${timeKey}.999Z`)
      .gte("timestamp", `${timeKey}.000Z`)
      .limit(1)

    if (existing && existing.length > 0) {
      // FUSION
      const prev = existing[0]

      const merged = {
        stress: avg(prev.stress, row.stress),
        confidence: avg(prev.confidence, row.confidence),
        eye_contact: avg(prev.eye_contact, row.eye_contact),
        posture_score: avg(prev.posture_score, row.posture_score),
        words_per_min: avg(prev.words_per_min, row.words_per_min),
        hesitations: avgInt(prev.hesitations, row.hesitations),
        smiles: avgInt(prev.smiles, row.smiles),
        smile: avg(prev.smile, row.smile),
        gaze_stability: avg(prev.gaze_stability, row.gaze_stability),
        authenticity_score: avg(prev.authenticity_score, row.authenticity_score),

        // Valeurs non moyennables → priorité au nouveau si présent
        tone: row.tone ?? prev.tone,
        posture: row.posture ?? prev.posture,
        gaze_direction: row.gaze_direction ?? prev.gaze_direction,
        expressions: row.expressions ?? prev.expressions,
        raw_data: row.raw_data ?? prev.raw_data,
      }

      await supabaseAdmin.from("nova_emotions").update(merged).eq("id", prev.id)

      return NextResponse.json({
        ok: true,
        fusion: true,
        id: prev.id,
        merged,
      })
    }

    /** ------------------------------
     * Nouveau signal
     * ------------------------------*/
    const { data, error } = await supabaseAdmin
      .from("nova_emotions")
      .insert(row)
      .select("id, timestamp, stress, confidence, eye_contact")
      .single()

    if (error) throw error

    return NextResponse.json({
      ok: true,
      fusion: false,
      inserted: data,
    })
  } catch (e: any) {
    console.error("❌ emotions/POST error:", e)
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 })
  }
}

/* ======================================================
 *                 🔧 UTILITAIRES
 * ======================================================*/

function clamp01(v: any): number | null {
  return typeof v === "number" && v >= 0 && v <= 1 ? v : null
}

function intOrNull(v: any): number | null {
  return Number.isFinite(v) ? Math.round(Number(v)) : null
}

function strOrNull(v: any): string | null {
  return typeof v === "string" && v.length <= 64 ? v : null
}

function avg(a: any, b: any): number | null {
  if (a == null && b == null) return null
  if (a == null) return b
  if (b == null) return a
  return Math.round(((a + b) / 2) * 100) / 100
}

function avgInt(a: any, b: any): number | null {
  if (a == null && b == null) return null
  if (a == null) return b
  if (b == null) return a
  return Math.round((a + b) / 2)
}
