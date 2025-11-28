const fs = require("fs");
const path = require("path");

const requiredFiles = [
  "app/globals.css",
  "app/layout.tsx",
  "app/dashboard/page.tsx",
  "components/theme-provider.tsx",
  "components/ui/button.tsx",
  "components/ui/badge.tsx",
  "components/ui/input.tsx",
  "components/ui/avatar.tsx",
  "hooks/use-toast.ts",
  "hooks/use-mobile.ts",
  "lib/utils.ts",
];

console.log("🔎 Checking Nova project structure...\n");

let allGood = true;

// --- Check critical files ---
for (const file of requiredFiles) {
  const filePath = path.join(process.cwd(), "src", file); // Check in /src
  const altPath = path.join(process.cwd(), file); // Check in root

  if (fs.existsSync(filePath)) {
    console.log(`✅ Found: src/${file}`);
  } else if (fs.existsSync(altPath)) {
    console.log(`✅ Found: ${file}`);
  } else {
    console.log(`❌ Missing: ${file}`);
    allGood = false;
  }
}

// --- Check Tailwind config ---
console.log("\n🔎 Checking Tailwind config...\n");
const tailwindPath = path.join(process.cwd(), "tailwind.config.js");
if (fs.existsSync(tailwindPath)) {
  const content = fs.readFileSync(tailwindPath, "utf-8");

  let ok = true;
  if (!content.includes("./app/")) {
    console.log("⚠️ Missing './app/**/*' in Tailwind content.");
    ok = false;
  }
  if (!content.includes("./components/")) {
    console.log("⚠️ Missing './components/**/*' in Tailwind content.");
    ok = false;
  }
  if (ok) {
    console.log("✅ Tailwind content config looks good.");
  }
} else {
  console.log("❌ No tailwind.config.js found at project root!");
  allGood = false;
}

// --- Check layout.tsx ---
console.log("\n🔎 Checking layout.tsx...\n");
const layoutPaths = [
  path.join(process.cwd(), "src/app/layout.tsx"),
  path.join(process.cwd(), "app/layout.tsx"),
];

let layoutFound = false;
for (const layoutPath of layoutPaths) {
  if (fs.existsSync(layoutPath)) {
    layoutFound = true;
    console.log(`✅ Found layout: ${layoutPath}`);
    const layoutContent = fs.readFileSync(layoutPath, "utf-8");

    if (layoutContent.includes("./globals.css")) {
      console.log("✅ layout.tsx correctly imports './globals.css'");
    } else {
      console.log("⚠️ layout.tsx does NOT import './globals.css'");
      allGood = false;
    }
  }
}

if (!layoutFound) {
  console.log("❌ No layout.tsx found in app/ or src/app/");
  allGood = false;
}

// --- Summary ---
if (allGood) {
  console.log("\n🎉 All required V0 files, Tailwind config, and layout.tsx look correct!");
} else {
  console.log("\n⚠️ Some issues detected. Please fix the ❌ and ⚠️ above.");
}
