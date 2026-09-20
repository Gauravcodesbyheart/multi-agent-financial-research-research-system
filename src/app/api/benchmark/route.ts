import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { financialMetrics, companies, riskFlags, documents } from "@/db/schema";
import { and, eq, inArray, or } from "drizzle-orm";
import { generateBenchmarkInsights } from "@/lib/agents/benchmarkAgent";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { companyIds, sessionId } = await req.json();
  if (!companyIds || companyIds.length < 2) {
    return NextResponse.json({ error: "At least 2 companies required" }, { status: 400 });
  }

  const hasAI = process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.startsWith("AIzaSyDemo");

  const metricsData = await db
    .select()
    .from(financialMetrics)
    .innerJoin(documents, eq(financialMetrics.documentId, documents.id))
    .where(and(
      inArray(financialMetrics.companyId, companyIds),
      or(eq(documents.userId, session.user.id), eq(documents.isSeeded, true)),
    ));

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
      or(eq(documents.userId, session.user.id), eq(documents.isSeeded, true)),
    ));

  let insights = "Configure GEMINI_API_KEY for AI-powered benchmark insights.";
  if (hasAI) {
    try {
      insights = await generateBenchmarkInsights(companyIds, session.user.id, sessionId);
    } catch (e) {
      insights = `Error generating insights: ${String(e)}`;
    }
  }

  return NextResponse.json({
    metrics: metricsData.map((row) => row.financial_metrics),
    companies: companiesData,
    risks: risksData.map((row) => row.risk_flags),
    insights,
  });
}
