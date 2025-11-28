import { z } from "zod";

/** Contrat scénario → orchestrateur */
export const ScenarioSchema = z.object({
  type: z.string(),
  niveau: z.union([z.string(), z.number()]).transform(String),
  lang: z.string().default("fr"),
  duration_target_sec: z.number().int().positive(),
  career_stage: z.string().optional(),
  domain: z.string().optional(),
  goal: z.string().optional(),
});
export type NovaScenario = z.infer<typeof ScenarioSchema>;

/** Historique compacté pour limiter la charge */
export const HistoryItemSchema = z.object({
  action: z.enum(["QUESTION", "RELANCE", "FEEDBACK", "SYNTHESIS"]),
  q_id: z.string().optional(),
  id: z.string().optional(),
  ts: z.number().optional(),
  ans_len_sec: z.number().optional(),
  quality: z.enum(["low", "mid", "high"]).optional(),
});
export type NovaHistoryItem = z.infer<typeof HistoryItemSchema>;

export function sanitizeHistory(
  history: any[],
  maxItems = 30
): NovaHistoryItem[] {
  const parsed = z.array(HistoryItemSchema).safeParse(history ?? []);
  const arr = parsed.success ? parsed.data : [];
  return arr.slice(-maxItems);
}

/** Analyse CV/Offre injectée */
export type NovaAnalysis = {
  experiences?: Array<{
    titre?: string;
    entreprise?: string;
    resultats?: string[];
  }>;
  competences?: string[];
  manques?: string[];
  softskills?: string[];
  [k: string]: any;
};

/** Analyse émotionnelle injectée */
export type NovaEmotionHint = {
  stress?: number;
  confidence?: number;
  eye_contact?: number;
  hesitations?: number;
  tone?: string;
};

/** Charge utile standardisée pour /api/orchestrate → /decision */
export function buildDecisionPayload(params: {
  user_id: string;
  session_id?: string;
  scenario: NovaScenario;
  time_left_sec: number;
  history?: any[];
  available_assets?: {
    q?: string[];
    rel?: string[];
    fb?: string[];
    listen?: string[];
  };
  emotions_hint?: NovaEmotionHint;
  analysis?: NovaAnalysis | null;
}) {
  const scenario = ScenarioSchema.parse(params.scenario);

  // 🔹 Texte contextuel injecté dans le prompt IA
  const promptContext = buildContextPrompt({
    type: scenario.type,
    lang: scenario.lang,
    career_stage: scenario.career_stage,
    domain: scenario.domain,
    goal: scenario.goal,
    analysis: params.analysis,
    emotions_hint: params.emotions_hint,
  });

  return {
    user_id: params.user_id,
    session_id: params.session_id,
    scenario,
    time_left_sec: Math.max(0, Math.floor(params.time_left_sec || 0)),
    history: sanitizeHistory(params.history ?? []),
    available_assets: params.available_assets ?? {},
    emotions_hint: params.emotions_hint ?? {},
    analysis: params.analysis ?? null,
    prompt_context: promptContext, // 🆕 utilisé par l’orchestrateur IA
  };
}

/** 🔹 Construit le contexte IA dynamique selon type d’entretien */
export function buildContextPrompt({
  type,
  lang,
  career_stage,
  domain,
  goal,
  analysis,
  emotions_hint,
}: {
  type: string;
  lang?: string;
  career_stage?: string;
  domain?: string;
  goal?: string;
  analysis?: NovaAnalysis | null;
  emotions_hint?: NovaEmotionHint;
}): string {
  const base = `
You are Nova, an AI recruiter conducting a ${type} interview
with a ${career_stage ?? "candidate"} working in ${domain ?? "their field"}.
The goal of this session is: ${goal ?? "evaluate professional fit"}.
`;

  const tone = `
Answer and react naturally, with empathy and curiosity.
Use short and realistic sentences (6–8 seconds).
Never mention that you are AI. Always stay professional and encouraging.
`;

  const analysisBlock =
    analysis && Object.keys(analysis).length
      ? `
CV / Offer analysis summary:
- Key skills: ${(analysis.competences ?? []).slice(0, 5).join(", ") || "N/A"}
- Missing skills: ${(analysis.manques ?? []).slice(0, 3).join(", ") || "N/A"}
- Notable experiences: ${
          (analysis.experiences ?? [])
            .map((e) => e.titre || e.entreprise)
            .slice(0, 2)
            .join(", ") || "N/A"
        }
`
      : "";

  const emotionBlock =
    emotions_hint && Object.keys(emotions_hint).length
      ? `
Current behavioral indicators:
- Stress: ${Math.round((emotions_hint.stress ?? 0) * 100)}%
- Confidence: ${Math.round((emotions_hint.confidence ?? 0) * 100)}%
- Eye contact: ${Math.round((emotions_hint.eye_contact ?? 0) * 100)}%
Tone of voice: ${emotions_hint.tone ?? "neutral"}
Use this to adapt your approach (encourage if stress is high, challenge if confidence is high).
`
      : "";

  // 💡 Ajustement du type
  let focus = "";
  switch (type) {
    case "job_interview":
      focus = "Focus on past experiences, motivation, and team fit.";
      break;
    case "promotion":
      focus = "Focus on leadership, initiative, and progression.";
      break;
    case "annual_review":
      focus = "Discuss results, feedback, and development goals.";
      break;
    case "goal_setting":
      focus = "Focus on planning, priorities, and alignment with company goals.";
      break;
    case "case_study":
    case "strategic_case":
      focus = "Present analytical or business reasoning challenges.";
      break;
    case "practice":
      focus = "Ask open questions about communication and motivation.";
      break;
    default:
      focus = "Simulate a professional dialogue.";
  }

  return [base, tone, analysisBlock, emotionBlock, focus].join("\n");
}
