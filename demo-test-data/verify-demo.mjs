import fs from "fs";
import path from "path";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse/lib/pdf-parse.js");
const { extractMetricsLocally } = await import("../src/lib/agents/extractionUtils.ts");
const { detectTextualRedFlags } = await import("../src/lib/agents/analysisUtils.ts");

const checks = ["Apple/Apple_Annual_Report_FY2023.pdf", "Tesla/Tesla_Annual_Report_FY2026.pdf", "Reliance-Industries/Reliance-Industries_Annual_Report_FY2025.pdf", "Infosys/Infosys_Annual_Report_FY2024.pdf"];
for (const rel of checks) {
  const buf = fs.readFileSync(path.join(import.meta.dirname, rel));
  const { text } = await pdfParse(buf);
  const m = extractMetricsLocally(text);
  const flags = detectTextualRedFlags(text);
  console.log("\n=== " + rel + " ===");
  console.log("fiscal_year:", m.fiscal_year, "| revenue:", m.revenue, "| growth:", m.revenue_growth, "| gross_margin:", m.gross_margin, "| net_income:", m.net_income, "| total_debt:", m.total_debt, "| eps:", m.eps, "| fcf:", m.free_cash_flow);
  console.log("metrics extracted:", Object.keys(m).filter(k => typeof m[k] === "number").length, "of 26");
  console.log("red flags:", flags.map(f => f.risk_type + "(" + f.severity + ")").join(", ") || "none (clean doc)");
}
