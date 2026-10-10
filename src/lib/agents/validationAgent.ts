// Validation Agent -- checks that an uploaded document really IS a financial
// document (annual report, financial statements, quarterly filing...) before the
// rest of the pipeline treats it like one.
//
// Design follows the project's hybrid philosophy: deterministic heuristics run
// first (transparent, free, testable), and an AI tie-breaker is consulted ONLY
// for borderline documents. The AI can never override a clear deterministic
// verdict, so the demo behaviour stays predictable.
//
// Used by POST /api/documents: a rejected upload returns 422 with the reasons;
// an accepted upload is logged to agent_logs so the Validation Agent appears in
// the document's activity trail.

import { db } from "@/db";
import { agentLogs } from "@/db/schema";
import { generateJsonLlm } from "./llmClient";

export interface DocumentValidationResult {
  isFinancial: boolean;
  confidence: "high" | "medium" | "low";
  documentTypeGuess: string;
  score: number;
  reasons: string[];
}

// ---------------------------------------------------------------------------
// Deterministic signals
// ---------------------------------------------------------------------------

/** Strong report-style section headings (each distinct hit scores +3). */
const SECTION_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  // Title-style usage only (up to two words before it on the line), so prose
  // like "I read your annual report" does not count as report structure.
  { name: "'Annual report' title", pattern: /^\s*(?:\S+\s+){0,2}\bannual report\b/im },
  {
    name: "financial statements heading",
    pattern: /\b(financial statements?|consolidated statements?|balance sheets?|statements? of (financial position|operations|income|cash flows?))\b/i,
  },
  { name: "Management discussion & analysis", pattern: /\bmanagement['’]?s? discussion and analysis\b/i },
  { name: "Notes to financial statements", pattern: /\bnotes to (the )?(consolidated )?financial statements\b/i },
  { name: "Results of operations", pattern: /\bresults of operations\b/i },
  {
    name: "independent auditor report",
    pattern: /\b(report of independent|independent (registered )?public accounting|independent auditor|statutory auditor)\b/i,
  },
  { name: "quarterly filing", pattern: /\b(quarterly report|10-q|three months ended)\b/i },
];

/** Metric-style "Label: value" lines (each distinct pattern scores +2, extras +1). */
const METRIC_LABEL_PATTERNS: RegExp[] = [
  /^\s*(?:total\s+)?(?:net\s+)?(?:revenues?|net sales)\s*[:—-]/im,
  /^\s*(?:gross|operating|net)\s+(?:income|profit|margin)\s*[:—-]/im,
  /^\s*total\s+(?:assets|liabilities|equity)\s*[:—-]/im,
  /^\s*(?:cash and (?:cash )?equivalents|operating cash flow|free cash flow|capital expenditures)\s*[:—-]/im,
  /^\s*(?:earnings per share|eps|ebitda|current ratio|quick ratio|debt[- ]to[- ]equity|return on equity|return on assets)\b[^:\n]{0,30}[:—-]/im,
  /^\s*fiscal year\s*[:—-]/im,
  /^\s*(?:total debt|long[- ]term debt|short[- ]term debt|borrowings)\s*[:—-]/im,
  /^\s*(?:revenue growth|year-over-year)\b[^:\n]{0,40}[:—-]/im,
];

/** Financial vocabulary density: count per 1,000 words. */
const FINANCE_VOCAB = /\b(revenue|revenues|profit|loss|assets|liabilities|equity|shareholders|dividend|fiscal|quarter|quarterly|auditor|audit|gaap|ifrs|cash flow|earnings|margin|liquidity|solvency|debt|borrowings|depreciation|amortization|interest expense|operating income|net income|gross|balance sheet|retained earnings|book value|diluted|capital expenditure|free cash flow|ebitda)\b/gi;

/** Table-style figures: $1,234 / 12.3% */
const MONEY_FIGURES = /\$\s?-?[\d,]{2,}(?:\.\d+)?/g;
const PERCENT_FIGURES = /\d+(?:\.\d+)?\s?%/g;

/** Period markers that real filings always contain. */
const PERIOD_MARKER = /\b(fiscal year|year ended|quarter ended|for the (financial )?year|annual filing|as of december 31)\b/i;

/** Wrong-document-type detectors (each hit is a strong rejection + type guess). */
const WRONG_TYPE_CHECKS: Array<{ type: string; test: (text: string) => boolean }> = [
  {
    type: "Resume/CV",
    test: (t) => /\b(curriculum vitae|cover letter|references available)\b/i.test(t) ||
      /\b(work experience|professional experience)\b/i.test(t) ||
      (/\bresume\b/i.test(t) && /\b(work experience|skills|education)\b/i.test(t)),
  },
  {
    type: "Invoice/bill",
    test: (t) => /\b(invoice\s*(no\.?|number|#)|bill to|purchase order\s*(no\.?|#)?|amount due|payment terms|due date)\b/i.test(t),
  },
  {
    type: "Recipe",
    test: (t) => /\b(ingredients|preheat|servings|cook(ing)? time)\b/i.test(t) || /\binstructions\s*:/i.test(t),
  },
  {
    type: "Book/fiction",
    test: (t) => /\b(prologue|epilogue|novel)\b/i.test(t) || /\bchapter (one|two|three|four|five|\d+)\b/i.test(t),
  },
  {
    type: "Academic paper",
    test: (t) => /\bet al\.?\b/.test(t) && /\b(references|bibliography)\b/i.test(t),
  },
  {
    type: "Source code / technical docs",
    test: (t) => (/\b(npm install|function\s*\(|=>\s*\{|import .* from ['"]|const [a-zA-Z_$]+ =)\b/.test(t) ? countMatches(t, /\b(npm install|function\s*\(|=>\s*\{|import .* from ['"]|const [a-zA-Z_$]+ =)\b/g) >= 3 : false),
  },
  {
    type: "Presentation slides",
    test: (t) => countMatches(t, /\bslide\s+\d+/gi) >= 3,
  },
];

function countMatches(text: string, pattern: RegExp): number {
  return (text.match(pattern) || []).length;
}

// ---------------------------------------------------------------------------
// Core validation
// ---------------------------------------------------------------------------

export async function validateFinancialDocument(
  content: string,
  fileName = "",
): Promise<DocumentValidationResult> {
  const text = content.slice(0, 200000);
  const words = Math.max(1, countMatches(text, /\b\w+\b/g));
  const reasons: string[] = [];

  // 1. Wrong-type detection runs ONLY when the document lacks financial
  //    structure: real filings can legitimately mention "ingredients" (a food
  //    segment) or "professional experience" (director bios) without being a
  //    recipe or a resume.
  const sectionsFound = SECTION_PATTERNS.filter((s) => s.pattern.test(text));
  const sectionScore = Math.min(12, sectionsFound.length * 3);

  // 2. Metric-label lines ("Total revenue: ...").
  let labelHits = 0;
  for (const pattern of METRIC_LABEL_PATTERNS) {
    labelHits += Math.min(2, countMatches(text, new RegExp(pattern.source, "gim")));
  }
  const labelScore = Math.min(14, labelHits * 2);

  const hasStructure = sectionsFound.length >= 2 || labelHits >= 4;
  if (!hasStructure) {
    for (const check of WRONG_TYPE_CHECKS) {
      if (check.test(text)) {
        return {
          isFinancial: false,
          confidence: "high",
          documentTypeGuess: check.type,
          score: -100,
          reasons: [
            `The content matches a ${check.type.toLowerCase()} pattern, not a financial report.`,
            "Upload an annual report, financial statements, or a regulatory filing.",
          ],
        };
      }
    }
  }

  // 3. Financial vocabulary density (scaled down for very short texts, which
  //    would otherwise show inflated density from a handful of finance words).
  const vocabCount = countMatches(text, FINANCE_VOCAB);
  const per1000 = Math.round((vocabCount / words) * 1000);
  const densityFactor = Math.min(1, words / 200);
  const vocabScore = Math.round(Math.min(10, Math.min(per1000, 50) / 5) * densityFactor);

  // 4. Money and percent figures (financial tables).
  const figures = countMatches(text, MONEY_FIGURES) + countMatches(text, PERCENT_FIGURES);
  const figureScore = Math.min(4, Math.floor(figures / 6));

  // 5. Period marker ("Fiscal year: 2025", "Year ended ...").
  const hasPeriod = PERIOD_MARKER.test(text);
  const periodScore = hasPeriod ? 2 : 0;

  const score = sectionScore + labelScore + vocabScore + figureScore + periodScore;

  // 6. Type guess.
  const documentTypeGuess =
    /\b(quarterly report|10-q|three months ended)\b/i.test(text) ? "Quarterly report/filing"
    : /\b(annual report|10-k)\b/i.test(text) ? "Annual report"
    : sectionScore > 0 ? "Financial statements/filing"
    : "Financial document";

  // 7. Human-readable evidence for the decision.
  if (sectionsFound.length > 0) {
    reasons.push(`Financial sections found: ${sectionsFound.map((s) => s.name).join(", ")}.`);
  }
  if (labelHits > 0) {
    reasons.push(`Metric-style lines found: ${labelHits} (e.g. "Total revenue: ...", "Fiscal year: ...").`);
  }
  reasons.push(`Financial vocabulary: ${per1000} terms per 1,000 words.`);
  if (figures > 0) reasons.push(`Money/percent figures found: ${figures}.`);

  // 8. Verdict (deterministic gate).
  let isFinancial = hasStructure && score >= 8;
  let confidence: DocumentValidationResult["confidence"] = isFinancial
    ? score >= 15 && sectionScore >= 3
      ? "high"
      : "medium"
    : "low";

  // 9. AI tie-breaker ONLY for borderline documents (no structure either way).
  const borderline = !hasStructure && score >= 4 && score <= 12;
  if (borderline) {
    try {
      const verdict = await generateJsonLlm<{ isFinancial: boolean; reason: string }>(
        `Classify this document excerpt. Is it a financial report/filing (annual report, financial statements, quarterly filing) or not?\n\n` +
          `File name: ${fileName || "unknown"}\n\nExcerpt:\n${text.slice(0, 1500)}`,
        "You classify documents strictly by their content. Respond with JSON only: " +
          '{"isFinancial": boolean, "reason": string} where reason is one short sentence.',
      );
      if (verdict && typeof verdict.isFinancial === "boolean") {
        isFinancial = verdict.isFinancial;
        confidence = "medium";
        reasons.push(`AI tie-break (borderline score ${score}): ${String(verdict.reason || "").slice(0, 200)}`);
      }
    } catch {
      reasons.push("AI tie-break unavailable; deterministic verdict kept.");
    }
  }

  if (!isFinancial && reasons.length === 0) {
    reasons.push("No financial-report structure, metric tables, or filing language were detected.");
  }
  if (!isFinancial && !hasStructure) {
    reasons.push(
      `No financial report sections or metric tables were found (score ${score}). ` +
        "Upload an annual report, financial statements, or a regulatory filing.",
    );
  }

  return { isFinancial, confidence, documentTypeGuess, score, reasons };
}

// ---------------------------------------------------------------------------
// Pipeline logging (shows the Validation Agent in the activity trail)
// ---------------------------------------------------------------------------

export async function logDocumentValidation(
  documentId: string,
  result: DocumentValidationResult,
): Promise<void> {
  try {
    await db.insert(agentLogs).values({
      documentId,
      agentName: "Validation Agent",
      action: "Financial document type check",
      status: result.isFinancial ? "completed" : "failed",
      details:
        `${result.isFinancial ? "Confirmed" : "Rejected"}: ${result.documentTypeGuess} ` +
        `(confidence ${result.confidence}, score ${result.score}). ${result.reasons.join(" | ")}`.slice(0, 1000),
    });
  } catch (error) {
    // Logging must never break an upload.
    console.error("Validation Agent log failed:", error);
  }
}