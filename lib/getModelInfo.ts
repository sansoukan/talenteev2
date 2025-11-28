import OpenAI from "openai";

export async function getModelInfo() {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });

    // 👇 Le modèle configuré dans ton projet (change si besoin)
    const modelName = process.env.OPENAI_MODEL || "gpt-5";

    console.log("🚀 Nova Model Check");
    console.log("   API Key loaded:", process.env.OPENAI_API_KEY ? "✅" : "❌ MISSING");
    console.log("   Model configured:", modelName);

    // 🔎 Test rapide : on demande au modèle de s'identifier
    const completion = await openai.chat.completions.create({
      model: modelName,
      messages: [{ role: "user", content: "Say your model name only." }],
      max_completion_tokens: 20, // GPT-5
    });

    console.log("   Model responded:", completion.model);
    console.log("   Full ID:", completion.id);

    return {
      configured: modelName,
      responded: completion.model,
    };
  } catch (err: any) {
    console.error("❌ Error checking model:", err.message);
    return { error: err.message };
  }
}
