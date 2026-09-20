// Extraction Agent — pulls financial metrics, ratios, revenue trends from documents
import { db } from "@/db";
import { financialMetrics, agentLogs, documents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateJSON } from "./gemini";

interface ExtractedMetrics {
  fiscal_year?: number;
  fiscal_period?: string;
  revenue?: number;
  revenue_growth?: number;
  gross_profit?: number;
  gross_margin?: number;
  operating_income?: number;
  operating_margin?: number;
  net_income?: number;
  net_margin?: number;
  ebitda?: number;
  ebitda_margin?: number;
  total_assets?: number;
  total_liabilities?: number;
  total_equity?: number;
  cash_and_equivalents?: number;
  total_debt?: number;
  current_ratio?: number;
  quick_ratio?: number;
  debt_to_equity?: number;
  roe?: number;
  roa?: number;
  eps?: number;
  pe_ratio?: number;
  operating_cash_flow?: number;
  capital_expenditures?: number;
  free_cash_flow?: number;
  raw_metrics?: Record<string, string | number>;
}

const EXTRACTION_SYSTEM = `You are an expert financial data extraction AI. 
Extract financial metrics from the provided document text and return them as valid JSON.
All monetary values should be in millions of USD. 
Ratios should be decimal (e.g., 0.25 for 25%, not 25).
If a metric cannot be found in the text, use null.
Return only valid JSON — no markdown, no explanation.`;

function findNumber(content: string, labels: string[]): number | undefined {
  const label = labels.join("|");
  const match = content.match(new RegExp(`(?:${label})[^\\d-]{0,80}(-?\\d[\\d,]*(?:\\.\\d+)?)\\s*(%|percent|million|billion)?`, "i"));
  if (!match) return undefined;
  const value = Number(match[1].replace(/,/g, ""));
  const unit = (match[2] || "").toLowerCase();
  if (unit === "billion") return value * 1000;
  return value;
}

function extractMetricsLocally(content: string): ExtractedMetrics {
  const result: ExtractedMetrics = {
    fiscal_year: Number(content.match(/(?:fiscal year|year ended|annual report)[^\d]{0,30}(20\d{2})/i)?.[1]) || undefined,
    fiscal_period: "Annual",
    revenue: findNumber(content, ["total revenue", "revenue", "net sales"]),
    gross_profit: findNumber(content, ["gross profit"]),
    gross_margin: findNumber(content, ["gross margin"]),
    operating_income: findNumber(content, ["operating income"]),
    operating_margin: findNumber(content, ["operating margin"]),
    net_income: findNumber(content, ["net income"]),
    net_margin: findNumber(content, ["net margin"]),
    total_assets: findNumber(content, ["total assets"]),
    total_liabilities: findNumber(content, ["total liabilities"]),
    total_equity: findNumber(content, ["total shareholders.? equity", "total equity"]),
    cash_and_equivalents: findNumber(content, ["cash and cash equivalents", "cash and equivalents"]),
    total_debt: findNumber(content, ["total debt", "long-term debt"]),
    current_ratio: findNumber(content, ["current ratio"]),
    debt_to_equity: findNumber(content, ["debt-to-equity ratio", "debt to equity"]),
    roe: findNumber(content, ["return on equity", "roe"]),
    roa: findNumber(content, ["return on assets", "roa"]),
    eps: findNumber(content, ["earnings per share", "eps"]),
    operating_cash_flow: findNumber(content, ["operating cash flow"]),
    capital_expenditures: findNumber(content, ["capital expenditures", "capital expenditure"]),
    free_cash_flow: findNumber(content, ["free cash flow"]),
  };
  result.raw_metrics = { extraction_method: "local-fallback" };
  return result;
}

