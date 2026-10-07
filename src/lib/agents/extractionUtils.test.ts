import test from "node:test";
import assert from "node:assert/strict";
import {
  evidenceSupportsMetricValue,
  extractMetricsLocally,
  validateExtractedMetrics,
} from "./extractionUtils";
import { seedDocumentContent } from "@/lib/seedData";
import {
  detectMetricAnomalies,
  detectTextualRedFlags,
  hasGroundedEvidence,
  type FinancialSnapshot,
} from "./analysisUtils";

// Independent assertions for values explicitly present in the simulated source filings.
const seedMetricExpectations: Record<string, Record<string, number>> = {
  "Apple Inc.": {
    fiscal_year: 2023, revenue: 394328, revenue_growth: -0.0026, gross_margin: 0.429,
    operating_income: 114301, operating_margin: 0.29, net_income: 96995, net_margin: 0.246,
    total_assets: 352583, total_equity: 62146, current_ratio: 0.99, debt_to_equity: 1.53,
    roe: 1.5608, roa: 0.2751, eps: 6.13, operating_cash_flow: 114164, free_cash_flow: 103205,
  },
  "Microsoft Corporation": {
    fiscal_year: 2023, revenue: 211915, revenue_growth: 0.069, gross_margin: 0.689,
    operating_income: 88523, operating_margin: 0.418, net_income: 72361, net_margin: 0.341,
    total_assets: 411976, total_equity: 206223, current_ratio: 1.77, debt_to_equity: 0.20,
    roe: 0.3509, roa: 0.1757, eps: 9.72, operating_cash_flow: 87582, free_cash_flow: 59475,
  },
  "Tesla, Inc.": {
    fiscal_year: 2023, revenue: 96773, revenue_growth: 0.188, gross_margin: 0.182,
    operating_income: 8891, operating_margin: 0.092, net_income: 14999, net_margin: 0.155,
    total_assets: 106618, total_equity: 62634, current_ratio: 1.73, debt_to_equity: 0.05,
    roe: 0.239, roa: 0.141, eps: 3.53, operating_cash_flow: 13256, free_cash_flow: 4358,
  },
  "Amazon.com, Inc.": {
    fiscal_year: 2023, revenue: 574785, revenue_growth: 0.118, gross_margin: 0.469,
    operating_income: 36852, operating_margin: 0.064, net_income: 30425, net_margin: 0.053,
    total_assets: 527854, total_equity: 201875, current_ratio: 1.13, debt_to_equity: 0.29,
    roe: 0.151, roa: 0.058, eps: 2.90, operating_cash_flow: 84946, free_cash_flow: 32217,
  },
};

function snapshotFromLocalMetrics(metrics: ReturnType<typeof extractMetricsLocally>): FinancialSnapshot {
  const evidence = metrics.metric_evidence || {};
  return {
    fiscalYear: metrics.fiscal_year,
    fiscalPeriod: metrics.fiscal_period,
    revenue: metrics.revenue,
    totalDebt: metrics.total_debt,
    grossMargin: metrics.gross_margin,
    operatingMargin: metrics.operating_margin,
    netMargin: metrics.net_margin,
    totalAssets: metrics.total_assets,
    totalLiabilities: metrics.total_liabilities,
    totalEquity: metrics.total_equity,
    currentRatio: metrics.current_ratio,
    debtToEquity: metrics.debt_to_equity,
    netIncome: metrics.net_income,
    operatingCashFlow: metrics.operating_cash_flow,
    metricEvidence: {
      revenue: evidence.revenue,
      totalDebt: evidence.total_debt,
      grossMargin: evidence.gross_margin,
      operatingMargin: evidence.operating_margin,
      netMargin: evidence.net_margin,
      totalAssets: evidence.total_assets,
      totalLiabilities: evidence.total_liabilities,
      totalEquity: evidence.total_equity,
      currentRatio: evidence.current_ratio,
      debtToEquity: evidence.debt_to_equity,
      netIncome: evidence.net_income,
      operatingCashFlow: evidence.operating_cash_flow,
    },
  };
}

