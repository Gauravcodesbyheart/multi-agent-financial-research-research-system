/*
 * 5-minute team deck -- PowerPoint 16:9 (338.67 x 190.5 mm = 960x540pt).
 * Professional template: Montserrat + Roboto embedded fonts, navy/gold theme,
 * complete architecture flowchart (ALL 8 agents), sentence-style content.
 * Person labels kept (styled). No timings on slides.
 * Run from repo root:  node presentation/generate-team-deck.cjs
 */
const fs = require("fs");
const path = require("path");
const { jsPDF } = require("jspdf");

const OUT = path.resolve(__dirname);
const FONTS = path.join(__dirname, "..", "node_modules", "@expo-google-fonts");
const W = 338.67, H = 190.5;

const INK = [15, 23, 42];
const NAVY = [11, 22, 48];
const NAVY2 = [30, 58, 138];
const BLUE = [37, 99, 235];
const SKY = [219, 234, 254];
const GOLD = [217, 119, 6];
const GOLD2 = [245, 158, 11];
const GREEN = [22, 101, 52];
const GREEN_BG = [240, 253, 244];
const RED = [185, 28, 28];
const RED_BG = [254, 242, 242];
const BG = [248, 250, 252];
const MUTED = [71, 85, 105];
const WHITE = [255, 255, 255];

function clean(s) {
  return String(s)
    .replace(/→/g, "->").replace(/⇒/g, "=>").replace(/✓/g, "[v]").replace(/✗/g, "[x]")
    .replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/—/g, "--").replace(/–/g, "-")
    .replace(/…/g, "...").replace(/×/g, "x").replace(/≈/g, "~");
}

function img(p) {
  return "data:image/jpeg;base64," + fs.readFileSync(p).toString("base64");
}

const doc = new jsPDF({ unit: "mm", format: [W, H], orientation: "landscape" });

// ---- embed fonts ----
function addFont(file, family, style) {
  const p = path.join(FONTS, file);
  doc.addFileToVFS(path.basename(p), fs.readFileSync(p).toString("base64"));
  doc.addFont(path.basename(p), family, style);
}
addFont("montserrat/600SemiBold/Montserrat_600SemiBold.ttf", "Montserrat", "normal");
addFont("montserrat/800ExtraBold/Montserrat_800ExtraBold.ttf", "Montserrat", "bold");
addFont("roboto/400Regular/Roboto_400Regular.ttf", "Roboto", "normal");
addFont("roboto/700Bold/Roboto_700Bold.ttf", "Roboto", "bold");
addFont("roboto/500Medium/Roboto_500Medium.ttf", "RobotoMd", "normal");

let n = 0;

// ---------- template ----------
function slide(title, person, kicker) {
  n += 1;
  if (n > 1) doc.addPage([W, H]);
  doc.setFillColor(...BG); doc.rect(0, 0, W, H, "F");
  // header band
  doc.setFillColor(...NAVY); doc.rect(0, 0, W, 30, "F");
  doc.setFillColor(...GOLD2); doc.rect(0, 30, W, 1.6, "F");
  // title
  doc.setFont("Montserrat", "bold"); doc.setFontSize(23);
  doc.setTextColor(...WHITE);
  doc.text(clean(title), 16, 19.5);
  if (kicker) {
    doc.setFont("RobotoMd", "normal"); doc.setFontSize(10.5);
    doc.setTextColor(147, 197, 253);
    doc.text(clean(kicker), 16, 26.5);
  }
  // person pill (right of band)
  doc.setFillColor(...GOLD2);
  doc.roundedRect(W - 62, 8, 46, 14, 7, 7, "F");
  doc.setFont("Montserrat", "bold"); doc.setFontSize(10.5);
  doc.setTextColor(...NAVY);
  doc.text(clean(person), W - 39, 17.2, { align: "center" });
  // footer
  doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.4);
  doc.line(16, H - 10, W - 16, H - 10);
  doc.setFont("RobotoMd", "normal"); doc.setFontSize(7.5); doc.setTextColor(...MUTED);
  doc.text("FinResearch AI  |  Multi-Agent Financial Research System", 16, H - 5.5);
  doc.text(String(n).padStart(2, "0") + " / 10", W - 16, H - 5.5, { align: "right" });
  return 42;
}

