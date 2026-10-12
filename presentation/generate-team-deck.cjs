/*
 * 5-minute team presentation deck -- Microsoft PowerPoint Widescreen 16:9
 * (338.67 x 190.5 mm = 13.333 x 7.5 in, the standard PPT slide size).
 * 10 slides, 2 per speaker. Sentence-style content, large type.
 * Speaker timings are intentionally NOT on slides.
 * Run from repo root:  node presentation/generate-team-deck.cjs
 */
const fs = require("fs");
const path = require("path");
const { jsPDF } = require("jspdf");

const OUT = path.resolve(__dirname);
const W = 338.67, H = 190.5; // PowerPoint Widescreen 16:9 exact

const INK = [15, 23, 42];
const BRAND = [30, 58, 138];
const BRAND2 = [37, 99, 235];
const LIGHT = [241, 245, 249];
const GREEN = [22, 101, 52];
const RED = [185, 28, 28];
const GOLD = [217, 119, 6];
const MUTED = [71, 85, 105];

function clean(s) {
  return String(s)
    .replace(/→/g, "->").replace(/⇒/g, "=>").replace(/✓/g, "[v]").replace(/✗/g, "[x]")
    .replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/—/g, "--").replace(/–/g, "-")
    .replace(/…/g, "...").replace(/×/g, "x").replace(/≈/g, "~");
}

function dataUrl(p) {
  return "data:image/jpeg;base64," + fs.readFileSync(p).toString("base64");
}

const doc = new jsPDF({ unit: "mm", format: [W, H], orientation: "landscape" });
let n = 0;

function personChip(person) {
  doc.setFillColor(...BRAND2);
  doc.roundedRect(14, 10, 36, 11, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(13);
  doc.text(clean(person), 32, 17.3, { align: "center" });
}

function frame(person, title, kicker) {
  n += 1;
  if (n > 1) doc.addPage([W, H]);
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, W, H, "F");
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, 6, H, "F");
  personChip(person);
  if (kicker) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...MUTED);
    doc.text(clean(kicker), W - 14, 17.3, { align: "right" });
  }
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold"); doc.setFontSize(32);
  doc.text(clean(title), 14, 40);
  doc.setFillColor(...GOLD);
  doc.rect(14, 45, 42, 2.2, "F");
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...MUTED);
  doc.text("FinResearch AI  |  Multi-Agent Financial Research System", 14, H - 7);
  doc.text("Team Presentation", W - 14, H - 7, { align: "right" });
  return 58;
}

function sentences(items, y0, opts = {}) {
  const size = opts.size || 16;
  const lh = size * 0.58;
  let y = y0;
  for (const it of items) {
    const obj = typeof it === "object";
    const text = clean(obj ? it.text : it);
    const color = obj && it.color ? it.color : INK;
    doc.setFillColor(...(obj && it.dot ? it.dot : BRAND2));
    doc.circle(17.5, y - 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, W - 42);
    for (const line of lines) { doc.text(line, 23, y); y += lh; }
    y += opts.gap === undefined ? 5.5 : opts.gap;
  }
  return y;
}

function card(x, y, w, h, title, body, fill, stroke, titleCol, bodyCol) {
  doc.setFillColor(...fill); doc.setDrawColor(...stroke); doc.setLineWidth(0.9);
  doc.roundedRect(x, y, w, h, 3, 3, "FD");
  doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(...titleCol);
  doc.text(clean(title), x + 8, y + 8.5);
  doc.setFont("helvetica", "normal"); doc.setFontSize(12.5); doc.setTextColor(...bodyCol);
  const lines = doc.splitTextToSize(clean(body), w - 16);
  let by = y + 16;
  for (const ln of lines.slice(0, 2)) { doc.text(ln, x + 8, by); by += 5.6; }
}

