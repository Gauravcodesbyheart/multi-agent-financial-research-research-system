// Benchmark Agent — compares companies across financial metrics
import { db } from "@/db";
import { financialMetrics, companies, riskFlags, agentLogs, documents } from "@/db/schema";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { generateWithLlm } from "./llmClient";

export async function generateBenchmarkInsights(
  companyIds: string[],
  userId: string,
  sessionId?: string
): Promise<string> {
  if (companyIds.length < 2) {
    return "At least 2 companies are required for benchmarking.";
  }

  const start = Date.now();

  await db.insert(agentLogs).values({
    sessionId: sessionId || null,
    agentName: "Benchmark Agent",
    action: "Starting benchmark comparison",
    status: "running",
    details: `Comparing ${companyIds.length} companies...`,
  });

  try {
    // Fetch metrics for all companies
    const metricsData = await db
      .select()
      .from(financialMetrics)
      .innerJoin(documents, eq(financialMetrics.documentId, documents.id))
      .where(and(
        inArray(financialMetrics.companyId, companyIds),
        or(eq(documents.userId, userId), eq(documents.isSeeded, true)),
      ))
      .orderBy(sql`${financialMetrics.fiscalYear} DESC NULLS LAST`, desc(financialMetrics.extractedAt));

    const companiesData = await db
      .select()
      .from(companies)
      .where(inArray(companies.id, companyIds));

    const risksData = await db
      .select()
      .from(riskFlags)
      .innerJoin(documents, eq(riskFlags.documentId, documents.id))
      .where(and(
        inArray(riskFlags.companyId, companyIds),
        or(eq(documents.userId, userId), eq(documents.isSeeded, true)),
      ));

    // Build comparison context
    const companyContext = companiesData.map((company) => {
      const metrics = metricsData.map((row) => row.financial_metrics).filter((m) => m.companyId === company.id);
      const risks = risksData.map((row) => row.risk_flags).filter((r) => r.companyId === company.id);
      const latestMetrics = metrics[0];

      return {
        name: company.name,
        ticker: company.ticker,
        sector: company.sector,
        fiscalYear: latestMetrics?.fiscalYear ?? null,
        fiscalPeriod: latestMetrics?.fiscalPeriod ?? null,
        sourceDocument: metricsData.find((row) => row.financial_metrics.companyId === company.id)?.documents.fileName || "Unknown source document",
        metrics: latestMetrics
          ? {
              revenue: latestMetrics.revenue,
              revenueGrowth: latestMetrics.revenueGrowth,
              netIncome: latestMetrics.netIncome,
              totalDebt: latestMetrics.totalDebt,
              freeCashFlow: latestMetrics.freeCashFlow,
              grossMargin: latestMetrics.grossMargin,
              operatingMargin: latestMetrics.operatingMargin,
              netMargin: latestMetrics.netMargin,
              currentRatio: latestMetrics.currentRatio,
              debtToEquity: latestMetrics.debtToEquity,
              roe: latestMetrics.roe,
              eps: latestMetrics.eps,
            }
          : null,
        riskCount: risks.length,
        criticalRisks: risks.filter((r) => r.severity === "critical").length,
      };
    });

    const prompt = `As a careful financial analyst, compare the supplied company data. This data comes only from the named source documents.

${JSON.stringify(companyContext, null, 2)}

Compare revenue/growth, profitability, leverage/liquidity, and risk counts. Name the fiscal period and source document beside each company's figures. Do not silently compare mismatched years or periods; state when comparisons are not like-for-like. Do not give buy/sell investment recommendations. Do not infer facts that are not in the supplied data. If a value is missing, say N/A.`;

    let insights: string;
    try {
      insights = await generateWithLlm(prompt);
    } catch (error) {
      insights = createLocalBenchmarkInsights(companyContext);
      await db.insert(agentLogs).values({
        sessionId: sessionId || null,
        agentName: "Benchmark Agent",
        action: "AI unavailable; generated local benchmark insights",
        status: "completed",
        details: String(error),
        duration: Date.now() - start,
      });
    }

    await db.insert(agentLogs).values({
      sessionId: sessionId || null,
      agentName: "Benchmark Agent",
      action: "Benchmark complete",
      status: "completed",
      details: "Generated comparative insights for all companies",
      duration: Date.now() - start,
    });

    return insights;
  } catch (error) {
    await db.insert(agentLogs).values({
      sessionId: sessionId || null,
      agentName: "Benchmark Agent",
      action: "Benchmark failed",
      status: "failed",
      details: String(error),
      duration: Date.now() - start,
    });
    throw error;
  }
}

function createLocalBenchmarkInsights(
  context: Array<{ name: string; ticker: string | null; metrics: Record<string, string | null> | null; riskCount: number; criticalRisks: number; fiscalYear?: number | null; fiscalPeriod?: string | null; sourceDocument?: string }>
): string {
  const percent = (value: string | null | undefined) => {
    const number = value === null || value === undefined || value === "" ? NaN : Number(value);
    return Number.isFinite(number) ? `${(number * 100).toFixed(2)}%` : "N/A";
  };
  const amount = (value: string | null | undefined) => value === null || value === undefined || value === "" ? "N/A" : `${value}M USD`;
  const periodFor = (company: typeof context[number]) => `${company.fiscalPeriod || "Annual"} ${company.fiscalYear ?? "N/A"}`;
  const ranked = [...context].sort((a, b) => Number(b.metrics?.roe || 0) - Number(a.metrics?.roe || 0));
  const lines = ranked.map((company, index) => {
    const metrics = company.metrics;
    const label = company.ticker ? `${company.name} (${company.ticker})` : company.name;
    const source = company.sourceDocument || "Unknown source document";
    return `${index + 1}. ${label} (${periodFor(company)}; source ${source}): revenue ${amount(metrics?.revenue)}, growth ${percent(metrics?.revenueGrowth)}, net income ${amount(metrics?.netIncome)}, net margin ${percent(metrics?.netMargin)}, total debt ${amount(metrics?.totalDebt)}, free cash flow ${amount(metrics?.freeCashFlow)}, ROE ${percent(metrics?.roe)}, current ratio ${metrics?.currentRatio ?? "N/A"}, ${company.riskCount} risks (${company.criticalRisks} critical).`;
  });
  const periods = new Set(context.map(periodFor));
  const comparability = periods.size > 1 ? "Latest fiscal periods differ or are missing; these figures are not a like-for-like comparison." : "Latest fiscal periods match.";
  return `AI insights are temporarily unavailable, so this comparison uses the extracted document metrics and risks.\n${comparability}\n\nRanking by extracted ROE:\n${lines.join("\n")}\n\nVerify values against the named source filings, especially where a metric is N/A.`;
}
