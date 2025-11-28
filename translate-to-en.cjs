require("dotenv").config();
const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ROOT_DIR = path.join(process.cwd(), "src"); // adapte si besoin

async function translateText(text) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a translator. Translate French UI text into natural English. Do not touch code or variable names.",
      },
      { role: "user", content: text },
    ],
    temperature: 0,
  });

  return completion.choices[0].message.content.trim();
}

function getAllFiles(dir, extList = [".tsx", ".ts", ".jsx", ".js"]) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(filePath, extList));
    } else if (extList.includes(path.extname(file))) {
      results.push(filePath);
    }
  });
  return results;
}

async function processFile(file) {
  let code = fs.readFileSync(file, "utf8");

  // Find text inside quotes
  const regex = /(["'`])([^"'`\n]{2,}?)\1/g;
  let matches = [...code.matchAll(regex)];

  for (let match of matches) {
    const full = match[0];
    const txt = match[2];
    if (/^[A-Za-z0-9\s.,!?'"%:→-]+$/.test(txt)) continue; // skip if already English-like
    console.log(`Translating in ${file}:`, txt);
    const translation = await translateText(txt);
    code = code.replace(full, full[0] + translation + full[0]);
  }

  // Backup and overwrite
  fs.writeFileSync(file + ".bak", code, "utf8");
  fs.writeFileSync(file, code, "utf8");
}

async function main() {
  const files = getAllFiles(ROOT_DIR);
  for (const file of files) {
    await processFile(file);
  }
  console.log("✅ Translation finished.");
}

main();
