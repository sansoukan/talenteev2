"use client"

import { useEffect, useState } from "react"
import { supabaseClient } from "@/src/lib/supabaseClient"

type Offer = {
  label: string
  price: string
  option: string // utilisé dans /api/checkout
}

export default function PricingOptions() {
  const [offers, setOffers] = useState<Offer[]>([])

  useEffect(() => {
    async function fetchProfile() {
      const {
        data: { user },
      } = await supabaseClient.auth.getUser()
      if (!user) return

      const { data: profile } = await supabaseClient.from("profiles").select("career_stage").eq("id", user.id).single()

      if (!profile?.career_stage) return

      const stage = profile.career_stage.toLowerCase()
      const newOffers: Offer[] = []

      switch (stage) {
        case "student":
        case "graduate":
          newOffers.push(
            { label: "🎓 One-shot Simulation", price: "$2.99", option: stage },
            { label: "📦 Pack 3 Junior", price: "$7.99", option: "pack3junior" },
            { label: "🔥 Pack 5 Mix", price: "$19.99", option: "pack5mix" },
          )
          break

        case "mid":
        case "manager":
          newOffers.push(
            { label: "💼 One-shot Simulation", price: "$4.99", option: stage },
            { label: "📦 Pack 3 Mid", price: "$12.99", option: "pack3mid" },
            { label: "🔥 Pack 5 Mix", price: "$19.99", option: "pack5mix" },
          )
          break

        case "exec":
          newOffers.push(
            { label: "🏛 One-shot Simulation", price: "$9.99", option: stage },
            { label: "🔥 Pack 5 Mix", price: "$19.99", option: "pack5mix" },
          )
          break
      }

      setOffers(newOffers)
    }

    fetchProfile()
  }, [])

  async function startCheckout(option: string) {
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()
    if (!user) return

    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.id, app_session_id: "demo123", option }),
    })

    const { url } = await res.json()
    if (url) window.location.href = url
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold">Available Offers</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {offers.map((o) => (
          <div
            key={o.option}
            className="p-6 bg-white rounded-xl shadow-md border border-gray-200 flex flex-col items-center gap-2"
          >
            <h3 className="text-lg font-semibold">{o.label}</h3>
            <p className="text-gray-600">{o.price}</p>
            <button
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              onClick={() => startCheckout(o.option)}
            >
              Buy Now
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
