// /app/api/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

const stripeKey = process.env.STRIPE_SECRET_KEY;
const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/**
 * Maps if you want to use price ids per stage / pack.
 * Keep them in env if you configure Stripe later.
 */
const careerStagePrices: Record<string, string | undefined> = {
  student: process.env.STRIPE_PRICE_STAGE,
  graduate: process.env.STRIPE_PRICE_GRADUATE,
  mid: process.env.STRIPE_PRICE_MID,
  manager: process.env.STRIPE_PRICE_MANAGER,
  exec: process.env.STRIPE_PRICE_EXEC,
};

const packPrices: Record<string, string | undefined> = {
  pack3junior: process.env.STRIPE_PRICE_PACK3JUNIOR,
  pack3mid: process.env.STRIPE_PRICE_PACK3MID,
  pack5mix: process.env.STRIPE_PRICE_PACK5MIX,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { app_session_id, user_id, option } = body || {};

    if (!app_session_id || !user_id) {
      return NextResponse.json(
        { error: "Missing app_session_id or user_id" },
        { status: 400 }
      );
    }

    const supabase = createRouteHandlerClient({ cookies });

    // 1) Récupérer le profile (career_stage)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("career_stage, first_name")
      .eq("id", user_id)
      .single();

    if (profileError) {
      console.error("Failed to fetch profile:", profileError);
      return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
    }

    const stage = profile?.career_stage?.toLowerCase();
    const firstName = profile?.first_name ?? "User";

    // Helper urls
    const successUrl = `${site}/session?success=true&app_session_id=${encodeURIComponent(app_session_id)}`;
    const cancelUrl = `${site}/session?canceled=true&app_session_id=${encodeURIComponent(app_session_id)}`;

    // ---------- BYPASS FOR STUDENTS ----------
    if (stage === "student") {
      console.log("Student detected → free session (bypass).");

      const { error: insertError } = await supabase.from("nova_purchases").insert({
        user_id,
        option: "student_free",
        amount: 0.0,
        currency: "EUR",
        status: "completed",           // already granted
        payment_provider: "internal",
        provider_session_id: `student_${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (insertError) {
        console.error("Failed to insert free student purchase:", insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      return NextResponse.json({ url: successUrl, bypass: true });
    }

    // ---------- DEV COUPON (local only) ----------
    if (
      option &&
      String(option).toUpperCase() === "DEV25" &&
      process.env.NODE_ENV !== "production"
    ) {
      const { error: insertError } = await supabase.from("nova_purchases").insert({
        user_id,
        option: "dev_coupon",
        amount: 0.0,
        currency: "EUR",
        status: "completed",
        payment_provider: "internal",
        provider_session_id: `dev_${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (insertError) {
        console.error("Failed to insert dev coupon:", insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      return NextResponse.json({ url: successUrl, bypass: true });
    }

    // ---------- STRIPE CHECK ----------
    if (!stripeKey) {
      // If in production, require Stripe.
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "STRIPE_SECRET_KEY missing" }, { status: 500 });
      }

      // Dev fallback: create a MOCK purchase so the frontflow works before Stripe is configured.
      console.warn("STRIPE_SECRET_KEY missing — creating a mock purchase (dev only).");

      const { error: mockInsertError } = await supabase.from("nova_purchases").insert({
        user_id,
        option: option ?? "mock_purchase",
        amount: 0.0,
        currency: "EUR",
        status: "completed",
        payment_provider: "mock",
        provider_session_id: `mock_${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (mockInsertError) {
        console.error("Failed to create mock purchase:", mockInsertError);
        return NextResponse.json({ error: mockInsertError.message }, { status: 500 });
      }

      return NextResponse.json({ url: successUrl, mock: true });
    }

    // ---------- Normal Stripe flow ----------
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

    // determine priceId from option or stage
    let priceId: string | undefined;
    if (option) {
      const key = String(option).toLowerCase();
      priceId = packPrices[key] || careerStagePrices[key];
    }
    if (!priceId && stage) {
      priceId = careerStagePrices[stage];
    }

    if (!priceId) {
      return NextResponse.json(
        { error: `No Stripe Price ID found (option: ${option}, stage: ${stage})` },
        { status: 400 }
      );
    }

    // Retrieve price to know the amount & currency (safe to compute amount before inserting)
    const priceObj = await stripe.prices.retrieve(priceId);
    const unitAmount = (priceObj.unit_amount ?? 0) as number; // in cents
    const currency = (priceObj.currency ?? "eur").toUpperCase();
    const amount = unitAmount > 0 ? unitAmount / 100 : 0;

    // create stripe session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { app_session_id, user_id, option },
    });

    // Insert a purchase row in pending state (so dashboard shows it)
    const { error: insertErr } = await supabase.from("nova_purchases").insert({
      user_id,
      option: option ?? `stripe_price_${priceId}`,
      amount: amount,
      currency: currency,
      status: "pending",                     // will be updated by webhook on success
      payment_provider: "stripe",
      provider_session_id: session.id,       // stripe checkout session id
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (insertErr) {
      console.error("Failed to insert nova_purchases row:", insertErr);
      // don't fail the Stripe creation — but return an error to the client so you can handle it
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    // Return the checkout url to the front
    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("checkout route error:", err);
    return NextResponse.json({ error: err?.message ?? "server_error" }, { status: 500 });
  }
}