test("local extraction on every seed filing returns values with exact, metric-specific evidence", () => {
  const checks = [
    { actual: "revenue", tolerance: 1 },
    { actual: "revenue_growth", tolerance: 0.001 },
    { actual: "gross_margin", tolerance: 0.001 },
    { actual: "operating_income", tolerance: 1 },
    { actual: "operating_margin", tolerance: 0.001 },
    { actual: "net_income", tolerance: 1 },
    { actual: "net_margin", tolerance: 0.001 },
    { actual: "total_assets", tolerance: 1 },
    { actual: "total_equity", tolerance: 1 },
    { actual: "current_ratio", tolerance: 0.001 },
    { actual: "debt_to_equity", tolerance: 0.001 },
    { actual: "roe", tolerance: 0.001 },
    { actual: "roa", tolerance: 0.001 },
    { actual: "eps", tolerance: 0.001 },
    { actual: "operating_cash_flow", tolerance: 1 },
    { actual: "free_cash_flow", tolerance: 1 },
  ];

  for (const [company, expected] of Object.entries(seedMetricExpectations)) {
    const source = seedDocumentContent[company];
    assert.ok(source, `missing seed source for ${company}`);
    const extracted = extractMetricsLocally(source);
    const values = extracted as unknown as Record<string, unknown>;
    const validated = validateExtractedMetrics(values, source);

    assert.equal(extracted.fiscal_year, expected.fiscal_year, `${company} fiscal year`);
    for (const check of checks) {
      const value = values[check.actual];
      const quote = extracted.metric_evidence?.[check.actual];
      assert.equal(typeof value, "number", `${company} ${check.actual} should be extracted`);
      assert.ok(Math.abs(Number(value) - expected[check.actual]) <= check.tolerance, `${company} ${check.actual} value`);
      assert.ok(quote, `${company} ${check.actual} evidence`);
      assert.ok(hasGroundedEvidence(source, quote), `${company} ${check.actual} quote should occur in its source`);
      assert.equal(validated[check.actual], value, `${company} ${check.actual} should survive strict validation`);
    }

    for (const [metric, quote] of Object.entries(extracted.metric_evidence || {})) {
      const value = values[metric];
      if (typeof value !== "number") continue;
      assert.ok(hasGroundedEvidence(source, quote), `${company} ${metric} quote is source-grounded`);
      assert.ok(evidenceSupportsMetricValue(metric, value, quote), `${company} ${metric} quote supports its value`);
    }
  }
});

test("Red Flag rules run on seed source text and every emitted quote is traceable", () => {
  let appleFindings: ReturnType<typeof detectMetricAnomalies> = [];
  for (const [company, source] of Object.entries(seedDocumentContent)) {
    const metrics = extractMetricsLocally(source);
    const findings = [
      ...detectTextualRedFlags(source),
      ...detectMetricAnomalies(snapshotFromLocalMetrics(metrics), source),
    ];
    if (company === "Apple Inc.") appleFindings = findings;
    for (const finding of findings) {
      const evidenceLines = finding.source_text.split(/\r?\n/).filter(Boolean);
      assert.ok(evidenceLines.length > 0, `${company}: finding should have evidence`);
      for (const line of evidenceLines) {
        assert.ok(hasGroundedEvidence(source, line), `${company}: unsupported finding quote: ${line}`);
      }
    }
  }
  assert.ok(appleFindings.some((finding) => finding.title === "Current ratio is below 1.0"));
});

test("seed revenue growth reconciles with quoted comparative figures", () => {
  const text = seedDocumentContent["Apple Inc."];
  const comparisonLine = text.split("\n").find((line) => line.startsWith("Net sales:"));
  assert.ok(comparisonLine);
  const values = [...comparisonLine.matchAll(/\$([\d,]+)\s+million/g)].slice(0, 2).map((match) => Number(match[1].replace(/,/g, "")));
  assert.equal(values.length, 2);
  assert.equal(values[1] - values[0], 1022);
  const computedGrowth = (values[0] - values[1]) / values[1];
  assert.ok(Math.abs(computedGrowth - seedMetricExpectations["Apple Inc."].revenue_growth) < 0.0001);
});

test("extracts scale abbreviations and does not mistake long-term debt for total debt", () => {
  const content = [
    "Annual Report 2024",
    "Total revenue: $1.25 billion",
    "Total debt: $750 million",
    "Long-term debt: $700 million",
    "Free cash flow: $3.2B",
  ].join("\n");
  const extracted = extractMetricsLocally(content);
  assert.equal(extracted.revenue, 1250);
  assert.equal(extracted.total_debt, 750);
  assert.equal(extracted.free_cash_flow, 3200);
  assert.equal(extracted.metric_evidence?.total_debt, "Total debt: $750 million");
});

test("LLM extraction discards unsupported values and normalizes percentage values safely", () => {
  const content = "Total revenue: $1,250 million\nGross margin: 40.0%\nNet income: $1,250 million\n";
  const validated = validateExtractedMetrics({
    revenue: 1250,
    gross_margin: 0.4,
    net_income: 999,
    operating_income: 1250,
    metric_evidence: {
      revenue: "Total revenue: $1,250 million",
      gross_margin: "Gross margin: 40.0%",
      net_income: "Net income: $999 million",
      operating_income: "Net income: $1,250 million",
    },
  }, content);
  assert.equal(validated.revenue, 1250);
  assert.equal(validated.gross_margin, 0.4);
  assert.equal(validated.net_income, null);
  assert.equal(validated.operating_income, null);
  assert.equal(validated.metric_evidence.net_income, undefined);
  assert.equal(validated.metric_evidence.operating_income, undefined);

  const percentAsWholeNumber = validateExtractedMetrics({
    gross_margin: 40,
    metric_evidence: { gross_margin: "Gross margin: 40.0%" },
  }, content);
  assert.equal(percentAsWholeNumber.gross_margin, 0.4);
});
