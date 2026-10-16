/*
 * DEMO_RESEARCH_BENCHMARK_150MIN.pdf -- 150-minute demo session script (speaker's copy).
 * Research Agent + Benchmark Agent: website features only, click-by-click SHOW steps + SAY lines.
 * A4 portrait. Run from repo root:  node presentation/generate-demo-150min.cjs
 */
const fs = require("fs");
const path = require("path");
const { jsPDF } = require("jspdf");

const OUT = path.resolve(__dirname);
const W = 210, H = 297;
const INK = [15, 23, 42], BRAND = [30, 58, 138], GOLD = [181, 114, 22];
const GREEN = [22, 101, 52], RED = [185, 28, 28], MUTED = [71, 85, 105];
const LIGHT = [241, 245, 249], NAVY = [11, 22, 48];

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
  doc.text("FinResearch AI  |  Demo Session Script -- Research + Benchmark Agents  (150 minutes)", 12, 9.8);
  doc.setTextColor(...INK); doc.setFontSize(19);
  doc.text(clean(title), 12, 29);
  if (sub) { doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(...MUTED); doc.text(clean(sub), 12, 36); }
  doc.setFillColor(...GOLD); doc.rect(12, sub ? 40 : 34, 28, 1.8, "F");
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...MUTED);
  doc.text("Speaker script -- timings included for rehearsal", 12, H - 8);
  doc.text("Page " + n, W - 12, H - 8, { align: "right" });
  return sub ? 50 : 44;
}

function need(lines) {
  return lines * 4.6;
}

function stepBox(y, time, title, showSteps, say) {
  const sayLines = doc.splitTextToSize(clean(say), W - 34);
  const showAll = [];
  for (const s of showSteps) {
    const ls = doc.splitTextToSize(clean(s), W - 40);
    showAll.push(...ls);
  }
  const h = 16 + showAll.length * 4.6 + sayLines.length * 4.6 + 8;
  if (y + h > H - 16) { y = header("Session Script (continued)", "Research + Benchmark Agents -- website features"); }
  doc.setFillColor(255, 255, 255); doc.setDrawColor(...BRAND); doc.setLineWidth(0.9);
  doc.roundedRect(12, y, W - 24, h, 3, 3, "FD");
  doc.setFillColor(...BRAND);
  doc.roundedRect(16, y + 3.5, 36, 9, 2, 2, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
  doc.text(clean(time), 34, y + 9.7, { align: "center" });
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...INK);
  doc.text(clean(title), 56, y + 10);
  let yy = y + 18;
  doc.setFont("helvetica", "bold"); doc.setFontSize(9.2); doc.setTextColor(...GREEN);
  doc.text("SHOW (click by click):", 17, yy); yy += 5.6;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...INK);
  for (const s of showSteps) {
    const ls = doc.splitTextToSize(clean(s), W - 42);
    doc.setFillColor(...GOLD); doc.circle(19.5, yy - 1.1, 1, "F");
    let first = true;
    for (const ln of ls) { doc.text(ln, 23, yy); yy += 4.6; first = false; }
    yy += 0.8;
  }
  yy += 1.5;
  doc.setFont("helvetica", "bold"); doc.setFontSize(9.2); doc.setTextColor(...RED);
  doc.text("SAY:", 17, yy); yy += 5;
  doc.setFont("helvetica", "italic"); doc.setFontSize(9.2); doc.setTextColor(...INK);
  for (const ln of sayLines) { doc.text(ln, 17, yy); yy += 4.6; }
  return y + h + 4;
}

// ================= PAGE 1: TIME MAP + SETUP =================
let y = header("1. Time Map + Setup Checklist", "Total session: 150 minutes -- two agents, website features only");

