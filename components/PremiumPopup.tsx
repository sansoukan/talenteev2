"use client";

import { useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  preview?: string;
  userId: string;
  sessionId: string;
  amountCents?: number; // 499 / 699 / 999...
};

export default function PremiumPopup({
  open,
  onClose,
  preview,
  userId,
  sessionId,
  amountCents = 499,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleCheckout(option: string, cents: number) {
    try {
      const resp = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app_session_id: sessionId,
          user_id: userId,
          amount_cents: cents,
          option,
        }),
      });

      const json = await resp.json();
      if (json?.url) {
        // 👉 Stripe redirects to /success?app_session_id=xxx
        window.location.href = json.url;
      } else {
        alert("Payment session could not be created.");
        console.error(json);
      }
    } catch (e) {
      console.error("checkout error", e);
      alert("Unable to start payment.");
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "grid",
        placeItems: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 20,
          maxWidth: 520,
          width: "92%",
          color: "var(--text)",
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: 8, color: "var(--text)" }}>
          ⏳ Free trial ended
        </h3>
        <p style={{ marginTop: 0, color: "var(--text-muted)" }}>
          Here is a preview of your feedback:
        </p>

        <div
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: 12,
            whiteSpace: "pre-wrap",
            fontSize: "0.95rem",
            marginBottom: 16,
          }}
        >
          {preview ||
            "• Clarity: needs improvement\n• Provide concrete examples\n• Delivery speed: correct"}
        </div>

        <p style={{ marginTop: 0, color: "var(--text)" }}>
          After payment, your session will resume <strong>exactly where you left off</strong>.
        </p>

        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          <button
            onClick={() => handleCheckout("single", amountCents)}
            style={{
              background: "var(--primary)",
              color: "#fff",
              padding: "10px 14px",
              borderRadius: 8,
              border: "none",
              fontWeight: 600,
            }}
          >
            Continue this session (${(amountCents / 100).toFixed(2)})
          </button>

          <button
            onClick={() => handleCheckout("bundle", 1999)}
            style={secondaryBtnStyle}
          >
            Buy full journey (Levels 1–3) · $19.99
          </button>

          <button
            onClick={() => handleCheckout("pack3", 1399)}
            style={secondaryBtnStyle}
          >
            3 sessions pack · $13.99
          </button>

          <button
            onClick={() => handleCheckout("pack5", 1999)}
            style={secondaryBtnStyle}
          >
            5 sessions pack · $19.99
          </button>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              color: "var(--text-muted)",
              border: "none",
              cursor: "pointer",
            }}
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

const secondaryBtnStyle: React.CSSProperties = {
  background: "var(--bg)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "10px 14px",
  fontWeight: 600,
};
