"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/src/lib/supabaseClient"

type Row = {
  id: string
  question_id: string | null
  reponse: string | null
  feedback: string | null
  score: number | null
  created_at: string
}
type Q = {
  id: string
  question_en?: string | null
  expected_structure?: string | null
}

export default function QAHistory({ sessionId }: { sessionId: string }) {
  const [rows, setRows] = useState<Row[]>([])
  const [qsMap, setQsMap] = useState<Record<string, Q>>({})
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) return
    ;(async () => {
      setErr(null)
      try {
        // Fetch memory rows
        const { data, error } = await supabase
          .from("nova_memory")
          .select("id,question_id,reponse,feedback,score,created_at")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: true })
        if (error) throw error
        setRows((data ?? []) as Row[])

        // Fetch related questions in English
        const ids = Array.from(new Set((data ?? []).map((r: any) => r.question_id).filter(Boolean)))
        if (ids.length) {
          const { data: qs, error: qErr } = await supabase
            .from("nova_questions")
            .select("id,question_en,expected_structure")
            .in("id", ids)
          if (qErr) throw qErr
          const map: Record<string, Q> = {}
          ;(qs ?? []).forEach((q: any) => (map[q.id] = q))
          setQsMap(map)
        } else {
          setQsMap({})
        }
      } catch (e: any) {
        setErr(e?.message ?? "Error loading history")
      }
    })()
  }, [sessionId])

  const items = useMemo(
    () =>
      rows.map((r) => ({
        ...r,
        q: r.question_id ? qsMap[r.question_id] : undefined,
      })),
    [rows, qsMap],
  )

  function scoreColor(s: number) {
    if (s >= 0.75) return { color: "var(--success)", label: "Good" }
    if (s >= 0.5) return { color: "#f90", label: "Average" }
    return { color: "var(--danger)", label: "Low" }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {err && <div style={{ color: "var(--danger)" }}>⚠️ {err}</div>}
      {items.length === 0 ? (
        <div style={{ opacity: 0.7 }}>No Q/A recorded for this session.</div>
      ) : (
        <ol style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
          {items.map((it, idx) => (
            <li
              key={it.id}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: 12,
                background: "var(--bg-card)",
                color: "var(--text)",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  marginBottom: 4,
                }}
              >
                {new Date(it.created_at).toLocaleString()}
              </div>

              <div>
                <strong>❓ Q{idx + 1}:</strong> {it.q ? it.q.question_en : (it.question_id ?? "—")}
              </div>

              {it.reponse && (
                <div style={{ marginTop: 4 }}>
                  <strong>🧑 Answer:</strong> <span style={{ whiteSpace: "pre-wrap" }}>{it.reponse}</span>
                </div>
              )}

              {it.feedback && (
                <div style={{ marginTop: 4, color: "var(--text-muted)" }}>
                  <strong>🤖 Feedback:</strong> {it.feedback}
                </div>
              )}

              {typeof it.score === "number" && (
                <div style={{ marginTop: 8 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      color: scoreColor(it.score).color,
                      marginBottom: 4,
                    }}
                  >
                    <strong>📊 Score:</strong> {it.score.toFixed(2)} ({scoreColor(it.score).label})
                  </div>
                  <div
                    style={{
                      height: 8,
                      borderRadius: 4,
                      background: "var(--border)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.round(it.score * 100)}%`,
                        background: scoreColor(it.score).color,
                        height: "100%",
                      }}
                    />
                  </div>
                </div>
              )}

              {it.q?.expected_structure && (
                <div
                  style={{
                    fontSize: 12,
                    opacity: 0.8,
                    marginTop: 6,
                    color: "var(--text-muted)",
                  }}
                >
                  <em>✅ Ideal Answer Structure:</em> {it.q.expected_structure}
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
