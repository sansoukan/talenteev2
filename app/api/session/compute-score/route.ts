import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * POST /api/session/compute-score
 * body: { id: string }
 *
 * GET  /api/session/compute-score?id=...
 *
 * Calcule score final et met à jour nova_sessions + nova_profile.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as any));
  const id = body?.id as string | undefined;
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  return computeAndUpdate(id);
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") ?? undefined;
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  return computeAndUpdate(id);
}

async function computeAndUpdate(sessionId: string) {
  try {
    // 1) Scores contenu
    const { data: mem, error: memErr } = await supabaseAdmin
      .from("nova_memory")
      .select("score")
      .eq("session_id", sessionId);
    if (memErr) throw memErr;

    const contentScores = (mem ?? [])
      .map((r: any) => (typeof r.score === "number" ? r.score : null))
      .filter((v: number | null): v is number => v !== null);
    const contentAvg = avg(contentScores);

    // 2) Emotions
    const { data: emo, error: emoErr } = await supabaseAdmin
      .from("nova_emotions")
      .select("hesitations, eye_contact, words_per_min")
      .eq("session_id", sessionId);
    if (emoErr) throw emoErr;

    const hes = (emo ?? [])
      .map((e: any) => (Number.isInteger(e.hesitations) ? e.hesitations : null))
      .filter((v: number | null): v is number => v !== null);

    const wpm = (emo ?? [])
      .map((e: any) => (typeof e.words_per_min === "number" ? e.words_per_min : null))
      .filter((v: number | null): v is number => v !== null);

    const eye = (emo ?? [])
      .map((e: any) => (typeof e.eye_contact === "number" ? clamp01(e.eye_contact) : null))
      .filter((v: number | null): v is number => v !== null);

    const wpmNorm = normalizeWpm(avg(wpm));
    const hesNorm = normalizeHesitations(avg(hes));
    const eyeAvg = avg(eye);

    // 3) Pondération
    const weights = { content: 0.6, wpm: 0.2, hes: 0.1, eye: 0.1 };
    const present = [
      { key: "content", val: contentAvg },
      { key: "wpm", val: wpmNorm },
      { key: "hes", val: hesNorm },
      { key: "eye", val: eyeAvg },
    ].filter((p) => typeof p.val === "number") as { key: keyof typeof weights; val: number }[];

    if (present.length === 0) {
      await supabaseAdmin.from("nova_sessions").update({ score: null }).eq("id", sessionId);
      return NextResponse.json({
        id: sessionId,
        score: null,
        detail: { contentAvg: null, wpmNorm: null, hesNorm: null, eyeAvg: null },
        strengths: [],
        improvements: [],
        advice: "Aucune donnée exploitable.",
        idealAnswer: null,
        note: "no_data",
      });
    }

    const sumW = present.reduce((s, it) => s + weights[it.key], 0);
    const final = present.reduce((s, it) => s + (weights[it.key] / sumW) * it.val, 0);
    const finalRounded = round2(final);

    // 4) Écrire score
    const { error: upErr } = await supabaseAdmin
      .from("nova_sessions")
      .update({ score: finalRounded })
      .eq("id", sessionId);
    if (upErr) throw upErr;

    // 4b) Mettre à jour profil
    const { data: sessRow, error: sessErr } = await supabaseAdmin
      .from("nova_sessions")
      .select("user_id")
      .eq("id", sessionId)
      .maybeSingle();
    if (sessErr) throw sessErr;

    if (sessRow?.user_id) {
      const { data: userSessions, error: userErr } = await supabaseAdmin
        .from("nova_sessions")
        .select("score")
        .eq("user_id", sessRow.user_id);
      if (userErr) throw userErr;

      const scored = (userSessions ?? []).filter((s: any) => typeof s.score === "number");
      const xpTotal = scored.length * 10;

      const axes = {
        global_score: finalRounded,
        contentAvg: contentAvg === null ? null : round2(contentAvg),
        wpmNorm: wpmNorm === null ? null : round2(wpmNorm),
        hesNorm: hesNorm === null ? null : round2(hesNorm),
        eyeAvg: eyeAvg === null ? null : round2(eyeAvg),
      };

      const { error: profErr } = await supabaseAdmin
        .from("nova_profile")
        .upsert(
          [
            {
              user_id: sessRow.user_id,
              xp_total: xpTotal,
              axes,
              last_update: new Date().toISOString(),
            },
          ],
          { onConflict: "user_id" }
        );
      if (profErr) throw profErr;
    }

    // 5) Feedback qualitatif
    const strengths: string[] = [];
    const improvements: string[] = [];

    if ((contentAvg ?? 0) >= 0.75)
      strengths.push("Qualité des réponses satisfaisante.");
    else improvements.push("Structurer davantage vos réponses (méthode STAR).");

    if ((wpmNorm ?? 0) >= 0.6)
      strengths.push("Débit de parole fluide et naturel.");
    else improvements.push("Améliorer le rythme de parole (éviter trop lent ou trop rapide).");

    if ((hesNorm ?? 0) >= 0.7)
      strengths.push("Peu d’hésitations, discours clair.");
    else improvements.push("Réduire les hésitations en préparant vos idées.");

    if ((eyeAvg ?? 0) >= 0.55)
      strengths.push("Bon contact visuel (si caméra activée).");
    else improvements.push("Regarder davantage la caméra pour renforcer l’impact.");

    const advice =
      improvements.length > 0
        ? "Travaillez ces axes d’amélioration avant votre prochain entretien."
        : "Excellente prestation, continuez ainsi !";

    // 6) Réponse idéale
    const { data: memQ } = await supabaseAdmin
      .from("nova_memory")
      .select("question_id, question:question_id (ideal_answer)")
      .eq("session_id", sessionId)
      .limit(1);

    let idealAnswer: string | undefined = undefined;
    if (memQ && memQ.length > 0) {
      const ia = memQ[0].question?.ideal_answer;
      if (ia?.fr) idealAnswer = ia.fr;
    }

    // 7) Retour final
    return NextResponse.json({
      id: sessionId,
      score: finalRounded,
      detail: {
        contentAvg: contentAvg === null ? null : round2(contentAvg),
        wpmNorm: wpmNorm === null ? null : round2(wpmNorm),
        hesNorm: hesNorm === null ? null : round2(hesNorm),
        eyeAvg: eyeAvg === null ? null : round2(eyeAvg),
      },
      strengths,
      improvements,
      advice,
      idealAnswer,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "server_error" }, { status: 500 });
  }
}

/** Helpers */
function avg(arr: number[]): number | null {
  if (!arr || arr.length === 0) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}
function round2(x: number) {
  return Math.round(x * 100) / 100;
}
function normalizeWpm(wpm: number | null): number | null {
  if (wpm === null) return null;
  const center = 110;
  const span = 60;
  const score = 1 - Math.abs(wpm - center) / span;
  return clamp01(score);
}
function normalizeHesitations(hes: number | null): number | null {
  if (hes === null) return null;
  const score = 1 - hes / 8;
  return clamp01(score);
}
