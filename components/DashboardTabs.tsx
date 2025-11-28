"use client";
import { useEffect, useState } from "react";

type Tab = { id: string; label: string; content: React.ReactNode };

export default function DashboardTabs({
  tabs,
  initial,
}: {
  tabs: Tab[];
  initial?: string;
}) {
  const [active, setActive] = useState<string>(initial || tabs[0]?.id);

  // Fallback si l’onglet initial n’existe pas
  useEffect(() => {
    if (!tabs.find((t) => t.id === active)) {
      setActive(tabs[0]?.id);
    }
  }, [tabs, active]);

  function handleKey(e: React.KeyboardEvent<HTMLDivElement>) {
    const idx = tabs.findIndex((t) => t.id === active);
    if (idx === -1) return;
    if (e.key === "ArrowRight") {
      setActive(tabs[(idx + 1) % tabs.length].id);
    } else if (e.key === "ArrowLeft") {
      setActive(tabs[(idx - 1 + tabs.length) % tabs.length].id);
    }
  }

  return (
    <section>
      {/* Onglets */}
      <div
        role="tablist"
        aria-label="Dashboard sections"
        onKeyDown={handleKey}
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}
      >
        {tabs.map((t) => {
          const is = t.id === active;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={is}
              aria-controls={`tabpanel-${t.id}`}
              id={`tab-${t.id}`}
              onClick={() => setActive(t.id)}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: is ? "2px solid var(--primary)" : "1px solid var(--border)",
                background: is ? "rgba(22,119,255,0.15)" : "var(--bg-card)",
                color: is ? "var(--primary)" : "var(--text)",
                fontWeight: is ? 700 : 500,
                cursor: "pointer",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Contenu — tous montés mais cachés si inactifs */}
      {tabs.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`tabpanel-${t.id}`}
          aria-labelledby={`tab-${t.id}`}
          hidden={t.id !== active}
          style={{
            display: t.id === active ? "block" : "none",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: 16,
            background: "var(--bg-card)",
            color: "var(--text)",
            animation: t.id === active ? "fadeIn 0.3s ease-in-out" : "none",
          }}
        >
          {t.content}
        </div>
      ))}
    </section>
  );
}
