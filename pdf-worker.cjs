// pdf-worker.js
const pdfParse = require("pdf-parse");

/**
 * Parse un Buffer PDF et retourne le texte.
 * @param {Buffer} buffer
 * @returns {Promise<string>}
 */
async function parsePdf(buffer) {
  const data = await pdfParse(buffer);
  return data.text || "";
}

module.exports = { parsePdf };
