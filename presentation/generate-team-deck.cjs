/*
 * 5-minute team presentation deck -- PORTRAIT A4 (210 x 297mm), 10 pages, 2 per speaker.
 * Large type, minimal words. Speaker timings are intentionally NOT on slides.
 * Run from repo root:  node presentation/generate-team-deck.cjs
 */
const fs = require("fs");
const path = require("path");
const { jsPDF } = require("jspdf");

const OUT = path.resolve(__dirname);
const W = 210, H = 297; // A4 portrait mm

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

const doc = new jsPDF({ unit: "mm", format: [W, H] });
let n = 0;

function personChip(person, onDark) {
  doc.setFillColor(...BRAND2);
  doc.roundedRect(12, 12, 32, 10, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text(clean(person), 28, 18.7, { align: "center" });
}

function frame(person, title, kicker) {
  n += 1;
  if (n > 1) doc.addPage([W, H]);
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, W, H, "F");
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, 5, H, "F");
  personChip(person);
  if (kicker) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...MUTED);
    doc.text(clean(kicker), W - 12, 18.7, { align: "right" });
  }
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold"); doc.setFontSize(30);
  const lines = doc.splitTextToSize(clean(title), W - 24);
  let ty = 38;
  for (const line of lines) { doc.text(line, 12, ty); ty += 11; }
  doc.setFillColor(...GOLD);
  doc.rect(12, ty - 4, 34, 2, "F");
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...MUTED);
  doc.text("FinResearch AI  |  Multi-Agent Financial Research System", 12, H - 9);
  doc.text("Team Presentation", W - 12, H - 9, { align: "right" });
  return ty + 8; // content start y
}

function bullets(items, y0, opts = {}) {
  const size = opts.size || 19;
  const lh = size * 0.62;
  let y = y0;
  for (const it of items) {
    const obj = typeof it === "object";
    const text = clean(obj ? it.text : it);
    const color = obj && it.color ? it.color : INK;
    doc.setFillColor(...(obj && it.dot ? it.dot : BRAND2));
    doc.circle(15, y - 1.4, 1.4, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, W - 34);
    for (const line of lines) { doc.text(line, 21, y); y += lh; }
    y += opts.gap === undefined ? 7 : opts.gap;
  }
  return y;
}

function card(x, y, w, h, title, body, fill, stroke, titleCol, bodyCol, tSize, bSize) {
  doc.setFillColor(...fill); doc.setDrawColor(...stroke); doc.setLineWidth(0.8);
  doc.roundedRect(x, y, w, h, 3, 3, "FD");
  doc.setFont("helvetica", "bold"); doc.setFontSize(tSize); doc.setTextColor(...titleCol);
  doc.text(clean(title), x + 7, y + 8.5);
  if (body) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(bSize); doc.setTextColor(...bodyCol);
    doc.text(clean(body), x + 7, y + 8.5 + bSize * 0.6 + 3.5);
  }
}

