// /src/lib/novaPrices.ts
// =======================================================
// 🎯 Base officielle des tarifs Nova RH (V3 2025)
// =======================================================

export type NovaPriceItem = {
  id: string; // Identifiant logique (ex: job_interview)
  label: string;
  description: string;
  price: number;
  duration: string;
  questions: number;
  envKey: string; // Variable d'environnement Stripe
};

// 💰 Tarifs de référence (en EUR/USD)
// Nova convertira selon la devise détectée dans useCurrency()
export const novaPrices: NovaPriceItem[] = [
  {
    id: "internship",
    label: "Internship / First Job",
    description: "For students preparing their first interviews.",
    price: 2.99,
    duration: "15 min",
    questions: 8,
    envKey: "STRIPE_PRICE_INTERNSHIP",
  },
  {
    id: "job_interview",
    label: "Job Interview",
    description: "Standard external recruitment simulation.",
    price: 3.99,
    duration: "20 min",
    questions: 10,
    envKey: "STRIPE_PRICE_JOB",
  },
  {
    id: "case_study",
    label: "Case Study / Business Challenge",
    description: "Analytical or product-related challenge.",
    price: 3.99,
    duration: "20 min",
    questions: 5,
    envKey: "STRIPE_PRICE_CASE",
  },
  {
    id: "promotion",
    label: "Promotion Interview",
    description: "Internal mobility or new responsibility.",
    price: 3.99,
    duration: "20 min",
    questions: 10,
    envKey: "STRIPE_PRICE_PROMOTION",
  },
  {
    id: "annual_review",
    label: "Annual Review",
    description: "Prepare for your yearly evaluation.",
    price: 3.99,
    duration: "20 min",
    questions: 10,
    envKey: "STRIPE_PRICE_REVIEW",
  },
  {
    id: "goal_setting",
    label: "Goal-Setting Session",
    description: "Define objectives and alignment discussions.",
    price: 3.99,
    duration: "20 min",
    questions: 10,
    envKey: "STRIPE_PRICE_GOAL",
  },
  {
    id: "mobility",
    label: "Mobility / Career Change",
    description: "Prepare for internal or cross-department move.",
    price: 3.99,
    duration: "20 min",
    questions: 10,
    envKey: "STRIPE_PRICE_MOBILITY",
  },
  {
    id: "practice",
    label: "Practice Mode",
    description: "General HR, leadership or communication training.",
    price: 3.99,
    duration: "20 min",
    questions: 15,
    envKey: "STRIPE_PRICE_PRACTICE",
  },
  {
    id: "strategic_case",
    label: "Strategic Case / Board Presentation",
    description: "C-level or investor case simulation.",
    price: 6.99,
    duration: "30 min",
    questions: 5,
    envKey: "STRIPE_PRICE_STRATEGIC",
  },
];

// 🧠 Helper : récupérer le prix localement
export function getNovaPriceById(id: string): NovaPriceItem | undefined {
  return novaPrices.find((item) => item.id === id);
}

// 🧠 Helper : récupérer le Price ID Stripe depuis l'env
export function getStripePriceIdFor(id: string): string | undefined {
  const item = novaPrices.find((p) => p.id === id);
  if (!item) return undefined;
  return process.env[item.envKey];
}
