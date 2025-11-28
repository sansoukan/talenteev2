import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * /api/profile/update-score
 *
 * GET  ?user_id=...                → calcule & met à jour le profil, renvoie le détail
 * POST body { user_id: string }    → idem
 *
 * Logique:
 * - Récupère toutes les nova_sessions de l'user (score, premium, dates)
 * - Calcule une moyenne pondérée
 * - Met à jour nova_profile (score global + xp_total + axes détaillés)
 * - Vérifie les badges
 * - Ajoute le dernier résumé CV/offre de nova_analysis
 */

export async function GET(req: NextRequest) {
  const user_id = req.nextUrl.searchParams.get("user_id") ?? undefined;
  if (!user_id)
    return NextResponse.json({ error: "missing user_id" }, { status: 400 });
  return handle(user_id);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as any));
  const user_id = body?.user_id as string | undefined;
  if (!user_id)
    return NextResponse.json({ error: "missing user_id" }, { status: 400 });
  return handle(user_id);
}

async function handle(user_id: string) {
  try {
    // 1) Sessions scorées
    const { data: sessions, error: sesErr } = await supabaseAdmin
      .from("nova_sessions")
      .select("id, score, is_premium, ended_at, started_at, detail")
      .eq("user_id", user_id)
      .order("ended_at", { ascending: false });

    if (sesErr) throw sesErr;

    const now = Date.now();
    type Row = {
      id: string;
      score: number | null;
      is_premium: boolean | null;
      ended_at: string | null;
      started_at: string | null;
      detail?: any; // contient contentAvg, wpmNorm, hesNorm, eyeAvg
    };
    const scored = (sessions ?? []).filter(
      (s: Row) => typeof s.score === "number"
    ) as Required<Row>[];

    // 2) Rien à scorer
    if (scored.length === 0) {
      await upsertProfile(user_id, null, 0, null);
      return NextResponse.json({
        user_id,
        global_score: null,
        contributions: [],
        sessions: (sessions ?? []).length,
        note: "no_scored_sessions",
        last_analysis: await getLastAnalysis(user_id),
      });
    }

    // 3) Calcul pondéré
    let sumW = 0;
    let sumWX = 0;
    const contributions: Array<{
      session_id: string;
      score: number;
      is_premium: boolean;
      age_days: number;
      weight: number;
    }> = [];

    for (const s of scored) {
      const endedAt = s.ended_at
        ? new Date(s.ended_at).getTime()
        : s.started_at
        ? new Date(s.started_at).getTime()
        : now;
      const ageDays = Math.max(0, Math.floor((now - endedAt) / 86400000));
      const premiumBoost = s.is_premium ? 1.2 : 1.0;
      const recencyBoost = 0.5 + 0.5 * Math.exp(-ageDays / 90);
      const weight = 1.0 * premiumBoost * recencyBoost;
      sumW += weight;
      sumWX += weight * (s.score as number);

      contributions.push({
        session_id: s.id,
        score: round2(s.score as number),
        is_premium: !!s.is_premium,
        age_days: ageDays,
        weight: round3(weight),
      });
    }

    const global = sumW > 0 ? sumWX / sumW : null;
    const globalRounded = global === null ? null : round2(global);

    // 4) XP total basé sur nb de sessions scorées
    const xpTotal = scored.length * 10;

    // 5) Extraire les moyennes d’axes à partir des sessions (si dispo)
    // On prend la moyenne des champs detail.* si présents
    const avg = (arr: (number | null | undefined)[]) => {
      const vals = arr.filter((x): x is number => typeof x === "number");
      return vals.length ? round2(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
    };

    const contentAvg = avg(scored.map((s) => s.detail?.contentAvg));
    const wpmNorm = avg(scored.map((s) => s.detail?.wpmNorm));
    const hesNorm = avg(scored.map((s) => s.detail?.hesNorm));
    const eyeAvg = avg(scored.map((s) => s.detail?.eyeAvg));

    const axes = {
      global_score: globalRounded,
      contentAvg,
      wpmNorm,
      hesNorm,
      eyeAvg,
    };

    await upsertProfile(user_id, globalRounded, xpTotal, axes);

    // 6) Badge éventuel
    const badges_awarded: string[] = [];
    if ((global ?? 0) >= 0.8 && scored.length >= 3) {
      const inserted = await ensurePerformerBadge(
        user_id,
        Math.round((global ?? 0) * 100)
      );
      if (inserted) badges_awarded.push("Nova Performer");
    }

    // 7) Dernière analyse CV/offre
    const lastAnalysis = await getLastAnalysis(user_id);

    return NextResponse.json({
      user_id,
      global_score: globalRounded,
      sessions_total: sessions?.length ?? 0,
      sessions_scored: scored.length,
      contributions,
      badges_awarded,
      last_analysis: lastAnalysis,
      axes,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "server_error" },
      { status: 500 }
    );
  }
}

function round2(x: number) {
  return Math.round(x * 100) / 100;
}
function round3(x: number) {
  return Math.round(x * 1000) / 1000;
}

async function upsertProfile(
  user_id: string,
  globalScore: number | null,
  xpTotal: number,
  axes: any
) {
  const { data: prof, error: profErr } = await supabaseAdmin
    .from("nova_profile")
    .select("user_id, axes")
    .eq("user_id", user_id)
    .maybeSingle();
  if (profErr) throw profErr;

  const newAxes = { ...(prof?.axes ?? {}), ...axes };

  const { error: upErr } = await supabaseAdmin
    .from("nova_profile")
    .upsert(
      [
        {
          user_id,
          xp_total: xpTotal,
          axes: newAxes,
          last_update: new Date().toISOString(),
        },
      ],
      { onConflict: "user_id" }
    );
  if (upErr) throw upErr;
}

async function ensurePerformerBadge(user_id: string, scorePct: number) {
  const { data: exists, error: exErr } = await supabaseAdmin
    .from("nova_certifications")
    .select("id")
    .eq("user_id", user_id)
    .eq("skill_improved", "Nova Performer")
    .limit(1);
  if (exErr) throw exErr;
  if (exists && exists.length > 0) return false;

  const { error: insErr } = await supabaseAdmin.from("nova_certifications").insert({
    user_id,
    skill_improved: "Nova Performer",
    score: scorePct,
    badge_url: null,
    created_at: new Date().toISOString(),
  });
  if (insErr) throw insErr;
  return true;
}

/** Récupère la dernière analyse CV/offre */
async function getLastAnalysis(user_id: string) {
  const { data, error } = await supabaseAdmin
    .from("nova_analysis")
    .select("result_text, created_at")
    .eq("user_id", user_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data?.result_text) return null;

  try {
    return JSON.parse(data.result_text);
  } catch {
    return { raw: data.result_text };
  }
}
