import { NextResponse } from "next/server";
import { count, desc, eq, inArray, or, sql, type SQL } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { agentLogs, analysisReports, companies, documents, financialMetrics, researchSessions, riskFlags } from "@/db/schema";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const [
    [{ docCount }],
    [{ sessionCount }],
    [{ reportCount }],
    visibleDocuments,
    visibleSessions,
    recentSessions,
    recentReports,
  ] = await Promise.all([
    db.select({ docCount: count() }).from(documents).where(eq(documents.userId, userId)),
    db.select({ sessionCount: count() }).from(researchSessions).where(eq(researchSessions.userId, userId)),
    db.select({ reportCount: count() }).from(analysisReports).where(eq(analysisReports.userId, userId)),
    db.select({ id: documents.id, companyId: documents.companyId })
      .from(documents).where(or(eq(documents.userId, userId), eq(documents.isSeeded, true))),
    db.select({ id: researchSessions.id }).from(researchSessions).where(eq(researchSessions.userId, userId)),
    db.select().from(researchSessions).where(eq(researchSessions.userId, userId)).orderBy(desc(researchSessions.updatedAt)).limit(5),
    db.select().from(analysisReports).where(eq(analysisReports.userId, userId)).orderBy(desc(analysisReports.createdAt)).limit(3),
  ]);

  const visibleDocumentIds = visibleDocuments.map((document) => document.id);
  const visibleCompanyIds = [...new Set(visibleDocuments.map((document) => document.companyId).filter(Boolean))] as string[];
  const visibleSessionIds = visibleSessions.map((researchSession) => researchSession.id);

  const [{ companyCount }] = await db.select({ companyCount: count() }).from(companies)
    .where(visibleCompanyIds.length > 0
      ? or(eq(companies.isSeeded, true), inArray(companies.id, visibleCompanyIds))
      : eq(companies.isSeeded, true));
  const [{ riskCount }] = visibleDocumentIds.length > 0
    ? await db.select({ riskCount: count() }).from(riskFlags).where(inArray(riskFlags.documentId, visibleDocumentIds))
    : [{ riskCount: 0 }];

  const logConditions: SQL<unknown>[] = [];
  if (visibleSessionIds.length > 0) logConditions.push(inArray(agentLogs.sessionId, visibleSessionIds));
  if (visibleDocumentIds.length > 0) logConditions.push(inArray(agentLogs.documentId, visibleDocumentIds));
  const recentAgentActivity = logConditions.length > 0
    ? await db.select().from(agentLogs).where(or(...logConditions)).orderBy(desc(agentLogs.createdAt)).limit(10)
    : [];
  const metricsChartData = visibleDocumentIds.length > 0
    ? await db.select({ metrics: financialMetrics, company: companies })
      .from(financialMetrics)
      .innerJoin(documents, eq(financialMetrics.documentId, documents.id))
      .leftJoin(companies, eq(financialMetrics.companyId, companies.id))
      .where(or(eq(documents.userId, userId), eq(documents.isSeeded, true)))
      .orderBy(sql`${financialMetrics.fiscalYear} DESC NULLS LAST`, desc(financialMetrics.extractedAt))
      .limit(20)
    : [];

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
    metricsChartData,
  });
}
