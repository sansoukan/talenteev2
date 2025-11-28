import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

/* ============================================================
   🔐 CONFIG
============================================================ */
const stripeKey = process.env.STRIPE_SECRET_KEY!;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   🚀 WEBHOOK STRIPE — VERSION GOOGLE-CTO
============================================================ */
export async function POST(req: NextRequest) {
  const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

  console.log("===============================================");
  console.log("🚀 [WEBHOOK] Stripe event received:", new Date().toISOString());

  /* ---------------------------------------------
     1️⃣ Lire le body RAW (OBLIGATOIRE)
  --------------------------------------------- */
  const rawBody = Buffer.from(await req.arrayBuffer());
  const signature = req.headers.get("stripe-signature");

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature!,
      stripeWebhookSecret
    );
  } catch (err: any) {
    console.error("❌ Invalid Stripe signature:", err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  console.log(`📦 Event type: ${event.type}`);

  try {
    /* ============================================================
       CASE 1 — checkout.session.completed
    ============================================================= */
    if (event.type === "checkout.session.completed") {
      console.log("💳 checkout.session.completed received");

      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata ?? {};

      const novaSessionId = metadata.nova_session_id;
      const userId = metadata.user_id;
      const option = metadata.option;
      const amount = (session.amount_total ?? 0) / 100;
      const currency = session.currency ?? "EUR";

      if (!novaSessionId || !userId) {
        console.warn("⚠️ Missing metadata — ignoring");
        return NextResponse.json({ ok: true });
      }

      /* -----------------------
         1️⃣ Mark purchase PAID
      ------------------------ */
      await supabaseAdmin
        .from("nova_purchases")
        .upsert(
          {
            user_id: userId,
            session_id: novaSessionId,
            option,
            amount,
            currency,
            status: "paid",
            payment_provider: "stripe",
            provider_session_id: session.id,
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "session_id" }
        );

      /* -----------------------
         2️⃣ Mark session STARTED
      ------------------------ */
      await supabaseAdmin
        .from("nova_sessions")
        .update({
          status: "started",
          is_premium: true,
          payment_provider: "stripe",
          payment_session_id: session.id,
          payment_status: "paid",
          paid_at: new Date().toISOString(),
        })
        .eq("id", novaSessionId);

      console.log(
        `🎯 Session ${novaSessionId} marked as started (paid = true)`
      );
    }

    /* ============================================================
       CASE 2 — checkout.session.expired
    ============================================================= */
    else if (event.type === "checkout.session.expired") {
      console.warn("⚠️ checkout.session.expired");

      const session = event.data.object as Stripe.Checkout.Session;

      await supabaseAdmin
        .from("nova_purchases")
        .update({
          status: "canceled",
          updated_at: new Date().toISOString(),
        })
        .eq("provider_session_id", session.id);
    }

    /* ============================================================
       CASE 3 — payment_intent.payment_failed
    ============================================================= */
    else if (event.type === "payment_intent.payment_failed") {
      console.warn("💥 payment_intent.payment_failed");

      const intent = event.data.object as Stripe.PaymentIntent;
      const sessionId = intent.metadata?.nova_session_id;

      if (sessionId) {
        await supabaseAdmin
          .from("nova_purchases")
          .update({
            status: "failed",
            updated_at: new Date().toISOString(),
          })
          .eq("session_id", sessionId);
      }
    }

    /* ============================================================
       OTHER EVENTS (Ignored)
    ============================================================= */
    else {
      console.log(`ℹ️ Unhandled event: ${event.type}`);
    }

    console.log("✅ [WEBHOOK] Processed successfully");
    console.log("===============================================");

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("💥 Webhook internal error:", err.message);
    return new NextResponse(`Server Error: ${err.message}`, { status: 500 });
  }
}