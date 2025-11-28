import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * GET /api/admin/users
 * -> liste tous les utilisateurs avec leur profil et progression
 * ⚠️ Accès réservé aux admins
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Récupérer user_id injecté par middleware
    const user_id = req.headers.get("x-user-id");
    if (!user_id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // 2. Vérifier rôle admin
    const { data: roleRow, error: roleErr } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user_id)
      .maybeSingle();
    if (roleErr) throw roleErr;

    if (roleRow?.role !== "admin") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // 3. Charger tous les utilisateurs
    const { data: users, error: uErr } = await supabaseAdmin
      .from("profiles")
      .select("id, email, created_at, role");
    if (uErr) throw uErr;

    // 4. Charger profils
    const { data: profiles, error: pErr } = await supabaseAdmin
      .from("nova_profile")
      .select("user_id, xp_total, axes, last_update");
    if (pErr) throw pErr;

    // 5. Charger sessions récentes
    const { data: sessions, error: sErr } = await supabaseAdmin
      .from("nova_sessions")
      .select("id,user_id,score,started_at,is_premium")
      .order("started_at", { ascending: false })
      .limit(200);
    if (sErr) throw sErr;

    // 6. Mapping
    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]));
    const sessionMap = new Map<string, any[]>();
    (sessions ?? []).forEach((s) => {
      if (!sessionMap.has(s.user_id)) sessionMap.set(s.user_id, []);
      sessionMap.get(s.user_id)?.push(s);
    });

    const enriched = (users ?? []).map((u) => {
      const prof = profileMap.get(u.id) || null;
      const recentSessions = sessionMap.get(u.id) || [];
      return {
        id: u.id,
        email: u.email,
        role: u.role,
        created_at: u.created_at,
        xp_total: prof?.xp_total ?? 0,
        axes: prof?.axes ?? null,
        last_update: prof?.last_update ?? null,
        recent_sessions: recentSessions.slice(0, 3),
      };
    });

    return NextResponse.json({ ok: true, users: enriched });
  } catch (e: any) {
    console.error("admin/users error:", e);
    return NextResponse.json(
      { error: e?.message ?? "server_error" },
      { status: 500 }
    );
  }
}
