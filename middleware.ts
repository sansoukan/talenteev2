import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

const PROTECTED_PATHS = ["/session", "/dashboard", "/admin"];

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const path = url.pathname;

  // ---------------------------------------------------------
  // 0. ALLOW NON-PROTECTED ROUTES
  // ---------------------------------------------------------
  if (
    path.startsWith("/auth") ||
    path.startsWith("/auth/callback") ||
    path.startsWith("/api/stripe") || // webhook Stripe
    path.startsWith("/_next") ||
    path.includes(".")
  ) {
    return NextResponse.next();
  }

  // ---------------------------------------------------------
  // 1. STRIPE SAFE RETURN (NE PLUS BYPASSER SUPABASE)
  // ---------------------------------------------------------
  const isStripeReturn =
    path === "/session" && url.searchParams.get("session_id");

  const res = NextResponse.next();

  // IMPORTANT :
  // On crée toujours le client Supabase → pour restaurer la session
  const supabase = createMiddlewareClient(
    { req, res },
    {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Si retour Stripe → ON ACCEPTE, mais ON GARDE LA SESSION
  if (isStripeReturn) {
    console.log("🟦 [Middleware] Stripe return detected → SAFE PASS (session preserved)");
    return res; // PAS de bypass total — on renvoie la réponse AVEC la session
  }

  // ---------------------------------------------------------
  // 2. PROTECTED PATHS
  // ---------------------------------------------------------
  const isProtected = PROTECTED_PATHS.some((p) => path.startsWith(p));
  if (!isProtected) return res;

  // ---------------------------------------------------------
  // 3. REQUIRE LOGIN FOR PROTECTED PAGES
  // ---------------------------------------------------------
  if (!session) {
    console.log("❌ No Supabase session → redirect to /auth");
    url.pathname = "/auth";
    return NextResponse.redirect(url);
  }

  // ---------------------------------------------------------
  // 4. ONBOARDING CHECK
  // ---------------------------------------------------------
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", session.user.id)
    .maybeSingle();

  if (!profile?.onboarding_completed && path !== "/onboarding") {
    console.log("➡️ Redirecting to onboarding");
    url.pathname = "/onboarding";
    return NextResponse.redirect(url);
  }

  // ---------------------------------------------------------
  // 5. OK → Attach user header
  // ---------------------------------------------------------
  res.headers.set("x-user-id", session.user.id);
  return res;
}

export const config = {
  matcher: ["/((?!_next|static|favicon.ico).*)"],
};
