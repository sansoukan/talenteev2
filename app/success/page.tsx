"use client";

import { useEffect, useState } from "react";
import PremiumStatusBar from "@/components/PremiumStatusBar";

export default function SuccessPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [flipDone, setFlipDone] = useState(false);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const app_session_id = sp.get("app_session_id");
    if (app_session_id) setSessionId(app_session_id);

    // Fallback client: flip is_premium (webhook Stripe = source of truth)
    if (app_session_id) {
      fetch("/api/sessions/premium", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: app_session_id })
      })
        .then(() => setFlipDone(true))
        .catch(() => setFlipDone(false));
    }
  }, []);

  return (
    <main style={{ padding: 24, display: "grid", gap: 16 }}>
      <h1>✅ Payment confirmed</h1>

      {sessionId ? (
        <PremiumStatusBar
          sessionId={sessionId}
          pollMs={2000}
          timeoutMs={60000}
          onPremium={() => {
            // 👉 Auto-redirect to resume session after premium flip
            setTimeout(() => {
              window.location.href = `/session?sid=${encodeURIComponent(sessionId)}`;
            }, 1500);
          }}
        />
      ) : (
        <div style={{ color: "#d33" }}>⚠️ Session ID missing.</div>
      )}

      <div style={{ fontSize: 14, opacity: 0.8 }}>
        {flipDone
          ? "Your session has been upgraded to premium (server confirmation in progress)."
          : "Upgrade in progress…"}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <a
          href="/session"
          style={{ padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8 }}
        >
          Back to simulation
        </a>
        {sessionId && (
          <a
            href={`/session?sid=${encodeURIComponent(sessionId)}`}
            style={{ padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8 }}
          >
            Resume session
          </a>
        )}
      </div>
    </main>
  );
}
