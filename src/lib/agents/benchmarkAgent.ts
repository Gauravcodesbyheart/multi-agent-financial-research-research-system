// Benchmark Agent — compares every accessible source document and period using validated evidence only.
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { agentLogs, companies, documents, financialMetrics, riskFlags } from "@/db/schema";
import { hasGroundedEvidence } from "./analysisUtils";
import { evidenceLabelsMetric, evidenceSupportsMetricValue } from "./extractionUtils";
import { sourceBackedMetricValue } from "./evidenceUtils";
import { sortFiscalPeriods } from "./comparisonUtils";

export { fiscalPeriodRank } from "./comparisonUtils";
export const sortBenchmarkRows = sortFiscalPeriods;

export interface BenchmarkMetricRow {
  id: string;
  documentId: string;
  companyId: string;
  companyName: string;
  ticker: string | null;
  sector: string | null;
  sourceDocument: string;
  fiscalYear: number | null;
  fiscalPeriod: string | null;
  revenue: string | null;
  revenueGrowth: string | null;
  grossMargin: string | null;
  operatingMargin: string | null;
  netMargin: string | null;
  ebitdaMargin: string | null;
  netIncome: string | null;
  totalDebt: string | null;
  currentRatio: string | null;
  debtToEquity: string | null;
  roe: string | null;
  freeCashFlow: string | null;
  metricEvidence: Record<string, string>;
  riskCount: number;
  criticalRiskCount: number;
}

