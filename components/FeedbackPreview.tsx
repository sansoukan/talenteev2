"use client";

type Level = "high" | "mid" | "low";
type Props = {
  text?: string;
  level?: Level; // couleur adaptée si fourni
  bullets?: string[];
};

const colorByLevel: Record<Level, string> = {
  high: "var(--success)", // vert
  mid: "#f90",            // orange
  low: "var(--danger)",   // rouge
};

const labelByLevel: Record<Level, string> = {
  high: "✅ Très bon point",
  mid: "⚠️ À améliorer",
  low: "🔴 Point faible",
};

export default function FeedbackPreview({ text, level, bullets }: Props) {
  if (!text && (!bullets || bullets.length === 0)) return null;

  const color = level ? colorByLevel[level] : "var(--primary)";
  const label = level ? labelByLevel[level] : "ℹ️ Feedback";

  return (
    <div
      aria-live="polite"
      style={{
        background: "var(--bg-card)",
        border: `1px solid var(--border)`,
        borderLeft: `4px solid ${color}`,
        borderRadius: 8,
        padding: 12,
        color: "var(--text)",
      }}
    >
      <div style={{ fontWeight: 700, color, marginBottom: 6 }}>{label}</div>

      {text && (
        <div
          style={{
            whiteSpace: "pre-wrap",
            marginBottom: bullets?.length ? 8 : 0,
          }}
        >
          {text}
        </div>
      )}

      {!!bullets?.length && (
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
