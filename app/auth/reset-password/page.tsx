"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Check if we have a valid session from the reset link
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        setErr("Invalid or expired reset link. Please request a new one.")
      }
    }
    checkSession()
  }, [])

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErr(null)
    setOk(null)

    if (password !== confirmPassword) {
      setErr("Passwords do not match.")
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setErr("Password must be at least 6 characters.")
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setOk("Password updated successfully! Redirecting to sign in...")
      setTimeout(() => router.push("/auth"), 2000)
    } catch (e: any) {
      setErr(e?.message ?? "Failed to reset password.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl">
          <h1 className="text-4xl font-semibold tracking-tight text-white mb-2 text-center">Set New Password</h1>
          <p className="text-white/40 text-center mb-8 text-base">Enter your new password below.</p>

          <form onSubmit={handleReset} className="space-y-5">
            <label className="block">
              <span className="block font-medium text-white/70 mb-2 text-sm tracking-tight">New Password</span>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
                placeholder="Enter new password"
              />
            </label>

            <label className="block">
              <span className="block font-medium text-white/70 mb-2 text-sm tracking-tight">Confirm Password</span>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
                placeholder="Confirm new password"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold bg-white/10 backdrop-blur-xl hover:bg-white/20 transition-all duration-200 text-white border border-white/10 hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99] shadow-lg"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>

            {err && (
              <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {err}
              </div>
            )}
            {ok && (
              <div className="px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
                {ok}
              </div>
            )}
          </form>

          <div className="mt-8 text-center">
            <Link
              href="/auth"
              className="text-white/40 hover:text-white text-sm transition-colors inline-flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
