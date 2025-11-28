"use client";

import SettingsPanel from "@/components/SettingsPanel";
import SettingsToast from "@/components/SettingsToast";

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white p-8 flex flex-col items-center justify-start">
      <div className="w-full max-w-5xl mt-8">
        <SettingsPanel />
      </div>

      {/* ✅ Toast (succès ou erreur) */}
      <SettingsToast />
    </main>
  );
}