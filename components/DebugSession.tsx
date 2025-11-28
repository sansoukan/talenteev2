"use client";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function DebugSession() {
  const supabase = createClientComponentClient();
  const [output, setOutput] = useState<any>(null);

  async function runDebug() {
    // 🔎 Debug côté client
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    console.log("🔎 USER (browser):", user, "Error:", userError);
    console.log("🔎 SESSION (browser):", session, "Error:", sessionError);

    let profile = null;
    if (user) {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      console.log("🔎 PROFILE (browser):", data, "Error:", error);
      profile = { data, error };
    }

    // 🔎 Debug côté serveur (terminal)
    try {
      const res = await fetch("/api/debug");
      const serverData = await res.json();
      console.log("🔎 SERVER DEBUG (browser):", serverData);

      setOutput({
        user,
        session,
        profile,
        server: serverData,
      });
    } catch (err) {
      console.error("❌ API Debug error:", err);
      setOutput({
        user,
        session,
        profile,
        server: { error: String(err) },
      });
    }
  }

  return (
    <div className="bg-gray-900 text-white p-4 rounded-lg border border-gray-700 space-y-4">
      <h2 className="text-lg font-bold">🔍 Debug Supabase Session</h2>
      <button
        onClick={runDebug}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold"
      >
        Run Debug
      </button>

      {output && (
        <pre className="bg-black text-green-400 p-2 rounded-lg overflow-x-auto text-sm">
          {JSON.stringify(output, null, 2)}
        </pre>
      )}
    </div>
  );
}
