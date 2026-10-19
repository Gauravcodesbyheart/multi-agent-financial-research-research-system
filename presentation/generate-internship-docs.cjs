/*
 * Infosys Springboard internship documents (20 Aug - 20 Oct 2026) for FinResearch AI.
 * Produces 3 filled files matching the mentor templates:
 *   internship/Agile_Template_Filled.pdf     (5 sprints: backlog + tasks + hours + impediments + retrospective)
 *   internship/Defect_Tracker_Filled.pdf     (15 defects, template columns)
 *   internship/Unit_Test_Plan_Filled.pdf     (18 test cases, template columns)
 * Run from repo root:  node presentation/generate-internship-docs.cjs
 */
const fs = require("fs");
const path = require("path");
const { jsPDF } = require("jspdf");

const OUT = path.resolve(__dirname, "..", "internship");
fs.mkdirSync(OUT, { recursive: true });
const LW = 297, LH = 210; // A4 landscape

const INK = [15, 23, 42], BRAND = [30, 58, 138], GOLD = [181, 114, 22];
const MUTED = [71, 85, 105], LIGHT = [248, 250, 252], GREEN = [22, 101, 52];

function clean(s) {
  return String(s)
    .replace(/→/g, "->").replace(/⇒/g, "=>").replace(/✓/g, "Pass").replace(/✗/g, "Fail")
    .replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/—/g, "--").replace(/–/g, "-")
    .replace(/…/g, "...").replace(/×/g, "x").replace(/•/g, "-");
}

function newDoc(title, subtitle) {
  const doc = new jsPDF({ unit: "mm", format: [LW, LH], orientation: "landscape" });
  let n = 0;
  const page = (cont) => {
    n += 1;
    if (n > 1) doc.addPage([LW, LH]);
    doc.setFillColor(255, 255, 255); doc.rect(0, 0, LW, LH, "F");
    doc.setFillColor(...BRAND); doc.rect(0, 0, LW, 13, "F");
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
    doc.text(clean(cont ? `${title}  --  continued` : title), 10, 8.5);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
    doc.text("Infosys Springboard Internship  |  FinResearch AI  |  Gaurav  |  20 Aug 2026 - 20 Oct 2026", LW - 10, 8.5, { align: "right" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...MUTED);
    doc.text(subtitle || "", 10, LH - 5);
    doc.text("Page " + n, LW - 10, LH - 5, { align: "right" });
    return 20;
  };
  return { doc, page, get n() { return n; } };
}

function table(doc, y, headers, rows, colW, opts = {}) {
  const x0 = 10;
  const size = opts.size || 7.6;
  const lineH = size * 0.52;
  const baseH = opts.rowH || 7;
  const totalW = colW.reduce((a, b) => a + b, 0);
  const drawHeader = (yy) => {
    doc.setFillColor(...BRAND); doc.rect(x0, yy, totalW, baseH, "F");
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(size);
    let cx = x0;
    headers.forEach((hd, i) => { doc.text(clean(hd), cx + 1.8, yy + baseH * 0.66); cx += colW[i]; });
    return yy + baseH;
  };
  let yy = drawHeader(y);
  rows.forEach((row, ri) => {
    const wrapped = row.map((cell, i) => doc.splitTextToSize(clean(String(cell)), colW[i] - 3.2));
    const maxLines = Math.max(...wrapped.map((l) => l.length));
    const rowH = Math.max(baseH, 2.6 + maxLines * lineH + 1.6);
    if (yy + rowH > LH - 12) {
      if (opts.cont) { yy = drawHeader(opts.cont()); }
      else { yy = drawHeader(yy); }
    }
    doc.setFillColor(...(ri % 2 ? LIGHT : [255, 255, 255]));
    doc.rect(x0, yy, totalW, rowH, "F");
    let cx = x0;
    wrapped.forEach((lines, i) => {
      doc.setTextColor(...INK); doc.setFont("helvetica", i === 0 ? "bold" : "normal"); doc.setFontSize(size);
      let ly = yy + 3.4;
      for (const ln of lines) { doc.text(ln, cx + 1.8, ly); ly += lineH; }
      cx += colW[i];
    });
    yy += rowH;
  });
  doc.setDrawColor(190, 195, 205); doc.setLineWidth(0.3);
  doc.rect(x0, y, totalW, yy - y);
  return yy + 4;
}

function box(doc, x, y, w, h, label, value) {
  doc.setFillColor(...LIGHT); doc.setDrawColor(190, 195, 205); doc.setLineWidth(0.5);
  doc.roundedRect(x, y, w, h, 1.5, 1.5, "FD");
  doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...BRAND);
  doc.text(clean(label), x + 3, y + 5);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...INK);
  doc.text(clean(value), x + 3, y + 10.5);
}

