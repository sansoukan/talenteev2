import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import PDFDocument from "@/lib/pdfkit";

/**
 * GET /api/pdf/team?manager_id=xxx
 * → Retourne un PDF comparatif multi-utilisateurs pour un manager
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const manager_id = searchParams.get("manager_id");
    if (!manager_id) {
      return NextResponse.json({ error: "missing manager_id" }, { status: 400 });
    }

    // 1. Récupérer les users de l’équipe du manager
    const { data: users, error: usersErr } = await supabaseAdmin
      .from("profiles")
      .select("id, email, nom, prenom")
      .eq("manager_id", manager_id);
    if (usersErr) throw usersErr;
    if (!users || users.length === 0) {
      return NextResponse.json(
        { error: "no_users_for_manager" },
        { status: 404 }
      );
    }

    // 2. Charger profils + sessions pour chaque user
    const { data: profiles } = await supabaseAdmin
      .from("nova_profile")
      .select("user_id, xp_total, axes");

    const { data: sessions } = await supabaseAdmin
      .from("nova_sessions")
      .select("user_id, score, started_at, niveau, type");

    const { data: badges } = await supabaseAdmin
      .from("nova_certifications")
      .select("user_id, skill_improved, score, badge_url");

    // 3. Construire PDF
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      const bufs: Buffer[] = [];
      doc.on("data", (d) => bufs.push(d));
      doc.on("end", () => resolve(Buffer.concat(bufs)));
      doc.on("error", reject);

      // Titre
      doc.fontSize(20).text("📊 Rapport Nova RH – Vue Manager", { align: "center" });
      doc.moveDown();

      // Boucle sur chaque user
      users.forEach((u, idx) => {
        const prof = profiles?.find((p) => p.user_id === u.id);
        const ses = (sessions ?? []).filter((s) => s.user_id === u.id);
        const bds = (badges ?? []).filter((b) => b.user_id === u.id);

        if (idx > 0) doc.addPage();

        doc.fontSize(14).text(`👤 ${u.prenom ?? ""} ${u.nom ?? ""}`, {
          underline: true,
        });
        doc.fontSize(12).text(`Email: ${u.email ?? "—"}`);
        doc.text(`XP total: ${prof?.xp_total ?? 0}`);
        if (prof?.axes) {
          doc.text("Axes :");
          Object.entries(prof.axes).forEach(([k, v]: any) => {
            doc.text(`  • ${label(k)} : ${v ?? "—"}`);
          });
        }
        doc.moveDown();

        // Sessions
        doc.fontSize(13).text("📈 Sessions", { underline: true });
        if (ses.length === 0) {
          doc.text("Aucune session.");
        } else {
          ses.forEach((s) => {
            doc.text(
              `• ${new Date(s.started_at).toLocaleDateString()} | ${
                s.type
              } (N${s.niveau}) → Score: ${s.score ?? "—"}`
            );
          });
        }
        doc.moveDown();

        // Badges
        doc.fontSize(13).text("🏅 Badges", { underline: true });
        if (bds.length === 0) {
          doc.text("Aucun badge.");
        } else {
          bds.forEach((b) => {
            doc.text(
              `• ${b.skill_improved ?? "Compétence"} → Score: ${
                b.score ?? "—"
              } ${b.badge_url ? `(voir: ${b.badge_url})` : ""}`
            );
          });
        }
      });

      doc.end();
    });

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="nova_team_${manager_id}.pdf"`,
      },
    });
  } catch (e: any) {
    console.error("pdf team error:", e);
    return NextResponse.json(
      { error: e?.message ?? "server_error" },
      { status: 500 }
    );
  }
}

function label(k: string) {
  switch (k) {
    case "global_score":
      return "Score global";
    case "contentAvg":
      return "Contenu";
    case "wpmNorm":
      return "Débit parole";
    case "hesNorm":
      return "Hésitations";
    case "eyeAvg":
      return "Contact visuel";
    default:
      return k;
  }
}
