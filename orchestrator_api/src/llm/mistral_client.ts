export async function proposeActionMistral(_context: any): Promise<null | {
  action: "QUESTION"|"RELANCE"|"FEEDBACK"|"SYNTHESIS";
  id?: string; reason?: string;
}> {
  // Stub migration souveraine (même contrat que Gemini)
  return null;
}
