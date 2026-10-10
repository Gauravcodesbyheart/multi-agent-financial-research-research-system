/* Merge the documentation + presentation into one final PDF.
 * One-off packaging helper. If pdf-lib is missing:  npm i --no-save pdf-lib
 */
const fs = require("fs");
const path = require("path");
const { PDFDocument } = require("pdf-lib");

(async () => {
  const dir = __dirname;
  const out = await PDFDocument.create();
  for (const name of ["PROJECT_DOCUMENTATION.pdf", "PROJECT_PRESENTATION.pdf"]) {
    const src = await PDFDocument.load(fs.readFileSync(path.join(dir, name)));
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p) => out.addPage(p));
  }
  out.setTitle("FinResearch AI - Final Project Package (Documentation + Presentation)");
  const bytes = await out.save();
  const file = path.join(dir, "PROJECT_FINAL.pdf");
  fs.writeFileSync(file, bytes);
  console.log("wrote", file, "| pages:", out.getPageCount(), "| bytes:", bytes.length);
})();
