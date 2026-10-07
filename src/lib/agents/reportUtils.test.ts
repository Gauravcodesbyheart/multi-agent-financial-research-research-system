import assert from "node:assert/strict";
import test from "node:test";
import { buildEvidenceBackedReport, sanitizeStoredReport, type ReportProfileInput } from "./reportUtils";

function makeProfile(overrides: Partial<ReportProfileInput> = {}): ReportProfileInput {
  const documentText = [
    "Fiscal year ended 2024.",
    "Revenue: $1,250 million",
    "Revenue growth: 8.0%",
    "Gross margin: 42.0%",
    "Operating margin: 18.0%",
    "Net income: $210 million",
    "Total debt: $300 million",
    "Current ratio: 1.4",
    "Free cash flow: $190 million",
    "The company disclosed a substantial doubt about its ability to continue as a going concern.",
  ].join("\n");
  return {
    documentId: "doc-1",
    companyId: "company-1",
    companyName: "Example Holdings",
    ticker: "EXM",
    fiscalYear: 2024,
    fiscalPeriod: "Annual",
    extractedAt: "2025-02-01T00:00:00.000Z",
    sourceDocument: "example-2024-10k.pdf",
    documentText,
    metrics: {
      revenue: "1250", revenueGrowth: "0.08", grossMargin: "0.42", operatingMargin: "0.18",
      netIncome: "210", totalDebt: "300", currentRatio: "1.4", freeCashFlow: "190",
      // This field is intentionally not included in generated prose.
      unsupportedModelComment: "The company is a market leader and will outperform peers.",
    },
    metricEvidence: {
      revenue: "Revenue: $1,250 million",
      revenue_growth: "Revenue growth: 8.0%",
      gross_margin: "Gross margin: 42.0%",
      operating_margin: "Operating margin: 18.0%",
      net_income: "Net income: $210 million",
      total_debt: "Total debt: $300 million",
      current_ratio: "Current ratio: 1.4",
      free_cash_flow: "Free cash flow: $190 million",
    },
    risks: [
      { riskType: "Going Concern", severity: "critical", sourceText: "The company disclosed a substantial doubt about its ability to continue as a going concern." },
      { riskType: "Fraud", severity: "critical", sourceText: "An entirely invented risk quote not present in the document." },
    ],
    ...overrides,
  };
}

test("report contains a structured summary and key financials with exact source citations", () => {
  const report = buildEvidenceBackedReport([makeProfile()], "Focus on liquidity, not valuation.");
  assert.match(report.fullReportContent, /^# EXECUTIVE SUMMARY/m);
  assert.match(report.fullReportContent, /^# KEY FINANCIALS/m);
  assert.match(report.fullReportContent, /Revenue \(USD millions\)/);
  assert.match(report.fullReportContent, /1,250 million USD \[E1-1\]/);
  assert.match(report.fullReportContent, /\[E1-1\].*Revenue/);
  assert.match(report.fullReportContent, /Revenue: \$1,250 million/);
  assert.match(report.fullReportContent, /Going Concern screen/);
  assert.doesNotMatch(report.fullReportContent, /An entirely invented risk quote/);
  assert.match(report.fullReportContent, /not treated as source evidence/);
  assert.doesNotMatch(report.fullReportContent, /market leader|outperform peers/i);
  assert.equal(report.keyFindings.verifiedMetricClaims, 8);
  assert.equal(report.keyFindings.groundedRiskFlags, 1);
  assert.equal(report.metricsComparison.evidenceVersion, 1);
  assert.equal(report.metricsComparison.rows[0].metricEvidence.length, 8);
});

test("drops values whose source quote is missing, mislabeled, or numerically inconsistent", () => {
  const profile = makeProfile({
    metrics: { revenue: "9999", netIncome: "210", currentRatio: "1.4" },
    metricEvidence: {
      revenue: "Net income: $210 million",
      net_income: "Revenue: $1,250 million",
      current_ratio: "Current ratio: 1.4",
    },
  });
  const report = buildEvidenceBackedReport([profile]);
  assert.match(report.fullReportContent, /\| Example Holdings \| Annual 2024 \| N\/A \| N\/A \| N\/A \| N\/A \| N\/A \| N\/A \| 1\.40x \[E1-1\] \| N\/A \| \[D1\]/);
  assert.doesNotMatch(report.fullReportContent, /9,999|9999/);
  assert.doesNotMatch(report.fullReportContent, /210 million USD \[E1-\d+\]/);
  assert.match(report.fullReportContent, /Current ratio: 1\.40x/);
  assert.equal(report.keyFindings.verifiedMetricClaims, 1);
});

test("normalizes legacy percent-point values to source-consistent decimals before rendering", () => {
  const profile = makeProfile({
    metrics: { grossMargin: "42" },
    metricEvidence: { gross_margin: "Gross margin: 42.0%" },
  });
  const report = buildEvidenceBackedReport([profile]);
  const grossMargin = report.metricsComparison.rows[0].metricEvidence.find((item) => item.key === "grossMargin");
  assert.equal(grossMargin?.value, 0.42);
  assert.equal(grossMargin?.formattedValue, "42.00%");
  assert.doesNotMatch(report.fullReportContent, /4200\.00%/);
});

test("hides legacy model prose that predates the evidence contract", () => {
  const legacy = sanitizeStoredReport({
    status: "completed",
    metricsComparison: { rows: [{ company: "Example Holdings", revenue: "9999" }] },
    executiveSummary: "Unsupported legacy claim: revenue will double next year.",
    fullReportContent: "# Unsupported model-written report",
    recommendations: ["Buy immediately"],
  });
  assert.equal(legacy.unvalidated, true);
  assert.equal(legacy.executiveSummary, null);
  assert.equal(legacy.fullReportContent, null);
  assert.equal(legacy.recommendations, null);

  const current = buildEvidenceBackedReport([makeProfile()]);
  const safeCurrent = sanitizeStoredReport({ status: "completed", ...current });
  assert.equal(safeCurrent.unvalidated, false);
  assert.ok(safeCurrent.fullReportContent.includes("# KEY FINANCIALS"));
});

test("retains all periods and document-level evidence rather than only the latest row", () => {
  const older = makeProfile();
  const newer = makeProfile({
    documentId: "doc-2",
    fiscalYear: 2025,
    fiscalPeriod: "Q1",
    sourceDocument: "example-2025-q1-10q.pdf",
    extractedAt: "2024-04-01T00:00:00.000Z",
    documentText: "Fiscal quarter ended 2025.\nRevenue: $400 million\nGross margin: 44.0%",
    metrics: { revenue: "400", grossMargin: "0.44" },
    metricEvidence: { revenue: "Revenue: $400 million", gross_margin: "Gross margin: 44.0%" },
    risks: [],
  });
  const report = buildEvidenceBackedReport([older, newer]);
  assert.equal(report.metricsComparison.rows.length, 2);
  assert.equal(report.metricsComparison.rows[0].documentId, "doc-2");
  assert.equal(report.metricsComparison.rows[1].documentId, "doc-1");
  assert.match(report.fullReportContent, /example-2024-10k\.pdf/);
  assert.match(report.fullReportContent, /example-2025-q1-10q\.pdf/);
  assert.match(report.fullReportContent, /Annual 2024/);
  assert.match(report.fullReportContent, /Q1 2025/);
});
