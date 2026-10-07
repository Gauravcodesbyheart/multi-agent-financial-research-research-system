import assert from "node:assert/strict";
import test from "node:test";
import { buildGroundedBenchmarkSummary, fiscalPeriodRank, sortBenchmarkRows, type BenchmarkMetricRow } from "./benchmarkAgent";

const row = (overrides: Partial<BenchmarkMetricRow> & Pick<BenchmarkMetricRow, "id" | "companyId" | "companyName" | "sourceDocument" | "fiscalYear" | "fiscalPeriod"> & { extractedAt?: Date | string }): BenchmarkMetricRow & { extractedAt?: Date | string } => ({
  documentId: `doc-${overrides.id}`,
  ticker: null,
  sector: null,
  revenue: null,
  revenueGrowth: null,
  grossMargin: null,
  operatingMargin: null,
  netMargin: null,
  ebitdaMargin: null,
  netIncome: null,
  totalDebt: null,
  currentRatio: null,
  debtToEquity: null,
  roe: null,
  freeCashFlow: null,
  metricEvidence: {},
  riskCount: 0,
  criticalRiskCount: 0,
  ...overrides,
});

test("retains every document row and sorts by fiscal recency, not upload order", () => {
  const annual2023 = row({
    id: "a23", companyId: "a", companyName: "Acme", sourceDocument: "acme-2023.pdf",
    fiscalYear: 2023, fiscalPeriod: "Annual", extractedAt: "2026-01-01T00:00:00.000Z",
  });
  const q4_2024 = row({
    id: "a24q4", companyId: "a", companyName: "Acme", sourceDocument: "acme-q4-2024.pdf",
    fiscalYear: 2024, fiscalPeriod: "Q4", extractedAt: "2025-01-01T00:00:00.000Z",
  });
  const q1_2025 = row({
    id: "a25q1", companyId: "a", companyName: "Acme", sourceDocument: "acme-q1-2025.pdf",
    fiscalYear: 2025, fiscalPeriod: "Q1", extractedAt: "2024-01-01T00:00:00.000Z",
  });

  const sorted = sortBenchmarkRows([annual2023, q1_2025, q4_2024]);
  assert.deepEqual(sorted.map((item) => item.id), ["a25q1", "a24q4", "a23"]);
  assert.equal(fiscalPeriodRank("Q4"), 4);
  assert.equal(fiscalPeriodRank("Annual"), 5);
  assert.equal(sorted.length, 3, "no historical metric row should be dropped");
});

test("grounded comparison summary preserves source documents and warns on unlike periods", () => {
  const summary = buildGroundedBenchmarkSummary([
    row({
      id: "a", companyId: "a", companyName: "Acme Corp.", ticker: "ACM", sourceDocument: "acme-2024-10k.pdf",
      fiscalYear: 2024, fiscalPeriod: "Annual", revenue: "1500", revenueGrowth: "0.10", grossMargin: "0.42",
      metricEvidence: { revenue: "Revenue: $1,500 million", revenue_growth: "Revenue growth: 10%", gross_margin: "Gross margin: 42%" },
    }),
    row({
      id: "b", companyId: "b", companyName: "Beta Inc.", ticker: "BET", sourceDocument: "beta-q1-2025-10q.pdf",
      fiscalYear: 2025, fiscalPeriod: "Q1", revenue: "700", revenueGrowth: "0.03", grossMargin: "0.31",
    }),
  ]);

  assert.match(summary, /acme-2024-10k\.pdf/);
  assert.match(summary, /beta-q1-2025-10q\.pdf/);
  assert.match(summary, /Annual 2024/);
  assert.match(summary, /Q1 2025/);
  assert.match(summary, /different fiscal periods/);
  assert.match(summary, /1500 million USD/);
  assert.match(summary, /Revenue N\/A/);
  assert.doesNotMatch(summary, /700 million USD/);
});
