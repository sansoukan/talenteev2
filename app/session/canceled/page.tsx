"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SessionCanceledPage() {
  const router = useRouter();

  // ⏳ Redirection automatique vers la page des simulations après 4s
  useEffect(() => {
    const t = setTimeout(() => router.push("/session/start"), 4000);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg,#1a1a1a,#2d3436)",
        color: "#fff",
        textAlign: "center",
        padding: 24,
      }}
    >
      <h1 style={{ fontSize: 36, marginBottom: 12 }}>❌ Payment canceled</h1>

      <p style={{ fontSize: 18, maxWidth: 480, marginBottom: 16 }}>
        You canceled the payment or closed the Stripe checkout window.
      </p>

      <p style={{ fontSize: 16, opacity: 0.8 }}>
        No payment has been made — your session was not activated.
      </p>

      <div
        style={{
          width: 60,
          height: 60,
          borderRadius: "50%",
          border: "4px solid #e74c3c",
          borderTopColor: "transparent",
          animation: "spin 1s linear infinite",
          marginTop: 24,
          marginBottom: 24,
        }}
      />

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>

      <p style={{ fontSize: 14, opacity: 0.6 }}>
        Redirecting you back to the simulation screen...
      </p>

      <button
        onClick={() => router.push("/session/start")}
        style={{
          marginTop: 32,
          background: "#444",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          padding: "10px 18px",
          cursor: "pointer",
          fontWeight: "bold",
          transition: "background 0.3s ease",
        }}
      >
        ⬅️ Back to Simulation
      </button>
    </main>
  );
}