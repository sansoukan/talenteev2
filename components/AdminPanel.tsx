"use client";

import { useEffect, useState } from "react";

type UserRow = {
  id: string;
  email: string;
  created_at: string;
  xp_total: number;
  axes: Record<string, any> | null;
  last_update: string | null;
  recent_sessions: Array<{
    id: string;
    score: number | null;
    started_at: string;
    is_premium: boolean;
  }>;
};

export default function AdminPanel() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch("/api/admin/users", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "fetch_failed");
        setUsers(json.users || []);
      } catch (e: any) {
        setErr(e.message ?? "Erreur chargement users");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div style={{ padding: 20 }}>⏳ Loading...</div>;
  if (err) return <div style={{ color: "var(--danger)", padding: 20 }}>⚠️ {err}</div>;

  return (
    <div
      style={{
        display: "grid",
        gap: 16,
        padding: 24,
        background: "var(--bg)",
        color: "var(--text)",
      }}
    >
      <h2 style={{ margin: 0 }}>👥 Admin Panel – Users</h2>

      {users.length === 0 ? (
        <div style={{ opacity: 0.7 }}>No users found.</div>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 14,
          }}
        >
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid var(--border)" }}>
              <th style={{ padding: "6px 8px" }}>Email</th>
              <th style={{ padding: "6px 8px" }}>XP</th>
              <th style={{ padding: "6px 8px" }}>Axes</th>
              <th style={{ padding: "6px 8px" }}>Last update</th>
              <th style={{ padding: "6px 8px" }}>Recent sessions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                style={{
                  borderBottom: "1px solid var(--border)",
                  background: "var(--bg-card)",
                }}
              >
                <td style={{ padding: "6px 8px" }}>{u.email}</td>
                <td style={{ padding: "6px 8px" }}>{u.xp_total}</td>
                <td style={{ padding: "6px 8px" }}>
                  {u.axes ? (
                    <ul style={{ margin: 0, paddingLeft: 16 }}>
                      {Object.entries(u.axes).map(([k, v]) => (
                        <li key={k}>
                          {k}: {v}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    "—"
                  )}
                </td>
                <td style={{ padding: "6px 8px" }}>
                  {u.last_update ? new Date(u.last_update).toLocaleString() : "—"}
                </td>
                <td style={{ padding: "6px 8px" }}>
                  {u.recent_sessions.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: 16 }}>
                      {u.recent_sessions.map((s) => (
                        <li key={s.id}>
                          {new Date(s.started_at).toLocaleString()} — Score:{" "}
                          {s.score ?? "—"} {s.is_premium ? "⭐" : ""}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    "No session"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