function sentences(items, y0, opts = {}) {
  const size = opts.size || 13;
  const lh = size * 0.56;
  const width = opts.width || W - 44;
  let y = y0;
  for (const it of items) {
    const obj = typeof it === "object";
    const text = clean(obj ? it.text : it);
    const color = obj && it.color ? it.color : INK;
    doc.setFillColor(...(obj && it.dot ? it.dot : GOLD2));
    doc.circle((opts.x || 16) + 3.5, y - 1.2, 1.6, "F");
    doc.setFont("Roboto", "bold"); doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, width);
    for (const line of lines) { doc.text(line, (opts.x || 16) + 9, y); y += lh; }
    y += opts.gap === undefined ? 5 : opts.gap;
  }
  return y;
}

function agentCard(y, name, line, accent) {
  const h = 20;
  doc.setFillColor(...WHITE); doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.5);
  doc.roundedRect(16, y, W - 32, h, 3, 3, "FD");
  doc.setFillColor(...accent);
  doc.roundedRect(16, y, 6, h, 3, 3, "F");
  doc.setFillColor(...accent);
  doc.roundedRect(26, y + 4.5, 54, 11, 2, 2, "F");
  doc.setTextColor(...WHITE);
  doc.setFont("Montserrat", "bold"); doc.setFontSize(9);
  doc.text(clean(name), 53, y + 11.7, { align: "center" });
  doc.setTextColor(...INK);
  doc.setFont("Roboto", "bold"); doc.setFontSize(12);
  const lines = doc.splitTextToSize(clean(line), W - 100);
  let ly = y + 9;
  for (const ln of lines.slice(0, 2)) { doc.text(ln, 88, ly); ly += 5.4; }
  return y + h + 5.5;
}

function chip(x, y, w, h, label, fill, tcol, size, bold) {
  doc.setFillColor(...fill); doc.setDrawColor(190, 200, 215); doc.setLineWidth(0.5);
  doc.roundedRect(x, y, w, h, 2.5, 2.5, "FD");
  doc.setTextColor(...tcol);
  doc.setFont(bold === false ? "RobotoMd" : "Montserrat", bold === false ? "normal" : "bold");
  doc.setFontSize(size);
  const lines = doc.splitTextToSize(clean(label), w - 5);
  let yy = y + h / 2 + 1 - (lines.length - 1) * size * 0.27;
  for (const ln of lines) { doc.text(ln, x + w / 2, yy, { align: "center" }); yy += size * 0.52; }
}

function arrowRight(x1, y, x2) {
  doc.setFillColor(...BLUE); doc.setDrawColor(...BLUE);
  doc.setLineWidth(1.2); doc.line(x1, y, x2 - 3, y);
  doc.triangle(x2 - 3, y - 2.6, x2 - 3, y + 2.6, x2, y, "F");
}
function arrowDown(x, y1, y2) {
  doc.setFillColor(...BLUE); doc.setDrawColor(...BLUE);
  doc.setLineWidth(1.2); doc.line(x, y1, x, y2 - 3);
  doc.triangle(x - 2.6, y2 - 3, x + 2.6, y2 - 3, x, y2, "F");
}

