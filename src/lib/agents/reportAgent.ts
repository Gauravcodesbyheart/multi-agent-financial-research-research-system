// Report Agent — compiles all insights into structured analyst-style reports
import { db } from "@/db";
import { analysisReports, financialMetrics, riskFlags, companies, documents, agentLogs } from "@/db/schema";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { DEFAULT_GEMINI_PRO_MODEL, generateWithGemini } from "./gemini";

function extractMarkdownSection(markdown: string, heading: string): string | undefined {
  const lines = markdown.split(/\r?\n/);
  const wanted = heading.trim().toLocaleUpperCase();
  const start = lines.findIndex((line) =>
    /^#{1,3}\s+/.test(line) && line.replace(/^#{1,3}\s+/, "").trim().toLocaleUpperCase() === wanted
  );
  if (start < 0) return undefined;
  const nextHeading = lines.findIndex((line, index) => index > start && /^#{1,3}\s+/.test(line));
  return lines.slice(start + 1, nextHeading < 0 ? lines.length : nextHeading).join("\n").trim() || undefined;
}

type ReportProfile = {
  company: string;
  fiscalYear: number | null;
  fiscalPeriod: string | null;
  sourceDocument: string;
  metrics: typeof financialMetrics.$inferSelect | undefined;
};

function renderKeyFinancialsSection(profiles: ReportProfile[]): string {
  const display = (value: string | null | undefined) => value === null || value === undefined || value === "" ? "N/A" : value;
  const cell = (value: string) => value.replace(/\|/g, "\\|").replace(/[\r\n]+/g, " ");
  const percent = (value: string | null | undefined) => {
    if (value === null || value === undefined || value === "") return "N/A";
    const number = Number(value);
    return Number.isFinite(number) ? `${(number * 100).toFixed(2)}%` : "N/A";
  };
  const rows = profiles.map((profile) => {
    const metrics = profile.metrics;
    return `| ${cell(profile.company)} | ${cell(profile.fiscalPeriod || "Annual")} ${profile.fiscalYear ?? "N/A"} | ${display(metrics?.revenue)} | ${percent(metrics?.revenueGrowth)} | ${percent(metrics?.grossMargin)} | ${percent(metrics?.operatingMargin)} | ${display(metrics?.netIncome)} | ${display(metrics?.totalDebt)} | ${display(metrics?.currentRatio)} | ${display(metrics?.freeCashFlow)} | ${cell(profile.sourceDocument)} |`;
  }).join("\n");
  return `# KEY FINANCIALS\nAmounts are in millions of USD unless noted. Ratios and margins are shown as percentages. N/A means no stored metric was available. Values below are taken from the latest stored metric set for each company; periods are shown to make non-like-for-like comparisons visible.\n\n| Company | Fiscal period | Revenue | Revenue growth | Gross margin | Operating margin | Net income | Total debt | Current ratio | Free cash flow | Source document |\n|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|\n${rows || "| No data | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |"}`;
}

function replaceOrInsertMarkdownSection(markdown: string, heading: string, replacementSection: string, insertBeforeHeading?: string): string {
  const lines = markdown.split(/\r?\n/);
  const wanted = heading.trim().toLocaleUpperCase();
  const start = lines.findIndex((line) =>
    /^#{1,3}\s+/.test(line) && line.replace(/^#{1,3}\s+/, "").trim().toLocaleUpperCase() === wanted
  );
  const replacementLines = replacementSection.split(/\r?\n/);
  if (start >= 0) {
    const nextHeading = lines.findIndex((line, index) => index > start && /^#{1,3}\s+/.test(line));
    lines.splice(start, (nextHeading < 0 ? lines.length : nextHeading) - start, ...replacementLines);
  } else if (insertBeforeHeading) {
    const insertBefore = insertBeforeHeading.trim().toLocaleUpperCase();
    const index = lines.findIndex((line) => /^#{1,3}\s+/.test(line) && line.replace(/^#{1,3}\s+/, "").trim().toLocaleUpperCase() === insertBefore);
    if (index >= 0) lines.splice(index, 0, "", ...replacementLines, "");
    else lines.push("", ...replacementLines);
  } else {
    lines.push("", ...replacementLines);
  }
  return lines.join("\n").trim();
}

export async function generateAnalysisReport(
  reportId: string,
  sessionId: string,
  userId: string,
  companyIds: string[],
  additionalContext?: string
): Promise<void> {
  const start = Date.now();

  await db.insert(agentLogs).values({
    sessionId,
    agentName: "Report Agent",
    action: "Starting report generation",
    status: "running",
    details: "Compiling financial analysis report...",
  });

  try {
    // Gather all data
    const companiesData = await db
      .select()
      .from(companies)
      .where(inArray(companies.id, companyIds));

    const metricsData = await db
      .select()
      .from(financialMetrics)
      .innerJoin(documents, eq(financialMetrics.documentId, documents.id))
      .where(and(
        inArray(financialMetrics.companyId, companyIds),
        or(eq(documents.userId, userId), eq(documents.isSeeded, true)),
      ))
      .orderBy(sql`${financialMetrics.fiscalYear} DESC NULLS LAST`, desc(financialMetrics.extractedAt));

    const risksData = await db
      .select()
      .from(riskFlags)
      .innerJoin(documents, eq(riskFlags.documentId, documents.id))
      .where(and(
        inArray(riskFlags.companyId, companyIds),
        or(eq(documents.userId, userId), eq(documents.isSeeded, true)),
      ));

    // Build comprehensive context
    const companyProfiles = companiesData.map((co) => {
      const latestRow = metricsData.find((row) => row.financial_metrics.companyId === co.id);
      const metrics = latestRow?.financial_metrics;
      const risks = risksData.map((row) => row.risk_flags).filter((risk) => risk.companyId === co.id);
      const rawMetricEvidence = metrics?.rawMetrics && typeof metrics.rawMetrics === "object"
        ? (metrics.rawMetrics as Record<string, unknown>).metric_evidence
        : undefined;

      return {
        company: `${co.name} (${co.ticker || "N/A"})`,
        sector: co.sector,
        fiscalYear: metrics?.fiscalYear ?? null,
        fiscalPeriod: metrics?.fiscalPeriod ?? null,
        sourceDocument: latestRow?.documents.fileName || "Unknown source document",
        metricEvidence: rawMetricEvidence || {},
        metrics,
        risks: risks.map((risk) => ({
          type: risk.riskType,
          severity: risk.severity,
          title: risk.title,
          description: risk.description,
          sourceText: risk.sourceText,
          sourceDocument: risksData.find((row) => row.risk_flags.id === risk.id)?.documents.fileName || "Unknown source document",
        })),
      };
    });

    const reportPrompt = `You are a senior equity research analyst writing a professional financial research report.

Based on the following company data, write a comprehensive analyst-style report:

${JSON.stringify(companyProfiles, null, 2)}

${additionalContext ? `Additional context: ${additionalContext}` : ""}

Write the report in the following structure:

# EXECUTIVE SUMMARY
[2-3 paragraph overview of key findings. Cite the source document for factual statements.]

# KEY FINANCIALS
[Create a compact Markdown table with company, fiscal year/period, revenue, revenue growth, gross margin, operating margin, net income, total debt, current ratio, and free cash flow. Use N/A for absent fields, preserve the supplied units, and cite the source document beside each company's row. Do not combine mismatched fiscal periods without disclosing the difference.]

# COMPANY PROFILES
[Brief profile for each company]

# FINANCIAL PERFORMANCE ANALYSIS
## Revenue & Growth
[Analysis with specific numbers]
## Profitability
[Margins analysis]
## Balance Sheet Strength
[Liquidity and leverage]
## Cash Flow Quality
[Cash generation analysis]

# RISK ANALYSIS
[Detailed risk assessment for each company]

# COMPETITIVE BENCHMARKING
[Comparative analysis if multiple companies]

# KEY INVESTMENT CONSIDERATIONS
[3-5 bullet points per company]

# ANALYST RECOMMENDATIONS
[Clear buy/hold/sell recommendation with rationale]

# DISCLAIMER
This report is generated by AI based solely on provided document data and should not be considered as investment advice.

Write in professional analyst prose. Be specific with numbers. Cite data directly.`;

    let fullReport: string;
    try {
      fullReport = await generateWithGemini(reportPrompt, undefined, DEFAULT_GEMINI_PRO_MODEL);
    } catch (error) {
      fullReport = createLocalReport(companyProfiles, String(error));
    }

    fullReport = replaceOrInsertMarkdownSection(
      fullReport,
      "KEY FINANCIALS",
      renderKeyFinancialsSection(companyProfiles),
      "COMPANY PROFILES",
    );

    const executiveSummary = extractMarkdownSection(fullReport, "EXECUTIVE SUMMARY")
      || fullReport.split(/\r?\n/).filter((line) => line.trim() && !line.trim().startsWith("#")).slice(0, 3).join(" ").slice(0, 1200);
    const recommendationLines = (extractMarkdownSection(fullReport, "ANALYST RECOMMENDATIONS") || "")
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*[-*]\s*/, "").trim())
      .filter(Boolean);
    const recommendations = companiesData.map((co, index) =>
      recommendationLines[index] || `Review ${co.name} position against the cited source metrics and risk disclosures.`
    );
    const metricsComparison = companyProfiles.map((profile) => ({
      company: profile.company,
      sourceDocument: profile.sourceDocument,
      fiscalYear: profile.fiscalYear,
      fiscalPeriod: profile.fiscalPeriod,
      revenue: profile.metrics?.revenue ?? null,
      revenueGrowth: profile.metrics?.revenueGrowth ?? null,
      grossMargin: profile.metrics?.grossMargin ?? null,
      operatingMargin: profile.metrics?.operatingMargin ?? null,
      netIncome: profile.metrics?.netIncome ?? null,
      totalDebt: profile.metrics?.totalDebt ?? null,
      currentRatio: profile.metrics?.currentRatio ?? null,
      freeCashFlow: profile.metrics?.freeCashFlow ?? null,
    }));

    // Update report in DB
    await db
      .update(analysisReports)
      .set({
        executiveSummary,
        fullReportContent: fullReport,
        recommendations,
        companies: companiesData.map((co) => co.name),
        metricsComparison: { rows: metricsComparison },
        keyFindings: {
          totalCompanies: companiesData.length,
          totalRisks: risksData.length,
          criticalRisks: risksData.filter((r) => r.risk_flags.severity === "critical").length,
        },
        riskSummary: {
          byCompany: companiesData.map((co) => ({
            company: co.name,
            risks: risksData.filter((r) => r.documents.companyId === co.id).length,
          })),
        },
        status: "completed",
        updatedAt: new Date(),
      })
      .where(eq(analysisReports.id, reportId));

    await db.insert(agentLogs).values({
      sessionId,
      agentName: "Report Agent",
      action: "Report generation complete",
      status: "completed",
      details: `Generated ${fullReport.length} character report`,
      duration: Date.now() - start,
    });
  } catch (error) {
    await db
      .update(analysisReports)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(analysisReports.id, reportId));

    await db.insert(agentLogs).values({
      sessionId,
      agentName: "Report Agent",
      action: "Report generation failed",
      status: "failed",
      details: String(error),
      duration: Date.now() - start,
    });
    throw error;
  }
}

