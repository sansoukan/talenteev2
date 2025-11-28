"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useTypingEffect } from "@/lib/useTypingEffect"

export default function CVOfferSection() {
  const [file, setFile] = useState<File | null>(null)
  const [offer, setOffer] = useState("")
  const [feedback, setFeedback] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const typedFeedback = useTypingEffect(feedback || "", 20)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      if (data?.user?.id) setUserId(data.user.id)
    })()
  }, [])

  async function handleSubmit(endpoint: "improve" | "analyze") {
    if (!file) {
      setError("Please select a CV file first.")
      return
    }
    setLoading(true)
    setError(null)
    setFeedback(null)

    try {
      const formData = new FormData()
      formData.append("file", file)
      if (offer.trim()) formData.append("offer", offer)

      const resp = await fetch(`/api/cv/${endpoint}`, {
        method: "POST",
        body: formData,
      })

      const json = await resp.json()
      if (!resp.ok || json.error) {
        setError(json.error || "Error during analysis.")
      } else {
        setFeedback(json.feedback)

        if (userId) {
          await fetch("/api/cv/profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: userId,
              cv_text: offer || json.feedback || "",
            }),
          })
        }
      }
    } catch (e: any) {
      console.error("Error:", e)
      setError("Network error.")
    } finally {
      setLoading(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0])
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white/[0.02] rounded-[28px] border border-white/5 backdrop-blur-xl">
      <h1 className="text-2xl font-semibold mb-4 text-white tracking-tight">CV & Job Offer Analysis</h1>
      <p className="text-gray-500 mb-6 text-sm">
        Upload your CV (PDF/DOCX) and optionally paste a job offer. Nova will analyze it and tailor future simulations.
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragActive(true)
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`flex items-center justify-center w-full h-32 mb-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
          dragActive ? "border-blue-500 bg-blue-500/10" : "border-white/10 bg-white/5"
        }`}
        onClick={() => document.getElementById("fileInput")?.click()}
      >
        {file ? (
          <p className="text-green-400 font-medium text-sm">{file.name} ready</p>
        ) : (
          <p className="text-gray-500 text-sm">Drag & Drop your CV here or click to select</p>
        )}
        <input
          id="fileInput"
          type="file"
          accept=".pdf,.doc,.docx"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </div>

      <textarea
        placeholder="Paste the job offer text here (optional)"
        value={offer}
        onChange={(e) => setOffer(e.target.value)}
        className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white mb-4 h-32 placeholder-gray-600 text-sm focus:ring-2 focus:ring-white/20 outline-none"
      />

      <div className="flex gap-4">
        <button
          onClick={() => handleSubmit("improve")}
          disabled={loading}
          className="flex-1 px-6 py-3 rounded-xl font-medium text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 disabled:opacity-50 transition text-sm tracking-tight"
        >
          {loading ? "Processing..." : "Improve CV"}
        </button>

        <button
          onClick={() => handleSubmit("analyze")}
          disabled={loading}
          className="flex-1 px-6 py-3 rounded-xl font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 disabled:opacity-50 transition text-sm tracking-tight"
        >
          {loading ? "Processing..." : "Analyze CV + Offer"}
        </button>
      </div>

      {error && (
        <div className="mt-4 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm">{error}</div>
      )}

      {typedFeedback && (
        <div className="mt-6 bg-white/5 border border-white/10 rounded-xl p-6 text-gray-200 whitespace-pre-line font-mono text-sm">
          {typedFeedback}
          <span className="animate-pulse">|</span>
        </div>
      )}
    </div>
  )
}
