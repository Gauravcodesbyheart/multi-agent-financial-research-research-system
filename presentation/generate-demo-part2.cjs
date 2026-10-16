/*
 * DEMO_PART2_BENCHMARK_RESEARCH.pdf -- 2.5-minute demo script (speaker's copy).
 * Research Agent + Benchmark Agent showcase with SHOW/SAY steps, code anchors, Q&A.
 * A4 portrait. Run from repo root:  node presentation/generate-demo-part2.cjs
 */
const fs = require("fs");
const path = require("path");
const { jsPDF } = require("jspdf");

const OUT = path.resolve(__dirname);
const W = 210, H = 297;
const INK = [15, 23, 42], BRAND = [30, 58, 138], GOLD = [181, 114, 22];
const GREEN = [22, 101, 52], RED = [185, 28, 28], MUTED = [71, 85, 105];
const LIGHT = [241, 245, 249], GREEN_BG = [240, 253, 244], SKY = [219, 234, 254], NAVY = [11, 22, 48];

function clean(s) {
  return String(s)
    .replace(/→/g, "->").replace(/⇒/g, "=>").replace(/✓/g, "[v]").replace(/✗/g, "[x]")
    .replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/—/g, "--").replace(/–/g, "-")
    .replace(/…/g, "...").replace(/×/g, "x");
}

const doc = new jsPDF({ unit: "mm", format: [W, H], orientation: "portrait" });
let n = 0;

function header(title, sub) {
  n += 1;
  if (n > 1) doc.addPage([W, H]);
  doc.setFillColor(255, 255, 255); doc.rect(0, 0, W, H, "F");
  doc.setFillColor(...BRAND); doc.rect(0, 0, W, 15, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(9.5);
  doc.text("FinResearch AI  |  Demo Part 2 -- Research + Benchmark Agents  (2 min 30 sec)", 12, 9.8);
  doc.setTextColor(...INK); doc.setFontSize(20);
  doc.text(clean(title), 12, 30);
  if (sub) { doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...MUTED); doc.text(clean(sub), 12, 37.5); }
  doc.setFillColor(...GOLD); doc.rect(12, sub ? 41 : 35, 28, 1.8, "F");
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...MUTED);
  doc.text("Speaker script -- timings included for rehearsal", 12, H - 8);
  doc.text("Page " + n, W - 12, H - 8, { align: "right" });
  return sub ? 52 : 46;
}

function stepBox(y, time, title, show, say, accent) {
  doc.setFillColor(255, 255, 255); doc.setDrawColor(...accent); doc.setLineWidth(0.9);
  const sayLines = doc.splitTextToSize(clean(say), W - 34);
  const h = 24 + sayLines.length * 5;
  doc.roundedRect(12, y, W - 24, h, 3, 3, "FD");
  // time chip
  doc.setFillColor(...accent);
  doc.roundedRect(16, y + 4, 30, 9, 2, 2, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
  doc.text(clean(time), 31, y + 10, { align: "center" });
  doc.setFont("helvetica", "bold"); doc.setFontSize(11.5); doc.setTextColor(...INK);
  doc.text(clean(title), 50, y + 10.5);
  doc.setFont("helvetica", "bold"); doc.setFontSize(9.2); doc.setTextColor(...GREEN);
  const showLines = doc.splitTextToSize("SHOW:  " + clean(show), W - 34);
  let sy = y + 18.5;
  for (const ln of showLines) { doc.text(ln, 17, sy); sy += 5; }
  doc.setFont("helvetica", "italic"); doc.setFontSize(9.2); doc.setTextColor(...INK);
  let ly = sy + 1.5;
  doc.text("SAY:", 17, ly); 
  ly += 5;
  for (const ln of sayLines) { doc.text(ln, 17, ly); ly += 5; }
  return y + h + 4;
}

// ================= PAGE 1 =================
let y = header("Timing Plan + Research Agent", "Total time: 2 minutes 30 seconds -- one speaker, live demo");

// timing table
doc.setFillColor(...BRAND); doc.rect(12, y, W - 24, 9, "F");
doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
doc.text("Segment", 15, y + 6.2); doc.text("Clock", 95, y + 6.2); doc.text("Time", 130, y + 6.2); doc.text("Focus", 160, y + 6.2);
const rows = [
  ["1. Opening", "0:00 - 0:10", "10 sec", "Set up the two agents"],
  ["2. Research Agent", "0:10 - 1:15", "65 sec", "Cited answers"],
  ["3. Benchmark Agent", "1:15 - 2:20", "65 sec", "Safe comparison"],
  ["4. Wrap-up", "2:20 - 2:30", "10 sec", "Closing line"],
];
let ry = y + 9;
rows.forEach((r, i) => {
  doc.setFillColor(...(i % 2 ? [248, 250, 252] : [255, 255, 255])); doc.rect(12, ry, W - 24, 8.5, "F");
  doc.setTextColor(...INK); doc.setFont("helvetica", i === 1 || i === 2 ? "bold" : "normal"); doc.setFontSize(8.8);
  doc.text(r[0], 15, ry + 5.9); doc.text(r[1], 95, ry + 5.9); doc.text(r[2], 130, ry + 5.9); doc.text(r[3], 160, ry + 5.9);
  ry += 8.5;
});
doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3); doc.rect(12, y, W - 24, ry - y);
y = ry + 6;