doc.setFillColor(...BRAND); doc.rect(12, y, W - 24, 9, "F");
doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
doc.text("Clock", 15, y + 6.2); doc.text("Block", 45, y + 6.2); doc.text("Min", 130, y + 6.2); doc.text("Focus", 150, y + 6.2);
const rows = [
  ["0:00 - 0:05", "A. Opening + agenda", "5", "Set the stage"],
  ["0:05 - 0:25", "B1. Research: cited answer + verify a citation", "20", "Core feature"],
  ["0:25 - 0:45", "B2. Research: compound question + multi-document", "20", "Smart retrieval"],
  ["0:45 - 1:00", "B3. Research: honest refusal + chat history", "15", "Trust features"],
  ["1:00 - 1:05", "Buffer / short break", "5", "Reset screens"],
  ["1:05 - 1:25", "C1. Benchmark: comparison + reading the results", "20", "Core feature"],
  ["1:25 - 1:45", "C2. Benchmark: year mismatch + missing metrics", "20", "Safety rules"],
  ["1:45 - 2:00", "C3. Benchmark: history + repeat with new pair", "15", "Persistence"],
  ["2:00 - 2:15", "D. End-to-end recap run (one filing, both agents)", "15", "Full loop"],
  ["2:15 - 2:25", "E. Q&A with evaluators", "10", "Backup table"],
  ["2:25 - 2:30", "F. Closing + restore demo state", "5", "Thank you"],
];
let ry = y + 9;
rows.forEach((r, i) => {
  doc.setFillColor(...(i % 2 ? [248, 250, 252] : [255, 255, 255])); doc.rect(12, ry, W - 24, 8.2, "F");
  doc.setTextColor(...INK); doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
  doc.text(r[0], 15, ry + 5.7);
  doc.setFont("helvetica", "normal");
  doc.text(r[1], 45, ry + 5.7); doc.text(r[2], 132, ry + 5.7); doc.text(r[3], 150, ry + 5.7);
  ry += 8.2;
});
doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3); doc.rect(12, y, W - 24, ry - y);
y = ry + 6;

doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...INK);
doc.text("BEFORE THE EVALUATORS ARRIVE (setup checklist)", 12, y); y += 6;
const setup = [
  "App running and logged in. Open these tabs: Dashboard, Document page (Apple FY2024), Research/Chat, Benchmark, /api/health.",
  "Documents uploaded first (at least 2 companies x 1 filing each -- e.g. Apple FY2024 + Microsoft FY2024) so citations and benchmark both have data.",
  "One demo question typed but NOT sent: 'What was the total revenue in FY2024 and what are the key risks mentioned in the filing?'",
  "Benchmark page pre-selected: Apple vs Microsoft, same fiscal year -- but not generated yet.",
  "Chat history visible on purpose (shows persistence) but keep one clean session at the top for the live questions.",
  "Bookmark this script. Keep a stopwatch or phone timer to stay inside each block.",
];
doc.setFont("helvetica", "normal"); doc.setFontSize(9.3); doc.setTextColor(...INK);
for (const s of setup) {
  const ls = doc.splitTextToSize(clean(s), W - 32);
  doc.setFillColor(...GREEN); doc.circle(15, y - 1.1, 1.1, "F");
  for (const ln of ls) { doc.text(ln, 19, y); y += 4.6; }
  y += 1.8;
}

// ================= PAGE 2: OPENING + RESEARCH B1/B2 =================
y = header("2. Opening + Research Agent (Blocks B1-B2)");

y = stepBox(y, "0:00-0:05", "A. OPENING + AGENDA (5 min)",
  ["Land on the dashboard with the document list visible.", "Greet, then switch to the Research/Chat tab and keep it ready."],
  "Welcome. In this session I will demonstrate the two intelligence agents of FinResearch AI in depth -- the Research Agent, which answers questions strictly from your uploaded filings with verifiable citations, and the Benchmark Agent, which compares companies safely. I will show every functionality of both on the live website, including the trust and safety features. Total time: about two and a half hours, with a short break in the middle.");

y = stepBox(y, "0:05-0:25", "B1. RESEARCH: CITED ANSWER + VERIFY A CITATION (20 min)",
  [
    "Go to the Research / Chat page. Paste the prepared question: 'What was the total revenue in FY2024 and what are the key risks mentioned in the filing?'",
    "Click Send. Wait for the answer to appear (first answer may take a few seconds on a cold start -- this is normal, mention it).",
    "Point at the [S1] [S2] tags inside the answer text.",
    "Click / open one citation card. Show the full source detail: document name (Apple FY2024), the section it came from, the chunk number, and the exact excerpt quoted from the filing.",
    "Read one excerpt out loud and point back to the claim in the answer that it supports.",
    "Open the saved chat entry in history to show the answer persisted.",
  ],
  "This is the heart of the Research Agent. I ask a question in plain English. Notice the answer is not free text from an AI's memory -- every claim carries a tag like [S1]. When I open it, you see exactly where the number came from: the document name, the section, and the sentence in the filing itself. This is what we mean by verifiable research -- an analyst can audit every line. The answer is saved to the session history, so nothing is lost between visits.");

y = stepBox(y, "0:25-0:45", "B2. RESEARCH: COMPOUND QUESTION + MULTI-DOCUMENT (20 min)",
  [
    "Type a two-part question: 'Compare the revenue of Apple and Microsoft and mention one risk each company discloses.'",
    "Click Send. While it runs, point at the status/reasoning line (it shows how many documents were searched and how many retrieval steps ran).",
    "When the answer appears, show how each company's facts carry their own citation tags, pointing to different documents.",
    "Open one citation from each company to prove the sources are different filings.",
    "Optional repeat: ask 'What does the filing say about future outlook?' to show a topic question, not a number question.",
  ],
  "The Research Agent does not treat a compound question as one big guess. It decomposes it into retrieval steps -- one search for Apple's revenue, one for Microsoft's, one for each risk -- and then writes the answer only from the passages it actually found. Notice the reasoning line: it tells you how many documents were searched and how many steps ran. Two companies, two different source documents, one combined answer -- every part independently verifiable.");

