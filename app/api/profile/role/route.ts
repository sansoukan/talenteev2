import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * GET /api/profile/role
 * -> retourne le rôle de l’utilisateur courant ("user" ou "admin")
 * ⚠️ Le middleware doit injecter x-user-id
 */
export async function GET(req: NextRequest) {
  try {
    const user_id = req.headers.get("x-user-id");
    if (!user_id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user_id)
      .maybeSingle();
    if (error) throw error;

    return NextResponse.json({ role: data?.role ?? "user" });
  } catch (e: any) {
    console.error("profile/role error:", e);
    return NextResponse.json(
      { error: e?.message ?? "server_error" },
      { status: 500 }
    );
  }
}
