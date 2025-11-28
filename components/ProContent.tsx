"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { supabasePublic } from "@/lib/supabasePublic"; // ✅ client public stable

export default function ProContent() {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchArticles() {
      console.log("🚀 [ProContent] Fetching articles from supabasePublic...");

      try {
        const { data, error, status } = await supabasePublic
          .from("nova_articles")
          .select(
            "id, title, slug, excerpt, cover_url, reading_time, category, is_published, created_at"
          )
          .eq("is_published", true)
          .order("created_at", { ascending: false })
          .limit(5);

        console.log("🧾 [ProContent] Supabase status:", status);
        console.log("🧾 [ProContent] Supabase data:", data);
        console.log("🧾 [ProContent] Supabase error:", error);

        if (error) throw error;
        setArticles(data || []);
      } catch (err) {
        console.error("❌ [ProContent] Fetch error:", err);
      } finally {
        setLoading(false);
        console.log("✅ [ProContent] Fetch completed.");
      }
    }

    fetchArticles();
  }, []);

  if (loading)
    return (
      <div className="p-6 text-gray-400 text-center">
        Loading articles…
      </div>
    );

  if (!loading && articles.length === 0)
    return (
      <div className="p-6 text-gray-400 text-center">
        ⚠️ No published articles found.
      </div>
    );

  console.log("🎨 [ProContent] Rendering", articles.length, "articles");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-gray-900/60 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-lg space-y-6"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-blue-400 flex items-center gap-2">
          📚 Pro Content
        </h3>
        <Link
          href="/pro-content"
          aria-label="View all professional articles"
          className="text-sm text-blue-400 hover:text-white transition underline"
        >
          View all →
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {articles.map((a) => (
          <Link
            key={a.id}
            href={`/pro-content/${a.id}`}
            aria-label={`Read article: ${a.title}`}
          >
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.25 }}
              className="relative group rounded-xl overflow-hidden border border-white/10 hover:border-blue-500/30 bg-gray-800/50 hover:bg-gray-800/70 transition-all shadow-lg hover:shadow-blue-500/20"
            >
              <div className="relative w-full h-40 overflow-hidden">
                <img
                  src={a.cover_url || "/images/placeholder.jpg"}
                  alt={a.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              </div>

              <div className="p-4 space-y-2">
                <h4 className="font-semibold text-base text-white line-clamp-2 group-hover:text-blue-400 transition">
                  {a.title}
                </h4>
                <p className="text-sm text-gray-400 line-clamp-2">
                  {a.excerpt || "No excerpt available."}
                </p>
                <span className="text-xs text-gray-500">
                  ⏱ {a.reading_time || "5"} min • {a.category || "General"}
                </span>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}