type LocalReportProfile = {
  company: string;
  sector: string | null;
  fiscalYear: number | null;
  fiscalPeriod: string | null;
  sourceDocument: string;
  metrics: typeof financialMetrics.$inferSelect | undefined;
  risks: Array<{
    type: string;
    severity: string;
    title: string;
    description: string;
    sourceText: string | null;
    sourceDocument: string;
  }>;
};

function createLocalReport(profiles: LocalReportProfile[], reason: string): string {
  const ratioPercent = (value: string | null | undefined) => {
    if (value === null || value === undefined || value === "") return "N/A";
    const numeric = Number(value);
    return Number.isFinite(numeric) ? `${(numeric * 100).toFixed(2)}%` : "N/A";
  };
  const display = (value: string | number | null | undefined) => value === null || value === undefined || value === "" ? "N/A" : String(value);

  const companySections = profiles.map((profile) => {
    const metrics = profile.metrics;
    const risks = profile.risks.length > 0
      ? profile.risks.map((risk) => `- ${risk.severity}: ${risk.title} (${risk.type}); source: ${risk.sourceDocument}${risk.sourceText ? `; evidence: \"${risk.sourceText}\"` : ""}`).join("\n")
      : "- No stored risk flags were found for the selected documents.";

    return `## ${profile.company}
Sector: ${profile.sector || "Not provided"}
Source document: ${profile.sourceDocument}
Fiscal period: ${profile.fiscalPeriod || "Annual"} ${profile.fiscalYear ?? "N/A"}
Revenue: ${display(metrics?.revenue)} million USD
Revenue growth: ${ratioPercent(metrics?.revenueGrowth)}
Gross margin: ${ratioPercent(metrics?.grossMargin)}
Operating margin: ${ratioPercent(metrics?.operatingMargin)}
Net margin: ${ratioPercent(metrics?.netMargin)}
Current ratio: ${display(metrics?.currentRatio)}
Debt-to-equity: ${display(metrics?.debtToEquity)}
ROE: ${ratioPercent(metrics?.roe)}
Free cash flow: ${display(metrics?.freeCashFlow)} million USD

Risks:
${risks}`;
  }).join("\n\n");

  const companyNames = profiles.map((profile) => profile.company).join(", ") || "the selected companies";
  return `# EXECUTIVE SUMMARY
This evidence-only report covers ${companyNames}. Gemini report generation was unavailable, so this summary makes no unsupported performance or investment claims. The Key Financials table records the latest stored metric set for each selected company and names its source document; confirm periods and values in the original filings.

${renderKeyFinancialsSection(profiles)}

# COMPANY PROFILES
${companySections || "No company profiles are available."}

# FINANCIAL PERFORMANCE ANALYSIS
Values are reported from the latest stored metric sets above. Compare companies only when fiscal periods, accounting definitions, and units are comparable.

# RISK ANALYSIS
${companySections || "No risk information is available."}

# ANALYST RECOMMENDATIONS
- Verify every reported value and source excerpt against the original filing.
- Review fiscal period alignment before benchmarking companies.
- Treat red flags as screening signals, not investment advice.

# DISCLAIMER
This local report uses stored document-derived data only. Gemini detail was unavailable (${reason}). It is informational and not investment advice.`;
}
