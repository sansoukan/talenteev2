"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function SessionSuccessPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const sessionId = sp.get("session_id");

  useEffect(() => {
    const finalizePayment = async () => {
      if (!sessionId) {
        console.warn("⚠️ No session_id in URL");
        return;
      }

      try {
        // 1️⃣ Vérifie si la session existe
        const { data: existing, error: fetchError } = await supabase
          .from("nova_sessions")
          .select("id, status")
          .eq("id", sessionId)
          .maybeSingle();

        if (fetchError) {
          console.error("⚠️ Error fetching session:", fetchError.message);
          return;
        }

        // 2️⃣ Si la session est déjà marquée comme active → redirige
        if (existing?.status === "started" || existing?.status === "active") {
          console.log("ℹ️ Session already active, redirecting...");
          setTimeout(() => router.push(`/session?session_id=${sessionId}`), 1500);
          return;
        }

        // 3️⃣ Met à jour la session comme payée / active
        const { error: updateError } = await supabase
          .from("nova_sessions")
          .update({
            status: "started",
            started_at: new Date(),
            is_freemium: false,
          })
          .eq("id", sessionId);

        if (updateError) {
          console.error("❌ Error updating session:", updateError.message);
          return;
        }

        console.log("✅ Session marked as paid/active:", sessionId);

        // 4️⃣ Met à jour l’achat correspondant
        await supabase
          .from("nova_purchases")
          .update({ status: "completed" })
          .eq("provider_session_id", sessionId);

        // 5️⃣ Redirige automatiquement vers NovaEngine
        setTimeout(() => router.push(`/session?session_id=${sessionId}`), 2000);
      } catch (err) {
        console.error("❌ finalizePayment error:", err);
      }
    };

    finalizePayment();
  }, [router, sessionId]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg,#0f2027,#203a43,#2c5364)",
        color: "#fff",
        textAlign: "center",
        padding: 24,
      }}
    >
      <h1 style={{ fontSize: 36, marginBottom: 12 }}>✅ Payment confirmed!</h1>
      <p style={{ fontSize: 18, maxWidth: 480, marginBottom: 20 }}>
        Your payment was successful. Nova is preparing your simulation...
      </p>

      <div
        style={{
          width: 60,
          height: 60,
          borderRadius: "50%",
          border: "4px solid #4caf50",
          borderTopColor: "transparent",
          animation: "spin 1s linear infinite",
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

      <p style={{ fontSize: 14, opacity: 0.8, marginTop: 16 }}>
        Redirecting automatically...
      </p>
    </main>
  );
}