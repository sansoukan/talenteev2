import type React from "react";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
import { Suspense } from "react";
import { Toaster } from "react-hot-toast"; // ✅ import ajouté
import "./globals.css";

export const metadata: Metadata = {
  title: "Nova RH",
  description: "AI-powered HR platform with Apple-style elegance",
  generator: "v0.app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <body
        className={`font-sans ${GeistSans.variable} ${GeistMono.variable} antialiased bg-black text-white`}
      >
        {/* ✅ Provider global pour les toasts Nova */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: "#111827",
              color: "#fff",
              border: "1px solid #1e3a8a",
              fontSize: "0.9rem",
              borderRadius: "10px",
            },
            success: {
              iconTheme: { primary: "#3b82f6", secondary: "#111827" },
            },
          }}
        />

        {/* ⚡️ Rendu principal + suspense + analytics */}
        <Suspense fallback={null}>{children}</Suspense>
        <Analytics />
      </body>
    </html>
  );
}