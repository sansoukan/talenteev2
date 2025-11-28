import { z } from "zod";

export const ScenarioSchema = z.object({
  type: z.string(),
  niveau: z.union([z.string(), z.number()]).transform(String),
  lang: z.string().default("fr"),
  duration_target_sec: z.number().int().positive()
});

export const HistoryItemSchema = z.object({
  q_id: z.string().optional(),
  ans_len_sec: z.number().optional(),
  quality: z.enum(["low","mid","high"]).optional(),
  action: z.enum(["QUESTION","RELANCE","FEEDBACK","SYNTHESIS"]).optional()
});

export const DecisionRequestSchema = z.object({
  user_id: z.string(),
  session_id: z.string().optional(),
  scenario: ScenarioSchema,
  time_left_sec: z.number().int().nonnegative(),
  history: z.array(HistoryItemSchema).default([]),
  cv_profile: z.any().optional(),
  available_assets: z.object({
    q: z.array(z.string()).optional(),
    rel: z.array(z.string()).optional(),
    fb: z.array(z.string()).optional(),
    listen: z.array(z.string()).optional()
  }).default({}),
  emotions_hint: z.object({
    avg_hesitations: z.number().optional(),
    eye_contact: z.number().min(0).max(1).optional()
  }).optional()
});

export type DecisionRequest = z.infer<typeof DecisionRequestSchema>;

export const DecisionResponseSchema = z.object({
  action: z.enum(["QUESTION","RELANCE","FEEDBACK","SYNTHESIS"]),
  id: z.string(),
  fallback: z.boolean().default(false),
  reason: z.string().optional(),
  premium_gate: z.boolean().default(false)
});

export type DecisionResponse = z.infer<typeof DecisionResponseSchema>;
