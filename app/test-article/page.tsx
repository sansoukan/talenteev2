"use client";

import { useEffect, useState } from "react";
import { supabasePublic } from "@/lib/supabasePublic";

/**
 * 🧪 TestArticle – composant de diagnostic Supabase
 * -------------------------------------------------
 * Permet de vérifier :
 * - la connexion Supabase
 * - la policy RLS
 * - la validité des variables d'environnement
 */

export default function TestArticlePage() {
  const [id, setId] = useState<string>(
    "c914edc9-056d-4455-a7cd-438408747c6c" // 🧩 remplace par l’ID d’un article existant
  );
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function testFetch() {
    console.log("🚀 [TestArticle] Starting fetch for ID:", id);
    setLoading(true);
    setResult(null);

    try {
      const { data, error, status } = await supabasePublic
        .from("nova_articles")
        .select(
          "id, title, content, is_published, created_at, category, author"
        )
        .eq("id", id)
        .maybeSingle();

      console.log("🧾 [TestArticle] Status:", status);
      console.log("🧾 [TestArticle] Data:", data);
      console.log("🧾 [TestArticle] Error:", error);

      if (error) {
        setResult({ status, error: error.message, data: null });
      } else {
        setResult({ status, data, error: null });
      }
    } catch (err) {
      console.error("❌ [TestArticle] Unexpected error:", err);
      setResult({ status: "exception", error: String(err), data: null });
    } finally {
      setLoading(false);
      console.log("🏁 [TestArticle] Fetch finished");
    }
  }

  return (
    <main className="p-10 text-white">
      <h1 className="text-2xl font-bold text-blue-400 mb-6">
        🧪 Supabase Article Test
      </h1>

      <div className="flex gap-3 mb-6">
        <input
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="Paste an article ID..."
          className="flex-1 p-3 rounded-lg bg-gray-900 border border-gray-700 text-white"
        />
        <button
          onClick={testFetch}
          disabled={loading}
          className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 transition font-semibold"
        >
          {loading ? "Testing..." : "Test Fetch"}
        </button>
      </div>

      {result && (
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-700 space-y-3">
          <h2 className="text-lg font-semibold text-blue-400">Result</h2>
          <pre className="text-gray-300 text-sm overflow-x-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </main>
  );
}