export async function extractFinancialMetrics(
  documentId: string,
  content: string,
  companyId?: string
): Promise<void> {
  const start = Date.now();

  await db.insert(agentLogs).values({
    documentId,
    agentName: "Extraction Agent",
    action: "Starting metric extraction",
    status: "running",
    details: "Analyzing financial statements...",
  });

  try {
    // Use first 8000 chars for extraction — most key financials appear early
    const excerpt = content.slice(0, 8000);

    const prompt = `Extract ALL financial metrics from this document text:

${excerpt}

Return a JSON object with these exact keys (use null for missing values):
{
  "fiscal_year": <integer year>,
  "fiscal_period": <"Annual" or "Q1"/"Q2"/"Q3"/"Q4">,
  "revenue": <number in millions>,
  "revenue_growth": <decimal ratio e.g. 0.15 for 15%>,
  "gross_profit": <number in millions>,
  "gross_margin": <decimal ratio>,
  "operating_income": <number in millions>,
  "operating_margin": <decimal ratio>,
  "net_income": <number in millions>,
  "net_margin": <decimal ratio>,
  "ebitda": <number in millions>,
  "ebitda_margin": <decimal ratio>,
  "total_assets": <number in millions>,
  "total_liabilities": <number in millions>,
  "total_equity": <number in millions>,
  "cash_and_equivalents": <number in millions>,
  "total_debt": <number in millions>,
  "current_ratio": <decimal>,
  "quick_ratio": <decimal>,
  "debt_to_equity": <decimal>,
  "roe": <decimal ratio>,
  "roa": <decimal ratio>,
  "eps": <dollars per share>,
  "pe_ratio": <decimal>,
  "operating_cash_flow": <number in millions>,
  "capital_expenditures": <number in millions>,
  "free_cash_flow": <number in millions>,
  "raw_metrics": {}
}`;

    const extracted = await generateJSON<ExtractedMetrics>(prompt, EXTRACTION_SYSTEM);

    // Get document info
    const [doc] = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);

    // Upsert metrics
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
      rawMetrics: extracted.raw_metrics || {},
    };

    await db.insert(financialMetrics).values(metricValues);

    await db.insert(agentLogs).values({
      documentId,
      agentName: "Extraction Agent",
      action: "Metric extraction complete",
      status: "completed",
      details: `Extracted ${Object.values(extracted).filter((v) => v !== null).length} metrics`,
      duration: Date.now() - start,
    });
  } catch (error) {
    const fallback = extractMetricsLocally(content);
    const fallbackValues = Object.fromEntries(
      Object.entries(fallback).filter(([, value]) => value !== undefined)
    );
    const [doc] = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
    await db.insert(financialMetrics).values({
      documentId,
      companyId: companyId || doc?.companyId || undefined,
      fiscalYear: fallback.fiscal_year || doc?.fiscalYear || null,
      fiscalPeriod: "Annual",
      revenue: fallback.revenue?.toString() || null,
      grossProfit: fallback.gross_profit?.toString() || null,
      grossMargin: fallback.gross_margin?.toString() || null,
      operatingIncome: fallback.operating_income?.toString() || null,
      operatingMargin: fallback.operating_margin?.toString() || null,
      netIncome: fallback.net_income?.toString() || null,
      netMargin: fallback.net_margin?.toString() || null,
      totalAssets: fallback.total_assets?.toString() || null,
      totalLiabilities: fallback.total_liabilities?.toString() || null,
      totalEquity: fallback.total_equity?.toString() || null,
      cashAndEquivalents: fallback.cash_and_equivalents?.toString() || null,
      totalDebt: fallback.total_debt?.toString() || null,
      currentRatio: fallback.current_ratio?.toString() || null,
      debtToEquity: fallback.debt_to_equity?.toString() || null,
      roe: fallback.roe?.toString() || null,
      roa: fallback.roa?.toString() || null,
      eps: fallback.eps?.toString() || null,
      operatingCashFlow: fallback.operating_cash_flow?.toString() || null,
      capitalExpenditures: fallback.capital_expenditures?.toString() || null,
      freeCashFlow: fallback.free_cash_flow?.toString() || null,
      rawMetrics: fallback.raw_metrics,
    });
    await db.insert(agentLogs).values({
      documentId,
      agentName: "Extraction Agent",
      action: "Metric extraction completed with local fallback",
      status: "completed",
      details: `Gemini unavailable; extracted ${Object.keys(fallbackValues).length - 2} labeled metrics locally`,
      duration: Date.now() - start,
    });
  }
}
