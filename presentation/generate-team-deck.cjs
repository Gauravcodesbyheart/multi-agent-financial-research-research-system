/*
 * 5-minute team presentation deck (10 slides, 2 per speaker).
 * Large type, minimal words. Speaker timings are intentionally NOT on slides.
 * Run from repo root:  node presentation/generate-team-deck.cjs
 */
const fs = require("fs");
const path = require("path");
const { jsPDF } = require("jspdf");

const OUT = path.resolve(__dirname);
const W = 320, H = 180; // mm slide canvas (16:9-ish)

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

function frame(person, title, kicker) {
  n += 1;
  if (n > 1) doc.addPage([W, H]);
  // background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, W, H, "F");
  // left accent bar
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, 6, H, "F");
  // person chip (top-left)
  doc.setFillColor(...BRAND2);
  doc.roundedRect(14, 10, 34, 11, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(13);
  doc.text(clean(person), 31, 17.6, { align: "center" });
  // kicker (top-right)
  if (kicker) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...MUTED);
    doc.text(clean(kicker), W - 14, 17.6, { align: "right" });
  }
  // big title
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold"); doc.setFontSize(40);
  doc.text(clean(title), 14, 40);
  // underline
  doc.setFillColor(...GOLD);
  doc.rect(14, 45, 46, 2.2, "F");
  // footer
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...MUTED);
  doc.text("FinResearch AI  |  Multi-Agent Financial Research System", 14, H - 7);
  doc.text("Team Presentation", W - 14, H - 7, { align: "right" });
  return 58;
}

function bullets(items, y0, opts = {}) {
  const size = opts.size || 24;
  const lh = size * 0.62;
  let y = y0;
  for (const it of items) {
    const obj = typeof it === "object";
    const text = clean(obj ? it.text : it);
    const color = obj && it.color ? it.color : INK;
    // bullet dot
    doc.setFillColor(...(obj && it.dot ? it.dot : BRAND2));
    doc.circle(17.5, y - 1.6, 1.5, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, W - 42);
    for (const line of lines) {
      doc.text(line, 23, y);
      y += lh;
    }
    y += opts.gap === undefined ? 6 : opts.gap;
  }
  return y;
}

function stepStrip(y, steps) {
  const bw = 74, bh = 30, gap = 16;
  let x = 20;
  for (let i = 0; i < steps.length; i++) {
    doc.setFillColor(...LIGHT); doc.setDrawColor(...BRAND2); doc.setLineWidth(0.8);
    doc.roundedRect(x, y, bw, bh, 3, 3, "FD");
    doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(...BRAND);
    doc.text(clean(steps[i]), x + bw / 2, y + bh / 2 + 1.8, { align: "center" });
    if (i < steps.length - 1) {
      doc.setFillColor(...GOLD);
      // arrow
      const ax = x + bw + 3, ay = y + bh / 2;
      doc.triangle(ax, ay - 4, ax, ay + 4, ax + 10, ay, "F");
    }
    x += bw + gap;
  }
}