// =================== SLIDE 1 : COVER ===================
(() => {
  n += 1;
  doc.setFillColor(...NAVY); doc.rect(0, 0, W, H, "F");
  try {
    doc.addImage(img(path.join(OUT, "assets/hero.jpg")), "JPEG", 188, 0, 151, H);
    doc.setFillColor(...NAVY); doc.rect(182, 0, 10, H, "F");
  } catch (e) {}
  doc.setFillColor(...GOLD2);
  doc.roundedRect(16, 14, 46, 13, 6.5, 6.5, "F");
  doc.setFont("Montserrat", "bold"); doc.setFontSize(10.5);
  doc.setTextColor(...NAVY);
  doc.text("PERSON 1", 39, 22.7, { align: "center" });

  doc.setFont("Montserrat", "bold"); doc.setFontSize(38);
  doc.setTextColor(...WHITE);
  doc.text("FinResearch AI", 16, 56);
  doc.setFont("Montserrat", "normal"); doc.setFontSize(14);
  doc.setTextColor(147, 197, 253);
  doc.text("Multi-Agent Financial Research System", 16, 68);
  doc.setFillColor(...GOLD2); doc.rect(16, 76, 40, 2.2, "F");

  doc.setFont("Montserrat", "bold"); doc.setFontSize(17); doc.setTextColor(...WHITE);
  doc.text("THE PROBLEM", 16, 94);
  doc.setFont("Roboto", "normal"); doc.setFontSize(12.5); doc.setTextColor(226, 232, 240);
  const t = [
    "Annual reports run 100+ pages and take hours to read and analyse by hand.",
    "AI chat tools invent numbers and show no sources for their claims.",
    "Teams cannot trust financial answers that they cannot verify.",
  ];
  let y = 108;
  for (const line of t) {
    doc.setFillColor(...GOLD2); doc.circle(19, y - 1.1, 1.5, "F");
    const lines = doc.splitTextToSize(clean(line), 150);
    for (const ln of lines) { doc.text(ln, 25, y); y += 6.6; }
    y += 3.5;
  }
  doc.setFont("RobotoMd", "normal"); doc.setFontSize(9); doc.setTextColor(148, 163, 184);
  doc.text("Team Presentation  |  Project Evaluation", 16, H - 12);
})();

// =================== SLIDE 2 : SOLUTION ===================
let y = slide("How We Solve It", "PERSON 1", "The solution");
y = sentences([
  "You upload a filing, and eight specialised agents analyse it end to end.",
  "We extract 26 financial metrics and flag every risk with its exact source quote.",
  "Ask questions, compare companies, and generate a full research report in seconds.",
  { text: "Every number on screen carries its evidence line from the original filing.", color: GREEN },
], y, { size: 13, gap: 6, width: 190 });
// step flow (right side)
const steps = ["UPLOAD", "ANALYSE", "DECIDE"];
let sy = 46;
for (let i = 0; i < steps.length; i++) {
  chip(220, sy, 100, 20, steps[i], i === 2 ? GREEN_BG : SKY, i === 2 ? GREEN : NAVY2, 13);
  if (i < 2) arrowDown(270, sy + 20, sy + 28);
  sy += 28;
}
try {
  doc.addImage(img(path.join(OUT, "assets/verify.jpg")), "JPEG", 220, 133, 100, 40);
} catch (e) {}

// =================== SLIDE 3 : WHY MULTI-AGENT ===================
y = slide("Why Multi-Agent?", "PERSON 2", "Our approach");
y = sentences([
  "One big AI prompt is a black box -- when it fails, everything fails with it.",
  "We split the job into eight focused agents, each with its own fallback path.",
  "Numbers are computed by reliable code; language is handled by AI.",
  { text: "The result is a system that is testable, auditable, and explainable.", color: GREEN },
], y, { size: 13, gap: 6 });
// compare cards
doc.setFillColor(...RED_BG); doc.setDrawColor(...RED); doc.setLineWidth(1);
doc.roundedRect(16, y + 2, 148, 34, 4, 4, "FD");
doc.setFont("Montserrat", "bold"); doc.setFontSize(13); doc.setTextColor(...RED);
doc.text("[x]  Single LLM", 24, y + 13);
doc.setFont("Roboto", "normal"); doc.setFontSize(10.5);
doc.text(doc.splitTextToSize("It hallucinates numbers, cites nothing, and one failure kills the whole answer.", 132), 24, y + 21);
doc.setFillColor(...GREEN_BG); doc.setDrawColor(...GREEN); doc.setLineWidth(1);
doc.roundedRect(176, y + 2, 146, 34, 4, 4, "FD");
doc.setFont("Montserrat", "bold"); doc.setFontSize(13); doc.setTextColor(...GREEN);
doc.text("[v]  Multi-Agent", 184, y + 13);
doc.setFont("Roboto", "normal"); doc.setFontSize(10.5);
doc.text(doc.splitTextToSize("Verified numbers, cited answers, isolated failures -- one stage can fail while the rest continue.", 130), 184, y + 21);