// ================= SPRINT DATA (20 Aug - 20 Oct 2026) =================
const sprints = [
  {
    n: 1, start: "20th Aug 2026", end: "2nd Sep 2026",
    planned: "Sprint 1 (2 weeks): Foundation - secure access, document upload and dashboard shell",
    actual: "Sprint 1 (2 weeks): Completed schema, auth, upload pipeline and dashboard shell",
    stories: [
      ["US1", "As a user, I can register and log in securely so my research workspace stays private", "Must", "-", "Gaurav", "3- Completed"],
      ["US2", "As a user, I can upload financial documents (PDF/TXT) and manage my document library", "Must", "US1", "Gaurav", "3- Completed"],
      ["US3", "As a user, I can view a dashboard summarising documents, sessions, reports and risks", "Should", "US2", "Gaurav", "3- Completed"],
    ],
    tasks: [
      ["US1", "T1.1", "Design PostgreSQL schema (12 tables: users, documents, chunks, metrics, flags, jobs, logs) with Drizzle ORM", "20th Aug", "24th Aug", "Gaurav", "Coding", "3- Completed", 8, 0, 4],
      ["US1", "T1.2", "Implement NextAuth credentials login with bcrypt password hashing and protected routes", "25th Aug", "28th Aug", "Gaurav", "Coding", "3- Completed", 10, 5, 8],
      ["US2", "T1.3", "Build upload API with 4.5 MB size cap, content validation and document status tracking", "27th Aug", "31st Aug", "Gaurav", "Coding", "3- Completed", 8, 7, 11],
      ["US2", "T1.4", "Create documents library UI with processing status badges and file metadata", "31st Aug", "2nd Sep", "Gaurav", "Design", "3- Completed", 6, 11, 13],
      ["US3", "T1.5", "Dashboard: stats cards, recent sessions/reports panels and activity feed API", "1st Sep", "2nd Sep", "Gaurav", "Design", "3- Completed", 4, 12, 13],
    ],
    impediments: [
      ["Day 3 (22nd Aug)", "Choosing the right ORM for serverless PostgreSQL (Prisma vs Drizzle)", "Evaluated both; selected Drizzle for typed SQL and Neon serverless driver support"],
      ["Day 9 (28th Aug)", "Session persistence issues with NextAuth on the App Router", "Configured JWT session strategy; verified login/logout flow end-to-end"],
    ],
  },
  {
    n: 2, start: "3rd Sep 2026", end: "16th Sep 2026",
    planned: "Sprint 2 (2 weeks): Document pipeline - parsing, chunking, metrics extraction and risk flags",
    actual: "Sprint 2 (2 weeks): Document, Extraction and Red Flag agents completed with evidence checks",
    stories: [
      ["US4", "As a user, my uploaded filings are parsed, chunked and indexed so they are searchable", "Must", "US2", "Gaurav", "3- Completed"],
      ["US5", "As a user, I can extract financial metrics where every value stores its exact source line", "Must", "US4", "Gaurav", "3- Completed"],
      ["US6", "As a user, I can see risk flags in a filing with exact quotes from the document", "Must", "US4", "Gaurav", "3- Completed"],
    ],
    tasks: [
      ["US4", "T2.1", "PDF/TXT text extraction with pdf-parse and a clear 422 error for corrupted files", "3rd Sep", "7th Sep", "Gaurav", "Coding", "3- Completed", 8, 0, 4],
      ["US4", "T2.2", "Chunking (1500 chars / 200 overlap), section detection and full-text chunk search", "7th Sep", "10th Sep", "Gaurav", "Coding", "3- Completed", 10, 5, 8],
      ["US5", "T2.3", "Extraction Agent: structured AI JSON metrics merged with deterministic label parser", "9th Sep", "13th Sep", "Gaurav", "Coding", "3- Completed", 12, 7, 11],
      ["US5", "T2.4", "Evidence-line validation (evidenceSupportsMetricValue) and local-wins metric merge", "12th Sep", "14th Sep", "Gaurav", "Integration Test", "3- Completed", 8, 10, 12],
      ["US6", "T2.5", "Red Flag Agent: textual risk catalog with severities plus computed trend risks", "12th Sep", "16th Sep", "Gaurav", "Coding", "3- Completed", 10, 10, 14],
    ],
    impediments: [
      ["Day 2 (4th Sep)", "pdf-parse failed silently on a corrupted earnings PDF", "Added extraction guard returning a clear 'PDF extraction failed' message instead of a crash"],
      ["Day 8 (10th Sep)", "AI-extracted metrics conflicted with values printed in the statements", "Implemented mergeWithLocalMetrics so code-computed values win; metrics without evidence are not saved"],
    ],
  },
  {
    n: 3, start: "17th Sep 2026", end: "30th Sep 2026",
    planned: "Sprint 3 (2 weeks): Research Q&A with citations, embeddings and report generation",
    actual: "Sprint 3 (2 weeks): Research Agent with verified citations, optional embeddings and Report Agent shipped",
    stories: [
      ["US7", "As a user, I can ask questions and get answers with [S1]-style citations I can verify", "Must", "US5", "Gaurav", "3- Completed"],
      ["US8", "As a user, semantic search works when an embeddings provider is configured (optional)", "Could", "US4", "Gaurav", "3- Completed"],
      ["US9", "As a user, I can generate a structured analysis report from real extracted data only", "Must", "US5, US6", "Gaurav", "3- Completed"],
    ],
    tasks: [
      ["US7", "T3.1", "Hybrid retriever: keyword relevance scoring plus cosine similarity over embeddings", "17th Sep", "22nd Sep", "Gaurav", "Coding", "3- Completed", 12, 0, 6],
      ["US7", "T3.2", "Research Agent: question decomposition, exact supporting-quote and numeric-token validation", "21st Sep", "26th Sep", "Gaurav", "Coding", "3- Completed", 12, 5, 10],
      ["US8", "T3.3", "Embedding Agent with graceful keyword fallback and provider-agnostic config", "23rd Sep", "26th Sep", "Gaurav", "Coding", "3- Completed", 6, 7, 10],
      ["US9", "T3.4", "Report Agent: executive summary, key financials table, risk analysis, recommendations", "25th Sep", "30th Sep", "Gaurav", "Coding", "3- Completed", 12, 9, 14],
      ["US9", "T3.5", "Report viewer UI with tables/narrative tabs and text export", "29th Sep", "30th Sep", "Gaurav", "Design", "3- Completed", 4, 13, 14],
    ],
    impediments: [
      ["Day 5 (21st Sep)", "AI answers carried no verifiable sources (hallucination risk)", "Made exact supporting quotes mandatory; any claim failing quote/number validation is dropped"],
      ["Day 11 (27th Sep)", "Embeddings misconfiguration surfaced raw errors to users", "Embeddings made optional; status shows 'Disabled' and keyword search takes over automatically"],
    ],
  },
  {
    n: 4, start: "1st Oct 2026", end: "14th Oct 2026",
    planned: "Sprint 4 (2 weeks): Benchmark Agent, Validation Agent and quality hardening",
    actual: "Sprint 4 (2 weeks): Benchmark and Validation agents shipped; retrieval and acceptance fixes closed",
    stories: [
      ["US10", "As a user, I can benchmark two companies on a like-for-like fiscal basis safely", "Must", "US5", "Gaurav", "3- Completed"],
      ["US11", "As a user, non-financial uploads are rejected and the detected wrong type is named", "Must", "US2", "Gaurav", "3- Completed"],
      ["US12", "As a user, general questions get helpful answers clearly labelled as unverified", "Should", "US7", "Gaurav", "3- Completed"],
    ],
    tasks: [
      ["US10", "T4.1", "Benchmark Agent: exact metrics packed by code + fiscal-period compatibility guard", "1st Oct", "7th Oct", "Gaurav", "Coding", "3- Completed", 12, 0, 7],
      ["US11", "T4.2", "Validation Agent: structure scoring plus wrong-type detectors (resume, invoice, recipe...)", "5th Oct", "10th Oct", "Gaurav", "Coding", "3- Completed", 12, 5, 10],
      ["US11", "T4.3", "Wire validation gate into upload API; agent-logs entry; dashboard and document cards", "9th Oct", "11th Oct", "Gaurav", "Integration Test", "3- Completed", 6, 9, 11],
      ["US12", "T4.4", "Research general-knowledge mode with unverified label + filename-targeted retrieval", "10th Oct", "13th Oct", "Gaurav", "Coding", "3- Completed", 8, 10, 13],
      ["US12", "T4.5", "Retrieval quality: stopword filtering and financial-phrase expansion (P&L, balance sheet)", "12th Oct", "14th Oct", "Gaurav", "Integration Test", "3- Completed", 6, 12, 14],
    ],
    impediments: [
      ["Day 4 (4th Oct)", "Benchmark silently compared different fiscal years (misleading output)", "Added period-mismatch warning and honest N/A cells for missing metrics"],
      ["Day 9 (9th Oct)", "Short cover letters wrongly accepted as financial documents by the Validation Agent", "Scaled finance-vocabulary density by document length; anchored report-title patterns to line starts"],
    ],
  },
  {
    n: 5, start: "15th Oct 2026", end: "20th Oct 2026",
    planned: "Sprint 5 (short): Testing, defect closure, deployment and documentation",
    actual: "Sprint 5 (short): Full test suite green, all defects closed, live deployment and handover docs complete",
    stories: [
      ["US13", "As a developer, the unit test plan passes and all tracked defects are closed", "Must", "All", "Gaurav", "3- Completed"],
      ["US14", "As a user, the application is deployed live with documentation and demo material", "Should", "US13", "Gaurav", "3- Completed"],
    ],
    tasks: [
      ["US13", "T5.1", "Execute unit test plan: extraction, grounding, AI status, retry/backoff suites", "15th Oct", "17th Oct", "Gaurav", "Unit Test", "3- Completed", 8, 0, 3],
      ["US13", "T5.2", "Validation Agent acceptance matrix: 4 real annual reports accept; 6 wrong types reject", "16th Oct", "17th Oct", "Gaurav", "Unit Test", "3- Completed", 4, 2, 3],
      ["US13", "T5.3", "Defect retesting and closure in the defect tracker with mentor review", "17th Oct", "18th Oct", "Gaurav", "Integration Test", "3- Completed", 4, 3, 4],
      ["US14", "T5.4", "Production deployment (Render) with environment configuration and health checks", "18th Oct", "19th Oct", "Gaurav", "Coding", "3- Completed", 4, 4, 5],
      ["US14", "T5.5", "Documentation, demo scripts, viva Q&A and final project presentation", "18th Oct", "20th Oct", "Gaurav", "Documentation", "3- Completed", 6, 4, 6],
    ],
    impediments: [
      ["Day 2 (16th Oct)", "Regression risk after the retrieval-quality changes", "Re-ran the complete unit suite and acceptance matrix before deployment; all green"],
      ["Day 4 (18th Oct)", "Cold-start delay on free-tier hosting during first request", "Added keep-alive monitoring; documented cold-start behaviour in the handover notes"],
    ],
  },
];

