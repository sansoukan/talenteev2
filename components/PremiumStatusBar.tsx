"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Status = {
  id: string;
  is_premium: boolean | null;
  started_at: string | null;
  ended_at: string | null;
  duration: number | null;
  credits_sessions?: number | null;
  credits_total?: number | null;   // ✅ ajouté
  is_freemium_used?: boolean | null;
};

type Props = {
  sessionId: string;
  pollMs?: number;
  timeoutMs?: number;
  onPremium?: () => void;
};

export default function PremiumStatusBar({
  sessionId,
  pollMs = 2000,
  timeoutMs = 60000,
  onPremium,
}: Props) {
  const [status, setStatus] = useState<Status | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const premium = useMemo(() => !!status?.is_premium, [status]);

  useEffect(() => {
    let mounted = true;

    async function fetchStatus() {
      try {
        const res = await fetch(
          `/api/session/status?id=${encodeURIComponent(sessionId)}`,
          { cache: "no-store" }
        );
        const json = await res.json();
        if (!mounted) return;
        if (!res.ok) throw new Error(json?.error || "status_error");
        setStatus(json);
        if (json?.is_premium) {
          onPremium?.();
          stopPoll();
        }
      } catch (e: any) {
        if (!mounted) return;
        setErr(e?.message ?? "Status error");
        stopPoll();
      }
    }

    function stopPoll() {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    fetchStatus();
    timerRef.current = setInterval(() => {
      setElapsed((t) => {
        const nt = t + pollMs;
        if (nt >= timeoutMs) stopPoll();
        return nt;
      });
      fetchStatus();
    }, pollMs);

    return () => {
      mounted = false;
      stopPoll();
    };
  }, [pollMs, sessionId, timeoutMs, onPremium]);

  const minutes = useMemo(() => {
    if (typeof status?.duration === "number") return status.duration;
    if (status?.started_at && status?.ended_at) {
      const s = new Date(status.started_at).getTime();
      const e = new Date(status.ended_at).getTime();
      return Math.round((e - s) / 60000);
    }
    return null;
  }, [status]);

  return (
    <div
      style={{
        border: "1px solid #eee",
        borderRadius: 10,
        padding: 12,
        background: premium ? "#eafff6" : "#fff7e6",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ fontWeight: 700 }}>
        {premium
          ? "✅ Premium activated – You can continue your session"
          : "⏳ Waiting for payment confirmation…"}
      </div>

      {status?.id && (
        <div style={{ fontSize: 13, opacity: 0.8 }}>
          Duration: {minutes ?? "—"} min
        </div>
      )}

      {/* ✅ Sessions left out of total */}
      {typeof status?.credits_sessions === "number" &&
        typeof status?.credits_total === "number" &&
        status.credits_total > 0 && (
          <div style={{ fontSize: 13 }}>
            🎟️ Sessions left:{" "}
            <strong
              style={{
                color: status.credits_sessions > 0 ? "var(--success)" : "var(--danger)",
              }}
            >
              {status.credits_sessions}
            </strong>
            {" / "}
            {status.credits_total}
          </div>
        )}

      {/* Freemium info */}
      {status?.is_freemium_used !== null && (
        <div style={{ fontSize: 13, opacity: 0.9 }}>
          {status.is_freemium_used
            ? "🆓 Free trial already used"
            : "🆓 Free trial still available"}
        </div>
      )}

      {err && <div style={{ color: "#d33" }}>⚠️ {err}</div>}

      {!premium && (
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          Checking status…{" "}
          {Math.min(
            Math.round(elapsed / 1000),
            Math.round((timeoutMs || 1) / 1000)
          )}
          s / {Math.round((timeoutMs || 1) / 1000)}s
        </div>
      )}
    </div>
  );
}
