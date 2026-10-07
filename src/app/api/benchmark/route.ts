import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray, or } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { companies, documents, researchSessions } from "@/db/schema";
import { generateBenchmarkInsights } from "@/lib/agents/benchmarkAgent";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { companyIds?: unknown; sessionId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }
  const companyIds = Array.isArray(body.companyIds)
    ? [...new Set(body.companyIds.filter((id): id is string => typeof id === "string" && Boolean(id)))]
    : [];
  const sessionId = typeof body.sessionId === "string" && body.sessionId ? body.sessionId : undefined;
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

  const visibleDocuments = [
    inArray(documents.companyId, companyIds),
    or(eq(documents.userId, session.user.id), eq(documents.isSeeded, true)),
  ];
  if (sessionId) visibleDocuments.push(eq(documents.sessionId, sessionId));

  const [companiesData, accessibleDocuments] = await Promise.all([
    db.select().from(companies).where(inArray(companies.id, companyIds)),
    db.select({ companyId: documents.companyId })
      .from(documents)
      .where(and(...visibleDocuments)),
  ]);
  const accessibleCompanyIds = new Set(accessibleDocuments.map((document) => document.companyId).filter(Boolean));
  if (companiesData.length !== companyIds.length || companyIds.some((id) => !accessibleCompanyIds.has(id))) {
    return NextResponse.json({ error: "Each selected company must have a document you can access in this scope." }, { status: 400 });
  }

  try {
    const benchmark = await generateBenchmarkInsights(companyIds, session.user.id, sessionId);
    return NextResponse.json({
      // Includes all eligible metric rows, newest fiscal period first, not only one row per company.
      metrics: benchmark.rows,
      companies: companiesData,
      insights: benchmark.insights,
    });
  } catch (error) {
    console.error("Benchmark failed:", error);
    return NextResponse.json({ error: "Benchmark failed. Please try again." }, { status: 500 });
  }
}
