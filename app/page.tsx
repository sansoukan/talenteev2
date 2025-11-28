"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { getClientUser } from "@/lib/auth"
import {
  Sparkles,
  Video,
  TrendingUp,
  FileQuestion,
  MessageSquareDashed,
  Timer,
  MessageSquareOff,
  Target,
  Zap,
} from "lucide-react"

/* -----------------------------------------------------
    AUTH POPUP
  ------------------------------------------------------ */
function AuthPopup({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-xl grid place-items-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", duration: 0.4, bounce: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-950/90 backdrop-blur-2xl rounded-3xl p-10 w-full max-w-md border border-white/5"
      >
        <h3 className="text-3xl font-semibold text-white mb-4 tracking-tight">Sign in required</h3>

        <p className="text-zinc-400 mb-8 text-[17px] leading-relaxed font-light">
          Please sign in or create an account to launch your simulation. Your progress will be saved automatically.
        </p>

        <a
          href="/auth"
          className="block text-center py-4 px-8 rounded-full bg-white hover:bg-zinc-100 text-black font-medium text-[17px] transition-all duration-200 mb-4"
        >
          Continue
        </a>

        <div className="text-center">
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 text-[15px] transition-colors duration-200"
          >
            Not now
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* -----------------------------------------------------
    LANDING PAGE
  ------------------------------------------------------ */
export default function LandingPage() {
  const router = useRouter()
  const [showAuth, setShowAuth] = useState(false)

  async function handleStart() {
    const user = await getClientUser()
    if (!user) {
      setShowAuth(true)
      return
    }
    router.push("/dashboard")
  }

  return (
    <main className="min-h-screen bg-black text-white overflow-hidden relative">
      {/* BACKGROUND */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/10 via-black to-black" />

      {/* HEADER */}
      <header className="relative z-20 px-6 sm:px-8 lg:px-16 pt-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-[1400px] mx-auto"
        >
          <img
            src="https://qpnalviccuopdwfscoli.supabase.co/storage/v1/object/public/nova-assets/talentee_logo_static.svg"
            alt="Nova RH"
            className="h-10"
          />
        </motion.div>
      </header>

      {/* HERO */}
      <div className="relative z-10">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-16 pt-20 pb-32 grid lg:grid-cols-2 gap-20 items-center">
          {/* LEFT CONTENT */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-12"
          >
            <h1 className="text-6xl sm:text-7xl lg:text-[80px] font-semibold leading-[1.05] tracking-[-0.025em]">
              <span className="block text-white">Train for the</span>
              <span className="block bg-gradient-to-r from-blue-400 to-violet-500 bg-clip-text text-transparent">
                questions
              </span>
              <span className="block text-white">you're most</span>
              <span className="block text-white">likely to face.</span>
            </h1>

            <p className="text-xl sm:text-2xl text-zinc-400 leading-relaxed font-light max-w-[600px] tracking-[-0.01em]">
              Nova analyzes your role, predicts what recruiters will ask, and prepares you on the exact points that
              matter — including how to answer them with confidence.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleStart}
                className="px-9 py-[18px] bg-white text-black rounded-full font-medium text-[17px] transition-all shadow-[0_0_25px_rgba(255,255,255,0.15)] hover:shadow-[0_0_40px_rgba(255,255,255,0.3)]"
              >
                Start training
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-9 py-[18px] border border-white/20 rounded-full text-white font-medium text-[17px] hover:bg-white/5 transition-all"
                onClick={() => document.getElementById("learn-more")?.scrollIntoView({ behavior: "smooth" })}
              >
                Learn more
              </motion.button>
            </div>
          </motion.div>

          {/* VIDEO */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.15 }}
            className="relative w-full"
          >
            <video
              src="https://qpnalviccuopdwfscoli.supabase.co/storage/v1/object/public/videos/welcom.mp4"
              poster="https://qpnalviccuopdwfscoli.supabase.co/storage/v1/object/public/public-assets/17608929945463sl9bxar.png"
              controls
              playsInline
              className="w-full aspect-video rounded-[28px] object-cover shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
            />
          </motion.div>
        </div>
      </div>

      {/* -----------------------------------------------------
            LOGOS CAROUSEL PREMIUM
        ------------------------------------------------------ */}
      <section className="relative py-24 px-6 w-full max-w-7xl mx-auto overflow-hidden">
        <p className="text-zinc-500 text-sm text-center mb-12 tracking-wide">
          Candidates train for interviews at companies like
        </p>

        {/* LEFT GRADIENT */}
        <div className="absolute left-0 top-0 h-full w-32 bg-gradient-to-r from-black via-black/50 to-transparent pointer-events-none z-20"></div>

        {/* RIGHT GRADIENT */}
        <div className="absolute right-0 top-0 h-full w-32 bg-gradient-to-l from-black via-black/50 to-transparent pointer-events-none z-20"></div>

        <div className="flex flex-nowrap gap-20 items-center animate-logoScroll hover:[animation-play-state:paused] select-none">
          {[
            "google-1-1.svg",
            "meta-3.svg",
            "tesla-motors.svg",
            "deloiteblanc.png",
            "PWC-Logo-PNG.png",
            "mckinzeywhite.png",
            "bcg-3.svg",
          ].map((logo, i) => (
            <img
              key={i}
              draggable={false}
              src={`https://qpnalviccuopdwfscoli.supabase.co/storage/v1/object/public/public-assets/logos/${logo}`}
              className="h-10 opacity-80 hover:opacity-100 transition duration-300"
            />
          ))}

          {/* COPY LOOP */}
          {[
            "google-1-1.svg",
            "meta-3.svg",
            "tesla-motors.svg",
            "deloiteblanc.png",
            "PWC-Logo-PNG.png",
            "mckinzeywhite.png",
            "bcg-3.svg",
          ].map((logo, i) => (
            <img
              key={`loop-${i}`}
              draggable={false}
              src={`https://qpnalviccuopdwfscoli.supabase.co/storage/v1/object/public/public-assets/logos/${logo}`}
              className="h-10 opacity-80 hover:opacity-100 transition duration-300"
            />
          ))}
        </div>
      </section>

      {/* -----------------------------------------------------
            HOW NOVA PREPARES YOU
        ------------------------------------------------------ */}
      <section className="pt-32 pb-20 px-8 max-w-7xl mx-auto text-center">
        <h2 className="text-5xl font-semibold tracking-tight mb-10">How Nova prepares you</h2>

        <p className="text-zinc-400 text-xl max-w-4xl mx-auto leading-relaxed font-light mb-20">
          Nova predicts, simulates, and improves your interview performance — focusing only on what actually matters for
          your next role.
        </p>

        <div className="grid sm:grid-cols-3 gap-8">
          {[
            {
              icon: Sparkles,
              title: "Identify what truly matters",
              desc: "Nova analyses your role, seniority and domain to surface the questions real recruiters prioritize — not generic lists.",
            },
            {
              icon: Video,
              title: "Train under real interview conditions",
              desc: "A video-based engine that reacts to your tone, structure, pace and reasoning — just like a seasoned recruiter.",
            },
            {
              icon: TrendingUp,
              title: "Strengthen your thinking, step by step",
              desc: "Nova highlights what you do well, pinpoints blind spots, and guides you toward sharper, more structured answers.",
            },
          ].map((item, i) => (
            <div
              key={i}
              className="group relative bg-zinc-900/30 border border-white/5 rounded-[32px] p-10 transition-all duration-500 hover:bg-zinc-900/60 hover:border-blue-500/20 hover:shadow-[0_0_50px_-10px_rgba(59,130,246,0.15)] hover:-translate-y-1 overflow-hidden"
            >
              {/* Hover Gradient Blob */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative z-10 space-y-6">
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-2xl flex items-center justify-center border border-white/10 group-hover:border-blue-500/30 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all duration-500">
                  <item.icon
                    className="w-10 h-10 text-white group-hover:text-blue-400 transition-colors duration-500"
                    strokeWidth={1.5}
                  />
                </div>
                <h3 className="text-2xl font-semibold tracking-tight group-hover:text-blue-100 transition-colors">
                  {item.title}
                </h3>
                <p className="text-zinc-400 text-[16px] leading-relaxed group-hover:text-zinc-300 transition-colors">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* -----------------------------------------------------
            PAIN POINTS SECTION
        ------------------------------------------------------ */}
      <section className="pt-32 pb-36 px-8 max-w-6xl mx-auto text-center" id="learn-more">
        <h2 className="text-5xl font-semibold tracking-tight mb-24">If this sounds like you…</h2>

        <div className="grid sm:grid-cols-2 gap-x-12 gap-y-16 max-w-5xl mx-auto text-left">
          {[
            {
              icon: FileQuestion,
              title: "You’re unsure what will truly be evaluated",
              desc: "Job boards list hundreds of questions — but none explain which ones matter for your role, level, or context.",
            },
            {
              icon: MessageSquareDashed,
              title: "Your answers feel scattered or too long",
              desc: "You know what you want to say, but everything comes out messy.",
            },
            {
              icon: Timer,
              title: "You lose clarity when the pressure rises",
              desc: "Silence, timing, stress — your mind speeds up, your message slows down, and the value of your answer gets diluted.",
            },
            {
              icon: MessageSquareOff,
              title: "You never receive rigorous, actionable feedback",
              desc: "People say you’re ‘good’, but no one tells you why, what to strengthen, or how your answers land from a recruiter’s lens.",
            },
          ].map((item, i) => (
            <div
              key={i}
              className="group flex gap-8 p-6 -m-6 rounded-3xl hover:bg-white/5 transition-colors duration-300"
            >
              <div className="shrink-0 w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center border border-white/10 group-hover:border-white/20 group-hover:bg-zinc-800 transition-all duration-300 shadow-sm">
                <item.icon
                  className="w-7 h-7 text-zinc-400 group-hover:text-white transition-colors"
                  strokeWidth={1.5}
                />
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-semibold text-zinc-200 group-hover:text-white transition-colors">
                  {item.title}
                </h3>
                <p className="text-zinc-400 leading-relaxed text-lg group-hover:text-zinc-300 transition-colors">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* -----------------------------------------------------
            HOW NOVA FIXES THIS
        ------------------------------------------------------ */}
      <section className="pt-16 pb-32 px-8 max-w-6xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-5xl font-semibold tracking-tight mb-6">
            Nova fixes all of this — <span className="text-blue-500">instantly.</span>
          </h2>
        </div>

        <div className="grid sm:grid-cols-3 gap-8">
          {[
            {
              icon: Target,
              title: "Get the questions that actually matter",
              desc: "Each question is selected using your domain, seniority and role dynamics — no randomness, no noise.",
            },
            {
              icon: Video,
              title: "Experience a realistic, recruiter-grade simulation",
              desc: "Video-based, dynamic, and adaptive",
            },
            {
              icon: Zap,
              title: "Receive feedback you can immediately use",
              desc: "Clear, structured and practical insights — the type of feedback managers and recruiters give behind closed doors.",
            },
          ].map((item, i) => (
            <div
              key={i}
              className="relative bg-zinc-900/40 border border-blue-500/10 rounded-[32px] p-8 text-center hover:bg-zinc-900/60 transition-all duration-500 group overflow-hidden"
            >
              <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative z-10 space-y-5">
                <div className="w-20 h-20 mx-auto bg-gradient-to-b from-blue-500/10 to-transparent rounded-2xl flex items-center justify-center border border-blue-500/20 mb-2 shadow-[0_0_30px_-5px_rgba(59,130,246,0.2)] group-hover:scale-110 transition-transform duration-500">
                  <item.icon className="w-9 h-9 text-blue-400" strokeWidth={1.5} />
                </div>
                <h3 className="text-2xl font-semibold text-white">{item.title}</h3>
                <p className="text-zinc-400 text-[17px] leading-relaxed px-4">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <AuthPopup open={showAuth} onClose={() => setShowAuth(false)} />
    </main>
  )
}
