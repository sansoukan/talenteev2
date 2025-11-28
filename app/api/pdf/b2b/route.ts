import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import PDFDocument from "@/lib/pdfkit";

/**
 * GET /api/pdf/b2b?user_id=xxx
 * → Retourne un PDF multi-sessions pour un utilisateur (progression, badges, axes)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get("user_id");
    if (!user_id) {
      return NextResponse.json({ error: "missing user_id" }, { status: 400 });
    }

    // 1. Charger profil
    const { data: profile, error: profErr } = await supabaseAdmin
      .from("nova_profile")
      .select("*")
      .eq("user_id", user_id)
      .maybeSingle();
    if (profErr) throw profErr;

    // 2. Charger sessions
    const { data: sessions, error: sesErr } = await supabaseAdmin
      .from("nova_sessions")
      .select("id, type, niveau, lang, started_at, ended_at, score, report_url")
      .eq("user_id", user_id)
      .order("started_at", { ascending: true });
    if (sesErr) throw sesErr;

    // 3. Charger badges
    const { data: badges } = await supabaseAdmin
      .from("nova_certifications")
      .select("skill_improved, score, badge_url, created_at")
      .eq("user_id", user_id)
      .order("created_at", { ascending: true });

    // 4. Construire PDF
    const doc = new PDFDocument({ margin: 40 });
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      const bufs: Buffer[] = [];
      doc.on("data", (d) => bufs.push(d));
      doc.on("end", () => resolve(Buffer.concat(bufs)));
      doc.on("error", reject);

      // Titre
      doc.fontSize(20).text("📊 Rapport Nova RH – Vue B2B", { align: "center" });
      doc.moveDown();

      // Profil
      doc.fontSize(14).text("👤 Profil utilisateur", { underline: true });
      doc.fontSize(12).text(`User ID: ${user_id}`);
      doc.text(`XP total: ${profile?.xp_total ?? 0}`);
      if (profile?.axes) {
        doc.text("Axes récents :");
        Object.entries(profile.axes).forEach(([k, v]: any) => {
          doc.text(`  • ${label(k)} : ${v ?? "—"}`);
        });
      }
      doc.moveDown();

      // Progression des sessions
      doc.fontSize(14).text("📈 Progression des sessions", { underline: true });
      if (!sessions || sessions.length === 0) {
        doc.text("Aucune session enregistrée.");
      } else {
        sessions.forEach((s, i) => {
          doc.moveDown(0.5);
          doc.fontSize(12).text(
            `${i + 1}. ${s.type} (Niveau ${s.niveau}, ${s.lang}) – Score: ${
              s.score ?? "—"
            }`
          );
          doc.text(
            `   Début: ${s.started_at ? new Date(s.started_at).toLocaleString() : "—"}`
          );
          doc.text(
            `   Fin: ${s.ended_at ? new Date(s.ended_at).toLocaleString() : "—"}`
          );
          if (s.report_url) {
            doc.fillColor("blue").text(`   Rapport: ${s.report_url}`, {
              link: s.report_url,
              underline: true,
            });
            doc.fillColor("black");
          }
        });
      }
      doc.moveDown();

      // Badges
      doc.fontSize(14).text("🏅 Badges obtenus", { underline: true });
      if (!badges || badges.length === 0) {
        doc.text("Aucun badge pour l’instant.");
      } else {
        badges.forEach((b) => {
          doc.moveDown(0.5);
          doc.fontSize(12).text(
            `${b.skill_improved ?? "Compétence"} – Score: ${b.score ?? "—"}`
          );
          if (b.badge_url) {
            doc.fillColor("blue").text(`Badge: ${b.badge_url}`, {
              link: b.badge_url,
              underline: true,
            });
            doc.fillColor("black");
          }
          if (b.created_at) {
            doc.text(`Attribué le: ${new Date(b.created_at).toLocaleDateString()}`);
          }
        });
      }

      doc.end();
    });

    // 5. Retourner PDF
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="nova_b2b_${user_id}.pdf"`,
      },
    });
  } catch (e: any) {
    console.error("pdf b2b error:", e);
    return NextResponse.json({ error: e?.message ?? "server_error" }, { status: 500 });
  }
}

function label(k: string) {
  switch (k) {
    case "global_score":
      return "Score global";
    case "contentAvg":
      return "Contenu";
    case "wpmNorm":
      return "Débit de parole";
    case "hesNorm":
      return "Hésitations";
    case "eyeAvg":
      return "Contact visuel";
    default:
      return k;
  }
}
