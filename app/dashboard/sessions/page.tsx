"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function SessionsDashboard() {
  const router = useRouter()
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth")
        return
      }

      const { data, error } = await supabase
        .from("nova_sessions")
        .select(`
          id,
          created_at,
          score_global,
          final_feedback_summary,
          type_entretien,
          domain,
          sub_domain,
          duration,
          duration_target
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) console.error("❌ Error loading sessions:", error)

      setSessions(data || [])
      setLoading(false)
    })()
  }, [router])

  if (loading) {
    return (
      <main className="h-screen flex items-center justify-center bg-[#0A0A0A]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
          <p className="text-gray-400 text-lg font-light tracking-tight">Loading your sessions…</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] px-6 py-16 text-white">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-5xl font-semibold tracking-tight mb-3 bg-gradient-to-r from-blue-400 via-purple-300 to-blue-400 bg-clip-text text-transparent">
          Your Sessions
        </h1>
        <p className="text-gray-400 text-sm font-light tracking-wide mb-12">
          View and manage all your interview sessions
        </p>

        {sessions.length === 0 ? (
          <div className="flex items-center justify-center py-32">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-xl">
                <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <p className="text-gray-500 text-sm font-light">You have no sessions yet.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {sessions.map((s) => (
              <div
                key={s.id}
                onClick={() => router.push(`/dashboard/sessions/${s.id}`)}
                className="group cursor-pointer p-6 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.05] to-black/40 backdrop-blur-xl shadow-[0_0_50px_rgba(255,255,255,0.03)] hover:shadow-[0_0_80px_rgba(255,255,255,0.08)] hover:border-white/20 transition-all duration-500 hover:-translate-y-1 hover:brightness-110"
              >
                <div className="flex justify-between items-center mb-4">
                  <p className="text-xs text-gray-500 font-light tracking-wide">
                    {new Date(s.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <span className="px-3 py-1.5 bg-white/10 text-xs font-medium rounded-full border border-white/10 backdrop-blur-sm tracking-wide">
                    {s.type_entretien?.replace("_", " ") || "Interview"}
                  </span>
                </div>

                <h2 className="text-xl font-semibold tracking-tight mb-2 text-white/95 group-hover:text-white transition-colors">
                  {s.domain ? `${s.domain} · ${s.sub_domain}` : "Interview Session"}
                </h2>

                <p className="text-sm text-gray-400 font-light leading-relaxed line-clamp-3 mb-6">
                  {s.final_feedback_summary || "No final feedback was generated for this session."}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-400/80 shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
                    <span className="text-blue-400 font-semibold text-sm tracking-tight">
                      Score: {s.score_global ?? "—"}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 font-light">
                    {Math.round((s.duration / 60) * 10) / 10} / {Math.round((s.duration_target / 60) * 10) / 10} min
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}