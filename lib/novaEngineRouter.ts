export function buildDecisionPayload(session: any, history: any[], last_answer?: string) {
  const role = session?.role_target ?? "candidate";
  const type = session?.type_entretien ?? "generic";

  const context = `
You are Nova, an AI recruiter.
You are conducting a ${type} interview for a ${role}.
Ask realistic, conversational questions (7–8 seconds long).
Avoid repeating topics already asked.
`;

  const previous = history
    .map((h, i) => `Q${i + 1}: ${h.question_id} → ${h.reponse}`)
    .join("\n");

  return `${context}\nPrevious exchanges:\n${previous}\nCandidate's last answer:\n${last_answer ?? "(none)"}\nNext:`;
}
