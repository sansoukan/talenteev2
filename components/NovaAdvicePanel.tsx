"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/src/lib/supabaseClient"

type Emo = {
  hesitations: number | null
  words_per_min?: number | null
  eye_contact?: number | null
  tone?: string | null
}

export default function NovaAdvicePanel({
  sessionId,
  lang = "fr",
}: {
  sessionId: string
  lang?: "fr" | "en"
}) {
  const [emos, setEmos] = useState<Emo[]>([])
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) return // ✅ skip si vide
    ;(async () => {
      setErr(null)
      try {
        const { data, error } = await supabase
          .from("nova_emotions")
          .select("hesitations, words_per_min, eye_contact, tone")
          .eq("session_id", sessionId)
        if (error) throw error
        setEmos((data ?? []) as Emo[])
      } catch (e: any) {
        setErr(e?.message ?? "Erreur récupération émotions")
      }
    })()
  }, [sessionId])

  const tips = useMemo(() => {
    const avg = (arr: (number | null | undefined)[]) => {
      const v = arr.filter((x): x is number => typeof x === "number")
      return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
    }

    if (!emos.length) {
      return lang === "en"
        ? [
            "Not enough data to generate detailed advice.",
            "Structure your answers in 3 steps: Context → Action → Result.",
            "Support your points with a concrete example.",
          ]
        : [
            "Pas assez de données pour générer des conseils détaillés.",
            "Structurez vos réponses en 3 points : Contexte → Action → Résultat.",
            "Appuyez vos propos par un exemple concret.",
          ]
    }

    const avgHes = avg(emos.map((e) => e.hesitations))
    const avgWpm = avg(emos.map((e) => e.words_per_min))
    const avgEye = avg(emos.map((e) => e.eye_contact))

    const t: string[] = []

    if (lang === "en") {
      if (avgHes !== null && avgHes > 4) t.push("Reduce hesitations by noting 2–3 keywords before answering.")
      if (avgWpm !== null && (avgWpm < 80 || avgWpm > 150))
        t.push("Adjust your speaking rate: aim for ~110 words/min for clarity.")
      if (avgEye !== null && avgEye < 0.5) t.push("Improve eye contact with the camera to reinforce credibility.")
      t.push("Structure your answers with the STAR method: Situation → Task → Action → Result.")
      t.push("Back up your points with a measurable result (%, time saved, cost reduced).")
    } else {
      if (avgHes !== null && avgHes > 4) t.push("Réduisez vos hésitations en notant 2–3 mots-clés avant de répondre.")
      if (avgWpm !== null && (avgWpm < 80 || avgWpm > 150))
        t.push("Adaptez votre débit : visez ~110 mots/min pour plus de clarté.")
      if (avgEye !== null && avgEye < 0.5) t.push("Améliorez le contact caméra pour renforcer votre impact.")
      t.push("Structurez vos réponses avec la méthode STAR : Situation → Tâche → Actions → Résultats.")
      t.push("Appuyez vos propos par un exemple chiffré (gain %, temps, coût).")
    }

    return t.slice(0, 5)
  }, [emos, lang])

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: 14,
        background: "var(--bg-card)",
        color: "var(--text)",
      }}
    >
      {err && <div style={{ color: "var(--danger)", marginBottom: 8 }}>⚠️ {err}</div>}
      <div
        style={{
          fontWeight: 700,
          color: "var(--primary)",
          marginBottom: 8,
        }}
      >
        💡 {lang === "en" ? "Advice for improvement" : "Conseils de progression"}
      </div>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {tips.map((x, i) => (
          <li key={i} style={{ marginBottom: 4 }}>
            {x}
          </li>
        ))}
      </ul>
    </div>
  )
}
