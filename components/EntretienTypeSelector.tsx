"use client";

import { useMemo } from "react";

type InterviewType =
  | "job"
  | "internal_review"
  | "internal_mobility"
  | "internal_promotion"
  | "internal_objectives"
  | "internal_feedback"
  | "salary_review"
  | "other";

type Props = {
  value?: InterviewType;
  onChange: (val: InterviewType) => void;
  disabled?: boolean;
};

export default function InterviewTypeSelector({
  value,
  onChange,
  disabled,
}: Props) {
  const options = useMemo(
    () =>
      [
        { id: "job", label: "Job interview", duration: null, price: null },
        { id: "internal_review", label: "Annual review", duration: "20 min", price: "6.99 €" },
        { id: "internal_mobility", label: "Internal mobility", duration: "20 min", price: "6.99 €" },
        { id: "internal_promotion", label: "Promotion / Career evolution", duration: "20 min", price: "6.99 €" },
        { id: "internal_objectives", label: "Objectives setting", duration: "20 min", price: "6.99 €" },
        { id: "internal_feedback", label: "Manager feedback", duration: "20 min", price: "6.99 €" },
        { id: "salary_review", label: "Salary review", duration: "20 min", price: "6.99 €" },
        { id: "other", label: "Other", duration: "20 min", price: "6.99 €" },
      ] as { id: InterviewType; label: string; duration: string | null; price: string | null }[],
    []
  );

  return (
    <div>
      <label
        style={{
          fontWeight: 700,
          display: "block",
          marginBottom: 8,
          color: "var(--text)",
        }}
      >
        Interview type
      </label>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 10,
        }}
      >
        {options.map((o) => {
          const active = o.id === value;
          return (
            <button
              key={o.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(o.id)}
              aria-pressed={active}
              style={{
                textAlign: "left",
                padding: "10px 14px",
                borderRadius: 8,
                border: active
                  ? "2px solid var(--primary)"
                  : "1px solid var(--border)",
                background: active
                  ? "rgba(22,119,255,0.15)"
                  : "var(--bg-card)",
                color: active ? "var(--primary)" : "var(--text)",
                cursor: disabled ? "not-allowed" : "pointer",
                fontWeight: active ? 700 : 500,
                transition: "all 0.2s ease",
              }}
            >
              <div>{o.label}</div>
              {o.duration && o.price && (
                <div
                  style={{
                    fontSize: 13,
                    opacity: 0.8,
                    marginTop: 4,
                    color: active ? "var(--primary)" : "var(--text-muted)",
                  }}
                >
                  {o.duration} · {o.price}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