// ================= PAGE 3: RESEARCH B3 + BUFFER =================
y = header("3. Research Trust Features + Break (Block B3)");

y = stepBox(y, "0:45-1:00", "B3. RESEARCH: HONEST REFUSAL + HISTORY (15 min)",
  [
    "Ask something the filings cannot answer: 'What will the stock price be next month?'",
    "Show the response: it states that no source passages passed the relevance filter -- it does NOT invent an answer.",
    "Ask another unanswerable: 'What is the CEO's favourite colour?' -- same honest behaviour.",
    "Now go to the research / session history list. Scroll through saved Q&As. Open one older entry to show answers persist with their citations.",
    "Point out the retrieval mode note (embeddings on = semantic search; embeddings off = keyword search -- both produce citations).",
  ],
  "This is the feature evaluators should remember: the agent says NO. If the uploaded documents do not contain the answer, it replies that no source passages passed the relevance filter instead of guessing. In financial research, an honest gap is infinitely more valuable than a confident invention. And everything you ask is kept in the session history -- questions, answers, and their citations -- so your research trail is permanent. Also note the search is robust: with embeddings it searches by meaning; without them it falls back to keywords, and citations work the same way.");

y = stepBox(y, "1:00-1:05", "BUFFER / SHORT BREAK (5 min)",
  ["Switch the browser tabs to the Benchmark page setup (Apple vs Microsoft, same fiscal year, not generated yet).", "Sip water. Reset the chat tab for the recap run later."],
  "We will now move to the second agent -- the Benchmark Agent. I am preparing two companies for a like-for-like comparison.");

// ================= PAGE 4: BENCHMARK C1/C2 =================
y = header("4. Benchmark Agent (Blocks C1-C2)");

y = stepBox(y, "1:05-1:25", "C1. BENCHMARK: COMPARISON + READING THE RESULTS (20 min)",
  [
    "On the Benchmark page: select Company A = Apple, Company B = Microsoft, same fiscal year (FY2024).",
    "Click Generate / Compare. Wait for the results (mention: numbers come from the extracted metrics of the uploaded filings).",
    "Walk through the side-by-side table row by row: Revenue, Revenue growth, Gross margin, Operating margin, Net income, Total debt, Current ratio, Free cash flow.",
    "Point at the fiscal-period label under each company -- it is always displayed.",
    "Read the verdict / insight section out loud (the written analysis).",
    "Point at one number in the table and trace it back: it matches the metric on the company's document page -- it was not typed by the AI.",
  ],
  "The Benchmark Agent compares two companies on the same financial basis. The table is not typed by an AI -- every cell comes from the metrics extracted from the filings during upload. The periods are printed under each company so you can always confirm it is a like-for-like comparison. The written verdict then explains the numbers -- but notice the discipline: the analysis discusses figures that are actually in the table, so the story can never drift away from the data.");

y = stepBox(y, "1:25-1:45", "C2. BENCHMARK: YEAR MISMATCH + MISSING METRICS (20 min)",
  [
    "Change one company to a DIFFERENT fiscal year (e.g. Apple FY2023 vs Microsoft FY2024) and generate.",
    "Show the warning: the system flags the period mismatch instead of silently comparing.",
    "Explain why: comparing different periods produces misleading conclusions, so the agent refuses to hide it.",
    "Now show the 'missing metrics' behaviour: if a company has no stored value for a metric (or you pick a filing with less data), the cell shows N/A -- an honest gap, not a guessed number.",
    "Switch back to the correct same-year pair to confirm normal operation again.",
  ],
  "Two more safety rules live here. Rule one: periods must be compatible. If I try to compare Apple's FY2023 against Microsoft's FY2024, the system warns me instead of pretending it is fair. Rule two: honest gaps. If a metric was not extracted for a company, the cell says N/A -- the agent would rather show a gap than invent a number. These are the small design decisions that make the comparison trustworthy enough for real financial work.");

// ================= PAGE 5: C3 + RECAP =================
y = header("5. Benchmark Persistence + End-to-End Recap (Blocks C3-D)");