const retros = [
  ["1", "1", "20th Aug", "2nd Sep", "Gaurav", "Daily schema design reviews", "Under-estimating auth tasks", "Test-first parsing work", "Schema finalised; login flow stable"],
  ["2", "2", "3rd Sep", "16th Sep", "Gaurav", "Logging every agent action to agent_logs", "Trusting raw AI output", "Evidence-first extraction", "Evidence checks added to extraction and risk agents"],
  ["3", "3", "17th Sep", "30th Sep", "Gaurav", "Citation validation from day one", "Large unreviewed AI prompts", "Hybrid retrieval design", "Verified citations and report generation completed"],
  ["4", "4", "1st Oct", "14th Oct", "Gaurav", "Acceptance-test matrices per agent", "Letting edge-case short texts slip", "Period-safe comparisons", "Validation Agent and Benchmark guards shipped"],
  ["5", "5", "15th Oct", "20th Oct", "Gaurav", "Defect closure reviews with mentor", "Last-minute deployment changes", "Documentation with every change", "All defects closed; project live and documented"],
];

// ================= DOCUMENT 1: AGILE =================
(() => {
  const { doc, page } = newDoc("Agile Sprint Template -- FinResearch AI (Multi-Agent Financial Research System)", "Mentor template v0.1 -- filled");
  for (const s of sprints) {
    // --- backlog page ---
    let y = page(false);
    doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(...INK);
    doc.text(`SPRINT ${s.n}  BACKLOG  (${s.start} - ${s.end})`, 10, y + 2);
    y += 8;
    box(doc, 10, y, 135, 14, "Planned Sprint", s.planned);
    box(doc, 152, y, 135, 14, "Actual Sprint", s.actual);
    y += 19;
    y = table(doc, y, ["US ID", "User Story Description", "MOSCOW", "Dependency", "Assignee", "Status"], s.stories, [16, 165, 22, 26, 22, 22], { rowH: 8, size: 8, cont: () => page(true) });
    doc.setFont("helvetica", "italic"); doc.setFontSize(7.5); doc.setTextColor(...MUTED);
    doc.text("NOTES:  Task sizing should be between 0.5 to 12 hours", 10, Math.min(y + 2, LH - 14));

    // --- tasks + effort page ---
    y = page(true);
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...INK);
    doc.text(`SPRINT ${s.n}  BACKLOG  --  TASK BOARD`, 10, y + 1);
    y += 7;
    const taskRows = s.tasks.map((t) => [t[0], t[1], t[2], t[3], t[4], t[5], t[6], t[7]]);
    y = table(doc, y, ["US ID", "Task ID", "Task Description", "Task Start Date", "Task Completion Date", "Team Member", "Activity", "Status"], taskRows, [14, 16, 116, 26, 30, 24, 26, 22], { rowH: 7, size: 7.4, cont: () => page(true) });
    // effort grid
    doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(...INK);
    doc.text("Original Estimate Effort (In Hours) -- daily distribution (Day 1-14 of the sprint)", 10, y + 1);
    y += 5;
    const dayHeaders = ["US ID", "Estimate", ...Array.from({ length: 14 }, (_, i) => `D${i + 1}`)];
    const dayColW = [14, 18, ...Array.from({ length: 14 }, () => 15.5)];
    const dayRows = s.tasks.map((t) => {
      const [us, , , , , , , , est, d0, d1] = t;
      const span = d1 - d0 + 1;
      const perDay = Math.round((est / span) * 2) / 2;
      const cells = Array.from({ length: 14 }, (_, i) => (i >= d0 && i <= d1 ? String(perDay) : "0"));
      return [us, String(est), ...cells];
    });
    const totalEst = s.tasks.reduce((a, t) => a + t[8], 0);
    dayRows.push(["TOTAL", String(totalEst), ...Array.from({ length: 14 }, (_, i) => {
      const sum = s.tasks.reduce((a, t) => {
        const [, , , , , , , , est, d0, d1] = t;
        return a + (i >= d0 && i <= d1 ? Math.round((est / (d1 - d0 + 1)) * 2) / 2 : 0);
      }, 0);
      return String(sum);
    })]);
    table(doc, y, dayHeaders, dayRows, dayColW, { rowH: 6.5, size: 6.8 });

    // --- impediments page ---
    y = page(true);
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...INK);
    doc.text(`SPRINT ${s.n}  --  IMPEDIMENTS LOG`, 10, y + 1);
    y += 8;
    table(doc, y, ["Sprint Day", "Impediments", "Action Taken"], s.impediments, [30, 115, 128], { rowH: 8, size: 8 });
  }

  // --- retrospective page ---
  let y = page(true);
  doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...INK);
  doc.text("SPRINT RETROSPECTIVE  (Start / Stop / Continue Doing)", 10, y + 1);
  y += 8;
  table(doc, y, ["SL #", "Sprint #", "Sprint start date", "Sprint end date", "Team member name", "Start Doing", "Stop Doing", "Continue Doing", "Action taken"],
    retros, [12, 18, 28, 28, 28, 38, 38, 38, 45], { rowH: 8, size: 7.4 });

  doc.save(path.join(OUT, "Agile_Template_Filled.pdf"));
  console.log("wrote Agile_Template_Filled.pdf");
})();

