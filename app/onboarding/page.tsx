"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from "@/lib/supabaseClient";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import DomainSubSelector from "@/components/DomainSubSelector";

type Step =
  | "identity"
  | "education"
  | "career"
  | "domain"
  | "subdomain"
  | "goal"
  | "summary";

type DomainRow = { value: string; label: string };

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>("identity");

  // identité
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");

  // profil
  const [segment, setSegment] = useState<string | null>(null);
  const [careerStage, setCareerStage] = useState<string | null>(null);

  // domain & subdomain
  const [domain, setDomain] = useState<string | null>(null);
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [domainsLoading, setDomainsLoading] = useState(true);
  const [domainsError, setDomainsError] = useState<string | null>(null);
  const [subDomain, setSubDomain] = useState<string | null>(null);

  // objectif
  const [goal, setGoal] = useState<string | null>(null);
  const [goalType, setGoalType] = useState<string | null>(null);

  const router = useRouter();
  const search = useSearchParams();
  const isEditMode = search.get("mode") === "edit";

  async function saveProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/auth");
      return;
    }

    const sessionCheck = await supabase.auth.getSession();
    console.log("🔥 SESSION FROM ONBOARDING:", sessionCheck);

    try {
      const payload = {
        id: user.id,
        prenom,
        nom,
        segment,

        career_target:
          segment === "operational"
            ? "op_junior"
            : careerStage || "professional",

        career_stage:
          segment === "operational"
            ? "op_junior"
            : careerStage || "professional",

        domain,
        sub_domain: subDomain,
        goal,
        goal_type: goalType,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("profiles")
        .upsert(payload, { onConflict: "id" });

      if (error) {
        console.error(error);
        toast.error("Error saving your profile");
        return;
      }

      await supabase.auth.refreshSession();

      toast.success(
        isEditMode ? "Profile updated" : "Profile created successfully"
      );

      router.push(isEditMode ? "/session/start" : "/dashboard?updated=true");
    } catch (err) {
      console.error(err);
      toast.error("Unexpected error");
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/auth");
  }

  useEffect(() => {
    (async () => {
      try {
        setDomainsLoading(true);

        if (!segment) {
          setDomains([]);
          setDomainsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("nova_domains")
          .select("value,label,segment_target")
          .or(`segment_target.eq.${segment},segment_target.eq.all`)
          .order("label", { ascending: true });

        if (error) throw error;
        
        const excludedValues = ['general', 'multidisciplinary', 'operations', 'supply'];
        const filteredData = (data || []).filter((d: DomainRow) => !excludedValues.includes(d.value.toLowerCase()));
        
        setDomains(filteredData as DomainRow[]);
      } catch (e: any) {
        setDomainsError("Unable to load domains");
        console.error(e);
      } finally {
        setDomainsLoading(false);
      }
    })();
  }, [segment]);

  const stepsOrder: Step[] = [
    "identity",
    "education",
    "career",
    "domain",
    "subdomain",
    "goal",
    "summary",
  ];
  const currentIndex = stepsOrder.indexOf(step);

  const Card = ({
    label,
    onClick,
  }: {
    label: string;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className="w-full sm:w-64 h-28 bg-white/5 backdrop-blur-xl border border-white/10 text-white rounded-2xl 
                 hover:bg-white/10 hover:border-white/20 hover:scale-[1.02] flex items-center justify-center 
                 text-lg font-medium tracking-tight transition-all duration-300"
    >
      {label}
    </button>
  );

  function renderIdentityStep() {
    return (
      <div className="flex flex-col items-center gap-8">
        <h2 className="text-3xl font-semibold text-white tracking-tight">Welcome</h2>
        <p className="text-white/60 text-center max-w-md leading-relaxed">
          Let's personalize your experience. Please tell us your name.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
          <input
            type="text"
            placeholder="First name"
            value={prenom}
            onChange={(e) => setPrenom(e.target.value)}
            className="flex-1 px-5 py-4 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 
                       text-white placeholder:text-white/40 outline-none focus:border-white/30 
                       transition-all duration-300"
          />
          <input
            type="text"
            placeholder="Last name"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className="flex-1 px-5 py-4 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 
                       text-white placeholder:text-white/40 outline-none focus:border-white/30 
                       transition-all duration-300"
          />
        </div>
        <button
          onClick={() => setStep("education")}
          disabled={!prenom}
          className="px-10 py-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl 
                     font-medium text-white tracking-tight hover:bg-white/15 hover:scale-[1.02] 
                     transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    );
  }

  function renderEducationStep() {
    const options = [
      { label: "Bachelor's Degree", value: "operational" },
      { label: "Master's Degree", value: "elite" },
    ];

    return (
      <div className="flex flex-col items-center gap-8 w-full">
        <h2 className="text-3xl font-semibold text-white tracking-tight">Education Level</h2>
        <p className="text-white/60 text-center max-w-md leading-relaxed">
          This helps tailor your interview simulations to your world.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
          {options.map((opt) => (
            <Card
              key={opt.value}
              label={opt.label}
              onClick={() => {
                setSegment(opt.value);
                if (opt.value === "elite") setStep("career");
                else setStep("domain");
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  function renderCareerStep() {
    const roles = [
      { label: "Student (Internship)", value: "student" },
      { label: "Graduate (First Job)", value: "graduate" },
      { label: "Professional (2–5 years)", value: "professional" },
      { label: "Manager (5–10 years)", value: "manager" },
      { label: "Executive (10+ years)", value: "exec" },
    ];

    return (
      <div className="flex flex-col items-center gap-8 w-full">
        <h2 className="text-3xl font-semibold text-white tracking-tight">Career Stage</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
          {roles.map((r) => (
            <Card
              key={r.value}
              label={r.label}
              onClick={() => {
                setCareerStage(r.value);
                setStep("domain");
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  function renderDomainStep() {
    if (domainsLoading)
      return <div className="text-white/40 text-sm animate-pulse">Loading domains</div>;
    if (domainsError)
      return <div className="text-red-400/80 text-sm">{domainsError}</div>;
    if (!domains.length)
      return <div className="text-white/40 text-sm">No domain available</div>;

    return (
      <div className="flex flex-col items-center gap-8 w-full">
        <h2 className="text-3xl font-semibold text-white tracking-tight">Your Field</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
          {domains.map((d) => (
            <Card
              key={d.value}
              label={d.label}
              onClick={() => {
                setDomain(d.value);
                setStep("subdomain");
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  function renderSubDomainStep() {
    return (
      <DomainSubSelector
        domain={domain}
        userSegment={segment || "operational"}
        onSelect={(val) => {
          setSubDomain(val);
          if (segment === "operational") {
            setGoal("job_interview");
            setGoalType("external");
            setStep("summary");
          } else {
            setStep("goal");
          }
        }}
      />
    );
  }

  function renderGoalStep() {
    const goals = [
      { label: "Job Interview", value: "job_interview", type: "external" },
      { label: "Case Study / Business Challenge", value: "case_study", type: "external" },
      { label: "Promotion or Evolution", value: "promotion", type: "internal" },
      { label: "Annual / Performance Review", value: "annual_review", type: "internal" },
      { label: "Practice Mode", value: "practice", type: "general" },
    ];

    return (
      <div className="flex flex-col items-center gap-8 w-full">
        <h2 className="text-3xl font-semibold text-white tracking-tight">Your Goal</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
          {goals.map((g) => (
            <Card
              key={g.value}
              label={g.label}
              onClick={() => {
                setGoal(g.value);
                setGoalType(g.type);
                setStep("summary");
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  function renderSummaryStep() {
    return (
      <div className="flex flex-col items-center gap-10 w-full max-w-lg">
        <h2 className="text-3xl font-semibold text-white tracking-tight">
          Your Profile is Ready
        </h2>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full bg-white/5 backdrop-blur-xl border border-white/10 text-white 
                     rounded-2xl p-8 flex flex-col gap-5"
        >
          <h3 className="text-xl font-medium text-white/90 tracking-tight">
            Profile Summary
          </h3>
          <div className="space-y-3 text-base text-white/70 leading-relaxed">
            <p><span className="text-white/40">Name:</span> {prenom} {nom}</p>
            <p><span className="text-white/40">Education:</span> {segment === "elite" ? "Master's Degree" : "Bachelor's Degree"}</p>
            {careerStage && <p><span className="text-white/40">Career Stage:</span> {careerStage}</p>}
            <p><span className="text-white/40">Domain:</span> {domain}</p>
            {subDomain && <p><span className="text-white/40">Specialization:</span> {subDomain}</p>}
            <p><span className="text-white/40">Goal:</span> {goal}</p>
          </div>
          <div className="text-green-400/80 text-sm text-right mt-4">Validated</div>
        </motion.div>

        <button
          onClick={saveProfile}
          className="px-10 py-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl 
                     font-medium text-white tracking-tight hover:bg-white/15 hover:scale-[1.02] 
                     transition-all duration-300"
        >
          Confirm & Save
        </button>
      </div>
    );
  }

  function renderStep() {
    switch (step) {
      case "identity": return renderIdentityStep();
      case "education": return renderEducationStep();
      case "career": return renderCareerStep();
      case "domain": return renderDomainStep();
      case "subdomain": return renderSubDomainStep();
      case "goal": return renderGoalStep();
      case "summary": return renderSummaryStep();
    }
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-[#0A0A0A] text-white p-8">
      <div className="flex flex-col items-center gap-12 w-full max-w-4xl">
        <h1 className="text-5xl font-semibold text-white tracking-tight">
          {isEditMode ? "Modify your profile" : "Welcome to Nova RH"}
        </h1>
        <p className="text-white/60 text-lg text-center leading-relaxed">
          Nova will personalize your simulations according to your role and specialization.
        </p>

        <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden backdrop-blur-xl">
          <div
            className="bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 h-1.5 transition-all duration-500"
            style={{ width: `${((currentIndex + 1) / stepsOrder.length) * 100}%` }}
          ></div>
        </div>

        {renderStep()}

        <button
          onClick={handleSignOut}
          className="mt-10 px-6 py-3 bg-white/5 backdrop-blur-xl border border-white/10 
                     rounded-xl font-medium text-white/70 hover:text-white hover:bg-white/10 
                     transition-all duration-300"
        >
          Sign Out
        </button>
      </div>
    </main>
  );
}
