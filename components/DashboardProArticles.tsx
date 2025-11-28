"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { supabasePublic } from "@/lib/supabasePublic"

export default function DashboardProArticles({ onBackToDashboard }: { onBackToDashboard?: () => void }) {
  const [articles, setArticles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchArticles() {
      try {
        const { data, error } = await supabasePublic
          .from("nova_articles")
          .select("id, title, slug, excerpt, cover_url, reading_time, category, is_published, created_at")
          .eq("is_published", true)
          .order("created_at", { ascending: false })
          .limit(4)

        if (error) throw error
        setArticles(data || [])
      } catch (err) {
        console.error("Error fetching articles:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchArticles()
  }, [])

  if (loading)
    return (
      <div className="bg-white/[0.02] border border-white/5 rounded-[28px] p-8 backdrop-blur-xl">
        <div className="text-gray-400 text-center">Loading articles…</div>
      </div>
    )

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="bg-white/[0.02] border border-white/5 rounded-[28px] p-8 backdrop-blur-xl space-y-6"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-semibold text-white tracking-tight">📚 Latest Pro Articles</h3>
        <Link
          href="/pro-content"
          className="text-sm font-medium text-white/60 hover:text-white transition-colors duration-300"
        >
          View all →
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {articles.map((a) => (
          <Link key={a.id} href={`/pro-content/${a.id}`} className="group block">
            <motion.article
              whileHover={{ scale: 1.03 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="relative rounded-2xl overflow-hidden border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 transition-all duration-500 h-full"
            >
              <div className="relative w-full h-48 overflow-hidden bg-white/5">
                <img
                  src={a.cover_url || "/placeholder.svg?height=300&width=400&query=article+cover"}
                  alt={a.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              </div>

              <div className="p-5 space-y-3">
                <h4 className="font-semibold text-lg text-white line-clamp-2 tracking-tight leading-tight group-hover:text-white/90 transition-colors duration-300">
                  {a.title}
                </h4>
                <p className="text-sm font-light text-white/50 line-clamp-2 leading-relaxed">
                  {a.excerpt || "No excerpt available."}
                </p>
                <div className="flex items-center gap-2 text-xs font-medium text-white/30 tracking-wide pt-1">
                  <span>⏱ {a.reading_time || "5"} min</span>
                  <span className="w-1 h-1 rounded-full bg-white/20" />
                  <span>{a.category || "General"}</span>
                </div>
              </div>
            </motion.article>
          </Link>
        ))}
      </div>
    </motion.div>
  )
}
