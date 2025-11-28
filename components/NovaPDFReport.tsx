"use client";
import { useState } from "react";

type Props = { sessionId: string };

export default function NovaPDFReport({ sessionId }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function downloadPdf() {
    try {
      setLoading(true);
      setError(null);

      const resp = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }), // ✅ correspond à ce que ton endpoint attend
      });

      if (!resp.ok) {
        const t = await resp.text();
        throw new Error(`Erreur PDF: ${t}`);
      }

      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nova_report_${sessionId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message ?? "Impossible de générer le PDF");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 12 }}>
      <button
        onClick={downloadPdf}
        disabled={loading}
        style={{
          background: "var(--primary)",
          color: "#fff",
          padding: "8px 14px",
          borderRadius: 8,
          border: "none",
          fontWeight: 600,
        }}
      >
        {loading ? "⏳ Génération..." : "🖨️ Télécharger le rapport PDF"}
      </button>
      {error && (
        <div style={{ color: "var(--danger)", marginTop: 8 }}>
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}
