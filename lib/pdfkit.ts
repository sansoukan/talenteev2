// src/lib/pdfkit.ts
import _PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

// ———————————————————————————————
// Load Roboto as ONLY font (kills Helvetica.afm silently)
// ———————————————————————————————
const ROBOTO_PATH = path.join(
  process.cwd(),
  "public/fonts/Roboto-VariableFont_wdth,wght.ttf"
);
const ROBOTO_BUFFER = fs.readFileSync(ROBOTO_PATH);

// Keep reference to original method
const originalRegister = _PDFDocument.prototype.registerFont;

// Override registerFont to intercept all font loading
_PDFDocument.prototype.registerFont = function (name: string, src: any) {
  if (name === "Helvetica" || name === "Times" || name === "Courier") {
    // Force Roboto instead of system fonts
    return originalRegister.call(this, "NovaFont", ROBOTO_BUFFER);
  }
  return originalRegister.call(this, name, src);
};

// Also override internal fallback font
(_PDFDocument.prototype as any)._font = "NovaFont";

export default _PDFDocument;