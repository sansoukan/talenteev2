#!/usr/bin/env node
/** Vérifie la complétude du front Nova RH (fichiers, placeholders, deps, env). */
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

const mustHaveFiles = [
  // libs
  "src/lib/supabaseClient.ts",
  "src/lib/supabaseAdmin.ts",
  "src/lib/NovaPromptRouter.ts",
  "src/lib/fetchAssetUrl.ts",
  "src/lib/saveSessionToSupabase.ts",
  "src/lib/voice-utils.ts",
  "src/lib/fetchNovaFeedback.ts",

  // components
  "src/components/NovaEngine.tsx",
  "src/components/VideoPlayer.tsx",
  "src/components/RecordingControl.tsx",
  "src/components/PremiumPopup.tsx",
  "src/components/NovaTimer.tsx",
  "src/components/FeedbackPreview.tsx",
  "src/components/NiveauSelector.tsx",
  "src/components/EntretienTypeSelector.tsx",
  "src/components/NovaFinalFeedback.tsx",
  "src/components/VideoIntro.tsx",

  // pages
  "src/app/page.tsx",
  "src/app/session/page.tsx",
  "src/app/dashboard/page.tsx",

  // api front
  "src/app/api/orchestrator/route.ts",
  "src/app/api/sessions/route.ts",
  "src/app/api/memoire/route.ts",
  "src/app/api/relance/route.ts",
  "src/app/api/emotions/route.ts",
  "src/app/api/checkout/session/route.ts",
  "src/app/api/stt/route.ts",
  "src/app/api/nova-intro/route.ts"
];

const placeholders = [
  /export\s+default\s+function\s+\w+\s*\(\)\s*\{\s*return\s+null;\s*\}/m,
  /TODO:/i
];

function exists(p) { return fs.existsSync(path.join(ROOT, p)); }
function read(p) { return fs.readFileSync(path.join(ROOT, p), "utf8"); }

let ok = true;

// 1) Fichiers présents
console.log("🔎 Vérification des fichiers requis…");
for (const f of mustHaveFiles) {
  if (!exists(f)) { console.log(`❌ Manquant: ${f}`); ok = false; }
  else { console.log(`✅ ${f}`); }
}

// 2) Placeholders
console.log("\n🔎 Recherche de placeholders (return null; / TODO:)…");
for (const f of mustHaveFiles.filter(exists)) {
  const src = read(f);
  for (const re of placeholders) {
    if (re.test(src)) { console.log(`⚠️  Placeholder détecté dans: ${f}`); ok = false; break; }
  }
}

// 3) Dépendances
console.log("\n🔎 Vérification package.json (deps clés) …");
const pkgPath = path.join(ROOT, "package.json");
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const needed = ["next", "react", "react-dom", "@supabase/supabase-js", "hls.js"];
  for (const d of needed) {
    if (!deps[d]) { console.log(`❌ Dépendance manquante: ${d}`); ok = false; }
    else { console.log(`✅ ${d}`); }
  }
} else { console.log("❌ package.json introuvable"); ok = false; }

// 4) ENV .env.local.example
console.log("\n🔎 Vérification .env.local.example …");
const envPath = path.join(ROOT, ".env.local.example");
if (!fs.existsSync(envPath)) { console.log("❌ .env.local.example manquant"); ok = false; }
else {
  const env = fs.readFileSync(envPath, "utf8");
  const keys = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "ORCHESTRATOR_API_URL",
    "OPENAI_API_KEY",
    "SUPABASE_SERVICE_ROLE_KEY"
  ];
  for (const k of keys) {
    if (!env.includes(k)) { console.log(`❌ Clé manquante dans .env.local.example: ${k}`); ok = false; }
    else { console.log(`✅ ${k}`); }
  }
}

console.log("\n==============================");
if (ok) {
  console.log("🎉 Front Nova RH — Vérification OK : base complète et sans placeholder bloquant.");
  process.exit(0);
} else {
  console.log("⚠️ Vérification terminée avec des éléments manquants ou placeholders. Corrige avant lancement.");
  process.exit(1);
}
