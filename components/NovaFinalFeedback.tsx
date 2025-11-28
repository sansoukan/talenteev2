"use client";

import { useState, useEffect } from "react";

type FeedbackAxes = {
  clarity?: number;
  insight?: number;
  structure?: number;
  leadership?: number;
  comment?: string;
};

type Summary = {
  score_global?: number | null;
  feedback_json?: FeedbackAxes;
  summary?: {
    strengths?: string[];
    weaknesses?: string[];
    recommendations?: string[];
  };
  behavior?: {
    stress?: number;
    confidence?: number;
    eye_contact?: number;
    smiles?: number;
    posture_score?: number;
  };
  tone?: string;
};

type Props = {
  sessionId: string;
  onClose?: () => void;
};

export default function NovaFinalFeedback({ sessionId, onClose }: Props) {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/report?session_id=${sessionId}`);
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        setData(json);
      } catch (e: any) {
        setError(e.message ?? "Erreur lors du chargement du feedback");
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

  async function downloadPdf() {
    try {
      setPdfLoading(true);
      const resp = await fetch(`/api/pdf?session_id=${sessionId}`);
      if (!resp.ok) throw new Error(`Erreur PDF: ${await resp.text()}`);
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nova_feedback_${sessionId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message ?? "Impossible de générer le PDF");
    } finally {
      setPdfLoading(false);
    }
  }

  if (loading) return <p style={{ color: "#888" }}>Chargement du feedback...</p>;
  if (error) return <p style={{ color: "var(--danger)" }}>⚠️ {error}</p>;
  if (!data) return <p>Aucune donnée disponible.</p>;

  const score = data.score_global ?? null;
  const feedback = data.feedback_json ?? {};
  const summary = data.summary ?? {};
  const behavior = data.behavior ?? {};
  const tone = data.tone ?? "neutral";

  const toneColor =
    tone === "encouraging"
      ? "#2ecc71"
      : tone === "direct"
      ? "#e67e22"
      : "var(--text-muted)";

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 24,
        background: "var(--bg-card)",
        color: "var(--text)",
        maxWidth: 760,
        margin: "0 auto",
        boxShadow: "0 0 20px rgba(0,0,0,0.2)",
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: 16 }}>🧩 Synthèse finale de Nova</h3>

      {/* SCORE GLOBAL */}
      <div
        style={{
          textAlign: "center",
          fontSize: 34,
          fontWeight: 700,
          marginBottom: 12,
          color:
            score && score >= 80
              ? "var(--success)"
              : score && score >= 60
              ? "var(--warning)"
              : "var(--danger)",
        }}
      >
        {typeof score === "number" ? `${score.toFixed(0)} / 100` : "—"}
      </div>

      <p style={{ textAlign: "center", color: toneColor, marginBottom: 24 }}>
        🎙️ Ton de Nova : <strong>{tone}</strong>
      </p>

      {/* 🎯 Axes analytiques */}
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: 16,
          marginBottom: 24,
          background: "rgba(255,255,255,0.03)",
        }}
      >
        <h4 style={{ margin: "6px 0 12px 0" }}>
          🎯 Analyse analytique de votre performance
        </h4>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
            gap: 10,
          }}
        >
          {[
            { key: "clarity", label: "Clarté", color: "#3498db" },
            { key: "insight", label: "Pertinence / Insight", color: "#2ecc71" },
            { key: "structure", label: "Structure", color: "#f1c40f" },
            { key: "leadership", label: "Leadership", color: "#9b59b6" },
          ].map((axis) => {
            const value = feedback[axis.key as keyof FeedbackAxes] ?? null;
            const percent =
              value !== undefined && value !== null ? Math.round(value) : null;
            return (
              <div key={axis.key}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 4,
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  <span>{axis.label}</span>
                  <span style={{ color: "#999" }}>
                    {percent !== null ? `${percent}%` : "—"}
                  </span>
                </div>
                <div
                  style={{
                    height: 6,
                    borderRadius: 6,
                    background: "var(--border)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: percent ? `${percent}%` : "0%",
                      height: "100%",
                      background: axis.color,
                      transition: "width 0.8s ease",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        {feedback.comment && (
          <p
            style={{
              marginTop: 14,
              fontStyle: "italic",
              color: "#aaa",
              lineHeight: 1.5,
            }}
          >
            💬 {feedback.comment}
          </p>
        )}
      </div>

      {/* 🎭 Comportement observé */}
      {/* ... ton bloc comportemental existant ... */}

      {/* ✅ Points forts / Faiblesses / Reco */}
      {/* ... les Sections existantes ... */}

      {/* Boutons */}
      {/* ... tes boutons PDF et Fermer ... */}
    </div>
  );
}