// =================== SLIDE 4 : ARCHITECTURE (COMPLETE) ===================
y = slide("How Agents Interact", "PERSON 2", "Architecture -- all 8 agents + orchestrator");

// lane 1
doc.setFont("Montserrat", "bold"); doc.setFontSize(10); doc.setTextColor(...NAVY2);
doc.text("EVERY UPLOAD  (automatic pipeline)", 16, y + 1);
const auto = [
  ["Validation\nAgent", GREEN],
  ["Document\nAgent", NAVY2],
  ["Extraction\nAgent", NAVY2],
  ["Red Flag\nAgent", NAVY2],
  ["Embedding\nAgent", NAVY2],
];
const bw = 52, gap = 9.5;
let bx = 16;
for (let i = 0; i < auto.length; i++) {
  chip(bx, y + 5, bw, 19, auto[i][0].replace("\n", " "), auto[i][1] === GREEN ? GREEN_BG : SKY, auto[i][1] === GREEN ? GREEN : NAVY2, 8.5);
  if (i < auto.length - 1) arrowRight(bx + bw + 0.5, y + 14.5, bx + bw + gap - 0.5);
  bx += bw + gap;
}
// orchestrator band
arrowDown(W / 2, y + 24, y + 31);
doc.setFillColor(...GOLD); doc.setDrawColor(...GOLD); doc.setLineWidth(0.8);
doc.roundedRect(16, y + 31, W - 32, 15, 3, 3, "FD");
doc.setFont("Montserrat", "bold"); doc.setFontSize(11); doc.setTextColor(...WHITE);
doc.text("PIPELINE ORCHESTRATOR  --  job queue  |  atomic claim  |  retries  |  stage isolation", W / 2, y + 41, { align: "center" });
// lane 2
doc.setFont("Montserrat", "bold"); doc.setFontSize(10); doc.setTextColor(...GREEN);
doc.text("ON DEMAND  (agents that answer whenever you ask)", 16, y + 56);
const onDemand = [["Research Agent", GREEN], ["Report Agent", GREEN], ["Benchmark Agent", GREEN]];
const bw2 = 66, gap2 = 26;
let bx2 = 42;
for (let i = 0; i < onDemand.length; i++) {
  chip(bx2, y + 61, bw2, 19, onDemand[i][0], GREEN_BG, GREEN, 8.5);
  if (i < onDemand.length - 1) arrowRight(bx2 + bw2 + 1, y + 70.5, bx2 + bw2 + gap2 - 1);
  bx2 += bw2 + gap2;
}
// bottom: DB + AI
doc.setFillColor(...WHITE); doc.setDrawColor(190, 200, 215); doc.setLineWidth(0.6);
doc.roundedRect(16, y + 88, 150, 16, 3, 3, "FD");
doc.setFont("Montserrat", "bold"); doc.setFontSize(9); doc.setTextColor(...NAVY2);
doc.text("POSTGRESQL:  12 tables  |  data + jobs + agent_logs", 91, y + 97, { align: "center" });
doc.roundedRect(176, y + 88, 146, 16, 3, 3, "FD");
doc.setFont("Montserrat", "bold"); doc.setFontSize(9); doc.setTextColor(...GOLD);
doc.text("AI LAYER:  Groq LLM + optional embeddings", 249, y + 97, { align: "center" });
arrowDown(91, y + 80, y + 88);
arrowDown(249, y + 80, y + 88);
doc.setFont("Roboto", "normal"); doc.setFontSize(9); doc.setTextColor(...MUTED);
doc.text("Orchestrator runs every stage; each stage writes to Postgres. If one stage fails, the others keep running -- failures stay isolated.", 16, y + 112);

