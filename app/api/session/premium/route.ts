import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * POST /api/sessions/premium
 * body: { id: string, user_id: string, option?: string }
 * Effet:
 *   - Marque la session comme premium
 *   - Si single → consomme freemium
 *   - Si pack → décrémente credits_sessions
 *   - Retourne l’état sauvegardé pour reprise
 */
export async function POST(req: NextRequest) {
  try {
    const { id, user_id, option = "single" } = await req.json();
    if (!id || !user_id) {
      return NextResponse.json({ error: "missing id or user_id" }, { status: 400 });
    }

    // 1. Marquer la session comme premium
    const { error: updateErr } = await supabaseAdmin
      .from("nova_sessions")
      .update({ is_premium: true })
      .eq("id", id);
    if (updateErr) throw updateErr;

    // 2. Mettre à jour les crédits utilisateur
    if (option === "single") {
      // Consommer freemium si encore disponible
      const { error: creditsErr } = await supabaseAdmin
        .from("nova_credits")
        .update({ is_freemium_used: true })
        .eq("user_id", user_id);
      if (creditsErr) throw creditsErr;
    } else if (option === "pack3" || option === "pack5" || option === "bundle") {
      const decrement = option === "pack3" ? 1 : option === "pack5" ? 1 : 1; 
      // 👆 ici on décrémente d’UNE session consommée
      const { data: credits, error: selectErr } = await supabaseAdmin
        .from("nova_credits")
        .select("credits_sessions")
        .eq("user_id", user_id)
        .single();
      if (selectErr) throw selectErr;

      const remaining = Math.max((credits?.credits_sessions ?? 0) - decrement, 0);
      const { error: updateCreditsErr } = await supabaseAdmin
        .from("nova_credits")
        .update({ credits_sessions: remaining })
        .eq("user_id", user_id);
      if (updateCreditsErr) throw updateCreditsErr;
    }

    // 3. Récupérer l’état de la session (questions déjà posées + mémoire)
    const { data: sessionData, error: sessionErr } = await supabaseAdmin
      .from("nova_sessions")
      .select("id, questions, lang, niveau, type, profile, duration")
      .eq("id", id)
      .single();
    if (sessionErr) throw sessionErr;

    const { data: memoryData, error: memoryErr } = await supabaseAdmin
      .from("nova_memory")
      .select("question_id, reponse, feedback, score, created_at")
      .eq("session_id", id)
      .order("created_at", { ascending: true });
    if (memoryErr) throw memoryErr;

    // 4. Lire crédits restants
    const { data: creditsFinal } = await supabaseAdmin
      .from("nova_credits")
      .select("credits_sessions, is_freemium_used")
      .eq("user_id", user_id)
      .single();

    // 5. Retourner l’état complet
    return NextResponse.json({
      ok: true,
      session: sessionData,
      memory: memoryData || [],
      credits: creditsFinal ?? {},
    });
  } catch (e: any) {
    console.error("sessions/premium error:", e);
    return NextResponse.json(
      { error: e?.message ?? "server_error" },
      { status: 500 }
    );
  }
}