function agentCard(y, name, line, accent) {
  const h = 22;
  doc.setFillColor(...LIGHT); doc.setDrawColor(...accent); doc.setLineWidth(0.9);
  doc.roundedRect(12, y, W - 24, h, 3, 3, "FD");
  doc.setFillColor(...accent);
  doc.roundedRect(16, y + 5, 40, 12, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(11.5);
  doc.text(clean(name), 36, y + 12.7, { align: "center" });
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold"); doc.setFontSize(15);
  const lines = doc.splitTextToSize(clean(line), W - 76);
  let ly = y + 10;
  for (const ln of lines.slice(0, 2)) { doc.text(ln, 62, ly); ly += 6.5; }
  return y + h + 7;
}

function box(x, yy, w, h, label, fill, tcol, size) {
  doc.setFillColor(...fill); doc.setDrawColor(...BRAND2); doc.setLineWidth(0.7);
  doc.roundedRect(x, yy, w, h, 2.5, 2.5, "FD");
  doc.setTextColor(...tcol);
  doc.setFont("helvetica", "bold"); doc.setFontSize(size);
  doc.text(clean(label), x + w / 2, yy + h / 2 + 1.5, { align: "center" });
}

function downArrow(x, y1, y2) {
  doc.setDrawColor(...BRAND2); doc.setLineWidth(1.1);
  doc.line(x, y1, x, y2 - 4);
  doc.setFillColor(...BRAND2);
  doc.triangle(x - 3, y2 - 4, x + 3, y2 - 4, x, y2, "F");
}

// ================= PAGE 1 : Person 1 - Title + Problem =================
(() => {
  n += 1;
  doc.setFillColor(11, 22, 48);
  doc.rect(0, 0, W, H, "F");
  // hero image as top banner
  try {
    doc.addImage(dataUrl(path.join(OUT, "assets/hero.jpg")), "JPEG", 5, 0, W - 5, 92);
    doc.setFillColor(11, 22, 48);
    doc.rect(5, 84, W - 5, 8, "F"); // blend strip
  } catch (e) { /* optional */ }
  personChip("PERSON 1", true);

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(38);
  doc.text("FinResearch AI", 12, 128);
  doc.setFontSize(15);
  doc.setTextColor(147, 197, 253);
  doc.text("Multi-Agent Financial Research System", 12, 140);

  doc.setFillColor(...GOLD);
  doc.rect(12, 150, 38, 2.2, "F");

  doc.setFont("helvetica", "bold"); doc.setFontSize(24); doc.setTextColor(255, 255, 255);
  doc.text("PROBLEM", 12, 172);
  doc.setFontSize(18); doc.setTextColor(226, 232, 240);
  const t = [
    "100+ page reports.",
    "Hours to analyse.",
    "AI chat tools invent numbers.",
    "No sources. No trust. No speed.",
  ];
  let y = 190;
  for (const line of t) {
    doc.setFillColor(...GOLD); doc.circle(15, y - 1.5, 1.5, "F");
    doc.text(clean(line), 21, y);
    y += 14;
  }
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(148, 163, 184);
  doc.text("Team Presentation  |  Project Evaluation", 12, H - 12);
})();

// ================= PAGE 2 : Person 1 - Solution =================
let y = frame("PERSON 1", "How We Solve It", "Solution");
y = bullets([
  "Upload -> 8 agents analyse -> trusted answers",
  "26 metrics. Risks with exact source quotes.",
  "Research. Benchmark. Reports.",
  { text: "Every number carries its evidence.", color: GREEN },
], y, { size: 19, gap: 8 });
// 3-step vertical strip
const steps = ["UPLOAD", "ANALYSE", "DECIDE"];
for (let i = 0; i < steps.length; i++) {
  box(30, y + 6, 150, 18, steps[i], [219, 234, 254], [30, 64, 175], 16);
  if (i < steps.length - 1) downArrow(105, y + 24, y + 32);
  y += 26;
}

// ================= PAGE 3 : Person 2 - Why multi-agent =================
y = frame("PERSON 2", "Why Multi-Agent?", "Our Approach");
y = bullets([
  "One big AI prompt = one black box.",
  { text: "8 agents = 8 focused jobs + 8 fallbacks.", color: GREEN },
  "Numbers by CODE. Language by AI.",
  "Testable. Auditable. Explainable.",
], y, { size: 19, gap: 9 });
card(12, y + 6, W - 24, 26, "[x]  Single LLM", "Hallucinates. No sources. One failure kills all.", [254, 242, 242], RED, RED, RED, 15, 13);
card(12, y + 42, W - 24, 26, "[v]  Multi-Agent", "Verified numbers. Cited answers. Resilient.", [240, 253, 244], GREEN, GREEN, GREEN, 15, 13);

// ================= PAGE 4 : Person 2 - How agents interact =================
y = frame("PERSON 2", "How Agents Interact", "Architecture");
box(30, y + 2, 150, 15, "USER UPLOAD", BRAND, [255, 255, 255], 13);
downArrow(105, y + 17, y + 24);
box(30, y + 24, 150, 15, "ORCHESTRATOR  (controls the flow)", GOLD, [255, 255, 255], 12);
downArrow(105, y + 39, y + 46);
// pipeline stacked
const names = ["Validation Agent", "Document Agent", "Extraction Agent", "Red Flag Agent", "Embedding Agent"];
let py = y + 46;
for (let i = 0; i < names.length; i++) {
  box(30, py, 150, 13, names[i] + (i < names.length - 1 ? "   ->" : ""), [219, 234, 254], [30, 64, 175], 11.5);
  py += 13;
}
downArrow(105, py, py + 7);
box(12, py + 7, 90, 14, "POSTGRES: data + queue + logs", LIGHT, BRAND, 9.5);
box(108, py + 7, 90, 14, "ON DEMAND: Research / Report / Benchmark", [240, 253, 244], GREEN, 9);
box(12, py + 28, W - 24, 13, "Groq AI + embeddings provider  |  Failures stay isolated", [254, 243, 199], [120, 53, 15], 11);

// ================= PAGE 5 : Person 3 - Agents 1 =================
y = frame("PERSON 3", "The Agents (1/2)", "Automatic on Upload");
y = agentCard(y + 2, "Validation", "Right document type? Reject the rest.", BRAND2);
y = agentCard(y, "Document", "Chunks + indexes. Makes it searchable.", BRAND2);
y = agentCard(y, "Extraction", "26 financial metrics + source evidence.", BRAND2);
y = agentCard(y, "Red Flag", "Risks from filing language. Exact quotes.", BRAND2);
y = agentCard(y, "Embedding", "Semantic search. Optional + provider-agnostic.", BRAND2);

// ================= PAGE 6 : Person 3 - Agents 2 =================
y = frame("PERSON 3", "The Agents (2/2)", "On Demand");
y = agentCard(y + 2, "Research", "Answers with [S1] citations. Never invented.", GREEN);
y = agentCard(y, "Report", "Tables by code. Narrative by AI.", GREEN);
y = agentCard(y, "Benchmark", "Company vs company. Period-safe.", GREEN);
y = agentCard(y, "Orchestrator", "Queues. Retries. Isolates every failure.", GOLD);
doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(...MUTED);
doc.text("Each agent = one job, one test surface, one fallback.", 14, y + 6);

// ================= PAGE 7 : Person 4 - Measuring metrics =================
y = frame("PERSON 4", "Measuring The Metrics", "Extraction & Quality");
y = bullets([
  "26 metrics per document",
  "Regex label parser = exact numbers",
  "Growth. Margins. Ratios. Cash flow.",
  { text: "Every metric stores its source line.", color: GREEN },
], y, { size: 18, gap: 8 });
// evidence card
doc.setFillColor(...LIGHT); doc.setDrawColor(...BRAND2); doc.setLineWidth(0.8);
doc.roundedRect(12, y + 8, W - 24, 52, 3, 3, "FD");
doc.setFont("courier", "bold"); doc.setFontSize(13); doc.setTextColor(...BRAND);
doc.text('Total revenue:', 20, y + 24);
doc.text('$383,285 million', 20, y + 34);
doc.setFont("courier", "normal"); doc.setFontSize(11); doc.setTextColor(...MUTED);
doc.text('Evidence: exact filing line saved', 20, y + 48);
doc.setFillColor(...GREEN);
doc.roundedRect(12, y + 70, W - 24, 18, 3, 3, "F");
doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(255, 255, 255);
doc.text("Quality gate: answers must match source text", W / 2, y + 81.5, { align: "center" });

// ================= PAGE 8 : Person 4 - Reliability =================
y = frame("PERSON 4", "Built To Be Reliable", "Graceful Degradation");
y = bullets([
  "AI down? Deterministic rules take over.",
  "Embeddings off? Keyword search works.",
  "One stage fails? Pipeline continues.",
  "Background jobs + automatic retries.",
  { text: "Secure: hashed keys. Scoped data.", color: GREEN },
], y, { size: 17.5, gap: 7 });
const chips = [
  ["AI offline", "Rule-based mode"],
  ["Bad PDF", "Clear, exact error"],
  ["Stage crash", "Status: partial"],
];
for (const [a, b] of chips) {
  doc.setFillColor(240, 253, 244); doc.setDrawColor(...GREEN); doc.setLineWidth(0.8);
  doc.roundedRect(12, y + 2, W - 24, 16, 3, 3, "FD");
  doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(...RED);
  doc.text(clean(a), 20, y + 12);
  doc.setFontSize(13); doc.setTextColor(...GREEN);
  doc.text("->   " + clean(b), 80, y + 12);
  y += 20;
}

// ================= PAGE 9 : Person 5 - The system today =================
y = frame("PERSON 5", "The System Today", "Built & Deployed");
// number chips: 3 + 2 rows
const nums = [["8", "AGENTS"], ["26", "METRICS"], ["20", "APIs"], ["12", "TABLES"], ["$0", "COST"]];
const cw = 56, ch = 30, gap = 5;
for (let i = 0; i < 3; i++) {
  const x = 12 + i * (cw + gap);
  doc.setFillColor(...BRAND);
  doc.roundedRect(x, y + 2, cw, ch, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(22);
  doc.text(nums[i][0], x + cw / 2, y + 15, { align: "center" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  doc.text(nums[i][1], x + cw / 2, y + 25, { align: "center" });
}
for (let i = 0; i < 2; i++) {
  const x = 40 + i * (cw + gap);
  doc.setFillColor(...GOLD);
  doc.roundedRect(x, y + 38, cw, ch, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(22);
  doc.text(nums[i + 3][0], x + cw / 2, y + 51, { align: "center" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  doc.text(nums[i + 3][1], x + cw / 2, y + 61, { align: "center" });
}
try {
  doc.addImage(dataUrl(path.join(OUT, "assets/network.jpg")), "JPEG", 25, y + 78, 160, 92);
} catch (e) { /* optional */ }
doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(...INK);
doc.text("Live demo:", 12, y + 188);
doc.setFontSize(15); doc.setTextColor(...BRAND);
doc.text("Upload -> Risk flags -> Research -> Report", 12, y + 198);
doc.setFontSize(15); doc.setTextColor(...GREEN);
doc.text("Tested. Deployed. Free-tier ready.", 12, y + 210);

// ================= PAGE 10 : Person 5 - Close =================
n += 1;
doc.addPage([W, H]);
doc.setFillColor(11, 22, 48);
doc.rect(0, 0, W, H, "F");
personChip("PERSON 5", true);

doc.setFont("helvetica", "bold"); doc.setFontSize(32); doc.setTextColor(255, 255, 255);
doc.text("Why It Matters", 12, 60);
doc.setFillColor(...GOLD); doc.rect(12, 68, 34, 2.2, "F");

doc.setFontSize(19); doc.setTextColor(226, 232, 240);
const take = [
  "Trustworthy AI -- every claim cited.",
  "Multi-agent = robust by design.",
  "Built. Tested. Deployed. Free.",
];
let yy = 96;
for (const t2 of take) {
  doc.setFillColor(...GOLD); doc.circle(15, yy - 1.6, 1.6, "F");
  doc.text(clean(t2), 21, yy);
  yy += 16;
}
doc.setFontSize(44); doc.setTextColor(255, 255, 255);
doc.text("Thank You", 12, 210);
doc.setFontSize(18); doc.setTextColor(147, 197, 253);
doc.text("Questions?", 12, 228);

// ================= save =================
const file = path.join(OUT, "TEAM_PRESENTATION_5MIN.pdf");
doc.save(file);
console.log("wrote", file, "| pages:", n, "| format: A4 portrait");
