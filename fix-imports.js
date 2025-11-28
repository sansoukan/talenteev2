import fs from "fs";
import path from "path";

const rootDir = path.join(process.cwd(), "src", "app");

// Fonction pour lire tous les fichiers récursivement
function getAllFiles(dir, files = []) {
  fs.readdirSync(dir).forEach((file) => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, files);
    } else if (filePath.endsWith(".ts") || filePath.endsWith(".tsx")) {
      files.push(filePath);
    }
  });
  return files;
}

// Correction des imports
function fixImports(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  const fixed = content.replace(/@\/src\//g, "@/");

  if (fixed !== content) {
    fs.writeFileSync(filePath, fixed, "utf8");
    console.log(`✅ Fixed imports in: ${filePath}`);
  }
}

const files = getAllFiles(rootDir);
files.forEach(fixImports);

console.log("✨ Import fix completed!");
