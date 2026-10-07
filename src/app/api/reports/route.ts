import { after, NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { analysisReports, companies, documents, researchSessions } from "@/db/schema";
import { and, eq, desc, inArray, or } from "drizzle-orm";
import { generateAnalysisReport } from "@/lib/agents/reportAgent";
import { sanitizeStoredReport } from "@/lib/agents/reportUtils";

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const reports = await db
    .select()
    .from(analysisReports)
    .where(eq(analysisReports.userId, session.user.id))
    .orderBy(desc(analysisReports.createdAt));

  return NextResponse.json({ reports: reports.map(sanitizeStoredReport) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }
  const sessionId = typeof body.sessionId === "string" && body.sessionId ? body.sessionId : null;
  const companyIds = Array.isArray(body.companyIds)
    ? [...new Set(body.companyIds.filter((id): id is string => typeof id === "string" && Boolean(id)))]
    : [];
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 500) : "";
  const reportType = typeof body.reportType === "string" ? body.reportType.slice(0, 100) : "comprehensive";
  const additionalContext = typeof body.additionalContext === "string" ? body.additionalContext.slice(0, 4000) : undefined;
  if (companyIds.length === 0 || companyIds.length > 8) {
    return NextResponse.json({ error: "Select between 1 and 8 companies" }, { status: 400 });
  }
  if (sessionId) {
    const [ownedSession] = await db.select({ id: researchSessions.id })
      .from(researchSessions)
      .where(and(eq(researchSessions.id, sessionId), eq(researchSessions.userId, session.user.id)))
      .limit(1);
    if (!ownedSession) return NextResponse.json({ error: "Research session not found" }, { status: 404 });
  }

  const selectedCompanies = await db.select().from(companies).where(inArray(companies.id, companyIds));
  const documentConditions = [
    inArray(documents.companyId, companyIds),
    or(eq(documents.userId, session.user.id), eq(documents.isSeeded, true)),
  ];
  if (sessionId) documentConditions.push(eq(documents.sessionId, sessionId));
  const selectedDocuments = await db.select({ id: documents.id, companyId: documents.companyId })
    .from(documents)
    .where(and(...documentConditions));
  const companiesWithDocuments = new Set(selectedDocuments.map((document) => document.companyId).filter(Boolean));
  if (selectedCompanies.length !== companyIds.length || companyIds.some((id) => !companiesWithDocuments.has(id))) {
    return NextResponse.json({ error: "Each selected company must have a document you can access." }, { status: 400 });
  }

  const reportTitle = title || `Financial Analysis Report — ${selectedCompanies.map((company) => company.ticker || company.name).join(", ")}`;
  const [report] = await db.insert(analysisReports).values({
    sessionId,
    userId: session.user.id,
    title: reportTitle,
    reportType,
    companies: selectedCompanies.map((company) => company.name),
    status: "generating",
  }).returning();

  after(async () => {
    try {
      await generateAnalysisReport(report.id, sessionId || report.id, session.user.id, companyIds, additionalContext, sessionId);
    } catch (error) {
      console.error("Report generation failed:", error);
    }
  });
  return NextResponse.json({ report }, { status: 201 });
}