y = stepBox(y, "1:45-2:00", "C3. BENCHMARK: HISTORY + REPEAT WITH A NEW PAIR (15 min)",
  [
    "Open the saved comparisons / history view. Show the comparison you just made is stored (companies, periods, timestamp).",
    "Re-open a saved comparison to prove results persist across visits.",
    "Run one fresh comparison with a different pair (e.g. Amazon vs Google, same fiscal year) to show the workflow repeats for any companies on hand.",
    "Point out that the same three rules apply automatically every time: period guard, exact values, honest gaps.",
  ],
  "Every comparison is stored with its companies and periods, so your benchmark work is a growing record, not a one-off screen. And notice the behaviour is identical for any pair -- the safety rules are not decorations, they run every time: compatible periods, exact extracted values, and honest N/A gaps.");

y = stepBox(y, "2:00-2:15", "D. END-TO-END RECAP RUN (15 min)",
  [
    "Start at the document page of one filing (Apple FY2024). Point at the agent summary cards -- including the Validation card that confirmed the document type at upload.",
    "Ask ONE research question about that filing and open ONE citation.",
    "Immediately run ONE benchmark including that company.",
    "Finish on the results screen side by side with the citation you opened.",
  ],
  "Let me connect everything in one minute. A filing is uploaded -- the Validation Agent confirms it is a real financial document, the other agents extract metrics and risks. The Research Agent answers questions about it with citations you can open. The Benchmark Agent compares it against a peer using the same extracted numbers. One document, two intelligence agents, every output traceable -- that is the complete loop of FinResearch AI.");

// ================= PAGE 6: Q&A + CLOSING =================
y = header("6. Q&A Backup + Closing (Blocks E-F)");

doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...INK);
doc.text("E. Q&A BACKUP -- one-line answers to likely questions (10 min)", 12, y + 2);
const qa = [
  ["How do I know the citation is real?", "It shows the document name, section, chunk number, and the verbatim excerpt -- open any of them on the spot."],
  ["What if the documents do not contain the answer?", "It says no source passages passed the relevance filter -- it never invents (shown live in B3)."],
  ["Can the AI fake the benchmark numbers?", "No -- the table is built from extracted metrics; the writing explains the table but cannot change it."],
  ["Why did it warn about the fiscal years?", "Comparing different periods is misleading, so the agent flags it instead of hiding it (shown live in C2)."],
  ["What if embeddings are not configured?", "Keyword search takes over automatically -- questions and citations work exactly the same."],
  ["Where do my questions and comparisons live?", "In the history views -- chat sessions and saved comparisons persist with their citations and periods."],
  ["Does it work for any company's filing?", "Any real annual/quarterly PDF or TXT -- the Validation Agent first confirms the document type (and rejects resumes, invoices, novels by name)."],
  ["What makes this better than asking a chatbot?", "Chatbots answer from memory; this answers only from YOUR filings, with every claim cited and every number extracted by code."],
];
let qy = y + 8;
qa.forEach(([q, a], i) => {
  doc.setFillColor(...(i % 2 ? [248, 250, 252] : [255, 255, 255])); doc.rect(12, qy, W - 24, 13, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(...BRAND);
  const qLines = doc.splitTextToSize("Q: " + clean(q), W - 32);
  doc.text(qLines[0], 15, qy + 4.6);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.3); doc.setTextColor(...INK);
  const aLines = doc.splitTextToSize("A: " + clean(a), W - 32);
  let ay = qy + 9.2;
  for (const ln of aLines.slice(0, 2)) { doc.text(ln, 15, ay); ay += 4.2; }
  qy += 13;
});
doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3); doc.rect(12, y + 8, W - 24, qy - y - 8);
y = qy + 8;

doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...INK);
doc.text("F. CLOSING (5 min)", 12, y); y += 7;
const closing = [
  "Summarise in one breath: Research Agent = cited answers from YOUR documents. Benchmark Agent = safe, like-for-like comparisons from extracted numbers.",
  "Thank the evaluators and invite final questions.",
  "Restore demo state afterwards: clear the throwaway chat entries if desired, keep the two uploaded filings -- ready for any follow-up session.",
];
doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(...INK);
for (const s of closing) {
  const ls = doc.splitTextToSize(clean(s), W - 32);
  doc.setFillColor(...GOLD); doc.circle(15, y - 1.1, 1.1, "F");
  for (const ln of ls) { doc.text(ln, 19, y); y += 4.8; }
  y += 2;
}
doc.setFillColor(240, 253, 244); doc.setDrawColor(...GREEN); doc.setLineWidth(1);
doc.roundedRect(12, y + 4, W - 24, 16, 3, 3, "FD");
doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...GREEN);
doc.text("Final line: 'Cited research and safe comparisons -- every number traceable back to the filing.'", 17, y + 14);

const file = path.join(OUT, "DEMO_RESEARCH_BENCHMARK_150MIN.pdf");
doc.save(file);
console.log("wrote", file, "| pages:", n);
