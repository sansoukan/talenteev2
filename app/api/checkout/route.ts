import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { fetchInterviewQuestions } from "@/lib/fetchInterviewQuestions"
import { normalizeStage } from "@/lib/utils/normalizeStage"

const stripeKey = process.env.STRIPE_SECRET_KEY
const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      user_id,
      option,
      domain,
      goal,
      career_stage,
      duration_limit,
      offer_context,
      sub_domain,
      skip_cv,
      chosen_lang,
      segment,
    } = body

    console.log("📩 /api/engine/start — Payload reçu:", body)

    if (!user_id || !option) {
      console.warn("⚠️ Requête incomplète → user_id ou option manquant")
      return NextResponse.json({ error: "Missing user_id or option" }, { status: 400 })
    }

    // 🔥 Langue de session : prend chosen_lang si fourni, sinon EN
    const lang = (chosen_lang || "en") as string

    const supabase = supabaseAdmin

    /* ----------------------------------------------------
       1️⃣ Vérifier profil utilisateur
    ---------------------------------------------------- */
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, last_cv_url, last_cv_upload_at, career_stage")
      .eq("id", user_id)
      .maybeSingle()

    console.log("🔍 Profil récupéré:", profile, "Erreur:", profileError)

    if (profileError) {
      console.error("❌ Erreur Supabase lors de la lecture profil:", profileError.message)
      return NextResponse.json({ error: "Error fetching profile" }, { status: 500 })
    }

    if (!profile) {
      console.warn("⚠️ Aucun profil trouvé pour user_id:", user_id)
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    const hasCV =
      profile?.last_cv_upload_at &&
      profile?.last_cv_url &&
      profile.last_cv_url.trim() !== ""

    console.log(`📎 CV détecté ? ${!!hasCV} | skip_cv = ${skip_cv}`)

    if (!hasCV && !skip_cv) {
      console.log("🟥 Blocage : CV manquant et skip désactivé")
      return NextResponse.json({
        require_cv: true,
        message:
          "Please upload your CV before starting your simulation. It helps Nova personalize your interview.",
      })
    }

    /* ----------------------------------------------------
       2️⃣ Profil CV structuré (si disponible)
    ---------------------------------------------------- */
    const { data: cvProfile } = await supabase
      .from("nova_cv_profiles")
      .select("domain_focus, seniority, skills, tags")
      .eq("user_id", user_id)
      .order("last_updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    console.log("📄 CV profile:", cvProfile)

    /* ----------------------------------------------------
       3️⃣ Génération des questions
    ---------------------------------------------------- */
    console.log("🎯 Génération des questions...")
    const questions = await fetchInterviewQuestions({
      career_stage,
      domain,
      sub_domain,
      option,
      lang,
      segment,
    })
    console.log(`✅ ${questions?.length || 0} questions générées.`)

    /* ----------------------------------------------------
       4️⃣ Création session dans nova_sessions
    ---------------------------------------------------- */
    console.log("🧾 Insertion nouvelle session Nova...")

    const { data: session, error: sessionError } = await supabase
      .from("nova_sessions")
      .insert({
        user_id,
        role_target: career_stage,
        type_entretien: option,
        domain,
        goal,
        sub_domain,
        lang, // langue choisie
        price_value: 0,
        currency: "EUR",
        duration_limit: duration_limit || 900,
        is_freemium: !stripeKey,
        status: "pending",
        started_at: new Date(),

        cv_context: hasCV
          ? {
              domain_focus: cvProfile?.domain_focus || domain,
              seniority: cvProfile?.seniority || career_stage,
              skills: cvProfile?.skills || [],
              tags: cvProfile?.tags || [],
            }
          : null,

        offer_context,
        questions: questions || [],
      })
      .select("id, status")
      .maybeSingle()

    if (sessionError || !session) {
      console.error("❌ Session creation failed:", sessionError)
      return NextResponse.json({ error: "Session creation failed" }, { status: 500 })
    }

    const session_id = session.id
    const stage = normalizeStage(profile?.career_stage || "unknown")

    console.log(`🧾 Session ${session_id} créée → status = ${session.status}`)

    /* ----------------------------------------------------
       5️⃣ Mode gratuit ou étudiant
    ---------------------------------------------------- */
    if (!stripeKey || stage === "student") {
      console.log("💸 Mode gratuit / étudiant détecté → pas de Stripe")

      await supabase.from("nova_purchases").insert({
        user_id,
        session_id,
        option,
        amount: 0,
        currency: "EUR",
        status: "completed",
        payment_provider: stripeKey ? "stripe" : "mock",
        provider_session_id: `free_${Date.now()}`,
        price_id: "free_mode",
        paid_at: new Date().toISOString(),
      })

      console.log("🧾 Achat gratuit enregistré")

      await supabase
        .from("nova_sessions")
        .update({ status: "paid" })
        .eq("id", session_id)

      return NextResponse.json({
        bypass: true,
        session_id,
        url: `${site}/session?session_id=${session_id}`,
      })
    }

    /* ----------------------------------------------------
       6️⃣ Stripe checkout (payant)
    ---------------------------------------------------- */
    console.log("💳 Initialisation Stripe...")

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" })
    const prices: Record<string, string | undefined> = {
      internship: process.env.STRIPE_PRICE_INTERNSHIP,
      job_interview: process.env.STRIPE_PRICE_JOB,
      case_study: process.env.STRIPE_PRICE_CASE,
      promotion: process.env.STRIPE_PRICE_PROMOTION,
      annual_review: process.env.STRIPE_PRICE_REVIEW,
      goal_setting: process.env.STRIPE_PRICE_GOAL,
      mobility: process.env.STRIPE_PRICE_MOBILITY,
      practice: process.env.STRIPE_PRICE_PRACTICE,
      strategic_case: process.env.STRIPE_PRICE_STRATEGIC,
    }

    const priceId = prices[option]

    if (!priceId) {
      return NextResponse.json(
        { error: `No Stripe price found for '${option}'` },
        { status: 400 }
      )
    }

    const metadataPayload = {
      nova_session_id: String(session_id),
      user_id: String(user_id),
      option: String(option),
    }

    const sessionStripe = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${site}/session?session_id=${session_id}`,
      cancel_url: `${site}/session/canceled`,
      metadata: metadataPayload,
    })

    await supabase.from("nova_purchases").insert({
      user_id,
      session_id,
      option,
      price_id: priceId,
      amount:
        option === "job_interview"
          ? 3.99
          : option === "strategic_case"
          ? 6.99
          : option === "annual_review"
          ? 3.99
          : 0,
      currency: "EUR",
      status: "pending",
      payment_provider: "stripe",
      provider_session_id: sessionStripe.id,
      created_at: new Date().toISOString(),
    })

    return NextResponse.json({
      url: sessionStripe.url,
      session_id,
    })
  } catch (err: any) {
    console.error("💥 Engine Start Error:", err?.message || err)
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 })
  }
}
