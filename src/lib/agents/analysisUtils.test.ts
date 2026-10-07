import test from "node:test";
import assert from "node:assert/strict";
import {
  cosineSimilarity,
  decomposeResearchQuestion,
  detectFinancialTrendRisks,
  detectMetricAnomalies,
  detectTextualRedFlags,
  hasGroundedEvidence,
  hasValidCitationMarkers,
  keywordRelevance,
  validateGroundedResearchAnswer,
  validateModelRiskItems,
} from "./analysisUtils";

 test("decomposes numbered and explicitly compound research questions", () => {
  assert.deepEqual(decomposeResearchQuestion("1. What happened to revenue?\n2. What happened to margins?"), [
    "What happened to revenue?",
    "What happened to margins?",
  ]);
  assert.deepEqual(decomposeResearchQuestion("What is revenue, and how did gross margin change?"), [
    "What is revenue",
    "how did gross margin change?",
  ]);
  assert.deepEqual(decomposeResearchQuestion("Compare revenue and margins for these two companies."), [
    "Compare revenue",
    "margins for these two companies.",
  ]);
  assert.deepEqual(decomposeResearchQuestion("What is Apple's revenue growth trend and gross margin compared to Microsoft?"), [
    "What is Apple's revenue growth trend",
    "gross margin compared to Microsoft?",
  ]);
  assert.deepEqual(decomposeResearchQuestion("What are research and development costs?"), [
    "What are research and development costs?",
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

  const negated = detectTextualRedFlags(`The auditor did not issue a qualified opinion.\nThere is no substantial doubt about going concern.\nNo debt covenant breach was reported.`);
  assert.deepEqual(negated, []);

  const reportedGoingConcern = detectTextualRedFlags("The auditor raised substantial doubt about the entity's ability to continue as a going concern.");
  assert.ok(reportedGoingConcern.some((finding) => finding.risk_type === "Going Concern"));

  const negatedAfterPhrase = detectTextualRedFlags("A qualified audit opinion was not issued. The auditor's report concluded there was no going-concern uncertainty.");
  assert.deepEqual(negatedAfterPhrase, []);
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

  const wrapped = validateModelRiskItems({ findings: [{
    risk_type: "Revenue Risk",
    severity: "medium",
    title: "Revenue declined",
    description: "The filing reports lower revenue.",
    source_text: "12% decline in net sales during the year",
  }] }, content);
  assert.equal(wrapped.length, 1, "JSON-object mode responses should expose the findings array");
});

test("detects rising debt and falling margins only when both periods have source lines", () => {
  const previousText = "Total debt: $100 million\nGross margin: 30.0%\n";
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

test("does not treat long-term debt alone as total debt for a cross-period trend", () => {
  const findings = detectFinancialTrendRisks(
    { fiscalYear: 2022, totalDebt: "100" },
    { fiscalYear: 2023, totalDebt: "200" },
    "Long-term debt: $100 million",
    "Long-term debt: $200 million",
  );
  assert.equal(findings.some((finding) => finding.risk_type === "Debt Risk"), false);
});

test("flags source-backed negative liquidity and cash-conversion anomalies", () => {
  const content = "Current ratio: 0.80\nNet income: $100 million\nOperating cash flow: -$20 million\n";
  const findings = detectMetricAnomalies({
    currentRatio: "0.8",
    netIncome: "100",
    operatingCashFlow: "-20",
  }, content);
  const liquidityFinding = findings.find((finding) => finding.risk_type === "Liquidity Risk");
  const cashFlowFinding = findings.find((finding) => finding.risk_type === "Earnings Quality Risk");
  assert.ok(liquidityFinding && content.includes(liquidityFinding.source_text));
  assert.ok(cashFlowFinding);
  assert.ok(cashFlowFinding.source_text.split("\n").every((line) => content.includes(line)));
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
        text: "Revenue: $1,250 million in FY2023.",
        citation_ids: ["S1"],
        supporting_quotes: { S1: "Revenue: $1,250 million in FY2023." },
      }],
    }],
  }, evidence);
  assert.ok(supported);
  assert.deepEqual(supported.usedCitationIds, ["S1"]);
  assert.match(supported.answer, /\[S1\]/);
  assert.match(supported.answer, /“Revenue: \$1,250 million in FY2023\.”/);

  const unsupportedParaphrase = validateGroundedResearchAnswer({
    steps: [{
      question: "What happened to revenue?",
      claims: [{
        text: "The company generated a strong revenue result.",
        citation_ids: ["S1"],
        supporting_quotes: { S1: "Revenue: $1,250 million in FY2023." },
      }],
    }],
  }, evidence);
  assert.deepEqual(unsupportedParaphrase?.usedCitationIds, []);

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