// =================== SLIDE 5 : AGENTS 1 ===================
y = slide("The Agents (1/2)", "PERSON 3", "Automatic on every upload");
y = agentCard(y, "Validation", "Checks that the upload is truly a financial document -- resumes, invoices, and novels are rejected by name.", GREEN);
y = agentCard(y, "Document", "Splits the report into searchable chunks and builds a full-text index of the document.", BLUE);
y = agentCard(y, "Extraction", "Reads the report and extracts 26 financial metrics, each with its source evidence line.", BLUE);
y = agentCard(y, "Red Flag", "Scans the filing language for risk signals like going concern and debt, always with exact quotes.", BLUE);
y = agentCard(y, "Embedding", "Turns text into vectors for semantic search -- optional and works with any embeddings provider.", BLUE);

// =================== SLIDE 6 : AGENTS 2 ===================
y = slide("The Agents (2/2)", "PERSON 3", "On demand + the controller");
y = agentCard(y, "Research", "Answers your questions with [S1]-style citations that you can click and verify against the filing.", GREEN);
y = agentCard(y, "Report", "Builds the full research report -- tables generated by code, narrative written by AI from real data.", GREEN);
y = agentCard(y, "Benchmark", "Compares companies and periods side by side, safely across fiscal-year gaps.", GREEN);
y = agentCard(y, "Orchestrator", "Manages the job queue, retries failures automatically, and keeps every stage isolated.", GOLD);
doc.setFont("Roboto", "bold"); doc.setFontSize(11); doc.setTextColor(...MUTED);
doc.text("Each agent does one job well, has its own tests, and has its own fallback.", 18, y + 4);

// =================== SLIDE 7 : METRICS ===================
y = slide("Measuring The Metrics", "PERSON 4", "Extraction and quality");
y = sentences([
  "We measure 26 metrics per document: growth, margins, ratios, and cash flow.",
  "A regex label parser reads statements like 'Total revenue: $383,285 million' exactly as written.",
  "Every metric stores the source line it came from -- nothing is ever guessed.",
  { text: "Quality gate: every AI answer must match the source text before it is shown.", color: GREEN },
], y, { size: 12, gap: 5.5, width: 195 });
// evidence card
doc.setFillColor(...WHITE); doc.setDrawColor(...BLUE); doc.setLineWidth(1);
doc.roundedRect(16, y + 4, 195, 38, 3, 3, "FD");
doc.setFont("courier", "bold"); doc.setFontSize(11); doc.setTextColor(...NAVY2);
doc.text('Total revenue:  $383,285 million', 24, y + 18);
doc.setFont("courier", "normal"); doc.setFontSize(9); doc.setTextColor(...MUTED);
doc.text('Evidence: the exact filing line is saved with the metric', 24, y + 30);
doc.setFillColor(...GREEN);
doc.roundedRect(221, y + 4, 101, 38, 3, 3, "F");
doc.setFont("Montserrat", "bold"); doc.setFontSize(11); doc.setTextColor(...WHITE);
doc.text("Verified by code,", 271, y + 18, { align: "center" });
doc.text("not by AI", 271, y + 28, { align: "center" });
try {
  doc.addImage(img(path.join(OUT, "assets/verify.jpg")), "JPEG", 221, y + 48, 101, 52);
} catch (e) {}

// =================== SLIDE 8 : RELIABILITY ===================
y = slide("Built To Be Reliable", "PERSON 4", "Graceful degradation");
y = sentences([
  "If the AI provider is offline, deterministic rule-based modes take over automatically.",
  "If embeddings are disabled, keyword search keeps retrieval working for every query.",
  "If one stage crashes, the pipeline marks it partial and continues with the rest.",
  "Jobs run in the background with automatic retries and stale-lock recovery.",
  { text: "Security: hashed passwords, scoped API routes, and validated uploads.", color: GREEN },
], y, { size: 11.5, gap: 5, width: 200 });
const chips = [
  ["AI offline", "Rule-based mode"],
  ["Bad PDF", "Clear, exact error"],
  ["Stage crash", "Status: partial"],
];
let cy = y + 2;
for (const [a, b] of chips) {
  doc.setFillColor(...GREEN_BG); doc.setDrawColor(...GREEN); doc.setLineWidth(0.8);
  doc.roundedRect(16, cy, 200, 13, 3, 3, "FD");
  doc.setFont("Montserrat", "bold"); doc.setFontSize(9.5); doc.setTextColor(...RED);
  doc.text(clean(a), 24, cy + 8.5);
  doc.setFont("Roboto", "bold"); doc.setFontSize(9.5); doc.setTextColor(...GREEN);
  doc.text("->   " + clean(b), 80, cy + 8.5);
  cy += 16;
}
try {
  doc.addImage(img(path.join(OUT, "assets/reliable.jpg")), "JPEG", 226, y + 2, 96, 88);
} catch (e) {}

