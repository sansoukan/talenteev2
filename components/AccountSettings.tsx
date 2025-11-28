"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function AccountSettings() {
  const supabase = createClientComponentClient();
  const [careerStage, setCareerStage] = useState("");
  const [domain, setDomain] = useState("");
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  // Load current user profile
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("career_stage, domain, goal")
        .eq("id", user.id)
        .single();

      if (profile) {
        setCareerStage(profile.career_stage || "");
        setDomain(profile.domain || "");
        setGoal(profile.goal || "");
      }
      setLoading(false);
    })();
  }, [supabase]);

  async function handleSave() {
    setLoading(true);
    setMessage(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setMessage("You must be signed in.");
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        career_stage: careerStage,
        domain,
        goal,
        onboarding_completed: true,
      })
      .eq("id", user.id);

    if (error) {
      setMessage("Error while saving. Please try again.");
    } else {
      setMessage("✅ Profile updated successfully.");
    }

    setLoading(false);
  }

  if (loading) {
    return <p className="text-gray-400">Loading your account...</p>;
  }

  return (
    <div className="bg-gray-900 text-white p-6 rounded-xl shadow-lg border border-gray-700 max-w-xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">My Account</h2>
      <p className="text-gray-400 mb-6">
        Update your personal information. These details are used to personalize
        your interview simulations.
      </p>

      <div className="flex flex-col gap-4">
        <label className="flex flex-col">
          <span className="mb-1 font-semibold">Career Stage</span>
          <select
            value={careerStage}
            onChange={(e) => setCareerStage(e.target.value)}
            className="bg-gray-800 border border-gray-600 rounded-lg p-2 text-white"
          >
            <option value="">Select...</option>
            <option value="student">🎓 Student</option>
            <option value="graduate">🧑‍🎓 Graduate</option>
            <option value="mid">💼 Professional (2–5 years)</option>
            <option value="manager">👥 Manager (5–10 years)</option>
            <option value="exec">🏛 Executive (10+ years)</option>
          </select>
        </label>

        <label className="flex flex-col">
          <span className="mb-1 font-semibold">Domain</span>
          <select
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="bg-gray-800 border border-gray-600 rounded-lg p-2 text-white"
          >
            <option value="">Select...</option>
            <option value="marketing">📊 Marketing</option>
            <option value="sales">💰 Sales</option>
            <option value="finance">🧮 Finance</option>
            <option value="product">🛠 Product / Tech</option>
            <option value="hr">🤝 HR</option>
            <option value="general">🌍 General</option>
          </select>
        </label>

        <label className="flex flex-col">
          <span className="mb-1 font-semibold">Goal</span>
          <select
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="bg-gray-800 border border-gray-600 rounded-lg p-2 text-white"
          >
            <option value="">Select...</option>
            <option value="job_hunting">🎯 Find an internship / job</option>
            <option value="promotion">📈 Prepare for a promotion</option>
            <option value="exec_path">🏛 Aim for an executive role</option>
            <option value="practice">💪 General practice</option>
          </select>
        </label>

        <button
          onClick={handleSave}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-bold mt-4"
        >
          {loading ? "Saving..." : "Save changes"}
        </button>

        {message && <p className="mt-2 text-sm">{message}</p>}
      </div>
    </div>
  );
}
