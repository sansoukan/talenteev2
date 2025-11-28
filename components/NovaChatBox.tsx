"use client";
import { forwardRef, useImperativeHandle, useState, useEffect } from "react";

/**
 * NovaChatBox — V4 (Texte uniquement, micro désactivé)
 * ----------------------------------------------------------
 * 💬 Chat interactif Nova ↔ Utilisateur
 * 💫 Effet typing + son NovaPop (lecture Nova uniquement)
 * 🧠 Aucune logique audio ni SpeechRecognition
 * ✍️ Échange 100 % écrit
 */

type Message = {
  sender: "nova" | "user";
  text: string;
  id: number;
};

export type NovaChatBoxRef = {
  addMessage: (sender: "nova" | "user", text: string) => void;
  setTyping: (value: boolean) => void;
  setLastQuestion: (question: string) => void;
  getLastQuestion: () => string | null;
  clearMessages: () => void;
};

type Props = {
  onUserMessage?: (text: string) => void; // callback vers NovaEngine
};

const NovaChatBox = forwardRef<NovaChatBoxRef, Props>(({ onUserMessage }, ref) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [typing, setTyping] = useState(false);
  const [animateLast, setAnimateLast] = useState(false);
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);
  const [input, setInput] = useState("");

  // 🎵 Son Nova (uniquement pour les messages de Nova)
  const popSoundRef =
    typeof Audio !== "undefined"
      ? new Audio(
          "https://qpnalviccuopdwfscoli.supabase.co/storage/v1/object/public/public-assets/system/nova_pop.mp3"
        )
      : null;
  if (popSoundRef) popSoundRef.volume = 0.45;

  /* ======================================================
     🔹 API exposée à NovaEngine
  ====================================================== */
  useImperativeHandle(ref, () => ({
    addMessage(sender, text) {
      if (!text) return;
      const newMsg = { sender, text, id: Date.now() };
      setMessages((prev) => [...prev, newMsg]);

      if (sender === "nova") {
        setAnimateLast(true);
        setTimeout(() => setAnimateLast(false), 700);
        try {
          popSoundRef && popSoundRef.play().catch(() => {});
        } catch {}
      }
    },
    setTyping(value) {
      setTyping(value);
    },
    setLastQuestion(question) {
      setLastQuestion(question);
    },
    getLastQuestion() {
      return lastQuestion;
    },
    clearMessages() {
      setMessages([]);
    },
  }));

  /* ======================================================
     🔹 Auto-scroll
  ====================================================== */
  useEffect(() => {
    const el = document.getElementById("nova-chat-scroll");
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  /* ======================================================
     🔹 Envoi texte utilisateur (aucun micro)
  ====================================================== */
  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { sender: "user", text, id: Date.now() }]);
    setInput("");
    onUserMessage?.(text);
  };

  /* ======================================================
     🖼 Render
  ====================================================== */
  return (
    <div className="flex flex-col h-full bg-[#F3F4F6] border-l border-gray-300 text-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-300 bg-white/90">
        <span className="font-semibold text-gray-700">💬 Chat with Nova</span>
        {typing && <span className="text-xs text-gray-400 italic">Nova is typing...</span>}
      </div>

      {/* Messages */}
      <div
        id="nova-chat-scroll"
        className="flex-1 overflow-y-auto p-4 space-y-3 transition-all duration-300"
      >
        {messages.map((m, i) => (
          <div
            key={m.id}
            className={`flex ${m.sender === "nova" ? "justify-start" : "justify-end"}`}
          >
            <div
              className={`px-3 py-2 rounded-2xl shadow-sm max-w-[80%] text-sm ${
                m.sender === "nova"
                  ? `bg-[#E0EFFF] text-gray-800 ${
                      animateLast && i === messages.length - 1
                        ? "opacity-0 animate-fadeIn"
                        : "opacity-100"
                    }`
                  : "bg-[#E5E7EB] text-gray-700 opacity-100"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}

        {typing && (
          <div className="flex items-center gap-1 px-3 py-2 rounded-2xl bg-[#E0EFFF]/80 text-blue-600 w-fit animate-pulse">
            <TypingDots />
          </div>
        )}
      </div>

      {/* Zone de saisie (aucun micro ni icône vocale) */}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-gray-300 bg-white/95">
        <input
          type="text"
          value={input}
          placeholder="Écrivez votre question ou votre réponse..."
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          className="flex-1 bg-[#F9FAFB] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleSend}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-semibold"
        >
          Envoyer
        </button>
      </div>
    </div>
  );
});

NovaChatBox.displayName = "NovaChatBox";

/* Typing dots animation */
function TypingDots() {
  const [dots, setDots] = useState(".");
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((p) => (p === "..." ? "." : p + "."));
    }, 400);
    return () => clearInterval(interval);
  }, []);
  return <span className="tracking-widest font-medium">{dots}</span>;
}

/* Fade-in animation */
const style = `
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fadeIn { animation: fadeIn 0.6s ease-out forwards; }
`;
if (typeof document !== "undefined" && !document.getElementById("nova-chat-style")) {
  const styleEl = document.createElement("style");
  styleEl.id = "nova-chat-style";
  styleEl.innerHTML = style;
  document.head.appendChild(styleEl);
}

export default NovaChatBox;