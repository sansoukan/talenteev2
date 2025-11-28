/**
 * ======================================================
 *  🔵 Nova RH – captureAndAnalyze() — Version V5
 * ------------------------------------------------------
 *  Capture 1 frame webcam / 4s
 *  → Analyse faciale & posture (DeepFace)
 *  → Analyse comportementale (anti-gpt)
 *  → Poussée dans nova_emotions (snapshot complet)
 *  → Compatible NovaEngine, PDF V5, Report V5
 * ======================================================
 */

let isAnalyzing = false;
let lastFrameTime = 0;

export async function captureAndAnalyze(
  videoElement: HTMLVideoElement,
  sessionId: string,
  userId?: string,
  lastTranscript?: string
) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = 224;
  canvas.height = 224;

  if (!videoElement) {
    console.warn("🎥 captureAndAnalyze: video element not ready");
    return;
  }

  async function analyzeFrame() {
    const now = Date.now();
    if (isAnalyzing || now - lastFrameTime < 4000) return; // 1 frame / 4s
    lastFrameTime = now;
    isAnalyzing = true;

    try {
      if (!ctx) return;
      ctx.drawImage(videoElement, 0, 0, 224, 224);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.8)
      );
      if (!blob) return;

      /* ------------------------------------------------------
       * 1️⃣ Analyse DeepFace + Posture → /api/analyze-face
       * ------------------------------------------------------ */
      const formData = new FormData();
      formData.append("file", blob);
      formData.append("session_id", sessionId);
      if (userId) formData.append("user_id", userId);

      const res = await fetch("/api/analyze-face", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error(await res.text());
      const jsonFace = await res.json();
      const result = jsonFace?.result;

      if (!result) return;

      console.log(
        `🧠 NovaFace: ${result.emotion} (${Math.round(
          result.confidence * 100
        )}%), posture ${result.posture_score}, gaze ${result.gaze_direction}`
      );

      /* ------------------------------------------------------
       * 2️⃣ Analyse anti-GPT (authenticité, engagement)
       * ------------------------------------------------------ */
      const emotionsPayload = {
        tone: result.emotion,
        eye_contact: result.eye_contact ?? 0,
        posture_score: result.posture_score ?? 0,
        hesitations: result.hesitations ?? 0,
        words_per_min: result.words_per_min ?? 0,
        gaze_direction: result.gaze_direction ?? "center",
        gaze_stability: result.gaze_stability ?? 0,
        expressions: result.expressions ?? null,
      };

      let jsonAntiGpt: any = null;

      try {
        const gptRes = await fetch("/api/anti-gpt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
            user_id: userId,
            text: lastTranscript ?? "",
            emotions: emotionsPayload,
          }),
        });

        if (gptRes.ok) {
          jsonAntiGpt = await gptRes.json();
          console.log(
            `🤖 Authenticité ${jsonAntiGpt?.authenticity_score}, Engagement ${jsonAntiGpt?.engagement_score}`
          );
        } else {
          console.warn("⚠️ Anti-GPT call failed:", await gptRes.text());
        }
      } catch (err) {
        console.warn("⚠️ anti-gpt error:", err);
      }

      /* ------------------------------------------------------
       * 3️⃣ PUSH dans nova_emotions (snapshot complet)
       * ------------------------------------------------------ */
      try {
        await fetch("/api/emotions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            session_id: sessionId,
            question_id: null,               // pas lié à une question
            source: "analyzer",

            // DeepFace
            stress: result.stress ?? null,
            confidence: result.confidence ?? null,
            eye_contact: result.eye_contact ?? 0,
            posture_score: result.posture_score ?? 0,
            hesitations: result.hesitations ?? 0,
            words_per_min: result.words_per_min ?? 0,
            gaze_stability: result.gaze_stability ?? 0,
            posture: result.posture_label ?? "unknown",
            gaze_direction: result.gaze_direction ?? "center",

            // Anti-GPT enrichi
            authenticity_score: jsonAntiGpt?.authenticity_score ?? null,
            engagement_score: jsonAntiGpt?.engagement_score ?? null,

            // Expressions faciales
            expressions: result.expressions ?? null,

            // Bloc brut
            raw_data: {
              ...result,
              anti_gpt: jsonAntiGpt ?? null,
            },
          }),
        });
      } catch (err) {
        console.warn("⚠️ Failed to push emotions to nova_emotions:", err);
      }
    } catch (e) {
      console.error("❌ captureAndAnalyze error:", e);
    } finally {
      isAnalyzing = false;
    }
  }

  /* ------------------------------------------------------
   * 🔁 Boucle continue
   * ------------------------------------------------------ */
  const loop = () => {
    if (videoElement.readyState >= 2 && videoElement.srcObject) {
      analyzeFrame();
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  /* ------------------------------------------------------
   * 🧹 Cleanup caméra
   * ------------------------------------------------------ */
  const observer = new MutationObserver(() => {
    if (!videoElement.srcObject) {
      observer.disconnect();
      console.log("🧹 Facial analysis stopped (camera stream closed)");
    }
  });
  observer.observe(videoElement, {
    attributes: true,
    attributeFilter: ["srcObject"],
  });

  console.log("🎬 Facial + Authenticity analysis started for session:", sessionId);
}
