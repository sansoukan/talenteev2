"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/src/lib/supabaseClient"

type Row = { question_id: string | null }
type Q = {
  id: string
  question_fr?: string | null
  question_en?: string | null
  expected_structure?: string | null
}

function buildTemplate(expected?: string | null) {
  if (!expected) return "• Contexte\n• Action\n• Résultat"
  const e = expected.toLowerCase()
  if (e.includes("star")) return "STAR → Situation • Tâche • Actions • Résultats"
  if (e.includes("mece")) return "MECE → 3 axes exclusifs et exhaustifs (1–2 phrases chacun)"
  if (e.includes("3 points") || e.includes("trois points")) return "• Point 1\n• Point 2\n• Point 3"
  return expected
}

export default function SuggestedAnswers({
  sessionId,
  lang = "fr",
}: {
  sessionId: string
  lang?: string
}) {
  const [qIds, setQIds] = useState<string[]>([])
  const [qs, setQs] = useState<Q[]>([])
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) return // ✅ skip si vide
    ;(async () => {
      setErr(null)
      try {
        const { data, error } = await supabase.from("nova_memory").select("question_id").eq("session_id", sessionId)
        if (error) throw error
        const ids = Array.from(new Set((data ?? []).map((r: Row) => r.question_id).filter(Boolean))) as string[]
        setQIds(ids)

        if (ids.length) {
          const { data: qsData, error: qErr } = await supabase
            .from("nova_questions")
            .select("id,question_fr,question_en,expected_structure")
            .in("id", ids)
          if (qErr) throw qErr
          setQs((qsData ?? []) as Q[])
        } else {
          setQs([])
        }
      } catch (e: any) {
        setErr(e?.message ?? "Erreur récupération questions")
      }
    })()
  }, [sessionId])

  const list = useMemo(() => {
    const map = new Map(qs.map((q) => [q.id, q]))
    return qIds.map((id) => map.get(id)).filter(Boolean) as Q[]
  }, [qIds, qs])

  function pickLang(q: Q) {
    switch (lang) {
      case "en":
        return q.question_en ?? q.question_fr
      default:
        return q.question_fr
    }
  }

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

      {list.length === 0 ? (
        <div style={{ opacity: 0.7 }}>Aucune question trouvée pour suggérer une réponse.</div>
      ) : (
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {list.map((q) => (
            <li key={q.id} style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>📌 {pickLang(q) ?? q.id}</div>
              <div
                style={{
                  fontSize: 12,
                  opacity: 0.8,
                  marginBottom: 4,
                  color: "var(--text-muted)",
                }}
              >
                Template recommandé :
              </div>
              <pre
                style={{
                  background: "rgba(22,119,255,0.1)",
                  border: "1px solid var(--border)",
                  padding: 10,
                  borderRadius: 6,
                  fontSize: "0.9rem",
                  lineHeight: 1.4,
                  color: "var(--text)",
                  whiteSpace: "pre-wrap",
                }}
              >
                {buildTemplate(q.expected_structure)}
              </pre>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
