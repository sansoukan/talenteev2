"use client";

import { useEffect, useState } from "react";
import NovaRadarChart from "@/components/NovaRadarChart"; // 🧠 ajout
type Contribution = {
  session_id: string;
  score: number;
  is_premium: boolean;
  age_days: number;
  weight: number;
};

type Axes = {
  global_score?: number | null;
  contentAvg?: number | null;
  wpmNorm?: number | null;
  hesNorm?: number | null;
  eyeAvg?: number | null;
};

type DashboardData = {
  user_id: string;
  global_score: number | null;
  sessions_total: number;
  sessions_scored: number;
  contributions: Contribution[];
  badges_awarded?: string[];
  note?: string;
  last_analysis?: any;
  axes?: Axes;
};

export default function NovaDashboard({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(
          `/api/profile/update-score?user_id=${encodeURIComponent(userId)}`,
          { method: "GET", cache: "no-store" }
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "update_score_failed");
        setData(json);
      } catch (e: any) {
        setErr(e.message ?? "Erreur chargement dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  if (loading) return <div style={{ padding: 20 }}>⏳ Chargement…</div>;
  if (err)
    return (
      <div style={{ padding: 20, color: "var(--danger)" }}>⚠️ {err}</div>
    );
  if (!data) return <div style={{ padding: 20 }}>Pas de données</div>;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Score global */}
      <section
        style={{
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 16,
          background: "var(--bg-card)",
        }}
      >
        <h3 style={{ margin: 0, marginBottom: 8 }}>🌐 Score global</h3>
        <div style={{ fontSize: 28, fontWeight: 700 }}>
          {data.global_score !== null ? data.global_score.toFixed(2) : "—"}
        </div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          Sessions scorées : {data.sessions_scored} / {data.sessions_total}
        </div>
        {data.note && (
          <div
            style={{ fontSize: 13, marginTop: 8, opacity: 0.8 }}
          >
            {data.note}
          </div>
        )}
      </section>

      {/* Axes */}
      {data.axes && (
        <section
          style={{
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: 16,
            background: "var(--bg-card)",
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>📊 Axes de performance</h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px,1fr))",
              gap: 12,
            }}
          >
            {Object.entries(data.axes).map(([k, v]) => (
              <div
                key={k}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: 10,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {label(k)}
                </div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>
                  {v !== null && v !== undefined ? v.toFixed(2) : "—"}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 🧠 Radar Chart */}
      <NovaRadarChart userId={userId} />

      {/* Badges */}
      {data.badges_awarded && data.badges_awarded.length > 0 && (
        <section
          style={{
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: 16,
            background: "var(--bg-card)",
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 8 }}>🏅 Badges obtenus</h3>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {data.badges_awarded.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Contributions */}
      {data.contributions && data.contributions.length > 0 && (
        <section
          style={{
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: 16,
            background: "var(--bg-card)",
            overflowX: "auto",
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 8 }}>📈 Contributions pondérées</h3>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 14,
              color: "var(--text)",
            }}
          >
            <thead>
              <tr
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <th style={{ padding: "6px 8px" }}>Session</th>
                <th style={{ padding: "6px 8px" }}>Score</th>
                <th style={{ padding: "6px 8px" }}>Premium</th>
                <th style={{ padding: "6px 8px" }}>Âge (j)</th>
                <th style={{ padding: "6px 8px" }}>Poids</th>
              </tr>
            </thead>
            <tbody>
              {data.contributions.map((c) => (
                <tr
                  key={c.session_id}
                  style={{
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <td style={{ padding: "6px 8px" }}>{c.session_id}</td>
                  <td style={{ padding: "6px 8px" }}>{c.score.toFixed(2)}</td>
                  <td style={{ padding: "6px 8px" }}>
                    {c.is_premium ? "Oui" : "Non"}
                  </td>
                  <td style={{ padding: "6px 8px" }}>{c.age_days}</td>
                  <td style={{ padding: "6px 8px" }}>{c.weight.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Dernière analyse */}
      {data.last_analysis && (
        <section
          style={{
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: 16,
            background: "var(--bg-card)",
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 8 }}>
            📄 Dernière analyse CV/Offre
          </h3>
          {data.last_analysis.experiences && (
            <div style={{ marginBottom: 8 }}>
              <strong>Expériences :</strong>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {data.last_analysis.experiences.map((e: any, i: number) => (
                  <li key={i}>
                    {e.titre ?? "—"} {e.entreprise ? `(${e.entreprise})` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {data.last_analysis.competences && (
            <div style={{ marginBottom: 8 }}>
              <strong>Compétences détectées :</strong>{" "}
              {data.last_analysis.competences.join(", ")}
            </div>
          )}
          {data.last_analysis.manques && (
            <div style={{ marginBottom: 8 }}>
              <strong>Points à améliorer :</strong>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {data.last_analysis.manques.map((m: string, i: number) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function label(k: string) {
  switch (k) {
    case "global_score":
      return "Score global";
    case "contentAvg":
      return "Contenu";
    case "wpmNorm":
      return "Débit";
    case "hesNorm":
      return "Hésitations";
    case "eyeAvg":
      return "Contact visuel";
    default:
      return k;
  }
}