"use client"

import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export default function SimulationPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()

  async function handleStart() {
    const { data: { session } } = await supabase.auth.getSession()

    if (session) {
      // ✅ Déjà connecté → démarrer simulation
      router.push("/session")
    } else {
      // 🚨 Pas connecté → aller sur page Auth
      router.push("/auth?next=/session")
    }
  }

  return (
    <main className="p-6">
      <div className="bg-bg-card border border-border rounded-lg p-6 shadow text-center space-y-4">
        <h1 className="text-xl font-bold">🚀 Start a Simulation</h1>
        <p className="text-text-muted">Begin or resume your interview practice session.</p>
        <button
          onClick={handleStart}
          className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-light transition"
        >
          Start Simulation
        </button>
      </div>
    </main>
  )
}
