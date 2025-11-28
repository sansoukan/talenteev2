"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function TestSupabasePage() {
  const [articles, setArticles] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      console.log("🚀 [test-supabase] Starting test fetch from Supabase...");

      try {
        const { data, error, status } = await supabase
          .from("nova_articles")
          .select("id, title, is_published, created_at")
          .order("created_at", { ascending: false })
          .limit(5);

        // 🧾 Logs côté navigateur
        console.log("🧾 [test-supabase] Status:", status);
        console.log("🧾 [test-supabase] Data:", data);
        console.log("🧾 [test-supabase] Error:", error);

        // 🧾 Logs côté terminal (affichés aussi dans la console Next.js)
        if (data) {
          console.log("✅ [SERVER LOG] Data fetched from Supabase:", JSON.stringify(data, null, 2));
        }
        if (error) {
          console.error("❌ [SERVER LOG] Supabase error:", error.message || error);
        }

        if (error) setError(error.message);
        else setArticles(data || []);
      } catch (err: any) {
        console.error("❌ [test-supabase] Unexpected error:", err);
        setError(err.message || String(err));
      }
    })();
  }, []);

  if (error)
    return (
      <main className="p-8 text-red-400">
        <h1 className="text-2xl font-bold mb-4">❌ Supabase Connection Error</h1>
        <pre>{error}</pre>
      </main>
    );

  return (
    <main className="p-8 text-white">
      <h1 className="text-2xl mb-4 text-blue-400">🔍 Supabase Test Page</h1>

      {articles.length === 0 ? (
        <p className="text-gray-400">⚠️ No articles found.</p>
      ) : (
        <ul className="space-y-2">
          {articles.map((a) => (
            <li
              key={a.id}
              className="border-b border-gray-700 pb-2 text-gray-300"
            >
              ✅ <span className="font-semibold text-blue-400">{a.title}</span>
              <span className="text-sm text-gray-500 ml-2">
                ({a.is_published ? "published" : "draft"})
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}