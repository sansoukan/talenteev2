/**
 * 🔍 VERIFY STRIPE PAYMENT
 * Cette route vérifie le paiement directement auprès de Stripe
 * et met à jour le status de la session si le paiement est confirmé.
 *
 * Utilisée comme fallback quand le webhook n'a pas encore mis à jour le status.
 */
import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

const stripeKey = process.env.STRIPE_SECRET_KEY!

export async function POST(req: NextRequest) {
  try {
    const { session_id } = await req.json()

    if (!session_id) {
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 })
    }

    console.log(`🔍 [verify-payment] Checking session: ${session_id}`)

    // 1️⃣ Récupérer la session Nova et le provider_session_id (Stripe checkout ID)
    const { data: novaSession, error: sessionError } = await supabaseAdmin
      .from("nova_sessions")
      .select("id, status, payment_session_id")
      .eq("id", session_id)
      .maybeSingle()

    if (sessionError || !novaSession) {
      console.error("❌ Session not found:", sessionError?.message)
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Si déjà payé/actif, retourner immédiatement
    if (["paid", "active", "started"].includes(novaSession.status)) {
      console.log(`✅ Session already active: ${novaSession.status}`)
      return NextResponse.json({
        status: novaSession.status,
        verified: true,
      })
    }

    // 2️⃣ Récupérer le provider_session_id depuis nova_purchases
    const { data: purchase } = await supabaseAdmin
      .from("nova_purchases")
      .select("provider_session_id, status")
      .eq("session_id", session_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!purchase?.provider_session_id) {
      console.log("⚠️ No Stripe session found for this Nova session")
      return NextResponse.json({
        status: novaSession.status,
        verified: false,
        message: "No payment session found",
      })
    }

    // Si c'est une session gratuite (étudiant, dev, mock), considérer comme payée
    if (
      purchase.provider_session_id.startsWith("free_") ||
      purchase.provider_session_id.startsWith("dev_") ||
      purchase.provider_session_id.startsWith("mock_") ||
      purchase.provider_session_id.startsWith("student_")
    ) {
      console.log("🆓 Free/dev session detected, marking as paid")

      await supabaseAdmin
        .from("nova_sessions")
        .update({
          status: "started",
          payment_status: "paid",
        })
        .eq("id", session_id)

      return NextResponse.json({ status: "started", verified: true })
    }

    // 3️⃣ Vérifier le paiement auprès de Stripe
    console.log(`💳 Checking Stripe session: ${purchase.provider_session_id}`)

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" })

    const stripeSession = await stripe.checkout.sessions.retrieve(purchase.provider_session_id)

    console.log(`📦 Stripe session status: ${stripeSession.payment_status}`)

    // 4️⃣ Si le paiement est confirmé, mettre à jour la session
    if (stripeSession.payment_status === "paid") {
      console.log("✅ Payment confirmed by Stripe, updating session...")

      // Mettre à jour nova_sessions
      await supabaseAdmin
        .from("nova_sessions")
        .update({
          status: "started",
          is_premium: true,
          payment_provider: "stripe",
          payment_session_id: stripeSession.id,
          payment_status: "paid",
          paid_at: new Date().toISOString(),
        })
        .eq("id", session_id)

      // Mettre à jour nova_purchases
      await supabaseAdmin
        .from("nova_purchases")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("session_id", session_id)

      console.log(`🎯 Session ${session_id} marked as started (paid)`)

      return NextResponse.json({
        status: "started",
        verified: true,
        message: "Payment verified and session activated",
      })
    }

    // Paiement non encore confirmé
    return NextResponse.json({
      status: novaSession.status,
      verified: false,
      stripe_status: stripeSession.payment_status,
      message: "Payment not yet confirmed",
    })
  } catch (err: any) {
    console.error("💥 verify-payment error:", err.message)
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 })
  }
}