y = stepBox(y, "0:00-0:10", "1. OPENING",
  "Have the app open, logged in, with at least one uploaded filing (e.g. Apple FY2024 demo PDF).",
  "Now I will show two on-demand agents: the Research Agent, which answers questions with citations you can verify, and the Benchmark Agent, which compares companies without ever inventing a number.", BRAND);

y = stepBox(y, "0:10-1:15", "2. RESEARCH AGENT (65 sec)",
  "Open the Research / chat page. Type the question: 'What was the total revenue in FY2024 and what are the key risks mentioned in the filing?' Then send. When the answer appears, point at the [S1] [S2] tags. Open one citation to show the exact source passage (document name, section, excerpt).",
  "The Research Agent is NOT allowed to answer from memory. First it retrieves real passages from the uploaded filings -- by meaning when embeddings are on, by keywords otherwise. Then the AI may answer ONLY from those passages, and every claim carries a tag like [S1] that points to the exact source. Watch -- if I ask something the documents do not contain, it says 'no source passages passed the relevance filter' instead of inventing an answer. This is retrieval-grounded research: every sentence is auditable.", GREEN);

// ================= PAGE 2 =================
y = header("Benchmark Agent + Wrap-up + Backup");

y = stepBox(y, "1:15-2:20", "3. BENCHMARK AGENT (65 sec)",
  "Open the Benchmark page. Select Apple vs Microsoft for the same fiscal year (e.g. FY2024). Generate the comparison. Point at: (a) the side-by-side metrics table, (b) the period labels under each company, (c) the verdict/insight text. Then mention the guard: pick different fiscal years and show it warns instead of comparing blindly.",
  "The Benchmark Agent compares companies safely -- three hard rules built into the code. Rule one: periods must be compatible -- it refuses to silently compare FY2024 with FY2023 and shows a clear warning instead. Rule two: the exact extracted metric values are packed into the prompt by CODE -- so the AI can write the analysis but can never round, drop, or invent a number. Rule three: the verdict is written only from verified fields; metrics that are missing are shown honestly as gaps. The result: a comparison an analyst can trust.", GOLD);

y = stepBox(y, "2:20-2:30", "4. WRAP-UP (10 sec)",
  "Stay on the benchmark result screen.",
  "Cited research and safe comparisons -- two agents, zero invented numbers, and every figure traceable back to the filing. Thank you.", BRAND);

// code anchors
doc.setFillColor(...LIGHT); doc.setDrawColor(...BRAND); doc.setLineWidth(0.8);
const h1 = 46;
doc.roundedRect(12, y + 2, W - 24, h1, 3, 3, "FD");
doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...BRAND);
doc.text("IF THE EXAMINER ASKS ABOUT THE CODE -- quick anchors", 17, y + 11);
doc.setFont("courier", "bold"); doc.setFontSize(8); doc.setTextColor(...GOLD);
doc.text("src/lib/agents/researchAgent.ts -> answerResearchQuestion()", 17, y + 19);
doc.setFont("helvetica", "normal"); doc.setFontSize(8.6); doc.setTextColor(...INK);
doc.text("Decomposes the question into retrieval steps, builds citations S1, S2... (document, section, chunk, excerpt), and answers only from them.", 17, y + 24.5);
doc.setFont("courier", "bold"); doc.setFontSize(8); doc.setTextColor(...GOLD);
doc.text("src/lib/agents/benchmarkAgent.ts -> generateBenchmarkInsights()", 17, y + 31.5);
doc.setFont("helvetica", "normal"); doc.setFontSize(8.6); doc.setTextColor(...INK);
doc.text("Period-compatibility guard, exact metric values packed by code, verdict compiled only from verified fields.", 17, y + 37);
doc.setFont("courier", "bold"); doc.setFontSize(8); doc.setTextColor(...GOLD);
doc.text("src/lib/agents/documentAgent.ts -> searchDocumentChunks() + embeddingAgent.ts (optional vectors)", 17, y + 43.5);
y += h1 + 8;

// Q&A backup
doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...INK);
doc.text("Q&A BACKUP (one-line answers)", 12, y);
const qa = [
  ["What if the filing has no relevant passage?", "It answers 'no source passages passed the relevance filter' -- never invents."],
  ["What if embeddings are not configured?", "Keyword relevance search takes over automatically -- citations work the same."],
  ["Why can't the AI fake benchmark numbers?", "Exact values are inserted into the prompt by code and the verdict uses only verified fields."],
  ["Can it compare different fiscal years?", "It warns about the period mismatch instead of producing a misleading comparison."],
  ["Where are the answers stored?", "chat_messages / benchmark_comparisons tables -- the history page shows them again."],
];
let qy = y + 6;
qa.forEach(([q, a], i) => {
  doc.setFillColor(...(i % 2 ? [248, 250, 252] : [255, 255, 255])); doc.rect(12, qy, W - 24, 11, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(8.6); doc.setTextColor(...BRAND);
  doc.text(doc.splitTextToSize("Q: " + clean(q), W - 30)[0], 15, qy + 4.5);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.4); doc.setTextColor(...INK);
  doc.text(doc.splitTextToSize("A: " + clean(a), W - 30)[0], 15, qy + 9);
  qy += 11;
});
doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3); doc.rect(12, y + 6, W - 24, qy - y - 6);

// ================= SAVE =================
const file = path.join(OUT, "DEMO_PART2_BENCHMARK_RESEARCH.pdf");
doc.save(file);
console.log("wrote", file, "| pages:", n);
