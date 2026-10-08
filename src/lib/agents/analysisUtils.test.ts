import test from "node:test";
import assert from "node:assert/strict";
import {
  buildRiskEvidenceExcerpt,
  cosineSimilarity,
  decomposeResearchQuestion,
  detectFinancialTrendRisks,
  detectMetricAnomalies,
  detectTextualRedFlags,
  hasGroundedEvidence,
  hasValidCitationMarkers,
  keywordRelevance,
  validateGroundedResearchAnswer,
  unwrapModelRiskItems,
  validateModelRiskItems,
} from "./analysisUtils";

 test("decomposes numbered and explicitly compound research questions", () => {
  assert.deepEqual(decomposeResearchQuestion("1. What happened to revenue?\n2. What happened to margins?"), [
    "What happened to revenue?",
    "What happened to margins?",
  ]);
  assert.deepEqual(decomposeResearchQuestion("What is revenue, and how did gross margin change?"), [
    "What is revenue,",
    "how did gross margin change?",
  ]);
  assert.deepEqual(decomposeResearchQuestion("Compare revenue and margins for these two companies."), [
    "Compare revenue and margins for these two companies.",
  ]);
});

test("only accepts source evidence that appears in the document", () => {
  const source = "Qualified audit opinion due to a material uncertainty.";
  assert.equal(hasGroundedEvidence(`Auditor's report: ${source}`, source), true);
  assert.equal(hasGroundedEvidence("The report has an unmodified opinion.", source), false);
});

test("detects auditor qualification and retains exact source evidence", () => {
  const content = "INDEPENDENT AUDITOR'S REPORT\nWe issued a qualified audit opinion due to the matter described below.\n";
  const findings = detectTextualRedFlags(content);
  const auditorFinding = findings.find((finding) => finding.risk_type === "Auditor Qualification");
  assert.ok(auditorFinding);
  assert.ok(content.includes(auditorFinding.source_text));
  assert.equal(auditorFinding.severity, "critical");
});

test("bounds the supplementary AI risk context and keeps exact high-signal excerpts", () => {
  const content = `${"Ordinary filing text with no warning. ".repeat(250)}\n` +
    "Management disclosed a material weakness in internal control over financial reporting.\n" +
    `${"Additional ordinary filing text. ".repeat(100)}\n` +
    "The company experienced a cybersecurity incident affecting customer data.\n" +
    `${"Appendix text. ".repeat(400)}`;
  const excerpt = buildRiskEvidenceExcerpt(content, 1800);
  assert.ok(excerpt.length <= 1800);
  assert.match(excerpt, /material weakness in internal control/);
  assert.match(excerpt, /cybersecurity incident affecting customer data/);
  const passages = excerpt.split(/\n\[…other text omitted…\]\n/);
  assert.ok(passages.every((passage) => content.includes(passage.trim())));
});

test("bounded risk context falls back to document edges if no risk terms match", () => {
  const content = `FRONT ${"neutral content ".repeat(200)} TAIL`;
  const excerpt = buildRiskEvidenceExcerpt(content, 500);
  assert.ok(excerpt.length <= 500);
  assert.match(excerpt, /^FRONT/);
  assert.match(excerpt, /TAIL$/);
});

test("unwraps a findings array from the JSON-object response required by Groq", () => {
  const finding = { risk_type: "Liquidity Risk", title: "Debt pressure" };
  assert.deepEqual(unwrapModelRiskItems({ findings: [finding] }), [finding]);
  assert.deepEqual(unwrapModelRiskItems({ findings: [] }), []);
  assert.deepEqual(unwrapModelRiskItems([finding]), [finding], "legacy array-shaped providers remain supported");
  assert.deepEqual(unwrapModelRiskItems({ result: [finding] }), []);
});

test("drops model risk findings whose source quote is fabricated", () => {
  const content = "The company reported a 12% decline in net sales during the year.";
  const findings = validateModelRiskItems([
    {
      risk_type: "Revenue Risk",
      severity: "medium",
      title: "Revenue declined",
      description: "The filing reports lower revenue.",
      source_text: "12% decline in net sales during the year",
    },
    {
      risk_type: "Debt Risk",
      severity: "high",
      title: "Debt default",
      description: "The company defaulted on its debt.",
      source_text: "The company defaulted on its debt.",
    },
    {
      risk_type: "Revenue Risk",
      severity: "high",
      title: "Revenue declined 50%",
      description: "The source reports a 50% revenue decline.",
      source_text: "The company reported a 12% decline in net sales during the year.",
    },
  ], content);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].risk_type, "Revenue Risk");
  assert.ok(content.includes(findings[0].source_text));
});

