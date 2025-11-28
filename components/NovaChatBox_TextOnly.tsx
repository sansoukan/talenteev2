"use client"

import { forwardRef, useImperativeHandle, useState } from "react"

export interface NovaChatBoxTextOnlyRef {
  addMessage: (sender: string, message: string) => void
  getLastQuestion: () => string | null
}

const NovaChatBox_TextOnly = forwardRef<NovaChatBoxTextOnlyRef, any>(({ onUserMessage }, ref) => {
  const [messages, setMessages] = useState<Array<{ sender: string; text: string }>>([])

  useImperativeHandle(ref, () => ({
    addMessage: (sender, message) => {
      setMessages((prev) => [...prev, { sender, text: message }])
    },
    getLastQuestion: () => messages[messages.length - 1]?.text || null,
  }))

  return (
    <div className="flex flex-col h-full p-4 bg-gray-950">
      <div className="flex-1 overflow-y-auto space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`p-3 rounded-lg ${msg.sender === "nova" ? "bg-blue-900/30" : "bg-gray-800"}`}>
            <div className="text-xs text-gray-400 mb-1">{msg.sender}</div>
            <div className="text-sm">{msg.text}</div>
          </div>
        ))}
      </div>
      <input
        type="text"
        placeholder="Type a message..."
        className="mt-4 px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500"
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.currentTarget.value) {
            onUserMessage(e.currentTarget.value)
            setMessages((prev) => [...prev, { sender: "user", text: e.currentTarget.value }])
            e.currentTarget.value = ""
          }
        }}
      />
    </div>
  )
})

NovaChatBox_TextOnly.displayName = "NovaChatBox_TextOnly"

export default NovaChatBox_TextOnly