function agentRow(y, name, line, accent) {
  const h = 19;
  doc.setFillColor(...LIGHT); doc.setDrawColor(...accent); doc.setLineWidth(0.9);
  doc.roundedRect(14, y, W - 28, h, 3, 3, "FD");
  doc.setFillColor(...accent);
  doc.roundedRect(18, y + 3.5, 52, 12, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(11.5);
  doc.text(clean(name), 44, y + 11.2, { align: "center" });
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold"); doc.setFontSize(13.5);
  const lines = doc.splitTextToSize(clean(line), W - 92);
  let ly = y + 8.5;
  for (const ln of lines.slice(0, 2)) { doc.text(ln, 78, ly); ly += 5.6; }
  return y + h + 5.5;
}

function stepStrip(y, steps) {
  const bw = 88, bh = 24, gap = 30;
  const total = steps.length * bw + (steps.length - 1) * gap;
  let x = (W - total) / 2;
  for (let i = 0; i < steps.length; i++) {
    doc.setFillColor(...LIGHT); doc.setDrawColor(...BRAND2); doc.setLineWidth(0.9);
    doc.roundedRect(x, y, bw, bh, 3, 3, "FD");
    doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(...BRAND);
    doc.text(clean(steps[i]), x + bw / 2, y + bh / 2 + 1.8, { align: "center" });
    if (i < steps.length - 1) {
      doc.setFillColor(...GOLD);
      const ax = x + bw + 7, ay = y + bh / 2;
      doc.triangle(ax, ay - 5, ax, ay + 5, ax + 13, ay, "F");
    }
    x += bw + gap;
  }
}

function box(x, yy, w, h, label, fill, tcol, size) {
  doc.setFillColor(...fill); doc.setDrawColor(...BRAND2); doc.setLineWidth(0.8);
  doc.roundedRect(x, yy, w, h, 2.5, 2.5, "FD");
  doc.setTextColor(...tcol);
  doc.setFont("helvetica", "bold"); doc.setFontSize(size);
  doc.text(clean(label), x + w / 2, yy + h / 2 + 1.5, { align: "center" });
}

function downArrow(x, y1, y2) {
  doc.setDrawColor(...BRAND2); doc.setLineWidth(1.2);
  doc.line(x, y1, x, y2 - 4);
  doc.setFillColor(...BRAND2);
  doc.triangle(x - 3, y2 - 4, x + 3, y2 - 4, x, y2, "F");
}

// ================= SLIDE 1 : Person 1 - Title + Problem =================
(() => {
  n += 1;
  doc.setFillColor(11, 22, 48);
  doc.rect(0, 0, W, H, "F");
  try {
    doc.addImage(dataUrl(path.join(OUT, "assets/hero.jpg")), "JPEG", 186, 0, 152, H);
    doc.setFillColor(11, 22, 48);
    doc.rect(180, 0, 10, H, "F"); // seam blend
  } catch (e) { /* optional */ }
  personChip("PERSON 1");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(42);
  doc.text("FinResearch AI", 16, 52);
  doc.setFontSize(17);
  doc.setTextColor(147, 197, 253);
  doc.text("Multi-Agent Financial Research System", 16, 64);

  doc.setFillColor(...GOLD);
  doc.rect(16, 72, 44, 2.4, "F");

  doc.setFont("helvetica", "bold"); doc.setFontSize(24); doc.setTextColor(255, 255, 255);
  doc.text("THE PROBLEM", 16, 92);
  doc.setFontSize(15.5); doc.setTextColor(226, 232, 240);
  const t = [
    "Annual reports run 100+ pages and take hours to read and analyse by hand.",
    "AI chat tools invent numbers and show no sources for their claims.",
    "Teams cannot trust financial answers that they cannot verify.",
  ];
  let y = 106;
  for (const line of t) {
    doc.setFillColor(...GOLD); doc.circle(19, y - 1.4, 1.5, "F");
    const lines = doc.splitTextToSize(clean(line), 152);
    for (const ln of lines) { doc.text(ln, 25, y); y += 7.4; }
    y += 4;
  }
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(148, 163, 184);
  doc.text("Team Presentation  |  Project Evaluation", 16, H - 10);
})();

// ================= SLIDE 2 : Person 1 - Solution =================
let y = frame("PERSON 1", "How We Solve It", "Solution");
y = sentences([
  "You upload a filing, and eight specialised agents analyse it end to end.",
  "We extract 26 financial metrics and flag every risk with its exact source quote.",
  "Ask questions, compare companies, and generate a full research report in seconds.",
  { text: "Every number on screen carries its evidence line from the original filing.", color: GREEN },
], y, { size: 15.5, gap: 6 });
stepStrip(y + 2, ["UPLOAD", "ANALYSE", "DECIDE"]);

// ================= SLIDE 3 : Person 2 - Why multi-agent =================
y = frame("PERSON 2", "Why Multi-Agent?", "Our Approach");
y = sentences([
  "One big AI prompt is a black box -- when it fails, everything fails with it.",
  "We split the job into eight focused agents, each with its own fallback path.",
  "Numbers are computed by reliable code; language is handled by AI.",
  { text: "The result is a system that is testable, auditable, and explainable.", color: GREEN },
], y, { size: 15.5, gap: 6 });
card(14, y + 2, 150, 30, "[x]  Single LLM", "It hallucinates numbers, cites nothing, and one failure kills the whole answer.", [254, 242, 242], RED, RED, RED);
card(174, y + 2, 150, 30, "[v]  Multi-Agent", "Verified numbers, cited answers, isolated failures -- one stage can fail while the rest continue.", [240, 253, 244], GREEN, GREEN, GREEN);

// ================= SLIDE 4 : Person 2 - How agents interact =================
y = frame("PERSON 2", "How Agents Interact", "Architecture");
doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(...MUTED);
doc.text("The Orchestrator runs each stage in order and every stage writes to Postgres.", 14, y);
// horizontal flow
const py = y + 10;
const names = ["Validation", "Document", "Extraction", "Red Flag", "Embedding"];
const bwi = 52, gapi = 12;
let px = 14;
box(px, py, 62, 16, "USER UPLOAD", BRAND, [255, 255, 255], 12);
// arrow to orchestrator below
box(14, py + 26, 180, 14, "ORCHESTRATOR  (queues, retries, isolates failures)", GOLD, [255, 255, 255], 11.5);
downArrow(104, py + 16, py + 26);
// pipeline to the right of upload
px = 92;
for (let i = 0; i < names.length; i++) {
  box(px, py, bwi, 16, names[i], [219, 234, 254], [30, 64, 175], 11);
  if (i < names.length - 1) {
    doc.setFillColor(...BRAND2);
    doc.triangle(px + bwi + 1, py + 8, px + bwi + 1, py + 8, px + bwi + gapi - 2, py + 8, "F");
    doc.setDrawColor(...BRAND2); doc.setLineWidth(1);
    doc.line(px + bwi + 1, py + 8, px + bwi + gapi - 2, py + 8);
  }
  px += bwi + gapi;
}
// bottom row
const by = py + 50;
box(14, by, 150, 15, "POSTGRES: data + job queue + agent logs", LIGHT, BRAND, 11);
box(174, by, 150, 15, "ON DEMAND: Research / Report / Benchmark", [240, 253, 244], GREEN, 11);
downArrow(104, py + 40, py + 50);
doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(...MUTED);
doc.text("If one stage fails, the others keep running -- failures stay isolated. On-demand agents answer whenever you ask.", 14, by + 28);

// ================= SLIDE 5 : Person 3 - Agents 1 =================
y = frame("PERSON 3", "The Agents (1/2)", "Automatic on Upload");
y = agentRow(y, "Validation", "Checks that the upload is truly a financial document -- resumes, invoices, and novels are rejected by name.", BRAND2);
y = agentRow(y, "Document", "Splits the report into searchable chunks and builds a full-text index of the document.", BRAND2);
y = agentRow(y, "Extraction", "Reads the report and extracts 26 financial metrics, each with its source evidence line.", BRAND2);
y = agentRow(y, "Red Flag", "Scans the filing language for risk signals like going concern and debt, always with exact quotes.", BRAND2);
y = agentRow(y, "Embedding", "Turns text into vectors for semantic search -- optional and works with any embeddings provider.", BRAND2);

// ================= SLIDE 6 : Person 3 - Agents 2 =================
y = frame("PERSON 3", "The Agents (2/2)", "On Demand");
y = agentRow(y, "Research", "Answers your questions with [S1]-style citations that you can click and verify against the filing.", GREEN);
y = agentRow(y, "Report", "Builds the full research report -- tables generated by code, narrative written by AI from real data.", GREEN);
y = agentRow(y, "Benchmark", "Compares companies and periods side by side, safely across fiscal-year gaps.", GREEN);
y = agentRow(y, "Orchestrator", "Manages the job queue, retries failures automatically, and keeps every stage isolated.", GOLD);
doc.setFont("helvetica", "bold"); doc.setFontSize(13.5); doc.setTextColor(...MUTED);
doc.text("Each agent does one job well, has its own tests, and has its own fallback.", 16, y + 3);

// ================= SLIDE 7 : Person 4 - Measuring metrics =================
y = frame("PERSON 4", "Measuring The Metrics", "Extraction & Quality");
y = sentences([
  "We measure 26 metrics per document: growth, margins, ratios, and cash flow.",
  "A regex label parser reads statements like 'Total revenue: $383,285 million' exactly as written.",
  "Every metric stores the source line it came from -- nothing is ever guessed.",
  { text: "Quality gate: every AI answer must match the source text before it is shown.", color: GREEN },
], y, { size: 15, gap: 6 });
// evidence card
doc.setFillColor(...LIGHT); doc.setDrawColor(...BRAND2); doc.setLineWidth(0.9);
doc.roundedRect(14, y + 2, 200, 32, 3, 3, "FD");
doc.setFont("courier", "bold"); doc.setFontSize(13); doc.setTextColor(...BRAND);
doc.text('Total revenue:  $383,285 million', 22, y + 15);
doc.setFont("courier", "normal"); doc.setFontSize(11); doc.setTextColor(...MUTED);
doc.text('Evidence: the exact filing line is saved with the metric', 22, y + 26);
doc.setFillColor(...GREEN);
doc.roundedRect(224, y + 2, 100, 32, 3, 3, "F");
doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(255, 255, 255);
doc.text("Verified by code,", 274, y + 14, { align: "center" });
doc.text("not by AI", 274, y + 23, { align: "center" });

// ================= SLIDE 8 : Person 4 - Reliability =================
y = frame("PERSON 4", "Built To Be Reliable", "Graceful Degradation");
y = sentences([
  "If the AI provider is offline, deterministic rule-based modes take over automatically.",
  "If embeddings are disabled, keyword search keeps retrieval working for every query.",
  "If one stage crashes, the pipeline marks it partial and continues with the rest.",
  "Jobs run in the background with automatic retries and stale-lock recovery.",
  { text: "Security: hashed passwords, scoped API routes, and validated uploads.", color: GREEN },
], y, { size: 14.5, gap: 5.5 });
const chips = [
  ["AI offline", "Rule-based mode"],
  ["Bad PDF", "Clear, exact error"],
  ["Stage crash", "Status: partial"],
];
const cw = (W - 28 - 2 * 8) / 3;
let cx = 14;
for (const [a, b] of chips) {
  doc.setFillColor(240, 253, 244); doc.setDrawColor(...GREEN); doc.setLineWidth(0.9);
  doc.roundedRect(cx, y + 2, cw, 18, 3, 3, "FD");
  doc.setFont("helvetica", "bold"); doc.setFontSize(12.5); doc.setTextColor(...RED);
  doc.text(clean(a), cx + 8, y + 9);
  doc.setFontSize(12.5); doc.setTextColor(...GREEN);
  doc.text("->  " + clean(b), cx + 8, y + 15.5);
  cx += cw + 8;
}

// ================= SLIDE 9 : Person 5 - The system today =================
y = frame("PERSON 5", "The System Today", "Built & Deployed");
// number chips in one row
const nums = [["8", "AGENTS"], ["26", "METRICS"], ["20", "APIs"], ["12", "TABLES"], ["$0", "COST"]];
const nw = 46, ng = 8;
let nx = 14;
for (const [num, label] of nums) {
  doc.setFillColor(...BRAND);
  doc.roundedRect(nx, y, nw, 28, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(21);
  doc.text(num, nx + nw / 2, y + 13, { align: "center" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  doc.text(label, nx + nw / 2, y + 22, { align: "center" });
  nx += nw + ng;
}
try {
  doc.addImage(dataUrl(path.join(OUT, "assets/network.jpg")), "JPEG", 196, y + 36, 128, 72);
} catch (e) { /* optional */ }
y = sentences([
  "Eight agents, twenty APIs, and twelve database tables -- live and tested end to end.",
  "The full loop: upload a filing, receive risk flags, ask research questions, and export the report.",
  { text: "Built entirely on free tiers -- zero infrastructure cost to run.", color: GREEN },
], y + 40, { size: 15, gap: 6 });

// ================= SLIDE 10 : Person 5 - Close =================
n += 1;
doc.addPage([W, H]);
doc.setFillColor(11, 22, 48);
doc.rect(0, 0, W, H, "F");
personChip("PERSON 5");

doc.setFont("helvetica", "bold"); doc.setFontSize(34); doc.setTextColor(255, 255, 255);
doc.text("Why It Matters", 16, 52);
doc.setFillColor(...GOLD); doc.rect(16, 58, 42, 2.2, "F");
doc.setFontSize(18); doc.setTextColor(226, 232, 240);
const take = [
  "Trustworthy AI: every claim is cited and every number is sourced.",
  "Multi-agent design makes the system robust by construction, not by luck.",
  "Built, tested, and deployed -- and it costs nothing to run.",
];
let yy = 82;
for (const t2 of take) {
  doc.setFillColor(...GOLD); doc.circle(19, yy - 1.5, 1.6, "F");
  const lines = doc.splitTextToSize(clean(t2), 180);
  for (const ln of lines) { doc.text(ln, 25, yy); yy += 8.5; }
  yy += 6;
}
doc.setFontSize(48); doc.setTextColor(255, 255, 255);
doc.text("Thank You", 16, 152);
doc.setFontSize(20); doc.setTextColor(147, 197, 253);
doc.text("Questions?", 16, 168);

// ================= save =================
const file = path.join(OUT, "TEAM_PRESENTATION_5MIN.pdf");
doc.save(file);
console.log("wrote", file, "| slides:", n, "| PowerPoint 16:9 (338.67 x 190.5 mm)");