test("detects rising debt and falling margins only when both periods have source lines", () => {
  const previousText = "Long-term debt: $100 million\nGross margin: 30.0%\n";
  const currentText = "Total debt: $120 million\nGross margin: 26.0%\n";
  const findings = detectFinancialTrendRisks(
    { fiscalYear: 2022, fileName: "FY22.txt", totalDebt: "100", grossMargin: "0.30" },
    { fiscalYear: 2023, fileName: "FY23.txt", totalDebt: "120", grossMargin: "0.26" },
    previousText,
    currentText,
  );
  assert.equal(findings.length, 2);
  assert.ok(findings.some((finding) => finding.risk_type === "Debt Risk" && finding.title.includes("20%")));
  assert.ok(findings.some((finding) => finding.risk_type === "Margin Risk" && finding.title.includes("4.0")));
  assert.ok(findings.every((finding) => finding.source_text.includes("FY22.txt") && finding.source_text.includes("FY23.txt")));

  assert.deepEqual(detectFinancialTrendRisks(
    { fiscalYear: 2022, totalDebt: "100" },
    { fiscalYear: 2023, totalDebt: "120" },
    "No debt information",
    "No debt information",
  ), []);

  const mismatchedQuoteFindings = detectFinancialTrendRisks(
    { fiscalYear: 2022, totalDebt: "100", grossMargin: "0.30" },
    { fiscalYear: 2023, totalDebt: "120", grossMargin: "0.26" },
    previousText,
    "Total debt: $90 million\nGross margin: 26.0%\n",
  );
  assert.equal(mismatchedQuoteFindings.length, 1);
  assert.equal(mismatchedQuoteFindings[0].risk_type, "Margin Risk");

  assert.deepEqual(detectFinancialTrendRisks(
    { fiscalYear: 2022, fiscalPeriod: "Annual", totalDebt: "100", grossMargin: "0.30" },
    { fiscalYear: 2023, fiscalPeriod: "Q4", totalDebt: "120", grossMargin: "0.26" },
    previousText,
    currentText,
  ), []);
});

test("flags balance-sheet arithmetic as a review item, not a definitive conclusion", () => {
  const content = "Total assets: $100 million\nTotal liabilities: $40 million\nTotal shareholders equity: $40 million\n";
  const findings = detectMetricAnomalies({ totalAssets: "100", totalLiabilities: "40", totalEquity: "40" }, content);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].risk_type, "Financial Anomaly");
  assert.ok(content.includes("Total assets: $100 million"));

  const mismatchedMetricQuote = detectMetricAnomalies(
    { totalAssets: "100", totalLiabilities: "40", totalEquity: "40" },
    "Total assets: $200 million\nTotal liabilities: $40 million\nTotal shareholders equity: $40 million\n",
  );
  assert.deepEqual(mismatchedMetricQuote, []);
});

test("embedding and keyword similarity functions handle valid and invalid vectors", () => {
  assert.ok(Math.abs(cosineSimilarity([1, 0], [1, 0]) - 1) < 1e-8);
  assert.ok(cosineSimilarity([1, 0], [0, 1]) < 1e-8);
  assert.equal(cosineSimilarity([1, 2], [1]), -1);
  assert.ok(keywordRelevance("gross margin", "The gross margin decreased") > 0);
  assert.equal(keywordRelevance("gross margin", "Cash and debt"), 0);
});

test("rejects invalid or fabricated citation ids", () => {
  assert.equal(hasValidCitationMarkers("Revenue increased [S1].", new Set(["S1"])), true);
  assert.equal(hasValidCitationMarkers("Revenue increased [S99].", new Set(["S1"])), false);
  assert.equal(hasValidCitationMarkers("Revenue increased.", new Set(["S1"])), false);
});

test("only renders research claims with an exact quote and matching cited numbers", () => {
  const evidence = [{ citationId: "S1", excerpt: "Revenue: $1,250 million in FY2023." }];
  const supported = validateGroundedResearchAnswer({
    steps: [{
      question: "What was revenue?",
      claims: [{
        text: "Revenue was $1,250 million in FY2023.",
        citation_ids: ["S1"],
        supporting_quotes: { S1: "Revenue: $1,250 million in FY2023." },
      }],
    }],
  }, evidence);
  assert.ok(supported);
  assert.deepEqual(supported.usedCitationIds, ["S1"]);
  assert.match(supported.answer, /\[S1\]/);

  const mismatchedNumber = validateGroundedResearchAnswer({
    steps: [{
      question: "What was revenue?",
      claims: [{
        text: "Revenue was $1,350 million in FY2023.",
        citation_ids: ["S1"],
        supporting_quotes: { S1: "Revenue: $1,250 million in FY2023." },
      }],
    }],
  }, evidence);
  assert.ok(mismatchedNumber);
  assert.deepEqual(mismatchedNumber.usedCitationIds, []);
  assert.match(mismatchedNumber.answer, /could be verified/);

  const fabricatedQuote = validateGroundedResearchAnswer({
    steps: [{
      question: "What was revenue?",
      claims: [{
        text: "Revenue was $1,250 million in FY2023.",
        citation_ids: ["S99"],
        supporting_quotes: { S99: "Revenue: $1,250 million in FY2023." },
      }],
    }],
  }, evidence);
  assert.deepEqual(fabricatedQuote?.usedCitationIds, []);

  const ungroundedQuote = validateGroundedResearchAnswer({
    steps: [{
      question: "What was revenue?",
      claims: [{
        text: "Revenue was $1,250 million in FY2023.",
        citation_ids: ["S1"],
        supporting_quotes: { S1: "Net income was $1,250 million in FY2023." },
      }],
    }],
  }, evidence);
  assert.deepEqual(ungroundedQuote?.usedCitationIds, []);

  const mismatchedUnit = validateGroundedResearchAnswer({
    steps: [{
      question: "What was revenue?",
      claims: [{
        text: "Revenue was $1 million.",
        citation_ids: ["S1"],
        supporting_quotes: { S1: "Revenue was $1 billion." },
      }],
    }],
  }, [{ citationId: "S1", excerpt: "Revenue was $1 billion." }]);
  assert.deepEqual(mismatchedUnit?.usedCitationIds, []);
});
