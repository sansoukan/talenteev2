"use client";

type Level = "0" | "1" | "2" | "3";

type Props = {
  value?: Level;
  onChange: (val: Level) => void;
  disabled?: boolean;
};

const DESC: Record<Level, { title: string; detail: string; duration: string; price: string }> = {
  "0": {
    title: "Coach Express",
    detail: "3 universal questions + 1 quick feedback",
    duration: "5 min",
    price: "Free",
  },
  "1": {
    title: "Screening",
    detail: "Motivation, background, soft skills",
    duration: "15 min",
    price: "4.99 €",
  },
  "2": {
    title: "Job fit",
    detail: "Realistic HR interview, structured feedback",
    duration: "25 min",
    price: "6.99 €",
  },
  "3": {
    title: "Case studies",
    detail: "Advanced case + posture analysis",
    duration: "40 min",
    price: "9.99 €",
  },
};

export default function LevelSelector({ value, onChange, disabled }: Props) {
  return (
    <fieldset
      style={{
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: 16,
        background: "var(--bg-card)",
        color: "var(--text)",
      }}
    >
      <legend
        style={{
          padding: "0 8px",
          fontWeight: 700,
          color: "var(--text)",
        }}
      >
        Select your level
      </legend>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 10,
        }}
      >
        {(["0", "1", "2", "3"] as Level[]).map((n) => {
          const active = n === value;
          const d = DESC[n];
          return (
            <label
              key={n}
              style={{
                borderRadius: 8,
                border: active
                  ? "2px solid var(--primary)"
                  : "1px solid var(--border)",
                background: active
                  ? "rgba(22,119,255,0.15)"
                  : "var(--bg)",
                padding: 12,
                cursor: disabled ? "not-allowed" : "pointer",
                display: "block",
                transition: "all 0.2s ease",
              }}
            >
              <input
                type="radio"
                name="level"
                value={n}
                checked={active}
                onChange={() => onChange(n)}
                disabled={disabled}
                style={{ marginRight: 8 }}
              />
              <strong style={{ color: active ? "var(--primary)" : "var(--text)" }}>
                {d.title} — {d.duration}
              </strong>
              <div
                style={{
                  opacity: 0.85,
                  marginTop: 4,
                  color: "var(--text)",
                  fontSize: 13,
                }}
              >
                {d.detail}
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontWeight: 600,
                  color: active ? "var(--primary)" : "var(--text-muted)",
                }}
              >
                {d.price}
              </div>
            </label>
          );
        })}
      </div>

      {/* Bundle option */}
      <div
        style={{
          marginTop: 20,
          padding: 12,
          borderRadius: 8,
          background: "rgba(22,119,255,0.05)",
          border: "1px solid var(--border)",
          textAlign: "center",
        }}
      >
        <strong>Full journey (Levels 1–3)</strong>
        <div style={{ marginTop: 4, fontSize: 13, opacity: 0.8 }}>
          80 minutes total · Screening + Job fit + Case study
        </div>
        <div style={{ marginTop: 6, fontWeight: 700, color: "var(--primary)" }}>
          19.99 €
        </div>
      </div>
    </fieldset>
  );
}
