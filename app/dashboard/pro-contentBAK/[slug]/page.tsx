"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { supabasePublic } from "@/lib/supabasePublic";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

/**
 * 🧠 Nova Insights — ArticlePage (slug)
 * ------------------------------------
 * - Lecture publique via supabasePublic (clé anon)
 * - Rendu Markdown typographié (HBR style)
 * - Style Nova Coach : fluide, lisible, premium
 */

export default function ArticlePage() {
  const { slug } = useParams();
  const router = useRouter();
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    async function fetchArticle() {
      console.log("🚀 [ArticlePage] Fetching article slug:", slug);

      try {
        const { data, error, status } = await supabasePublic
          .from("nova_articles")
          .select(
            "id, title, cover_url, content, author, reading_time, category, created_at, tags, is_published"
          )
          .eq("slug", slug)
          .eq("is_published", true)
          .maybeSingle();

        console.log("🧾 [ArticlePage] Status:", status);
        console.log("🧾 [ArticlePage] Data:", data);
        console.log("🧾 [ArticlePage] Error:", error);

        if (error) throw error;
        if (!data) {
          console.warn("⚠️ Article not found → redirect /pro-content");
          router.push("/pro-content");
          return;
        }

        setArticle(data);
      } catch (err) {
        console.error("❌ [ArticlePage] Fetch error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchArticle();
  }, [slug, router]);

  // 🌀 État de chargement
  if (loading)
    return (
      <main className="p-10 text-gray-400 text-center animate-pulse">
        Loading article…
      </main>
    );

  // ⚠️ Aucun article
  if (!article)
    return (
      <main className="p-10 text-center text-red-400">
        ⚠️ Article not found
        <div className="mt-4">
          <button
            onClick={() => router.push("/pro-content")}
            className="text-blue-400 underline hover:text-blue-300"
          >
            ← Back to articles
          </button>
        </div>
      </main>
    );

  const formattedDate = article.created_at
    ? new Date(article.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black text-white py-12 px-4 sm:px-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl mx-auto"
      >
        {/* 🖼️ Image de couverture */}
        {article.cover_url && (
          <div className="relative w-full h-[380px] mb-10 rounded-3xl overflow-hidden shadow-2xl">
            <img
              src={article.cover_url}
              alt={article.title}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          </div>
        )}

        {/* 🧠 Titre */}
        <h1 className="text-4xl sm:text-5xl font-extrabold mb-6 text-blue-400 leading-tight">
          {article.title}
        </h1>

        {/* 📅 Métadonnées */}
        <div className="flex flex-wrap items-center gap-3 text-gray-400 text-sm mb-8">
          {article.author && <span>✍️ {article.author}</span>}
          {article.reading_time && (
            <span>⏱ {article.reading_time} min read</span>
          )}
          {formattedDate && <span>📅 {formattedDate}</span>}
          {article.category && <span>• {article.category}</span>}
        </div>

        {/* ✍️ Contenu principal (Markdown) */}
        <article className="prose prose-invert prose-lg max-w-none leading-relaxed text-gray-200">
          {article.content ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
              {article.content}
            </ReactMarkdown>
          ) : (
            <p style={{ opacity: 0.6 }}>No content available for this article.</p>
          )}
        </article>

        {/* 🏷️ Tags */}
        {article.tags && Array.isArray(article.tags) && (
          <div className="flex flex-wrap gap-2 mt-10">
            {article.tags.map((tag: string) => (
              <span
                key={tag}
                className="text-xs bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full border border-blue-500/20"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* 🔙 Retour */}
        <div className="text-center mt-12">
          <button
            onClick={() => router.push("/pro-content")}
            className="px-6 py-3 rounded-lg bg-gray-800 hover:bg-blue-600 transition text-white font-semibold"
          >
            ← Back to all articles
          </button>
        </div>
      </motion.div>
    </main>
  );
}