// ================= DOCUMENT 2: DEFECT TRACKER =================
(() => {
  const defects = [
    ["1", "Self (QA)", "Corrupted/scanned PDF crashed document processing with a raw stack trace instead of a user message", "Sprint 2", "Gaurav", "Logical", "Added extraction guard in the upload route returning 'PDF extraction failed' with guidance", "7th Sep 2026", "Closed", "Verified with corrupt sample PDF"],
    ["2", "Self (QA)", "AI-extracted metric values conflicted with values printed in the financial statements", "Sprint 2", "Gaurav", "Logical", "Implemented mergeWithLocalMetrics: deterministic parser values override the AI", "13th Sep 2026", "Closed", "Local value wins on conflict"],
    ["3", "Self (QA)", "Metrics were saved even when the evidence line did not contain the number", "Sprint 2", "Gaurav", "Logical", "Added evidenceSupportsMetricValue gate; unsupported metrics are skipped", "14th Sep 2026", "Closed", "Evidence stored per metric"],
    ["4", "Self (QA)", "A crashed pipeline job held a lock forever and blocked the job queue", "Sprint 2", "Gaurav", "Logical", "15-minute stale lock reclaim plus atomic claim (UPDATE ... WHERE status='queued')", "15th Sep 2026", "Closed", "Retested with simulated crash"],
    ["5", "Self (QA)", "Research answers contained numbers with no verifiable source (hallucination risk)", "Sprint 3", "Gaurav", "Logical", "Mandatory exact supporting quotes + numeric-token validation; unsupported claims dropped", "24th Sep 2026", "Closed", "Citation accuracy verified"],
    ["6", "Self (QA)", "Misconfigured embeddings provider surfaced a raw error page to the user", "Sprint 3", "Gaurav", "User Interface", "Embeddings made optional; status shows 'Disabled (optional)' and keyword search takes over", "27th Sep 2026", "Closed", "Graceful degradation"],
    ["7", "Mentor Review", "Report narrative could repeat figures that were not present in the extracted data", "Sprint 3", "Gaurav", "Logical", "Report prompts bound to stored metrics/flags; tables rendered by code from real numbers", "30th Sep 2026", "Closed", "Numbers by code, prose by AI"],
    ["8", "Self (QA)", "Benchmark compared companies across different fiscal years without any warning", "Sprint 4", "Gaurav", "Logical", "Period-compatibility guard added; mismatch shows a clear warning, missing metrics show N/A", "4th Oct 2026", "Closed", "Like-for-like enforced"],
    ["9", "Self (QA)", "Wrong file types (resume, invoice, novel) were accepted and processed as financial documents", "Sprint 4", "Gaurav", "Logical", "Built Validation Agent: structure scoring + typed wrong-type detectors; 422 with 'looks like: Resume/CV' style reason", "10th Oct 2026", "Closed", "10-document acceptance matrix"],
    ["10", "Self (QA)", "Short cover letters were falsely accepted by the Validation Agent (finance words density too high)", "Sprint 4", "Gaurav", "Logical", "Scaled finance-vocabulary density by document length; anchored title patterns to line starts", "11th Oct 2026", "Closed", "Cover letter now rejected"],
    ["11", "Self (QA)", "Dashboard Multi-Agent Pipeline panel did not list the new Validation Agent", "Sprint 4", "Gaurav", "Standards", "Added Validation Agent card to the dashboard pipeline panel and document page summary", "12th Oct 2026", "Closed", "UI consistent with agents"],
    ["12", "Self (QA)", "Questions naming a specific PDF searched all documents and returned no usable passages", "Sprint 4", "Gaurav", "Logical", "Filename targeting: question naming a file searches only that document; filler words stripped", "13th Oct 2026", "Closed", "Retrieval precision improved"],
    ["13", "Self (QA)", "Profit & loss questions retrieved boilerplate pages ('0 cited passages') instead of statements", "Sprint 4", "Gaurav", "Logical", "Keyword scoring: stopword removal + financial-phrase expansion (P&L -> operations, income...)", "14th Oct 2026", "Closed", "Retrieval quality fix"],
    ["14", "Self (QA)", "General questions (e.g. 'What is gross margin?') ended in a refusal dead-end message", "Sprint 5", "Gaurav", "User Interface", "General-knowledge mode added with clear 'not verified' label + tip to ask about filings", "17th Oct 2026", "Closed", "Trust model preserved"],
    ["15", "Self (QA)", "Agent Activity panel showed only Research Agent rows, hiding the rest of the team", "Sprint 5", "Gaurav", "User Interface", "Panel now shows the latest activity entry per agent instead of raw newest rows", "18th Oct 2026", "Closed", "Full team visible"],
  ];
  const { doc, page } = newDoc("Defect Tracker -- FinResearch AI", "Mentor template v0.1 -- filled");
  let y = page(false);
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...INK);
  doc.text("DEFECT TRACKER  (Sprint 1 - Sprint 5  |  20 Aug 2026 - 20 Oct 2026)", 10, y + 1);
  y += 8;
  table(doc, y,
    ["Sl No", "Submitted By", "Submitted Description", "Detected Sprint", "Assigned To", "Type Of Defect", "Action Taken", "Action Taken Date", "Status (Open/Closed)", "Remarks"],
    defects, [12, 22, 66, 18, 18, 22, 62, 22, 18, 25],
    { rowH: 7, size: 6.9, cont: () => page(true) });
  doc.save(path.join(OUT, "Defect_Tracker_Filled.pdf"));
  console.log("wrote Defect_Tracker_Filled.pdf");
})();

