import { FastifyInstance } from "fastify";
import { DecisionRequestSchema, DecisionResponseSchema } from "../dto/contracts.js";
import { perAnswerMaxSeconds, shouldPremiumGate, shouldSynthesize } from "../logic/timekeeper.js";
import { getRecentlyAskedQuestionIds } from "../logic/memory_guard.js";
import { pickNextQuestion } from "../logic/selector.js";
import { getReadyAssetUrlByRef } from "../repo/assets.js";
import { proposeActionLLM } from "../llm/gemini_client.js";

export default async function decisionRoute(app: FastifyInstance) {
  app.post("/decision", async (req, reply) => {
    const parsed = DecisionRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_request", details: parsed.error.flatten() });
    }
    const body = parsed.data;

    const tk = {
      target: body.scenario.duration_target_sec,
      left: body.time_left_sec,
      niveau: body.scenario.niveau
    };

    if (shouldPremiumGate(tk)) {
      const res = DecisionResponseSchema.parse({
        action: "SYNTHESIS", id: "premium_gate", premium_gate: true, fallback: false, reason: "freemium_limit_reached"
      });
      return reply.send(res);
    }

    if (shouldSynthesize(tk)) {
      const res = DecisionResponseSchema.parse({
        action: "SYNTHESIS", id: "final_synthesis", premium_gate: false, fallback: false, reason: "time_low"
      });
      return reply.send(res);
    }

    const llm = await proposeActionLLM(body);
    if (llm && llm.action !== "QUESTION") {
      const res = DecisionResponseSchema.parse({
        action: llm.action, id: llm.id ?? "generic", premium_gate: false, fallback: false, reason: llm.reason ?? "llm"
      });
      return reply.send(res);
    }

    const exclude = await getRecentlyAskedQuestionIds(body.user_id, body.session_id);
    const q = await pickNextQuestion({
      user_id: body.user_id, niveau: body.scenario.niveau, scenarioType: body.scenario.type, lang: body.scenario.lang, excludeIds: exclude
    });

    if (!q) {
      const res = DecisionResponseSchema.parse({
        action: "RELANCE", id: "rel_generic_please_continue", premium_gate: false, fallback: true, reason: "no_question_available"
      });
      return reply.send(res);
    }

    const assetUrl = await getReadyAssetUrlByRef(q.id, body.scenario.lang, "question");
    if (!assetUrl) {
      const res = DecisionResponseSchema.parse({
        action: "RELANCE", id: "rel_asset_missing", premium_gate: false, fallback: true, reason: "question_asset_missing"
      });
      return reply.send(res);
    }

    const res = DecisionResponseSchema.parse({
      action: "QUESTION", id: q.id, premium_gate: false, fallback: false, reason: "ok_next_question"
    });

    reply.header("x-nova-max-answer-sec", String(perAnswerMaxSeconds(body.scenario.niveau)));
    return reply.send(res);
  });
}
