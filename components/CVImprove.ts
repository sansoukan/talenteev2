"use client";

import { useState } from "react";

type Improvement = {
  advice: string;
  explanation: string;
  priority: string;
};

type AnalysisResult = {
  narrative_summary?: string;
  improvements?: Improvement[];
  priority_tips?: Record<string, string[]>;
};

export default function OfferImprove() {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  async function analyzeOffer() {
    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      let body: BodyInit;
      let headers: HeadersInit = {};

      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        body = formData;
      } else {
        headers["content-type"] = "application/json";
        body = JSON.stringify({ text });
      }

      const res = await fetch("/api/analysis/offre", {
        method: "POST",
        headers,
        body,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Erreur analyse offre");

      setAnalysis(json.analysis);
    } catch (e: any) {
      setError(e.message ?? "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        display: "grid",
        gap: 12,
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: 16,
        background: "var(--bg-card)",
        color: "var(--text)",
      }}
    >
      <div style={{ fontWeight: 700 }}>📑 Analyse Offre d’emploi</div>

      <input
        type="file"
        accept=".pdf,.doc,.docx,.txt"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          setFile(f);
          setFileName(f ? f.name : null);
          if (f) setText("");
        }}
      />
      {fileName && <p style={{ fontSize: 12 }}>Fichier sélectionné : {fileName}</p>}

      <textarea
        placeholder="Colle ici l’offre (texte brut)…"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setFile(null);
          setFileName(null);
        }}
        style={{
          width: "100%",
          minHeight: 160,
          borderRadius: 8,
          border: "1px solid var(--border)",
          padding: 10,
          background: "var(--bg)",
          color: "var(--text)",
          whiteSpace: "pre-wrap",
        }}
      />

      <button
        onClick={analyzeOffer}
        disabled={loading || (!text.trim() && !file)}
        style={{
          padding: "10px 14px",
          borderRadius: 8,
          background: "var(--primary)",
          color: "#fff",
          border: "none",
          fontWeight: 600,
        }}
      >
        {loading ? "⏳ Analyse en cours..." : "Analyser l’Offre"}
      </button>

      {error && <div style={{ color: "var(--danger)" }}>⚠️ {error}</div>}

      {analysis && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Résultats :</div>

          {/* Résumé narratif */}
          {analysis.narrative_summary && (
            <p style={{ marginBottom: 12, fontSize: 14, color: "#ccc" }}>
              {analysis.narrative_summary}
            </p>
          )}

          {/* Liste des améliorations */}
          {analysis.improvements && Array.isArray(analysis.improvements) && (
            <ul style={{ display: "grid", gap: 8 }}>
              {analysis.improvements.map((tip, idx) => (
                <li
                  key={idx}
                  style={{
                    background: "#222",
                    padding: 10,
                    borderRadius: 6,
                    border: "1px solid #333",
                  }}
                >
                  <strong>{tip.advice}</strong>
                  <p style={{ fontSize: 12, color: "#aaa" }}>{tip.explanation}</p>
                  <span
                    style={{
                      display: "inline-block",
                      marginTop: 4,
                      padding: "2px 6px",
                      borderRadius: 4,
                      fontSize: 11,
                      background:
                        tip.priority === "high"
                          ? "red"
                          : tip.priority === "medium"
                          ? "orange"
                          : "gray",
                      color: "white",
                    }}
                  >
                    {tip.priority}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