function agentRow(y, name, line, accent) {
  doc.setFillColor(...accent);
  doc.roundedRect(18, y - 8.5, 58, 12, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(15);
  doc.text(clean(name), 47, y, { align: "center" });
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold"); doc.setFontSize(21);
  doc.text(clean(line), 84, y);
  return y + 19;
}

function numberStrip(y, items) {
  const bw = 54, gap = 6;
  const total = items.length * bw + (items.length - 1) * gap;
  let x = (W - total) / 2;
  for (const [num, label] of items) {
    doc.setFillColor(...BRAND);
    doc.roundedRect(x, y, bw, 34, 3, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold"); doc.setFontSize(26);
    doc.text(clean(num), x + bw / 2, y + 16, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(11);
    doc.text(clean(label), x + bw / 2, y + 26, { align: "center" });
    x += bw + gap;
  }
}

// ================= SLIDE 1 : Person 1 - Title + Problem =================
(() => {
  // custom cover layout
  n += 1;
  doc.setFillColor(11, 22, 48); // deep navy
  doc.rect(0, 0, W, H, "F");
  try {
    doc.addImage(dataUrl(path.join(OUT, "assets/hero.jpg")), "JPEG", 168, 0, 152, H);
    // left readability overlay
    doc.setFillColor(11, 22, 48);
    // soft panel behind text
    doc.setGState(new (doc.GState || Object)({ opacity: 0.85 }));
  } catch (e) { /* image optional */ }
  doc.setFillColor(11, 22, 48);
  doc.rect(0, 0, 178, H, "F");
  doc.setFillColor(...BRAND2);
  doc.roundedRect(16, 14, 34, 11, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(13);
  doc.text("PERSON 1", 33, 21.6, { align: "center" });

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(52);
  doc.text("FinResearch AI", 16, 52);
  doc.setFontSize(19);
  doc.setTextColor(147, 197, 253);
  doc.text("Multi-Agent Financial Research System", 16, 64);

  doc.setFillColor(...GOLD);
  doc.rect(16, 74, 50, 2.4, "F");

  doc.setFont("helvetica", "bold"); doc.setFontSize(26); doc.setTextColor(255, 255, 255);
  doc.text("PROBLEM", 16, 92);
  doc.setFontSize(21); doc.setTextColor(226, 232, 240);
  const t = [
    "100+ page reports. Hours to analyse.",
    "AI chat tools invent numbers.",
    "No sources. No trust. No speed.",
  ];
  let y = 106;
  for (const line of t) {
    doc.setFillColor(...GOLD); doc.circle(19, y - 1.6, 1.6, "F");
    doc.text(clean(line), 25, y);
    y += 13;
  }
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(148, 163, 184);
  doc.text("Team Presentation  |  Project Evaluation", 16, H - 10);
})();

// ================= SLIDE 2 : Person 1 - Solution =================
let y = frame("PERSON 1", "How We Solve It", "Solution");
y = bullets([
  "Upload -> 8 agents analyse -> trusted answers",
  "26 metrics. Risks with exact source quotes.",
  "Research. Benchmark. Reports.",
  { text: "Every number carries its evidence.", color: GREEN },
], y, { size: 25, gap: 7 });
stepStrip(y + 2, ["UPLOAD", "ANALYSE", "DECIDE"]);

// ================= SLIDE 3 : Person 2 - Why multi-agent =================
y = frame("PERSON 2", "Why Multi-Agent?", "Our Approach");
y = bullets([
  "One big AI prompt = one black box.",
  { text: "8 agents = 8 focused jobs + 8 fallbacks.", color: GREEN },
  "Numbers by CODE. Language by AI.",
  "Testable. Auditable. Explainable.",
], y, { size: 25, gap: 8 });
// mini compare
doc.setFillColor(254, 242, 242); doc.setDrawColor(...RED);
doc.roundedRect(18, y + 2, 130, 22, 3, 3, "FD");
doc.setFont("helvetica", "bold"); doc.setFontSize(17); doc.setTextColor(...RED);
doc.text("[x]  Single LLM: hallucinates, no sources", 26, y + 15.5);
doc.setFillColor(240, 253, 244); doc.setDrawColor(...GREEN);
doc.roundedRect(158, y + 2, 144, 22, 3, 3, "FD");
doc.setFontSize(17); doc.setTextColor(...GREEN);
doc.text("[v]  Multi-Agent: verified + resilient", 166, y + 15.5);

// ================= SLIDE 4 : Person 2 - How agents interact =================
y = frame("PERSON 2", "How Agents Interact", "Architecture");
// USER box
function box(x, yy, w, h, label, fill, tcol, size = 14) {
  doc.setFillColor(...fill); doc.setDrawColor(...BRAND2); doc.setLineWidth(0.7);
  doc.roundedRect(x, yy, w, h, 2.5, 2.5, "FD");
  doc.setTextColor(...tcol);
  doc.setFont("helvetica", "bold"); doc.setFontSize(size);
  doc.text(clean(label), x + w / 2, yy + h / 2 + 1.6, { align: "center" });
}
function arrow(x1, y1, x2, y2) {
  doc.setDrawColor(...BRAND2); doc.setLineWidth(1.1);
  doc.line(x1, y1, x2, y2);
  const ang = Math.atan2(y2 - y1, x2 - x1);
  doc.setFillColor(...BRAND2);
  doc.triangle(
    x2, y2,
    x2 - 4 * Math.cos(ang - 0.5), y2 - 4 * Math.sin(ang - 0.5),
    x2 - 4 * Math.cos(ang + 0.5), y2 - 4 * Math.sin(ang + 0.5),
    "F",
  );
}
box(16, y + 2, 46, 16, "USER UPLOAD", [30, 58, 138], [255, 255, 255], 13);
arrow(62, y + 10, 76, y + 10);
box(76, y + 2, 60, 16, "ORCHESTRATOR", [217, 119, 6], [255, 255, 255], 13);
// pipeline row
const py = y + 30;
const names = ["Validation", "Document", "Extraction", "Red Flag", "Embedding"];
let px = 16;
for (let i = 0; i < names.length; i++) {
  box(px, py, 52, 15, names[i], [219, 234, 254], [30, 64, 175], 13);
  if (i < names.length - 1) arrow(px + 52, py + 7.5, px + 58, py + 7.5);
  px += 58;
}
arrow(106, y + 18, 106, py);
// bottom row
const by = py + 26;
box(16, by, 130, 15, "POSTGRES: data + job queue + agent logs", [241, 245, 249], [30, 58, 138], 12);
box(158, by, 144, 15, "ON DEMAND: Research | Report | Benchmark", [240, 253, 244], [22, 101, 52], 12);
arrow(160, by - 1, 160, py + 16);
// AI side note
box(16, by + 22, 286, 13, "Powered by Groq AI  +  optional embeddings provider  |  Failures stay isolated -- one stage down, the rest continue", [254, 243, 199], [120, 53, 15], 11.5);

// ================= SLIDE 5 : Person 3 - Agents 1 =================
y = frame("PERSON 3", "The Agents (1/2)", "Automatic on Upload");
y = agentRow(y + 4, "Validation", "Right document type? Reject the rest.", [37, 99, 235]);
y = agentRow(y, "Document", "Chunks + indexes. Makes it searchable.", [37, 99, 235]);
y = agentRow(y, "Extraction", "26 financial metrics + source evidence.", [37, 99, 235]);
y = agentRow(y, "Red Flag", "Risks from filing language. Exact quotes.", [37, 99, 235]);
y = agentRow(y, "Embedding", "Semantic search. Optional + provider-agnostic.", [37, 99, 235]);

// ================= SLIDE 6 : Person 3 - Agents 2 =================
y = frame("PERSON 3", "The Agents (2/2)", "On Demand");
y = agentRow(y + 4, "Research", "Answers with [S1] citations. Never invented.", [22, 101, 52]);
y = agentRow(y, "Report", "Tables by code. Narrative by AI.", [22, 101, 52]);
y = agentRow(y, "Benchmark", "Company vs company. Period-safe.", [22, 101, 52]);
y = agentRow(y, "Orchestrator", "Queues. Retries. Isolates every failure.", [217, 119, 6]);
doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(...MUTED);
doc.text("Each agent = one job, one test surface, one fallback.", 18, y + 2);

// ================= SLIDE 7 : Person 4 - Measuring metrics =================
y = frame("PERSON 4", "Measuring The Metrics", "Extraction & Quality");
y = bullets([
  "26 metrics per document",
  "Regex label parser = exact numbers",
  "Growth. Margins. Ratios. Cash flow.",
  { text: "Every metric stores its source line.", color: GREEN },
], y, { size: 24, gap: 7 });
// evidence example card
doc.setFillColor(...LIGHT); doc.setDrawColor(...BRAND2); doc.setLineWidth(0.8);
doc.roundedRect(18, y + 2, 284, 30, 3, 3, "FD");
doc.setFont("courier", "bold"); doc.setFontSize(16); doc.setTextColor(...BRAND);
doc.text('Total revenue: $383,285 million', 28, y + 14);
doc.setFont("courier", "normal"); doc.setFontSize(13); doc.setTextColor(...MUTED);
doc.text('Evidence: the exact filing line is saved with the metric', 28, y + 24);
doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(...GREEN);
doc.text("Quality gate: answers must match source text", 210, y + 19);

// ================= SLIDE 8 : Person 4 - Reliability =================
y = frame("PERSON 4", "Built To Be Reliable", "Graceful Degradation");
y = bullets([
  "AI down? Deterministic rules take over.",
  "Embeddings off? Keyword search works.",
  "One stage fails? Pipeline continues.",
  "Background jobs + automatic retries.",
  { text: "Secure: hashed keys. Scoped data.", color: GREEN },
], y, { size: 23, gap: 6 });
const chips = [
  ["AI offline", "Rule-based mode", GREEN],
  ["Bad PDF", "Clear, exact error", GREEN],
  ["Stage crash", "Status: partial", GREEN],
];
let cx = 18;
for (const [a, b, col] of chips) {
  doc.setFillColor(240, 253, 244); doc.setDrawColor(...col); doc.setLineWidth(0.8);
  doc.roundedRect(cx, y + 4, 92, 20, 3, 3, "FD");
  doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(...RED);
  doc.text(clean(a), cx + 8, y + 12);
  doc.setFontSize(13); doc.setTextColor(...GREEN);
  doc.text("->  " + clean(b), cx + 8, y + 19.5);
  cx += 98;
}

// ================= SLIDE 9 : Person 5 - The system today =================
y = frame("PERSON 5", "The System Today", "Built & Deployed");
numberStrip(y - 2, [
  ["8", "AGENTS"],
  ["26", "METRICS"],
  ["20", "APIs"],
  ["12", "TABLES"],
  ["$0", "COST"],
]);
try {
  doc.addImage(dataUrl(path.join(OUT, "assets/network.jpg")), "JPEG", 96, y + 42, 128, 72);
} catch (e) { /* optional */ }
doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.setTextColor(...INK);
doc.text("Live demo:  Upload  ->  Risk flags  ->  Research  ->  Report", 40, H - 26);
doc.setFontSize(15); doc.setTextColor(...GREEN);
doc.text("Tested. Deployed. Free-tier ready.", 96, H - 16);

// ================= SLIDE 10 : Person 5 - Close =================
n += 1;
doc.addPage([W, H]);
doc.setFillColor(11, 22, 48);
doc.rect(0, 0, W, H, "F");
doc.setFillColor(...BRAND2);
doc.roundedRect(16, 14, 34, 11, 2, 2, "F");
doc.setTextColor(255, 255, 255);
doc.setFont("helvetica", "bold"); doc.setFontSize(13);
doc.text("PERSON 5", 33, 21.6, { align: "center" });

doc.setFont("helvetica", "bold"); doc.setFontSize(40); doc.setTextColor(255, 255, 255);
doc.text("Why It Matters", 16, 52);
doc.setFillColor(...GOLD); doc.rect(16, 58, 46, 2.2, "F");
doc.setFontSize(24); doc.setTextColor(226, 232, 240);
const take = [
  "Trustworthy AI -- every claim cited.",
  "Multi-agent = robust by design.",
  "Built. Tested. Deployed. Free.",
];
let yy = 82;
for (const t2 of take) {
  doc.setFillColor(...GOLD); doc.circle(19.5, yy - 1.8, 1.8, "F");
  doc.text(clean(t2), 26, yy);
  yy += 16;
}
doc.setFontSize(52); doc.setTextColor(255, 255, 255);
doc.text("Thank You", 16, 152);
doc.setFontSize(18); doc.setTextColor(147, 197, 253);
doc.text("Questions?", 16, 164);

// ================= save =================
const file = path.join(OUT, "TEAM_PRESENTATION_5MIN.pdf");
doc.save(file);
console.log("wrote", file, "| slides:", n);