// =================== SLIDE 9 : SYSTEM TODAY ===================
y = slide("The System Today", "PERSON 5", "Built and deployed");
const nums = [["8", "AGENTS"], ["26", "METRICS"], ["20", "APIs"], ["12", "TABLES"], ["$0", "COST"]];
const nw = 56, ng = 8;
let nx = 16;
for (const [num, label] of nums) {
  doc.setFillColor(...NAVY2);
  doc.roundedRect(nx, y, nw, 30, 3, 3, "F");
  doc.setTextColor(...WHITE);
  doc.setFont("Montserrat", "bold"); doc.setFontSize(19);
  doc.text(num, nx + nw / 2, y + 14, { align: "center" });
  doc.setFont("RobotoMd", "normal"); doc.setFontSize(9);
  doc.text(label, nx + nw / 2, y + 23.5, { align: "center" });
  nx += nw + ng;
}
try {
  doc.addImage(img(path.join(OUT, "assets/network.jpg")), "JPEG", 196, y + 38, 126, 74);
} catch (e) {}
y = sentences([
  "Eight agents, twenty APIs, and twelve database tables -- live and tested end to end.",
  "The full loop: upload a filing, receive risk flags, ask research questions, and export the report.",
  { text: "Built entirely on free tiers -- zero infrastructure cost to run.", color: GREEN },
], y + 40, { size: 12, gap: 5.5, width: 172 });

// =================== SLIDE 10 : CLOSE ===================
n += 1;
doc.addPage([W, H]);
doc.setFillColor(...NAVY); doc.rect(0, 0, W, H, "F");
doc.setFillColor(...GOLD2);
doc.rect(0, 0, W, 2.4, "F");
doc.setFillColor(...GOLD2);
doc.roundedRect(16, 14, 46, 13, 6.5, 6.5, "F");
doc.setFont("Montserrat", "bold"); doc.setFontSize(10.5);
doc.setTextColor(...NAVY);
doc.text("PERSON 5", 39, 22.7, { align: "center" });

doc.setFont("Montserrat", "bold"); doc.setFontSize(30); doc.setTextColor(...WHITE);
doc.text("Why It Matters", 16, 58);
doc.setFillColor(...GOLD2); doc.rect(16, 64, 36, 2.2, "F");
doc.setFont("Roboto", "normal"); doc.setFontSize(15); doc.setTextColor(226, 232, 240);
const take = [
  "Trustworthy AI: every claim is cited and every number is sourced.",
  "Multi-agent design makes the system robust by construction, not by luck.",
  "Built, tested, and deployed -- and it costs nothing to run.",
];
let yy = 92;
for (const t2 of take) {
  doc.setFillColor(...GOLD2); doc.circle(19, yy - 1.2, 1.6, "F");
  const lines = doc.splitTextToSize(clean(t2), 190);
  for (const ln of lines) { doc.text(ln, 25, yy); yy += 7.2; }
  yy += 5;
}
doc.setFont("Montserrat", "bold"); doc.setFontSize(40); doc.setTextColor(...WHITE);
doc.text("Thank You", 16, 165);
doc.setFont("Montserrat", "normal"); doc.setFontSize(15); doc.setTextColor(147, 197, 253);
doc.text("Questions?", 16, 178);

const file = path.join(OUT, "TEAM_PRESENTATION_5MIN.pdf");
doc.save(file);
console.log("wrote", file, "| slides:", n, "| PowerPoint 16:9 | fonts: Montserrat + Roboto");
