"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { supabasePublic } from "@/lib/supabasePublic"

type Article = {
  id: string
  title: string
  excerpt: string | null
  cover_url: string | null
  reading_time: number | null
  category: string | null
  created_at: string
}

export default function ProContentPage() {
  const [featuredArticle, setFeaturedArticle] = useState<Article | null>(null)
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchArticles() {
      const { data, error } = await supabasePublic
        .from("nova_articles")
        .select("id, title, excerpt, cover_url, reading_time, category, created_at")
        .eq("is_published", true)
        .order("created_at", { ascending: false })

      if (!error && data) {
        setFeaturedArticle(data[0])
        setArticles(data.slice(1))
      }
      setLoading(false)
    }
    fetchArticles()
  }, [])

  if (loading)
    return (
      <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center space-y-6 animate-in fade-in duration-700">
          <div className="w-10 h-10 mx-auto rounded-full border-2 border-white/10 border-t-white/60 animate-spin" />
          <p className="text-white/30 text-sm font-light tracking-wide">Loading articles…</p>
        </div>
      </main>
    )

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/[0.08] backdrop-blur-xl border border-white/10 text-white text-sm font-medium hover:bg-white/[0.12] hover:scale-[1.02] transition-all duration-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] group"
          >
            <svg
              className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
        </div>
      </header>

      <section className="pt-24 pb-12 px-6 lg:pt-32 lg:pb-16 border-b border-white/5">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-4"
          >
            <h1 className="text-5xl lg:text-6xl font-semibold tracking-[-0.02em] leading-[1.1]">
              Nova RH •{" "}
              <span className="bg-gradient-to-r from-blue-400/90 to-violet-400/90 bg-clip-text text-transparent">
                Pro Insights
              </span>
            </h1>
            <p className="text-lg lg:text-xl font-light text-white/40 tracking-[-0.01em] max-w-2xl leading-relaxed">
              Expert perspectives on leadership, career growth, and professional development.
            </p>
          </motion.div>
        </div>
      </section>

      {featuredArticle && (
        <section className="py-12 px-6 border-b border-white/5">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              <Link href={`/pro-content/${featuredArticle.id}`} className="group block">
                <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                  <div className="relative aspect-[16/10] lg:aspect-[4/3] overflow-hidden rounded-2xl bg-white/5">
                    <img
                      src={featuredArticle.cover_url || "/placeholder.svg?height=600&width=800&query=featured+article"}
                      alt={featuredArticle.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  </div>

                  <div className="space-y-6">
                    <div className="inline-block px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-medium text-blue-400 tracking-wide">
                      {featuredArticle.category || "Featured"}
                    </div>

                    <h2 className="text-3xl lg:text-4xl font-semibold tracking-[-0.02em] text-white leading-tight group-hover:text-white/90 transition-colors duration-300">
                      {featuredArticle.title}
                    </h2>

                    <p className="text-base lg:text-lg font-light text-white/60 leading-relaxed line-clamp-3">
                      {featuredArticle.excerpt || "Discover insights and strategies for professional excellence."}
                    </p>

                    <div className="flex items-center gap-3 text-sm font-medium text-white/30">
                      <span>⏱ {featuredArticle.reading_time || "5"} min read</span>
                      <span className="w-1 h-1 rounded-full bg-white/20" />
                      <span>
                        {new Date(featuredArticle.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    <button className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/[0.08] backdrop-blur-xl border border-white/10 text-white text-sm font-medium hover:bg-white/[0.12] hover:scale-[1.02] transition-all duration-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
                      Read Article
                      <svg
                        className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </Link>
            </motion.div>
          </div>
        </section>
      )}

      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-semibold tracking-[-0.02em] text-white mb-2">The Latest</h2>
              <p className="text-sm text-white/40">Recent articles and insights</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.map((article, index) => (
              <motion.article
                key={article.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
              >
                <Link href={`/pro-content/${article.id}`} className="group block h-full">
                  <div className="h-full space-y-4">
                    <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-white/5">
                      <img
                        src={article.cover_url || "/placeholder.svg?height=400&width=600&query=article+cover"}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs font-medium text-white/30">
                        <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">
                          {article.category || "Article"}
                        </span>
                        <span>•</span>
                        <span>{article.reading_time || "5"} min</span>
                      </div>

                      <h3 className="text-xl font-semibold tracking-[-0.01em] text-white leading-tight group-hover:text-blue-400 transition-colors duration-300 line-clamp-3">
                        {article.title}
                      </h3>

                      <p className="text-sm font-light text-white/50 leading-relaxed line-clamp-2">
                        {article.excerpt || "Discover valuable insights and actionable strategies."}
                      </p>
                    </div>
                  </div>
                </Link>
              </motion.article>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