function readMetricEvidence(rawMetrics: unknown): Record<string, string> {
  if (!rawMetrics || typeof rawMetrics !== "object") return {};
  const evidence = (rawMetrics as Record<string, unknown>).metric_evidence;
  if (!evidence || typeof evidence !== "object") return {};
  return Object.fromEntries(Object.entries(evidence).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

function metricValue(row: BenchmarkMetricRow, key: keyof BenchmarkMetricRow, evidenceKey: string): string | null {
  const value = row[key];
  const quote = row.metricEvidence[evidenceKey];
  if (typeof value !== "string" || value === "" || !quote) return null;
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || !evidenceLabelsMetric(evidenceKey, quote) || !evidenceSupportsMetricValue(evidenceKey, numericValue, quote)) return null;
  return value;
}

function formatAmount(value: string | null): string {
  return value === null ? "N/A" : `${value} million USD`;
}

function formatPercent(value: string | null): string {
  if (value === null) return "N/A";
  const number = Number(value);
  return Number.isFinite(number) ? `${(number * 100).toFixed(2)}%` : "N/A";
}

function periodLabel(row: BenchmarkMetricRow): string {
  return `${row.fiscalPeriod || "Period unknown"} ${row.fiscalYear ?? "year unknown"}`;
}

export function buildGroundedBenchmarkSummary(rows: BenchmarkMetricRow[]): string {
  if (rows.length === 0) return "No accessible source documents are available for the selected companies.";
  const companiesWithRows = [...new Set(rows.map((row) => row.companyName))];
  const periods = new Set(rows.map(periodLabel));
  const lines = rows.map((row) => {
    const label = row.ticker ? `${row.companyName} (${row.ticker})` : row.companyName;
    const revenue = metricValue(row, "revenue", "revenue");
    const revenueGrowth = metricValue(row, "revenueGrowth", "revenue_growth");
    const grossMargin = metricValue(row, "grossMargin", "gross_margin");
    const operatingMargin = metricValue(row, "operatingMargin", "operating_margin");
    const netIncome = metricValue(row, "netIncome", "net_income");
    const totalDebt = metricValue(row, "totalDebt", "total_debt");
    const currentRatio = metricValue(row, "currentRatio", "current_ratio");
    const freeCashFlow = metricValue(row, "freeCashFlow", "free_cash_flow");
    return `• ${label} — ${periodLabel(row)}; source: ${row.sourceDocument}. Revenue ${formatAmount(revenue)} (${formatPercent(revenueGrowth)} growth); gross margin ${formatPercent(grossMargin)}; operating margin ${formatPercent(operatingMargin)}; net income ${formatAmount(netIncome)}; total debt ${formatAmount(totalDebt)}; current ratio ${currentRatio ?? "N/A"}; free cash flow ${formatAmount(freeCashFlow)}; ${row.riskCount} grounded stored risk flag(s), ${row.criticalRiskCount} critical.`;
  });
  const periodNote = periods.size > 1
    ? "Rows include different fiscal periods; do not treat them as like-for-like comparisons without aligning periods and definitions."
    : "All listed rows share the same reported fiscal period.";
  return `Document-level comparison for ${companiesWithRows.length} selected compan${companiesWithRows.length === 1 ? "y" : "ies"}. Every accessible source document is retained, including documents without an extracted metric set.\n${periodNote}\n\n${lines.join("\n")}`;
}

function latestMetricForDocument(
  rows: Array<typeof financialMetrics.$inferSelect>,
): typeof financialMetrics.$inferSelect | undefined {
  return [...rows].sort((a, b) => b.extractedAt.getTime() - a.extractedAt.getTime())[0];
}

export async function generateBenchmarkInsights(
  companyIds: string[],
  userId: string,
  sessionId?: string,
): Promise<{ rows: BenchmarkMetricRow[]; insights: string }> {
  if (companyIds.length < 2) throw new Error("At least 2 companies are required for benchmarking.");

  const startedAt = Date.now();
  await db.insert(agentLogs).values({
    sessionId: sessionId || null,
    agentName: "Benchmark Agent",
    action: "Starting document-level benchmark comparison",
    status: "running",
    details: `Comparing accessible source documents for ${companyIds.length} companies.`,
  });

  try {
    const documentConditions = [
      inArray(documents.companyId, companyIds),
      or(eq(documents.userId, userId), eq(documents.isSeeded, true)),
    ];
    if (sessionId) documentConditions.push(eq(documents.sessionId, sessionId));

    const sourceRows = await db.select({ document: documents, company: companies, metric: financialMetrics })
      .from(documents)
      .innerJoin(companies, eq(documents.companyId, companies.id))
      .leftJoin(financialMetrics, eq(financialMetrics.documentId, documents.id))
      .where(and(...documentConditions));
    const sourceByDocument = new Map<string, {
      document: typeof documents.$inferSelect;
      company: typeof companies.$inferSelect;
      metrics: Array<typeof financialMetrics.$inferSelect>;
    }>();
    for (const sourceRow of sourceRows) {
      const existing = sourceByDocument.get(sourceRow.document.id) || {
        document: sourceRow.document,
        company: sourceRow.company,
        metrics: [],
      };
      if (sourceRow.metric) existing.metrics.push(sourceRow.metric);
      sourceByDocument.set(sourceRow.document.id, existing);
    }
    const documentRows = [...sourceByDocument.values()];
    const documentIds = documentRows.map((row) => row.document.id);
    const riskRows = documentIds.length > 0
      ? await db.select().from(riskFlags).where(inArray(riskFlags.documentId, documentIds))
      : [];
    const risksByDocument = new Map<string, typeof riskRows>();
    for (const risk of riskRows) risksByDocument.set(risk.documentId, [...(risksByDocument.get(risk.documentId) || []), risk]);

    const rows = sortFiscalPeriods(documentRows.map(({ document, company, metrics }) => {
      const metric = latestMetricForDocument(metrics);
      const rawEvidence = readMetricEvidence(metric?.rawMetrics);
      const metricEvidence: Record<string, string> = {};
      const verifiedValue = (dbKey: keyof typeof financialMetrics.$inferSelect, evidenceKey: string): string | null => {
        const rawValue = metric?.[dbKey];
        const quote = rawEvidence[evidenceKey];
        const value = sourceBackedMetricValue(evidenceKey, rawValue, quote, document.content || "");
        if (value === undefined) return null;
        metricEvidence[evidenceKey] = quote;
        return String(value);
      };
      const documentRisks = (risksByDocument.get(document.id) || []).filter((risk) =>
        hasGroundedEvidence(document.content || "", risk.sourceText || ""),
      );
      return {
        id: metric?.id || document.id,
        documentId: document.id,
        companyId: company.id,
        companyName: company.name,
        ticker: company.ticker,
        sector: company.sector,
        sourceDocument: document.fileName,
        fiscalYear: metric?.fiscalYear ?? document.fiscalYear ?? null,
        fiscalPeriod: metric?.fiscalPeriod ?? null,
        revenue: verifiedValue("revenue", "revenue"),
        revenueGrowth: verifiedValue("revenueGrowth", "revenue_growth"),
        grossMargin: verifiedValue("grossMargin", "gross_margin"),
        operatingMargin: verifiedValue("operatingMargin", "operating_margin"),
        netMargin: verifiedValue("netMargin", "net_margin"),
        ebitdaMargin: verifiedValue("ebitdaMargin", "ebitda_margin"),
        netIncome: verifiedValue("netIncome", "net_income"),
        totalDebt: verifiedValue("totalDebt", "total_debt"),
        currentRatio: verifiedValue("currentRatio", "current_ratio"),
        debtToEquity: verifiedValue("debtToEquity", "debt_to_equity"),
        roe: verifiedValue("roe", "roe"),
        freeCashFlow: verifiedValue("freeCashFlow", "free_cash_flow"),
        metricEvidence,
        riskCount: documentRisks.length,
        criticalRiskCount: documentRisks.filter((risk) => risk.severity.toLowerCase() === "critical").length,
        extractedAt: metric?.extractedAt,
      };
    })).map(({ extractedAt: _extractedAt, ...row }) => row);

    const insights = buildGroundedBenchmarkSummary(rows);
    await db.insert(agentLogs).values({
      sessionId: sessionId || null,
      agentName: "Benchmark Agent",
      action: "Document-level benchmark complete",
      status: "completed",
      details: `Compared ${rows.length} accessible source documents; each financial value and risk count is source-validated.`,
      duration: Date.now() - startedAt,
    });
    return { rows, insights };
  } catch (error) {
    await db.insert(agentLogs).values({
      sessionId: sessionId || null,
      agentName: "Benchmark Agent",
      action: "Benchmark failed",
      status: "failed",
      details: String(error).slice(0, 1000),
      duration: Date.now() - startedAt,
    });
    throw error;
  }
}
