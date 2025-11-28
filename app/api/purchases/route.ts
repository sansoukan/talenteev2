import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Auth user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Purchases list
    const { data, error } = await supabase
      .from("nova_purchases")
      .select("id, option, amount, currency, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;

    return NextResponse.json({ purchases: data ?? [] });
  } catch (err: any) {
    console.error("❌ Purchases API error:", err.message);
    return NextResponse.json({ error: err.message ?? "server_error" }, { status: 500 });
  }
}

// ⚠️ Debug only: insert fake purchase
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Disabled in production" }, { status: 403 });
  }

  try {
    const supabase = createRouteHandlerClient({ cookies });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { option = "student", amount = 2.99, status = "paid" } = body;

    const { data, error } = await supabase.from("nova_purchases").insert({
      user_id: user.id,
      option,
      price_id: "debug_price_id",
      amount,
      currency: "usd",
      status,
    });

    if (error) throw error;

    return NextResponse.json({ success: true, inserted: data });
  } catch (err: any) {
    console.error("❌ Insert fake purchase error:", err.message);
    return NextResponse.json({ error: err.message ?? "server_error" }, { status: 500 });
  }
}
