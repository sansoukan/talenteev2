"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import Link from "next/link";
import { motion } from "framer-motion";
import { supabasePublic } from "@/lib/supabasePublic";

export default function ProContentArticlePage({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const coverFromCard = searchParams.get("cover");
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchArticle() {
      try {
        const { data, error } = await supabasePublic
          .from("nova_articles")
          .select("*")
          .eq("id", params.id)
          .maybeSingle();

        if (error) throw error;
        setArticle(data);
      } catch (err) {
        console.error("❌ [ProContentArticle] Fetch error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchArticle();
  }, [params.id]);

  if (loading)
    return (
      <main className="min-h-screen flex items-center justify-center bg-black text-gray-400">
        Loading article…
      </main>
    );

  if (!article)
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-black text-red-400">
        ⚠️ Article not found
        <Link href="/pro-content" className="mt-4 text-blue-400 underline hover:text-blue-300">
          ← Back to articles
        </Link>
      </main>
    );

  const coverImage = coverFromCard || article.cover_url || "/images/placeholder.jpg";

  let text = article.content ?? "";
  try {
    if (text.startsWith('"') && text.endsWith('"')) text = JSON.parse(text);
  } catch {}

  const formattedDate = article.created_at
    ? new Date(article.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black text-gray-100">
      {/* ✅ HERO RESPONSIVE */}
      <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] md:aspect-[3/1] lg:aspect-[2.5/1] mb-16 overflow-hidden">
        <motion.img
          src={coverImage}
          alt={article.title}
          loading="eager"
          decoding="sync"
          initial={{ scale: 1.1, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0 w-full h-full object-cover brightness-[0.45]"
        />
        {/* ✅ Overlay dynamique pour lisibilité */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/60 to-black md:via-black/40" />

        {/* ✅ Mobile: blur léger sous le texte */}
        <div className="absolute bottom-0 w-full h-32 backdrop-blur-sm md:hidden" />

        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 text-center max-w-2xl px-6 z-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-blue-400 mb-3 drop-shadow-lg leading-tight">
            {article.title}
          </h1>
          <p className="text-gray-400 text-sm">
            ✍️ {article.author || "Nova Coach"} • {formattedDate} • ⏱{" "}
            {article.reading_time || "5"} min
          </p>
        </div>
      </div>

      {/* ✅ ARTICLE CONTENT */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-3xl mx-auto px-6 pb-20"
      >
        <article
          className="prose prose-invert prose-lg max-w-none
            prose-headings:text-blue-400
            prose-h1:mb-6 prose-h2:mt-8 prose-h2:mb-4
            prose-p:mb-5 prose-strong:text-white prose-a:text-blue-400
            hover:prose-a:text-blue-300 prose-img:rounded-xl prose-img:shadow-lg"
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
            {text}
          </ReactMarkdown>
        </article>

        <div className="text-center mt-16">
          <Link href="/pro-content" className="text-blue-400 underline hover:text-blue-300">
            ← Back to all articles
          </Link>
        </div>
      </motion.section>
    </main>
  );
}
