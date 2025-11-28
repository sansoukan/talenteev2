"use client";

import { useEffect, useState } from "react";
import { getClientUser, signOutClient } from "@/lib/auth";
import AdminPanel from "@/components/AdminPanel";

export default function AdminPage() {
  const [ready, setReady] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const u = await getClientUser();
      if (!u) {
        window.location.href = "/auth";
        return;
      }
      setUserEmail(u.email ?? null);

      try {
        const res = await fetch("/api/profile/role", {
          method: "GET",
          cache: "no-store",
        });
        const json = await res.json();
        if (res.ok && json.role === "admin") {
          setIsAdmin(true);
        } else if (res.ok && json.role !== "admin") {
          // 🚨 pas admin → retour dashboard
          window.location.href = "/dashboard";
          return;
        } else {
          throw new Error(json?.error || "Role fetch failed");
        }
      } catch (e: any) {
        console.error("role check failed", e);
        setError(e.message ?? "Server error");
      }

      setReady(true);
    })();
  }, []);

  if (!ready) return <div style={{ padding: 24 }}>⏳ Loading...</div>;
  if (error) return <div style={{ padding: 24, color: "var(--danger)" }}>⚠️ {error}</div>;

  if (!isAdmin) {
    return (
      <main style={{ padding: 24 }}>
        <h2 style={{ color: "var(--danger)" }}>⚠️ Access denied</h2>
        <p style={{ opacity: 0.7 }}>Redirecting...</p>
      </main>
    );
  }

  return (
    <main
      style={{
        padding: 24,
        display: "grid",
        gap: 16,
        background: "var(--bg)",
        color: "var(--text)",
        minHeight: "100vh",
      }}
    >
      {/* Header */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>⚙️ Nova Admin</h1>
          <div style={{ opacity: 0.7, fontSize: 14 }}>{userEmail}</div>
        </div>
        <button
          onClick={signOutClient}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            background: "var(--danger)",
            color: "#fff",
            border: "none",
          }}
        >
          Log out
        </button>
      </header>

      {/* Panel principal */}
      <AdminPanel />
    </main>
  );
}
