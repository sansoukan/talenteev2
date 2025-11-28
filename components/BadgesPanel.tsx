"use client";

import { useEffect, useState } from "react";

type Badge = {
  skill_improved: string;
  score: number | null;
  badge_url?: string | null;
  created_at: string;
};

export default function BadgesPanel({ userId }: { userId: string }) {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/badges?user_id=${encodeURIComponent(userId)}`);
        const json = await res.json();

        if (!res.ok) throw new Error(json?.error || "Erreur API");
        setBadges(json.badges ?? []);
      } catch (e: any) {
        setError(e?.message ?? "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  if (loading) return <div>⏳ Chargement des badges…</div>;
  if (error) return <div style={{ color: "var(--danger)" }}>⚠️ {error}</div>;

  if (badges.length === 0) {
    return (
      <div style={{ opacity: 0.7 }}>Aucun badge obtenu pour le moment.</div>
    );
  }

  return (
    <section
      style={{
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 16,
        background: "var(--bg-card)",
        color: "var(--text)",
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: 12 }}>🏅 Mes badges</h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 12,
        }}
      >
        {badges.map((b, i) => (
          <div
            key={i}
            style={{
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: 12,
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "var(--bg)",
            }}
          >
            <div style={{ fontSize: 28 }}>
              {b.badge_url ? (
                <img
                  src={b.badge_url}
                  alt={b.skill_improved}
                  style={{ width: 32, height: 32 }}
                />
              ) : (
                "🏆"
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>{b.skill_improved}</div>
              {b.score !== null && (
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Score atteint : {b.score}
                </div>
              )}
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {new Date(b.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
