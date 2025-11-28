import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin"; // ✅ admin client (bypass RLS)

/**
 * 🎯 Nova Engine — API Get Questions (V6 Enhanced — Admin Mode)
 * -------------------------------------------------------------
 * ✅ Retry automatique (3x si latence)
 * ✅ Vérifie présence de questions
 * ✅ Recharge depuis `nova_questions` si les objets sont incomplets
 * ✅ Logs complets
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { session_id: string } }
) {
  try {
    const { session_id } = params;
    if (!session_id)
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 });

    console.log(`🔍 [Nova] Checking session ${session_id} (admin mode)`);

    // 🧠 client admin (bypass RLS)
    const supabase = supabaseAdmin;

    // 🕐 Retry automatique (jusqu’à 3x)
    let data = null;
    let error = null;
    const maxAttempts = 3;
    const delayMs = 250;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const { data: result, error: err } = await supabase
        .from("nova_sessions")
        .select(
          "id, user_id, questions, domain, sub_domain, role_target, type_entretien, started_at, lang, status"
        )
        .eq("id", session_id)
        .maybeSingle();

      if (result) {
        data = result;
        console.log(`✅ Attempt ${attempt}/${maxAttempts} — session found`);
        break;
      }

      error = err;
      console.warn(`⚠️ Attempt ${attempt}/${maxAttempts} — session not found yet`);
      await new Promise((r) => setTimeout(r, delayMs));
    }

    // ❌ Session introuvable
    if (!data) {
      console.error("❌ Session not found after retries:", error);
      return NextResponse.json(
        {
          error: "Session not found. Please contact support if this persists.",
          code: "SESSION_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    console.log(
      `✅ [Nova] Session ${data.id} loaded (status: ${data.status}) | ${
        data.questions?.length || 0
      } raw questions`
    );

    // ❌ Aucune question dans la session
    if (!data.questions || data.questions.length === 0) {
      console.error("🚫 Empty session questions:", session_id);
      return NextResponse.json(
        {
          error:
            "Session not ready. Please wait a few seconds and restart the simulation.",
          code: "EMPTY_QUESTIONS",
        },
        { status: 409 }
      );
    }

    // 🔍 Vérifie si les questions sont incomplètes (pas de texte ni d'URL)
    const isIncomplete =
      data.questions &&
      data.questions.length > 0 &&
      (!data.questions[0].video_url_en &&
        !data.questions[0].video_url_fr &&
        !data.questions[0].text);

    if (isIncomplete) {
      console.log("♻️ [Nova] Questions incomplètes, rechargement depuis nova_questions…");

      const ids = data.questions.map((q: any) => q.id).filter(Boolean);
      if (ids.length > 0) {
        const { data: fullQuestions, error: qErr } = await supabase
          .from("nova_questions")
          .select("*")
          .in("id", ids);

        if (qErr) {
          console.error("❌ Erreur lors du rechargement des questions:", qErr.message);
        } else if (fullQuestions?.length) {
          data.questions = fullQuestions;
          console.log(`✅ [Nova] ${fullQuestions.length} questions enrichies depuis nova_questions`);
        } else {
          console.warn("⚠️ [Nova] Aucune question correspondante trouvée dans nova_questions");
        }
      } else {
        console.warn("⚠️ [Nova] Impossible de recharger, liste d'IDs vide.");
      }
    } else {
      console.log("🧠 [Nova] Questions déjà complètes, aucun rechargement nécessaire.");
    }

    // ✅ Session OK
    console.log(
      `✅ [Nova] Session ${session_id} finalisée avec ${
        data.questions?.length || 0
      } questions prêtes.`
    );

    return NextResponse.json({
      id: data.id,
      session_id: data.id,
      user_id: data.user_id,
      domain: data.domain,
      sub_domain: data.sub_domain,
      career_stage: data.role_target,
      type: data.type_entretien,
      started_at: data.started_at,
      lang: data.lang || "en",
      status: data.status || "unknown",
      questions: data.questions,
    });
  } catch (err: any) {
    console.error("❌ Engine Questions Error:", err);
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}