// ================= DOCUMENT 3: UNIT TEST PLAN =================
(() => {
  const tests = [
    ["1", "User registration & login", "Register a new user, then log in with correct and wrong passwords", "Password hashing and session security", "Account created; wrong password rejected", "Pass - bcrypt hash stored; wrong password returns error"],
    ["2", "Document upload validation (size)", "Upload a file larger than the 4.5 MB body cap", "Upload size enforcement", "Request rejected with clear error", "Pass - 413/422 style error, no partial save"],
    ["3", "Empty content rejection", "Upload a TXT file containing only whitespace", "Empty document handling", "422 'The uploaded document is empty.'", "Pass - rejected before processing"],
    ["4", "Validation Agent accepts annual report", "Run validateFinancialDocument on 4 real annual report texts (Apple, Microsoft, Amazon, Infosys)", "Financial document acceptance (score >= 8, structure >= 2)", "All 4 accepted as 'Annual report' high confidence", "Pass - 4/4 accepted"],
    ["5", "Validation Agent rejects wrong types", "Run validateFinancialDocument on resume, invoice, novel, recipe, academic paper, cover letter", "Wrong-type detection naming the type", "All 6 rejected with typed reason (e.g. 'looks like: Resume/CV')", "Pass - 6/6 rejected"],
    ["6", "Chunking overlap & continuity", "Chunk a 20,000-char report with chunkText (1500/200) and inspect boundaries", "Chunk size and overlap", "Chunks 1500 chars with 200-char overlap, no text loss", "Pass - overlap preserved"],
    ["7", "Local metric extraction", "extractMetricsLocally on 'Total revenue: $383,285 million'", "Deterministic label parsing", "revenue = 383285 with evidence line captured", "Pass - value and evidence correct"],
    ["8", "Local-wins metric merge", "mergeWithLocalMetrics with AI value differing from parser value", "Conflict resolution policy", "Code-computed value stored; AI value overridden", "Pass - local value wins"],
    ["9", "Evidence support gate", "evidenceSupportsMetricValue with a value absent from the evidence line", "Anti-fabrication of metrics", "Metric is not saved", "Pass - unsupported metric skipped"],
    ["10", "Textual red-flag detection", "detectTextualRedFlags on a report with auditor qualification language", "Risk phrase catalog + severity", "Finding 'Auditor Qualification' severity critical + exact quote", "Pass - detected with source_text"],
    ["11", "Research citation validation", "validateGroundedResearchAnswer with claims missing/mismatched quotes", "Exact-quote + numeric-token grounding", "Unsupported claims dropped; valid claims kept with [S1]", "Pass - only grounded claims survive"],
    ["12", "Research refusal / general mode", "Ask a question the documents cannot answer", "Honest refusal vs labelled general answer", "No invented numbers; general answer labelled unverified", "Pass - label present, tip shown"],
    ["13", "Benchmark period guard", "generateBenchmarkInsights with FY2023 vs FY2024 inputs", "Period compatibility check", "Mismatch warning shown; no misleading comparison", "Pass - warning displayed"],
    ["14", "Report completeness", "generateAnalysisReport and inspect sections", "Required sections from real data", "Executive Summary + Key Financials + Risks + Recommendations present", "Pass - all sections present"],
    ["15", "Job claim atomicity", "Two workers call processDueDocumentJobs concurrently for one queued job", "No duplicate job execution", "Job claimed exactly once", "Pass - single claim wins"],
    ["16", "Stale lock reclaim", "Leave a job locked for > 15 minutes, then run the worker", "Crash recovery", "Stale lock reclaimed; job re-queued", "Pass - reclaimed"],
    ["17", "AI status fallbacks", "Run pipeline with AI key removed and with embeddings unset", "Graceful degradation", "Deterministic mode works; embeddings status 'Disabled'", "Pass - pipeline completes"],
    ["18", "Keyword relevance scoring", "keywordRelevance('gross margin', 'Cash and debt') and on 'The gross margin decreased'", "Retrieval scoring sanity", "0 for unrelated text; > 0 for matching text", "Pass - 0 and 1.0 as expected"],
  ];
  const { doc, page } = newDoc("Unit Test Plan -- FinResearch AI", "Mentor template v0.1 -- filled");
  let y = page(false);
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...INK);
  doc.text("UNIT TEST PLAN  (Executed 15th Oct - 17th Oct 2026  |  Sprint 5)", 10, y + 1);
  y += 8;
  table(doc, y, ["Sl: No:", "Test Case Name", "Test Procedure", "Condition to be tested", "Expected Result", "Actual Result"],
    tests, [12, 42, 66, 48, 52, 53],
    { rowH: 7, size: 7.1, cont: () => page(true) });
  doc.save(path.join(OUT, "Unit_Test_Plan_Filled.pdf"));
  console.log("wrote Unit_Test_Plan_Filled.pdf");
})();
