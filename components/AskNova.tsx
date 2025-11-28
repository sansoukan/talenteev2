"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"

type Message = {
  role: "user" | "nova" | "nova-typing"
  text: string
  timestamp: number
}

export default function AskNova({ userId }: { userId: string }) {
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [count, setCount] = useState(0)
  const maxQuestions = 10

  const endRef = useRef<HTMLDivElement | null>(null)
  const chatContainerRef = useRef<HTMLDivElement | null>(null)
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null)
  const INACTIVITY_TIMEOUT = 10 * 60 * 1000 // 10 minutes
  const MESSAGE_EXPIRATION = 5 * 60 * 1000 // 5 minutes

  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
    }

    inactivityTimerRef.current = setTimeout(() => {
      setMessages([])
      setCount(0)
      localStorage.removeItem(`askNova_${userId}`)
      localStorage.removeItem(`askNovaCount_${userId}`)
    }, INACTIVITY_TIMEOUT)
  }

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setMessages((prev) => {
        const filtered = prev.filter((m) => now - m.timestamp < MESSAGE_EXPIRATION)
        if (filtered.length !== prev.length) {
          // Update localStorage when messages are removed
          if (filtered.length > 0) {
            localStorage.setItem(`askNova_${userId}`, JSON.stringify(filtered))
          } else {
            localStorage.removeItem(`askNova_${userId}`)
          }
        }
        return filtered
      })
    }, 1000) // Check every second

    return () => clearInterval(interval)
  }, [userId, MESSAGE_EXPIRATION])

  useEffect(() => {
    const savedMessages = localStorage.getItem(`askNova_${userId}`)
    const savedCount = localStorage.getItem(`askNovaCount_${userId}`)

    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages) as Message[]
        const now = Date.now()
        const validMessages = parsed.filter((m) => now - m.timestamp < MESSAGE_EXPIRATION)
        setMessages(validMessages)
      } catch (e) {
        console.error("Failed to parse saved messages", e)
      }
    }

    if (savedCount) {
      setCount(Number.parseInt(savedCount, 10) || 0)
    }

    resetInactivityTimer()

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current)
      }
    }
  }, [userId, MESSAGE_EXPIRATION])

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`askNova_${userId}`, JSON.stringify(messages))
    }
    localStorage.setItem(`askNovaCount_${userId}`, count.toString())
  }, [messages, count, userId])

  useEffect(() => {
    if (chatContainerRef.current) {
      const container = chatContainerRef.current
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100
      
      // Only auto-scroll if user is already near the bottom (within 100px)
      if (isNearBottom) {
        container.scrollTop = container.scrollHeight
      }
    }
  }, [messages, loading])

  async function handleSend(custom?: string) {
    const question = (custom || input).trim()
    if (!question || loading) return

    resetInactivityTimer()

    setMessages((m) => [...m, { role: "user", text: question, timestamp: Date.now() }])
    setInput("")
    setLoading(true)

    try {
      const res = await fetch("/api/ask-nova", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, user_id: userId }),
      })
      const json = await res.json()

      if (res.status === 403) {
        setMessages((m) => [...m, { role: "nova", text: "Daily limit reached (10 questions).", timestamp: Date.now() }])
      } else {
        simulateTyping(json.answer || "…")
        setCount((c) => c + 1)
      }
    } catch {
      setMessages((m) => [...m, { role: "nova", text: "Error contacting Nova.", timestamp: Date.now() }])
      setLoading(false)
    }
  }

  async function simulateTyping(fullText: string) {
    let typed = ""
    for (let i = 0; i < fullText.length; i++) {
      await new Promise((r) => setTimeout(r, 8))
      typed += fullText[i]
      setMessages((prev) => [
        ...prev.filter((m) => m.role !== "nova-typing"),
        { role: "nova-typing", text: typed, timestamp: Date.now() },
      ])
    }
    setMessages((prev) => [
      ...prev.filter((m) => m.role !== "nova-typing"),
      { role: "nova", text: fullText, timestamp: Date.now() },
    ])
    setLoading(false)
  }

  function handleKeyPress(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
    resetInactivityTimer()
  }

  return (
    <main className="flex flex-col h-[600px]">
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-32">
            <p className="text-lg text-gray-300 font-medium tracking-tight">Hello, I'm Nova</p>
            <p className="mt-2 text-gray-500 text-sm">
              Ask me anything about interviews, body language, or your career path.
            </p>
            <p className="mt-6 text-xs text-gray-600">Limit: {maxQuestions} questions per day.</p>
          </div>
        )}

        {messages.map((m, i) => {
          const isNova = m.role.includes("nova")
          const isTyping = m.role === "nova-typing"
          return (
            <div key={i} className={`flex ${isNova ? "justify-start" : "justify-end"}`}>
              <div
                className={`max-w-[80%] sm:max-w-[70%] px-4 py-3 rounded-2xl text-[15px] leading-relaxed whitespace-pre-wrap ${
                  isNova ? "bg-white/5 border border-white/5 text-gray-100" : "bg-white text-black"
                }`}
              >
                {m.text}
                {isTyping && <span className="inline-block w-2 h-3 bg-gray-400 ml-1 animate-pulse rounded" />}
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      <div className="border-t border-white/5 bg-black/50 backdrop-blur-xl p-4">
        <div className="flex gap-3 items-center">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            placeholder="Message Nova..."
            disabled={loading}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-white/20 outline-none"
          />
          <button
            onClick={() => handleSend()}
            disabled={loading}
            className="px-5 py-2.5 bg-white text-black font-medium rounded-xl hover:bg-gray-100 disabled:opacity-40 transition text-sm tracking-tight"
          >
            {loading ? "..." : "Send"}
          </button>
        </div>
      </div>
    </main>
  )
}
