"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabasePublic } from "@/lib/supabasePublic"; // ✅ client public lecture seule

type Article = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_url: string | null;
  reading_time: number | null;
  category: string | null;
};

export default function ProContentPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchArticles() {
      console.log("🚀 [ProContentList] Fetching articles from supabasePublic...");

      try {
        const { data, error, status } = await supabasePublic
          .from("nova_articles")
          .select(
            "id, title, slug, excerpt, cover_url, reading_time, category, is_published, created_at"
          )
          .eq("is_published", true)
          .order("created_at", { ascending: false });

        console.log("🧾 [ProContentList] Status:", status);
        console.log("🧾 [ProContentList] Data:", data);
        console.log("🧾 [ProContentList] Error:", error);

        if (error) throw error;
        setArticles(data || []);
      } catch (err) {
        console.error("❌ [ProContentList] Fetch error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchArticles();
  }, []);

  if (loading)
    return <main className="p-8 text-gray-400">Loading articles…</main>;

  if (!articles.length)
    return (
      <main className="p-8 text-gray-400 text-center">
        ⚠️ No published articles found.
      </main>
    );

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white p-8">
      <h1 className="text-4xl font-extrabold mb-8 text-blue-400">
        🧠 Nova Insights
      </h1>

      <div className="grid md:grid-cols-3 gap-8">
        {articles.map((a) => (
          <Link
            key={a.id}
            href={`/pro-content/${a.id}`}
            className="group bg-gray-800/80 rounded-2xl overflow-hidden shadow-lg hover:scale-[1.02] transition-transform"
          >
            <img
              src={a.cover_url || "/images/placeholder.jpg"}
              alt={a.title}
              className="w-full h-48 object-cover group-hover:opacity-90"
            />
            <div className="p-5 space-y-2">
              <h2 className="text-xl font-semibold group-hover:text-blue-400 transition">
                {a.title}
              </h2>
              <p className="text-sm text-gray-400 line-clamp-3">
                {a.excerpt || "No excerpt available."}
              </p>
              <div className="text-xs text-gray-500">
                ⏱ {a.reading_time || "5"} min read •{" "}
                {a.category || "General"}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}