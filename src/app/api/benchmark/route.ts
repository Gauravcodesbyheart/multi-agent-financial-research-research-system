import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { companies, documents, financialMetrics, researchSessions, riskFlags } from "@/db/schema";
import { generateBenchmarkInsights } from "@/lib/agents/benchmarkAgent";
import { isUuid, filterUuidList } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { companyIds?: unknown; sessionId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }
  // Every id must be a well-formed UUID before it reaches the query, otherwise
  // Postgres raises `invalid input syntax for type uuid` as an unhandled 500.
  const companyIds = filterUuidList(body.companyIds);
  const sessionId = isUuid(body.sessionId) ? body.sessionId : undefined;
  if (body.sessionId !== undefined && body.sessionId !== null && body.sessionId !== "" && !sessionId) {
    return NextResponse.json({ error: "Invalid sessionId" }, { status: 400 });
  }
  if (companyIds.length < 2 || companyIds.length > 8) {
    return NextResponse.json({ error: "Select between 2 and 8 companies" }, { status: 400 });
  }

  if (sessionId) {
    const [ownedSession] = await db.select({ id: researchSessions.id })
      .from(researchSessions)
      .where(and(eq(researchSessions.id, sessionId), eq(researchSessions.userId, session.user.id)))
      .limit(1);
    if (!ownedSession) return NextResponse.json({ error: "Research session not found" }, { status: 404 });
  }

  const [companiesData, accessibleDocuments] = await Promise.all([
    db.select().from(companies).where(inArray(companies.id, companyIds)),
    db.select({ companyId: documents.companyId })
      .from(documents)
      .where(and(
        inArray(documents.companyId, companyIds),
        or(eq(documents.userId, session.user.id), eq(documents.isSeeded, true)),
      )),
  ]);
  const accessibleCompanyIds = new Set(accessibleDocuments.map((document) => document.companyId).filter(Boolean));
  if (companiesData.length !== companyIds.length || companyIds.some((id) => !accessibleCompanyIds.has(id))) {
    return NextResponse.json({ error: "Each selected company must have a document you can access." }, { status: 400 });
  }

  const allowedDocuments = await db.select({ id: documents.id })
    .from(documents)
    .where(and(
      inArray(documents.companyId, companyIds),
      or(eq(documents.userId, session.user.id), eq(documents.isSeeded, true)),
    ));
  const documentIds = allowedDocuments.map((document) => document.id);
  const [metricsData, risksData] = documentIds.length > 0
    ? await Promise.all([
        db.select({ metrics: financialMetrics, sourceDocument: documents.fileName })
          .from(financialMetrics)
          .innerJoin(documents, eq(financialMetrics.documentId, documents.id))
          .where(inArray(financialMetrics.documentId, documentIds))
          .orderBy(sql`${financialMetrics.fiscalYear} DESC NULLS LAST`, desc(financialMetrics.extractedAt)),
        db.select().from(riskFlags).where(inArray(riskFlags.documentId, documentIds)),
      ])
    : [[], []];

  const latestByCompany = new Map<string, typeof metricsData[number]>();
  for (const row of metricsData) {
    if (row.metrics.companyId && !latestByCompany.has(row.metrics.companyId)) {
      latestByCompany.set(row.metrics.companyId, row);
    }
  }
  const latestMetrics = [...latestByCompany.values()].map(({ metrics, sourceDocument }) => ({
    ...metrics,
    sourceDocument,
  }));

  let insights: string;
  try {
    // The agent provides a deterministic local comparison when the AI model is unavailable.
    insights = await generateBenchmarkInsights(companyIds, session.user.id, sessionId);
  } catch (error) {
    insights = `Benchmark could not be completed: ${String(error).slice(0, 400)}`;
  }

  return NextResponse.json({
    metrics: latestMetrics,
    companies: companiesData,
    risks: risksData,
    insights,
  });
}
