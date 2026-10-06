// Extraction Agent — extracts financial metrics and stores source quotes for verification.
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { agentLogs, documents, financialMetrics } from "@/db/schema";
import { generateJSON } from "./gemini";
import {
  extractMetricsLocally,
  mergeWithLocalMetrics,
  validateExtractedMetrics,
  type LocalExtractedMetrics,
} from "./extractionUtils";

interface ExtractedMetrics extends LocalExtractedMetrics {
  raw_metrics?: Record<string, unknown>;
}

const EXTRACTION_SYSTEM = `You are a financial data extraction system. Extract only values explicitly supported by the supplied document text.
Return valid JSON only. Monetary values must be in millions of USD and financial ratios must be decimal values (for example, 0.25 for 25%).
For every non-null metric include an exact source quote in metric_evidence under the same key. Never infer or calculate a value unless the formula inputs are both present in the supplied text.`;

const PROMPT_METRICS = [
  "fiscal_year", "fiscal_period", "revenue", "revenue_growth", "gross_profit", "gross_margin",
  "operating_income", "operating_margin", "net_income", "net_margin", "ebitda", "ebitda_margin",
  "total_assets", "total_liabilities", "total_equity", "cash_and_equivalents", "total_debt",
  "current_ratio", "quick_ratio", "debt_to_equity", "roe", "roa", "eps", "pe_ratio",
  "operating_cash_flow", "capital_expenditures", "free_cash_flow",
];

function metricCount(metrics: ExtractedMetrics): number {
  return PROMPT_METRICS.filter((key) => metrics[key as keyof ExtractedMetrics] !== null && metrics[key as keyof ExtractedMetrics] !== undefined).length;
}

async function saveMetrics(documentId: string, companyId: string | undefined, extracted: ExtractedMetrics): Promise<void> {
  const [doc] = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
  const rawMetrics = {
    ...(extracted.raw_metrics || {}),
    extraction_method: extracted.raw_metrics?.extraction_method || "gemini-with-quote-validation-and-local-fill",
    metric_evidence: extracted.metric_evidence || {},
  };
  const metricValues = {
    documentId,
    companyId: companyId || doc?.companyId || undefined,
    fiscalYear: extracted.fiscal_year || doc?.fiscalYear || null,
    fiscalPeriod: extracted.fiscal_period || "Annual",
    revenue: extracted.revenue?.toString() || null,
    revenueGrowth: extracted.revenue_growth?.toString() || null,
    grossProfit: extracted.gross_profit?.toString() || null,
    grossMargin: extracted.gross_margin?.toString() || null,
    operatingIncome: extracted.operating_income?.toString() || null,
    operatingMargin: extracted.operating_margin?.toString() || null,
    netIncome: extracted.net_income?.toString() || null,
    netMargin: extracted.net_margin?.toString() || null,
    ebitda: extracted.ebitda?.toString() || null,
    ebitdaMargin: extracted.ebitda_margin?.toString() || null,
    totalAssets: extracted.total_assets?.toString() || null,
    totalLiabilities: extracted.total_liabilities?.toString() || null,
    totalEquity: extracted.total_equity?.toString() || null,
    cashAndEquivalents: extracted.cash_and_equivalents?.toString() || null,
    totalDebt: extracted.total_debt?.toString() || null,
    currentRatio: extracted.current_ratio?.toString() || null,
    quickRatio: extracted.quick_ratio?.toString() || null,
    debtToEquity: extracted.debt_to_equity?.toString() || null,
    roe: extracted.roe?.toString() || null,
    roa: extracted.roa?.toString() || null,
    eps: extracted.eps?.toString() || null,
    peRatio: extracted.pe_ratio?.toString() || null,
    operatingCashFlow: extracted.operating_cash_flow?.toString() || null,
    capitalExpenditures: extracted.capital_expenditures?.toString() || null,
    freeCashFlow: extracted.free_cash_flow?.toString() || null,
    rawMetrics,
  };

  const [existing] = await db.select({ id: financialMetrics.id })
    .from(financialMetrics)
    .where(eq(financialMetrics.documentId, documentId))
    .limit(1);
  if (existing) {
    await db.update(financialMetrics).set(metricValues).where(eq(financialMetrics.id, existing.id));
  } else {
    await db.insert(financialMetrics).values(metricValues);
  }
}

export async function extractFinancialMetrics(
  documentId: string,
  content: string,
  companyId?: string,
): Promise<void> {
  const startedAt = Date.now();
  await db.insert(agentLogs).values({
    documentId,
    agentName: "Extraction Agent",
    action: "Starting metric extraction",
    status: "running",
    details: "Extracting structured metrics and requiring source evidence for each model value.",
  });

  let extracted: ExtractedMetrics;
  let extractionMethod = "gemini-verified";
  try {
    const relevantText = content.length <= 30000
      ? content
      : `${content.slice(0, 15000)}\n\n[Middle of document omitted from model prompt]\n\n${content.slice(-15000)}`;
    const prompt = `Extract these financial metrics from the document below: ${PROMPT_METRICS.join(", ")}.

Return one JSON object. Use null for a missing value. All monetary amounts must be millions of USD; ratios and margins must be decimals. For each provided metric, metric_evidence must contain an exact short quote copied from the document that supports its numeric value. Do not include a value when you cannot cite an exact quote.

Required JSON shape:
{
  "fiscal_year": null,
  "fiscal_period": "Annual",
  "revenue": null,
  "revenue_growth": null,
  "gross_profit": null,
  "gross_margin": null,
  "operating_income": null,
  "operating_margin": null,
  "net_income": null,
  "net_margin": null,
  "ebitda": null,
  "ebitda_margin": null,
  "total_assets": null,
  "total_liabilities": null,
  "total_equity": null,
  "cash_and_equivalents": null,
  "total_debt": null,
  "current_ratio": null,
  "quick_ratio": null,
  "debt_to_equity": null,
  "roe": null,
  "roa": null,
  "eps": null,
  "pe_ratio": null,
  "operating_cash_flow": null,
  "capital_expenditures": null,
  "free_cash_flow": null,
  "metric_evidence": { "revenue": "exact quote", "gross_margin": "exact quote" },
  "raw_metrics": {}
}

DOCUMENT TEXT:\n${relevantText}`;

    const modelOutput = await generateJSON<ExtractedMetrics>(prompt, EXTRACTION_SYSTEM);
    const verified = validateExtractedMetrics(modelOutput as Record<string, unknown>, content);
    extracted = mergeWithLocalMetrics(verified, extractMetricsLocally(content)) as ExtractedMetrics;
    extracted.raw_metrics = {
      ...(modelOutput.raw_metrics || {}),
      extraction_method: "gemini-with-evidence-validation",
    };
  } catch (error) {
    extractionMethod = "local-evidence-parser";
    extracted = extractMetricsLocally(content) as ExtractedMetrics;
    extracted.raw_metrics = {
      ...(extracted.raw_metrics || {}),
      fallback_reason: String(error).slice(0, 500),
      extraction_method: extractionMethod,
    };
  }

  await saveMetrics(documentId, companyId, extracted);
  await db.insert(agentLogs).values({
    documentId,
    agentName: "Extraction Agent",
    action: "Metric extraction complete",
    status: extractionMethod === "gemini-verified" ? "completed" : "partial",
    details: `Stored ${metricCount(extracted)} evidence-backed fields using ${extractionMethod}.`,
    duration: Date.now() - startedAt,
  });
}
