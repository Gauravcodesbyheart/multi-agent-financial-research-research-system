// Benchmark Agent — compares companies across financial metrics
import { db } from "@/db";
import { financialMetrics, companies, riskFlags, agentLogs, documents } from "@/db/schema";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { generateWithGemini } from "./gemini";

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
      .orderBy(desc(financialMetrics.fiscalYear), desc(financialMetrics.extractedAt));

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
        metrics: latestMetrics
          ? {
              revenue: latestMetrics.revenue,
              revenueGrowth: latestMetrics.revenueGrowth,
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

    const prompt = `As a senior financial analyst, compare these companies and provide actionable insights:

${JSON.stringify(companyContext, null, 2)}

Provide a comprehensive benchmark analysis covering:
1. Revenue & Growth comparison
2. Profitability analysis (margins comparison)
3. Financial health (leverage, liquidity)
4. Risk profile comparison
5. Investment recommendation and ranking

Be specific, cite exact numbers, and provide professional analyst-quality insights.`;

    let insights: string;
    try {
      insights = await generateWithGemini(prompt);
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
  context: Array<{ name: string; ticker: string | null; metrics: Record<string, string | null> | null; riskCount: number; criticalRisks: number }>
): string {
  const ranked = [...context].sort((a, b) => Number(b.metrics?.roe || 0) - Number(a.metrics?.roe || 0));
  const lines = ranked.map((company, index) => {
    const metrics = company.metrics;
    const label = company.ticker ? `${company.name} (${company.ticker})` : company.name;
    return `${index + 1}. ${label}: revenue ${metrics?.revenue ?? "N/A"}M, net margin ${metrics?.netMargin ?? "N/A"}, ROE ${metrics?.roe ?? "N/A"}, ${company.riskCount} risks (${company.criticalRisks} critical).`;
  });
  return `AI insights are temporarily unavailable, so this comparison uses the extracted document metrics and risks.\n\nRanking by extracted ROE:\n${lines.join("\n")}\n\nVerify values against the uploaded reports, especially where a metric is N/A.`;
}
