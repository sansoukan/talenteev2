"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { motion } from "framer-motion"
import { toast } from "react-hot-toast"
import { User, Award, Database, Settings, Trash2, FileDown, Edit3, Headphones } from "lucide-react"

export default function SettingsPanel() {
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [badges, setBadges] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const { data: auth } = await supabase.auth.getUser()
      const id = auth?.user?.id
      if (!id) return
      setUserId(id)

      const [{ data: profile }, { data: stats }, { data: badges }] = await Promise.all([
        supabase
          .from("profiles")
          .select("career_stage, domain, sub_domain, goal, lang, is_realistic_mode, premium_status, freemium_use_done")
          .eq("id", id)
          .single(),
        supabase
          .from("nova_dashboard_view")
          .select("xp_total, last_session_score, last_session_ended_at")
          .eq("user_id", id)
          .single(),
        supabase
          .from("nova_certifications")
          .select("skill_improved, score, badge_url, created_at")
          .eq("user_id", id)
          .order("created_at", { ascending: false }),
      ])

      setProfile(profile)
      setStats(stats)
      setBadges(badges || [])
      setLoading(false)
    })()
  }, [])

  async function toggleMode() {
    const newValue = !profile?.is_realistic_mode
    setProfile({ ...profile, is_realistic_mode: newValue })
    if (!userId) return
    await supabase.from("profiles").update({ is_realistic_mode: newValue }).eq("id", userId)
    toast.success(`Mode ${newValue ? "Realistic" : "Simple"} activated`)
  }

  async function clearMemory() {
    if (!confirm("Are you sure you want to clear your memory?")) return
    await supabase.from("nova_memory").delete().eq("user_id", userId)
    toast.success("Memory cleared")
  }

  async function exportReport() {
    toast("Generating report...")
    window.open("/dashboard/report", "_blank")
  }

  async function deleteAccount() {
    const confirm1 = confirm("This will permanently delete your account.")
    if (!confirm1) return
    await supabase.auth.signOut()
    await supabase.from("profiles").delete().eq("id", userId)
    toast("Account deleted")
    window.location.href = "/auth"
  }

  if (loading) return <div className="flex justify-center items-center h-screen text-gray-500">Loading settings…</div>

  return (
    <main className="text-white space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="p-6 rounded-[28px] border border-white/5 bg-white/[0.02] backdrop-blur-xl"
      >
        <div className="flex items-center gap-3 mb-4">
          <User className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-semibold text-white tracking-tight">Profile & Simulation</h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 text-sm text-gray-400">
          <p>
            <strong className="text-white">Career Stage:</strong> {profile?.career_stage}
          </p>
          <p>
            <strong className="text-white">Domain:</strong> {profile?.domain}
          </p>
          {profile?.sub_domain && (
            <p>
              <strong className="text-white">Sub-domain:</strong> {profile?.sub_domain}
            </p>
          )}
          <p>
            <strong className="text-white">Goal:</strong> {profile?.goal}
          </p>
          <p>
            <strong className="text-white">Language:</strong> {profile?.lang?.toUpperCase()}
          </p>
          <p>
            <strong className="text-white">Premium:</strong> {profile?.premium_status || "Free"}
          </p>
        </div>

        <div className="flex flex-wrap gap-3 mt-6">
          <button
            onClick={() => (window.location.href = "/onboarding?mode=edit")}
            className="px-4 py-2 bg-white text-black rounded-xl transition text-sm font-medium tracking-tight hover:bg-gray-100"
          >
            <Edit3 className="inline w-4 h-4 mr-1" /> Edit Profile
          </button>
          <button
            onClick={toggleMode}
            className={`px-4 py-2 rounded-xl font-medium text-sm transition tracking-tight ${
              profile?.is_realistic_mode
                ? "bg-white/10 hover:bg-white/15 text-white border border-white/10"
                : "bg-white/5 hover:bg-white/10 text-gray-400 border border-white/5"
            }`}
          >
            {profile?.is_realistic_mode ? "Realistic Mode" : "Simple Mode"}
          </button>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="p-6 rounded-[28px] border border-white/5 bg-white/[0.02] backdrop-blur-xl"
      >
        <div className="flex items-center gap-3 mb-4">
          <Database className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-semibold text-white tracking-tight">Progress & Data</h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 text-sm text-gray-400">
          <p>
            <strong className="text-white">XP Total:</strong> {stats?.xp_total ?? 0}
          </p>
          <p>
            <strong className="text-white">Last Score:</strong> {stats?.last_session_score ?? "N/A"}
          </p>
          <p>
            <strong className="text-white">Last Session:</strong>{" "}
            {stats?.last_session_ended_at ? new Date(stats.last_session_ended_at).toLocaleDateString() : "N/A"}
          </p>
        </div>

        <div className="flex flex-wrap gap-3 mt-6">
          <button
            onClick={exportReport}
            className="px-4 py-2 bg-white text-black rounded-xl text-sm font-medium tracking-tight transition hover:bg-gray-100"
          >
            <FileDown className="inline w-4 h-4 mr-1" /> Export Report
          </button>
          <button
            onClick={clearMemory}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium tracking-tight transition text-white"
          >
            <Trash2 className="inline w-4 h-4 mr-1" /> Clear Memory
          </button>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="p-6 rounded-[28px] border border-white/5 bg-white/[0.02] backdrop-blur-xl"
      >
        <div className="flex items-center gap-3 mb-4">
          <Award className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-semibold text-white tracking-tight">Certifications & Badges</h2>
        </div>

        {badges.length === 0 && (
          <p className="text-gray-500 text-sm">No certifications yet — complete premium simulations to earn badges.</p>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
          {badges.map((b, i) => (
            <div key={i} className="bg-white/5 p-4 rounded-xl border border-white/10 text-sm">
              <img src={b.badge_url || "/placeholder.svg"} alt={b.skill_improved} className="h-12 w-12 mb-2" />
              <p className="font-semibold text-white">
                {b.skill_improved} ({b.score}%)
              </p>
              <p className="text-gray-500 text-xs">{new Date(b.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="p-6 rounded-[28px] border border-white/5 bg-white/[0.02] backdrop-blur-xl"
      >
        <div className="flex items-center gap-3 mb-4">
          <Settings className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-semibold text-white tracking-tight">Account & Support</h2>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => (window.location.href = "/support")}
            className="px-4 py-2 bg-white text-black rounded-xl text-sm font-medium tracking-tight transition hover:bg-gray-100"
          >
            <Headphones className="inline w-4 h-4 mr-1" /> Contact Support
          </button>
          <button
            onClick={() => (window.location.href = "/legal/privacy")}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-white tracking-tight"
          >
            Privacy Policy
          </button>
          <button
            onClick={deleteAccount}
            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-sm font-medium text-red-400"
          >
            Delete Account
          </button>
        </div>
      </motion.section>
    </main>
  )
}
