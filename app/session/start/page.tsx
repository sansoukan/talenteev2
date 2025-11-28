"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "react-hot-toast";
import NovaToast from "@/components/NovaToast";

/* ======================================================
   🌍 LANGUES SUPPORTEES
====================================================== */
const SUPPORTED_LANGS = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "it", label: "Italiano" },
  { code: "de", label: "Deutsch" },
  { code: "zh", label: "中文" },
  { code: "ko", label: "한국어" },
];

const PRICES = {
  job_interview: 3.99,
  strategic_case: 6.99,
  annual_review: 3.99,
};

const DURATIONS = {
  long: 1200, // 20 min
  medium: 900, // 15 min
};

export default function SessionStartPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [offerText, setOfferText] = useState("");
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [chosenLang, setChosenLang] = useState<string>("en");

  const router = useRouter();
  const sp = useSearchParams();
  const isTrial = sp.get("trial") === "true";

  /* ======================================================
     AUTH + PROFIL
  ====================================================== */
  useEffect(() => {
    (async () => {
      toast.dismiss();
      const { data: auth, error: authError } = await supabase.auth.getUser();

      if (authError || !auth?.user?.id) {
        console.error("⚠️ Auth error:", authError);
        router.push("/auth");
        return;
      }

      console.log("🧠 Auth user ID:", auth.user.id);

      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", auth.user.id)
        .limit(1);

      if (error) {
        console.error("⚠️ Supabase error while loading profile:", error.message);
        toast.error("Error loading your profile. Please retry.");
        router.push("/onboarding");
        return;
      }

      const userProfile = profiles?.[0] || null;

      if (!userProfile) {
        console.warn("⚠️ Aucun profil trouvé, redirection vers onboarding.");
        toast.error("Please complete your onboarding first.");
        router.push("/onboarding");
        return;
      }

      console.log("✅ Profil chargé avec succès:", userProfile);
      setProfile(userProfile);
      setLoading(false);
    })();
  }, [router]);

  if (loading || !profile)
    return (
      <main className="flex items-center justify-center min-h-screen bg-[#0A0A0A] text-white">
        <div className="text-white/60">Loading profile...</div>
      </main>
    );

  /* ======================================================
     ANALYSE DU CV & DE L’OFFRE
  ====================================================== */
  async function handleAnalyzeCVAndOffer() {
    if (!cvFile && !offerText.trim()) {
      toast.error("Please upload a CV or paste a job offer, or click 'Skip'.");
      return;
    }

    try {
      setIsAnalyzing(true);
      toast.loading("Analyzing your profile…", { id: "novaAnalysis" });

      const formData = new FormData();
      if (cvFile) formData.append("file", cvFile);
      if (offerText) formData.append("offer", offerText);
      formData.append("user_id", profile.id);

      const res = await fetch("/api/cv/analyze", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      setTimeout(() => toast.dismiss("novaAnalysis"), 200);

      if (!json.ok) {
        toast.error(json.error || "Error analyzing CV/offer");
        setIsAnalyzing(false);
        return;
      }

      setHasAnalyzed(true);
      setIsAnalyzing(false);
      toast.success("Profile analyzed successfully");
    } catch (err) {
      console.error("⚠️ handleAnalyzeCVAndOffer error:", err);
      setIsAnalyzing(false);
      setTimeout(() => toast.dismiss("novaAnalysis"), 200);
      toast.error("Submission failed");
    }
  }

  function handleSkipCV() {
    toast.success("Continuing with your onboarding profile only");
    localStorage.setItem("nova_skip_cv", "true");
    setHasAnalyzed(true);
  }

  /* ======================================================
     START SESSION (AVEC chosen_lang)
  ====================================================== */
  async function startSession(type: string, duration: number) {
    try {
      toast.loading("Starting your session…", { id: "novaStart" });

      const payload = {
        user_id: profile.id,
        option: type,
        duration_limit: duration,
        segment: profile.segment,
        domain: profile.domain,
        sub_domain: profile.sub_domain,
        career_stage: profile.career_stage,
        offer_context: offerText || null,
        skip_cv: localStorage.getItem("nova_skip_cv") === "true",
        // ✅ on envoie la langue choisie
        chosen_lang: chosenLang,
      };

      const res = await fetch("/api/engine/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      setTimeout(() => toast.dismiss("novaStart"), 200);

      if (json?.error) {
        toast.error(json.error);
        return;
      }

      if (json?.require_cv) {
        toast.error(json.message || "Please upload your CV before starting.");
        return;
      }

      if (json?.url) {
        window.location.href = json.url;
        return;
      }

      if (json?.bypass) {
        toast.success("Simulation ready, launching Nova…");
        router.push(`/session?session_id=${json.session_id}`);
        return;
      }

      toast.error("Unexpected server response.");
    } catch (err) {
      console.error("startSession error:", err);
      setTimeout(() => toast.dismiss("novaStart"), 200);
      toast.error("Server error");
    }
  }

  /* ======================================================
     UI COMPLETE
  ====================================================== */
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white p-6 sm:p-10">
      <div className="max-w-5xl mx-auto">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
              {isTrial ? "Free Trial Simulation" : "Choose Your Interview Type"}
            </h1>
            <p className="text-white/40 text-sm">
              Detected {profile.domain || "general"} {profile.career_stage} profile
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 text-sm bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all backdrop-blur-xl"
          >
            Back
          </button>
        </div>

        {/* 🌍 CHOIX DE LA LANGUE */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 backdrop-blur-xl">
          <p className="text-white/60 text-sm mb-3">Interview language</p>
          <div className="flex flex-wrap gap-3">
            {SUPPORTED_LANGS.map((lng) => (
              <button
                key={lng.code}
                onClick={() => setChosenLang(lng.code)}
                className={`px-4 py-2 rounded-xl border transition-all ${
                  chosenLang === lng.code
                    ? "border-blue-500 bg-blue-500/20 text-blue-300"
                    : "border-white/10 hover:border-white/30"
                }`}
              >
                {lng.label}
              </button>
            ))}
          </div>
        </div>

        {/* CV + OFFER SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* CV UPLOAD */}
          <div
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file && file.type.includes("pdf")) setCvFile(file);
              else toast.error("Please upload a valid PDF file.");
            }}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => document.getElementById("cvInput")?.click()}
            className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center hover:border-white/20 transition-all bg-white/5 backdrop-blur-xl flex flex-col justify-center items-center min-h-[240px] cursor-pointer group"
          >
            {cvFile ? (
              <>
                <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-4">
                  <svg
                    className="w-8 h-8 text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <p className="text-white font-semibold mb-1">{cvFile.name}</p>
                <p className="text-white/40 text-sm">CV ready for submission</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4 group-hover:bg-white/10 transition-all">
                  <svg
                    className="w-8 h-8 text-white/40"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                <p className="text-white font-semibold mb-2">Upload Your CV</p>
                <p className="text-white/40 text-sm">
                  Drag & drop or click to browse
                </p>
                <p className="text-white/20 text-xs mt-2">PDF, DOC, DOCX</p>
              </>
            )}
            <input
              id="cvInput"
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) =>
                setCvFile(e.target.files?.[0] || null)
              }
              className="hidden"
            />
          </div>

          {/* JOB OFFER */}
          <div className="relative">
            <textarea
              placeholder="Paste the job offer text here (optional)"
              value={offerText}
              onChange={(e) => setOfferText(e.target.value)}
              className="w-full min-h-[240px] p-6 bg-white/5 border border-white/10 rounded-2xl text-sm text-white placeholder:text-white/30 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 backdrop-blur-xl transition-all"
            />
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <button
            onClick={handleAnalyzeCVAndOffer}
            disabled={isAnalyzing}
            className="py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
          >
            {isAnalyzing ? "Analyzing..." : "Submit & Analyze"}
          </button>

          <button
            onClick={handleSkipCV}
            disabled={isAnalyzing}
            className="py-4 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] backdrop-blur-xl"
          >
            Skip This Step
          </button>
        </div>

        {/* STATUS MESSAGE */}
        {hasAnalyzed ? (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center p-4 rounded-xl bg-green-500/10 border border-green-500/20 mb-8"
          >
            <p className="text-green-400 text-sm font-medium">
              Profile ready. Choose your interview type below.
            </p>
          </motion.div>
        ) : (
          <p className="text-center text-white/40 text-sm mb-8">
            Upload your CV or paste a job offer, then click Submit or Skip.
          </p>
        )}

        {/* INTERVIEW TYPES */}
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 transition-all ${
            hasAnalyzed ? "" : "opacity-40 pointer-events-none"
          }`}
        >
          {/* Job Interview */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => startSession("job_interview", DURATIONS.long)}
            className="bg-white/5 border border-white/10 rounded-2xl p-6 cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all backdrop-blur-xl"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <span className="text-xs text-white/40 bg-white/5 px-2 py-1 rounded-lg">
                20 min
              </span>
            </div>
            <h3 className="text-xl font-bold tracking-tight mb-2">
              Job Interview
            </h3>
            <p className="text-white/40 text-sm mb-4">
              Comprehensive interview simulation
            </p>
            <p className="text-2xl font-bold text-blue-400">
              ${PRICES.job_interview}
            </p>
          </motion.div>

          {/* Strategic Case */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => startSession("strategic_case", DURATIONS.long)}
            className="bg-white/5 border border-white/10 rounded-2xl p-6 cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all backdrop-blur-xl"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-purple-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <span className="text-xs text-white/40 bg-white/5 px-2 py-1 rounded-lg">
                20 min
              </span>
            </div>
            <h3 className="text-xl font-bold tracking-tight mb-2">
              Strategic Case
            </h3>
            <p className="text-white/40 text-sm mb-4">
              Consulting-style case study
            </p>
            <p className="text-2xl font-bold text-purple-400">
              ${PRICES.strategic_case}
            </p>
          </motion.div>

          {/* Annual Review */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => startSession("annual_review", DURATIONS.medium)}
            className="bg-white/5 border border-white/10 rounded-2xl p-6 cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all backdrop-blur-xl"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <span className="text-xs text-white/40 bg-white/5 px-2 py-1 rounded-lg">
                15 min
              </span>
            </div>
            <h3 className="text-xl font-bold tracking-tight mb-2">
              Annual Review
            </h3>
            <p className="text-white/40 text-sm mb-4">
              Performance review preparation
            </p>
            <p className="text-2xl font-bold text-green-400">
              ${PRICES.annual_review}
            </p>
          </motion.div>
        </div>

        <NovaToast />
      </div>
    </main>
  );
}