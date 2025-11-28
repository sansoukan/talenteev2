import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Nova RH – Analyse Faciale Sécurisée (V4)
 * ----------------------------------------
 * - Vérifie le type et la taille du fichier
 * - Sauvegarde temporaire dans /tmp
 * - Lance /python/analyze_face_emotion.py (DeepFace + posture + regard)
 * - Supprime le fichier même en cas d’erreur
 * - Enregistre les scores dans Supabase
 * - Chaîne vers /api/anti-gpt pour l’analyse multimodale (authenticité IA)
 * - RGPD-safe : aucune image conservée
 */

export async function POST(req: Request) {
  const start = Date.now();
  let tempPath: string | null = null;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const sessionId = formData.get("session_id") as string | null;
    const userId = formData.get("user_id") as string | null;

    // 🧩 Validation basique
    if (!file) throw new Error("❌ No file received");
    if (!sessionId) throw new Error("❌ Missing session_id");

    // 🧱 Vérification de sécurité
    if (!file.type.startsWith("image/"))
      throw new Error("❌ Invalid file type (not an image)");
    if (file.size > 2_000_000)
      throw new Error("❌ File too large (>2 MB)");

    // 1️⃣ Écriture temporaire du fichier
    const buffer = Buffer.from(await file.arrayBuffer());
    const uniqueId = `${Date.now()}_${Math.floor(Math.random() * 9999)}`;
    tempPath = path.join("/tmp", `nova_face_${uniqueId}.jpg`);
    fs.writeFileSync(tempPath, buffer);
    console.log(`📸 Frame saved temporarily: ${tempPath}`);

    // 2️⃣ Exécution du script Python
    const python = spawn("python3", [
      path.join(process.cwd(), "python/analyze_face_emotion.py"),
      tempPath,
      sessionId,
    ]);

    let stdout = "";
    let stderr = "";

    python.stdout.on("data", (d) => (stdout += d.toString()));
    python.stderr.on("data", (d) => (stderr += d.toString()));

    const exitCode: number = await new Promise((resolve) => {
      python.on("close", resolve);
    });

    // 🔥 Suppression sécurisée même si le script échoue
    try {
      if (tempPath && fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
        console.log(`🧹 Deleted temp file: ${tempPath}`);
      }
    } catch (e) {
      console.warn("⚠️ Failed to delete temp file:", e);
    }

    if (exitCode !== 0) {
      console.error("❌ Python error:", stderr);
      throw new Error("Python execution failed");
    }

    // 3️⃣ Parsing du résultat DeepFace
    let result: any = {};
    try {
      result = JSON.parse(stdout || "{}");
    } catch {
      throw new Error("❌ Invalid JSON output from Python");
    }

    if (!result?.emotion) throw new Error("❌ Missing emotion data in result");

    // 4️⃣ Enregistrement dans Supabase
    const {
      emotion,
      confidence,
      posture_score,
      gaze_direction,
      eye_contact,
      gaze_stability,
    } = result;

    const stress =
      emotion === "angry" || emotion === "fear" || emotion === "disgust"
        ? Math.min(1, (1 - (confidence ?? 0)) * 1.2)
        : Math.max(0, 0.5 - (confidence ?? 0) / 2);

    await supabaseAdmin.from("nova_emotions").insert({
      session_id: sessionId,
      user_id: userId ?? null,
      source: "facial",
      tone: emotion,
      confidence,
      posture_score,
      gaze_direction,
      eye_contact,
      gaze_stability,
      stress,
      expressions: result?.emotion_scores ?? null,
      raw_data: result ?? null,
      created_at: new Date().toISOString(),
    });

    console.log(
      `🧠 DeepFace → ${emotion} (${Math.round(confidence * 100)}%), posture ${posture_score}`
    );

    // 5️⃣ Appel asynchrone vers /api/anti-gpt (analyse multimodale)
    (async () => {
      try {
        const baseUrl =
          process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
        const gptResponse = await fetch(`${baseUrl}/api/anti-gpt`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
            user_id: userId,
            text: "", // à remplacer par le transcript audio si disponible
            emotions: result,
          }),
        });

        if (gptResponse.ok) {
          const gptJson = await gptResponse.json();
          console.log(
            `🤖 Anti-GPT → Authenticité ${gptJson.authenticity_score}% | Engagement ${gptJson.engagement_score}%`
          );
        } else {
          console.warn("⚠️ Anti-GPT HTTP error:", await gptResponse.text());
        }
      } catch (e) {
        console.warn("⚠️ Anti-GPT unreachable:", e);
      }
    })();

    // 6️⃣ Réponse front
    const duration = ((Date.now() - start) / 1000).toFixed(2);
    return NextResponse.json({
      ok: true,
      result,
      duration,
      message: "✅ Facial analysis completed successfully",
    });
  } catch (err: any) {
    // 🔥 Nettoyage même en cas d’erreur
    try {
      if (tempPath && fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
        console.log(`🧹 Deleted temp file (error case): ${tempPath}`);
      }
    } catch {}

    console.error("❌ Face analysis API error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}