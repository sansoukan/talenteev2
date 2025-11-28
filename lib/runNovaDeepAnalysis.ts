// ------------------------------------------------------------
//  Nova Deep Analysis Engine (V3 — English Only, Hard-Lock)
// ------------------------------------------------------------

import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

type Session = any;
type MemoryRow = any;
type EmotionRow = any;

// Small compression helper (reduces latency massively)
function compress(text: string, max = 6000) {
  if (!text) return "";
  if (text.length <= max) return text;
  return text.slice(0, max) + "... [truncated]";
}

export async function runNovaDeepAnalysis({
  session,
  memoryRows,
  emotions,
}: {
  session: Session;
  memoryRows: MemoryRow[];
  emotions: EmotionRow[];
}) {
  const safe = (v: any) => (v == null ? "" : String(v));

  const clarity = session?.clarity_overall ?? 0;
  const structure = session?.structure_overall ?? 0;
  const confidence = session?.confidence_overall ?? 0;

  const stressCurve = emotions.map((e: any) => Number(e.stress) || 0);
  const confidenceCurve = emotions.map((e: any) => Number(e.confidence) || 0);

  const transcript = compress(safe(session?.transcript_full), 7000);
  const memory = compress(JSON.stringify(memoryRows), 7000);

  const messages = [
    {
      role: "system",
      content: `
You are NOVA — a world-class behavioural interview analyst.

CRITICAL RULES:
- YOU MUST RESPOND IN ENGLISH ONLY. NEVER USE FRENCH.
- Output MUST be STRICT valid JSON.
- NO text before or after the JSON.
- NO commentary.
- ALL fields must be present.
- Scores range 0–100.
- Curves range 0–1.

Persona options:
"Analytical", "Storyteller", "Executor", "Leader", "Adaptive"

Return EXACTLY the schema below — nothing else.
      `,
    },
    {
      role: "user",
      content: `
DATASET:

TRANSCRIPT (compressed):
${transcript}

MEMORY (compressed):
${memory}

CLARITY: ${clarity}
STRUCTURE: ${structure}
CONFIDENCE: ${confidence}

STRESS_CURVE: ${JSON.stringify(stressCurve)}
CONFIDENCE_CURVE: ${JSON.stringify(confidenceCurve)}

RETURN THIS JSON STRICTLY:

{
  "persona_type": "",
  "strengths": [],
  "risks": [],
  "stress_curve": [],
  "confidence_curve": [],
  "improved_pitch": {
    "pitch20": "",
    "pitch45": ""
  },
  "micro_habits": [],
  "clarity": 0,
  "depth": 0,
  "alignment": 0,
  "summary": ""
}
      `,
    },
  ];

  const response = await client.chat.completions.create({
    model: "gpt-5.1-mini-json", // ⚡ way faster + perfect for structured outputs
    response_format: { type: "json_object" },
    temperature: 0.15,
    max_tokens: 900,
    messages,
  });

  let json: any = {};
  try {
    json = JSON.parse(response.choices[0].message.content);
  } catch (err) {
    console.error("JSON PARSE ERROR:", err);
    json = {
      persona_type: "Analytical",
      strengths: [],
      risks: [],
      stress_curve: stressCurve,
      confidence_curve: confidenceCurve,
      improved_pitch: { pitch20: "", pitch45: "" },
      micro_habits: [],
      clarity,
      depth: structure,
      alignment: confidence,
      summary: "Analysis unavailable.",
    };
  }

  return json;
}