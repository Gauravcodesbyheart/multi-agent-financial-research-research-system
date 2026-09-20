import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { analysisReports, companies, documents } from "@/db/schema";
import { and, eq, desc, inArray, or } from "drizzle-orm";
import { generateAnalysisReport } from "@/lib/agents/reportAgent";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const reports = await db
    .select()
    .from(analysisReports)
    .where(eq(analysisReports.userId, session.user.id))
    .orderBy(desc(analysisReports.createdAt));

  return NextResponse.json({ reports });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId, companyIds, title, reportType, additionalContext } = await req.json();

  if (!companyIds || companyIds.length === 0) {
    return NextResponse.json({ error: "At least one company required" }, { status: 400 });
  }

  // Get company names
  const selectedCompanies = await db
    .select()
    .from(companies)
    .where(inArray(companies.id, companyIds));

  const selectedDocuments = await db
    .select({ id: documents.id })
    .from(documents)
    .where(and(
      inArray(documents.companyId, companyIds),
      or(eq(documents.userId, session.user.id), eq(documents.isSeeded, true)),
    ));
  if (selectedCompanies.length !== companyIds.length || selectedDocuments.length === 0) {
    return NextResponse.json({ error: "Selected companies have no available documents." }, { status: 400 });
  }

  const reportTitle = title || `Financial Analysis Report — ${selectedCompanies.map((c) => c.ticker || c.name).join(", ")}`;

  // Create initial report record
  const [report] = await db
    .insert(analysisReports)
    .values({
      sessionId: sessionId || null,
      userId: session.user.id,
      title: reportTitle,
      reportType: reportType || "comprehensive",
      companies: selectedCompanies.map((c) => c.name),
      status: "generating",
    })
    .returning();

  // Report Agent uses Gemini when available and a grounded local report otherwise.
  generateAnalysisReport(
    report.id,
    sessionId || report.id,
    session.user.id,
    companyIds,
    additionalContext
  ).catch(console.error);

  return NextResponse.json({ report }, { status: 201 });
}

function generateDemoReport(selectedCompanies: Array<{ name: string; ticker: string | null; sector: string | null }>) {
  const names = selectedCompanies.map((c) => c.name).join(", ");
  const summary = `This financial analysis report covers ${names}. The companies analyzed represent key players in their respective sectors. Based on the loaded financial documents, this report provides a comprehensive assessment of financial performance, risk factors, and investment considerations. Note: Configure GEMINI_API_KEY for AI-powered analysis.`;

  const content = `# FINANCIAL ANALYSIS REPORT

## Executive Summary
${summary}

## Companies Analyzed
${selectedCompanies.map((c) => `- **${c.name}** (${c.ticker || "N/A"}) — ${c.sector || "Unknown Sector"}`).join("\n")}

## Financial Performance Overview
Based on 2023 annual reports:

| Company | Revenue | Net Margin | Revenue Growth |
|---------|---------|------------|----------------|
| Apple Inc. | $394.3B | 24.6% | -0.3% |
| Microsoft Corp. | $211.9B | 34.1% | +6.9% |
| Tesla Inc. | $96.8B | 15.5% | +18.8% |
| Amazon.com | $574.8B | 5.3% | +11.8% |

## Key Findings
1. Microsoft leads in profitability with 41.8% operating margin
2. Amazon shows strongest revenue recovery with record operating cash flows
3. Tesla faces margin compression from price cuts and competition
4. Apple maintains premium brand but faces China concentration risk

## Risk Summary
- Critical: Tesla margin compression, Amazon FTC antitrust risk
- High: Apple China dependency, Microsoft AI investment uncertainty

## Recommendations
Configure GEMINI_API_KEY for personalized AI-generated investment recommendations.

---
*This report was generated in demo mode. Enable AI for full analyst-grade insights.*`;

  return {
    summary,
    content,
    recommendations: selectedCompanies.map((c) => `Review ${c.name} position based on 2023 financials`),
  };
}
