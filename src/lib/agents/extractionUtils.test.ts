import test from "node:test";
import assert from "node:assert/strict";
import { extractMetricsLocally, validateExtractedMetrics } from "./extractionUtils";
import { seedDocumentContent, seedMetrics, seedRisks } from "@/lib/seedData";
import { hasGroundedEvidence } from "./analysisUtils";

test("seed document risk examples cite text present in their own source document", () => {
  for (const [company, risks] of Object.entries(seedRisks)) {
    const source = seedDocumentContent[company];
    assert.ok(source, `missing seed document for ${company}`);
    for (const risk of risks) {
      assert.ok(hasGroundedEvidence(source, risk.sourceText), `${company}: unsupported quote: ${risk.sourceText}`);
    }
  }
});

test("local extraction captures seeded financial values with source-backed quotes", () => {
  const checks = [
    { actual: "revenue", expected: "revenue", tolerance: 1 },
    { actual: "revenue_growth", expected: "revenueGrowth", tolerance: 0.001 },
    { actual: "gross_margin", expected: "grossMargin", tolerance: 0.001 },
    { actual: "operating_margin", expected: "operatingMargin", tolerance: 0.001 },
    { actual: "net_income", expected: "netIncome", tolerance: 1 },
    { actual: "net_margin", expected: "netMargin", tolerance: 0.001 },
    { actual: "total_assets", expected: "totalAssets", tolerance: 1 },
    { actual: "total_equity", expected: "totalEquity", tolerance: 1 },
    { actual: "current_ratio", expected: "currentRatio", tolerance: 0.001 },
    { actual: "eps", expected: "eps", tolerance: 0.001 },
  ];

  for (const [company, expected] of Object.entries(seedMetrics)) {
    const source = seedDocumentContent[company];
    const extracted = extractMetricsLocally(source);
    const values = extracted as unknown as Record<string, unknown>;
    assert.equal(extracted.fiscal_year, expected.fiscalYear, `${company} fiscal year`);
    for (const check of checks) {
      const value = values[check.actual];
      const quote = extracted.metric_evidence?.[check.actual];
      assert.equal(typeof value, "number", `${company} ${check.actual} should be extracted`);
      assert.ok(Math.abs(Number(value) - Number(expected[check.expected as keyof typeof expected])) <= check.tolerance, `${company} ${check.actual} value`);
      assert.ok(quote, `${company} ${check.actual} evidence`);
      assert.ok(hasGroundedEvidence(source, quote), `${company} ${check.actual} quote should be in its source document`);
    }
  }
});

test("Apple seed revenue change reconciles with the cited comparative figures", () => {
  const text = seedDocumentContent["Apple Inc."];
  const comparisonLine = text.split("\n").find((line) => line.startsWith("Net sales:"));
  assert.ok(comparisonLine);
  const values = [...comparisonLine.matchAll(/\$([\d,]+)\s+million/g)].slice(0, 2).map((match) => Number(match[1].replace(/,/g, "")));
  assert.equal(values.length, 2);
  assert.equal(values[1] - values[0], 1022);
  const computedGrowth = (values[0] - values[1]) / values[1];
  assert.ok(Math.abs(computedGrowth - Number(seedMetrics["Apple Inc."].revenueGrowth)) < 0.0001);
});

test("LLM extraction discards values without a matching exact evidence quote", () => {
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
