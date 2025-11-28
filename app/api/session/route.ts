import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * POST  → create a session with freemium / credits logic
 * PATCH → close a session
 * GET   → return a session (for resume)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, type, niveau, lang: clientLang } = body || {};
    if (!user_id) {
      return NextResponse.json({ error: "missing user_id" }, { status: 400 });
    }

    // 🌍 Detect language (client > header > default EN)
    const detectedLang =
      clientLang ||
      req.headers.get("accept-language")?.slice(0, 2) ||
      "en"; // ✅ English fallback

    // 1️⃣ Fetch user credits
    const { data: credits, error: cErr } = await supabaseAdmin
      .from("nova_credits")
      .select("credits_sessions,is_freemium_used")
      .eq("user_id", user_id)
      .maybeSingle();
    if (cErr) throw cErr;

    let allow = false;
    let requiresPremium = false;
    let isPremium = false;
    let fixedDuration: number | null = null;

    // Level 0 (always free)
    if (String(niveau) === "0") {
      allow = true;
      isPremium = false;
    }
    // Level 1 (freemium possible once)
    else if (String(niveau) === "1") {
      if (!credits?.is_freemium_used) {
        allow = true;
        isPremium = false;
        await supabaseAdmin
          .from("nova_credits")
          .update({ is_freemium_used: true })
          .eq("user_id", user_id);
      } else if ((credits?.credits_sessions ?? 0) > 0) {
        allow = true;
        isPremium = true;
        await supabaseAdmin
          .from("nova_credits")
          .update({
            credits_sessions: (credits.credits_sessions ?? 0) - 1,
          })
          .eq("user_id", user_id);
      } else {
        requiresPremium = true;
      }
    }
    // Full journey (bundle, always premium, 80 minutes)
    else if (String(niveau) === "bundle") {
      fixedDuration = 80;
      if ((credits?.credits_sessions ?? 0) > 0) {
        allow = true;
        isPremium = true;
        await supabaseAdmin
          .from("nova_credits")
          .update({
            credits_sessions: (credits.credits_sessions ?? 0) - 1,
          })
          .eq("user_id", user_id);
      } else {
        requiresPremium = true;
      }
    }
    // Levels 2, 3, internal → premium required
    else {
      if ((credits?.credits_sessions ?? 0) > 0) {
        allow = true;
        isPremium = true;
        await supabaseAdmin
          .from("nova_credits")
          .update({
            credits_sessions: (credits.credits_sessions ?? 0) - 1,
          })
          .eq("user_id", user_id);
      } else {
        requiresPremium = true;
      }
    }

    // 2️⃣ Block if not allowed
    if (!allow) {
      return NextResponse.json(
        { requires_premium: true, message: "Premium required" },
        { status: 402 }
      );
    }

    // 3️⃣ Create session with detected language
    const { data, error } = await supabaseAdmin
      .from("nova_sessions")
      .insert({
        user_id,
        type: type ?? "job",
        niveau: String(niveau ?? "1"),
        lang: detectedLang, // ✅ Store detected language (default EN)
        started_at: new Date().toISOString(),
        is_premium: isPremium,
        duration: fixedDuration,
      })
      .select("id, lang")
      .maybeSingle();

    if (error) throw error;

    console.log("🌍 New session created with lang =", data?.lang);

    return NextResponse.json({ id: data?.id, is_premium: isPremium, lang: data?.lang });
  } catch (e: any) {
    console.error("session POST error:", e);
    return NextResponse.json(
      { error: e?.message ?? "server_error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      score,
      feedback_text,
      feedback_audio,
      report_url,
      detailed_report,
    } = body || {};
    if (!id)
      return NextResponse.json({ error: "missing id" }, { status: 400 });

    const { data: ses, error: e1 } = await supabaseAdmin
      .from("nova_sessions")
      .select("started_at")
      .eq("id", id)
      .maybeSingle();
    if (e1) throw e1;

    const endedAt = new Date();
    let duration: number | null = null;
    if (ses?.started_at) {
      duration = Math.round(
        (endedAt.getTime() - new Date(ses.started_at).getTime()) / 60000
      );
    }

    const { error: e2 } = await supabaseAdmin
      .from("nova_sessions")
      .update({
        ended_at: endedAt.toISOString(),
        duration,
        score: score ?? null,
        feedback_text: feedback_text ?? null,
        feedback_audio: feedback_audio ?? null,
        report_url: report_url ?? null,
        detailed_report: detailed_report ?? null,
      })
      .eq("id", id);

    if (e2) throw e2;
    return NextResponse.json({ ok: true, duration });
  } catch (e: any) {
    console.error("session PATCH error:", e);
    return NextResponse.json(
      { error: e?.message ?? "server_error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id)
      return NextResponse.json({ error: "missing id" }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from("nova_sessions")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data)
      return NextResponse.json({ error: "session_not_found" }, { status: 404 });

    return NextResponse.json(data);
  } catch (e: any) {
    console.error("session GET error:", e);
    return NextResponse.json(
      { error: e?.message ?? "server_error" },
      { status: 500 }
    );
  }
}
