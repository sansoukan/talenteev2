"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from 'next/navigation'
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"

type Mode = "signin" | "signup" | "magic"

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()

  const messageParam = searchParams.get("message")

  async function handlePostAuthRedirect(userId: string) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", userId)
      .maybeSingle()

    if (profile?.onboarding_completed) {
      router.push("/dashboard")
    } else {
      router.push("/onboarding")
    }
  }

  useEffect(() => {
    ;(async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session?.user) {
        await handlePostAuthRedirect(session.user.id)
      }
    })()
  }, [router])

  useEffect(() => {
    setErr(null)
    setOk(null)
  }, [mode])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErr(null)
    setOk(null)

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/onboarding`,
          },
        })
        if (error) throw error
        setOk("A confirmation email has been sent. Please check your inbox to activate your account.")
      } else if (mode === "signin") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        if (data?.user?.id) {
          localStorage.setItem("nova_user_id", data.user.id)
          setOk("Signed in successfully.")
          router.push("/dashboard")
        }
      } else if (mode === "magic") {
        const { error } = await supabase.auth.signInWithOtp({ email })
        if (error) throw error
        setOk("Magic link sent. Please check your inbox.")
      }
    } catch (e: any) {
      setErr(e?.message ?? "Authentication error.")
    } finally {
      setLoading(false)
    }
  }

  async function onSocial(provider: "google" | "apple") {
    setLoading(true)
    setErr(null)
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({ provider })
      if (error) throw error
      if (data?.user?.id) {
        localStorage.setItem("nova_user_id", data.user.id)
        router.push("/dashboard")
      }
    } catch (e: any) {
      setErr(e?.message ?? "Social login error.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl">
          <h1 className="text-4xl font-semibold tracking-tight text-white mb-2 text-center">
            Sign in to Nova
          </h1>
          <p className="text-white/40 text-center mb-8 text-base">
            Access your account or create one to start your journey with Nova.
          </p>

          {messageParam === "confirm" && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm text-center">
              Please confirm your email before continuing.
            </div>
          )}

          <div className="flex gap-2 mb-8 p-1 bg-white/5 rounded-xl">
            <button
              onClick={() => setMode("signin")}
              aria-pressed={mode === "signin"}
              className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 text-sm tracking-tight
                ${mode === "signin" 
                  ? "bg-white/10 backdrop-blur-xl text-white shadow-lg" 
                  : "text-white/50 hover:text-white/70"}`}
            >
              Sign in
            </button>
            <button
              onClick={() => setMode("signup")}
              aria-pressed={mode === "signup"}
              className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 text-sm tracking-tight
                ${mode === "signup" 
                  ? "bg-white/10 backdrop-blur-xl text-white shadow-lg" 
                  : "text-white/50 hover:text-white/70"}`}
            >
              Sign up
            </button>
            <button
              onClick={() => setMode("magic")}
              aria-pressed={mode === "magic"}
              className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 text-sm tracking-tight
                ${mode === "magic" 
                  ? "bg-white/10 backdrop-blur-xl text-white shadow-lg" 
                  : "text-white/50 hover:text-white/70"}`}
            >
              Magic link
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <label className="block">
              <span className="block font-medium text-white/70 mb-2 text-sm tracking-tight">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
                placeholder="you@example.com"
              />
            </label>

            {mode !== "magic" && (
              <label className="block">
                <span className="block font-medium text-white/70 mb-2 text-sm tracking-tight">Password</span>
                <input
                  type="password"
                  required={mode !== "magic"}
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
                  placeholder="Enter your password"
                />
              </label>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold bg-white/10 backdrop-blur-xl hover:bg-white/20 transition-all duration-200 text-white border border-white/10 hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99] shadow-lg"
            >
              {loading
                ? "Processing..."
                : mode === "signin"
                ? "Sign in"
                : mode === "signup"
                ? "Create my account"
                : "Send magic link"}
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

          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/40 text-sm">or continue with</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <div className="space-y-3">
            <button
              onClick={() => onSocial("google")}
              className="flex items-center justify-center gap-3 w-full px-4 py-3 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 text-white font-medium hover:bg-white/10 hover:border-white/20 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <button
              onClick={() => onSocial("apple")}
              className="flex items-center justify-center gap-3 w-full px-4 py-3 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 text-white font-medium hover:bg-white/10 hover:border-white/20 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              Continue with Apple
            </button>
          </div>

          <div className="mt-8 text-center">
            <Link 
              href="/" 
              className="text-white/40 hover:text-white text-sm transition-colors inline-flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
