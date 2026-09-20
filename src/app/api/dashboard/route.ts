import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { documents, researchSessions, analysisReports, companies, riskFlags, financialMetrics, agentLogs } from "@/db/schema";
import { eq, count, desc } from "drizzle-orm";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ docCount }] = await db.select({ docCount: count() }).from(documents).where(eq(documents.userId, session.user.id));
  const [{ sessionCount }] = await db.select({ sessionCount: count() }).from(researchSessions).where(eq(researchSessions.userId, session.user.id));
  const [{ reportCount }] = await db.select({ reportCount: count() }).from(analysisReports).where(eq(analysisReports.userId, session.user.id));
  const [{ companyCount }] = await db.select({ companyCount: count() }).from(companies);
  const [{ riskCount }] = await db.select({ riskCount: count() }).from(riskFlags);

  // Recent sessions
  const recentSessions = await db
    .select()
    .from(researchSessions)
    .where(eq(researchSessions.userId, session.user.id))
    .orderBy(desc(researchSessions.updatedAt))
    .limit(5);

  // Recent reports
  const recentReports = await db
    .select()
    .from(analysisReports)
    .where(eq(analysisReports.userId, session.user.id))
    .orderBy(desc(analysisReports.createdAt))
    .limit(3);

  // Recent agent activity
  const recentAgentActivity = await db
    .select()
    .from(agentLogs)
    .orderBy(desc(agentLogs.createdAt))
    .limit(10);

  // All metrics for charts
  const allMetrics = await db
    .select({ metrics: financialMetrics, company: companies })
    .from(financialMetrics)
    .leftJoin(companies, eq(financialMetrics.companyId, companies.id))
    .limit(20);

  return NextResponse.json({
    stats: {
      documents: Number(docCount),
      sessions: Number(sessionCount),
      reports: Number(reportCount),
      companies: Number(companyCount),
      risks: Number(riskCount),
    },
    recentSessions,
    recentReports,
    recentAgentActivity,
    metricsChartData: allMetrics,
  });
}
