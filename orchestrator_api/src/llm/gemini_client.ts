export async function proposeActionLLM(_context: any): Promise<null | {
  action: "QUESTION"|"RELANCE"|"FEEDBACK"|"SYNTHESIS";
  id?: string; reason?: string;
}> {
  // Brancher Vertex AI (Gemini) ici si besoin → retour null = fallback règles locales
  return null;
}
