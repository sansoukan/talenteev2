"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { supabasePublic } from "@/lib/supabasePublic"

type Article = {
  id: string
  title: string
  cover_url: string | null
  excerpt: string | null
  reading_time: number | null
  category: string | null
}

export default function DashboardArticlesPreview({
  onReadMore,
}: {
  onReadMore?: () => void
}) {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchArticles() {
      try {
        const { data, error } = await supabasePublic
          .from("nova_articles")
          .select("id, title, excerpt, cover_url, reading_time, category, is_published")
          .eq("is_published", true)
          .order("created_at", { ascending: false })
          .limit(3)

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

  if (loading) return <div className="p-6 text-gray-500 text-center animate-pulse">Loading articles…</div>

  if (!articles.length) return <div className="p-6 text-gray-500 text-center">No published articles found.</div>

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="p-6 bg-white/[0.02] rounded-[28px] border border-white/5 backdrop-blur-xl"
    >
      <h3 className="text-xl font-semibold text-white mb-4 tracking-tight">Latest Pro Articles</h3>

      <div className="space-y-4">
        {articles.map((a) => (
          <Link
            key={a.id}
            href={`/pro-content/${a.id}`}
            className="flex gap-4 items-start hover:bg-white/5 p-3 rounded-xl transition cursor-pointer"
          >
            <img
              src={a.cover_url || "/images/placeholder.jpg"}
              alt={a.title}
              className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
            />
            <div>
              <h4 className="font-medium text-white text-sm line-clamp-2 tracking-tight">{a.title}</h4>
              <p className="text-xs text-gray-500 line-clamp-2 mt-1">{a.excerpt || "No excerpt available."}</p>
              <p className="text-xs text-gray-600 mt-1">
                {a.reading_time || "5"} min • {a.category || "General"}
              </p>
            </div>
          </Link>
        ))}
      </div>

      <div className="text-center mt-5">
        <button
          onClick={onReadMore}
          className="px-5 py-2 rounded-xl bg-white text-black hover:bg-gray-100 transition text-sm font-medium tracking-tight"
        >
          Explore all →
        </button>
      </div>
    </motion.div>
  )
}
