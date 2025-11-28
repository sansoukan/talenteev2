import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type UpdateScoreRes = {
  user_id: string;
  global_score: number | null;
  sessions_total: number;
  sessions_scored: number;
  contributions: Array<{
    session_id: string;
    score: number;
    is_premium: boolean;
    age_days: number;
    weight: number;
  }>;
  badges_awarded?: string[];
  note?: string;
  last_analysis?: any;
  axes?: {
    global_score?: number | null;
    contentAvg?: number | null;
    wpmNorm?: number | null;
    hesNorm?: number | null;
    eyeAvg?: number | null;
  };
};

export async function GET(req: NextRequest) {
  try {
    const user_id = req.nextUrl.searchParams.get("user_id");
    if (!user_id) {
      return NextResponse.json({ error: "missing user_id" }, { status: 400 });
    }

    // 1. Récup sessions scorées
    const { data: sessions, error: sesErr } = await supabaseAdmin
      .from("nova_sessions")
      .select("id,score,is_premium,started_at,axes")
      .eq("user_id", user_id);

    if (sesErr) throw sesErr;

    const total = sessions?.length ?? 0;
    const scored = (sessions ?? []).filter((s) => typeof s.score === "number");

    // 2. Contributions pondérées
    const contributions: UpdateScoreRes["contributions"] = [];
    let weightedSum = 0;
    let sumWeights = 0;

    scored.forEach((s) => {
      const score = s.score as number;
      const isPremium = !!s.is_premium;

      const ageDays = s.started_at
        ? Math.max(
            0,
            Math.floor((Date.now() - new Date(s.started_at).getTime()) / 86400000)
          )
        : 0;

      // pondération : récent = plus fort, premium = boost
      const recencyFactor = 1 / (1 + ageDays / 30); // demi-vie 30j
      const premiumBoost = isPremium ? 1.2 : 1;
      const weight = recencyFactor * premiumBoost;

      contributions.push({
        session_id: s.id,
        score,
        is_premium: isPremium,
        age_days: ageDays,
        weight,
      });

      weightedSum += score * weight;
      sumWeights += weight;
    });

    const globalScore =
      scored.length > 0 && sumWeights > 0
        ? Math.round((weightedSum / sumWeights) * 100) / 100
        : null;

    // 3. Détection badges simples
    const badges: string[] = [];
    if ((globalScore ?? 0) >= 0.8) badges.push("Communication claire");
    if ((globalScore ?? 0) >= 0.9) badges.push("Excellence RH");
    if (scored.length >= 5) badges.push("Persévérance");

    // 4. Dernière analyse CV/offre
    const { data: analysis } = await supabaseAdmin
      .from("nova_analysis")
      .select("result_text")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let lastAnalysis: any = null;
    if (analysis?.result_text) {
      try {
        lastAnalysis = JSON.parse(analysis.result_text);
      } catch {
        lastAnalysis = { raw: analysis.result_text };
      }
    }

    // 5. Axes récents (depuis dernière session scorée)
    let axes: any = null;
    const lastScored = scored.sort(
      (a, b) =>
        new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    )[0];
    if (lastScored?.axes) {
      axes = lastScored.axes;
      axes.global_score = lastScored.score;
    }

    // 6. Construire réponse
    const res: UpdateScoreRes = {
      user_id,
      global_score: globalScore,
      sessions_total: total,
      sessions_scored: scored.length,
      contributions,
      badges_awarded: badges,
      note: globalScore
        ? `Votre score global est ${globalScore.toFixed(2)}`
        : "Pas assez de données pour un score global",
      last_analysis: lastAnalysis,
      axes,
    };

    return NextResponse.json(res);
  } catch (e: any) {
    console.error("update-score error:", e);
    return NextResponse.json(
      { error: e?.message ?? "server_error" },
      { status: 500 }
    );
  }
}
