import { NextResponse } from "next/server";
import { and, count, desc, eq, inArray, or, sql } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { companies, documents, financialMetrics, riskFlags } from "@/db/schema";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const visibleDocuments = await db.select({ companyId: documents.companyId })
    .from(documents)
    .where(or(eq(documents.userId, session.user.id), eq(documents.isSeeded, true)));
  const visibleCompanyIds = [...new Set(visibleDocuments.map((document) => document.companyId).filter(Boolean))] as string[];
  const visibleCompanies = await db.select().from(companies)
    .where(visibleCompanyIds.length > 0
      ? or(eq(companies.isSeeded, true), inArray(companies.id, visibleCompanyIds))
      : eq(companies.isSeeded, true))
    .orderBy(companies.name);

  const companiesWithData = await Promise.all(visibleCompanies.map(async (company) => {
    const [metricRow] = await db.select({ metrics: financialMetrics })
      .from(financialMetrics)
      .innerJoin(documents, eq(financialMetrics.documentId, documents.id))
      .where(and(
        eq(financialMetrics.companyId, company.id),
        or(eq(documents.userId, session.user.id), eq(documents.isSeeded, true)),
      ))
      .orderBy(sql`${financialMetrics.fiscalYear} DESC NULLS LAST`, desc(financialMetrics.extractedAt))
      .limit(1);
    const [{ value: riskCount }] = await db.select({ value: count() })
      .from(riskFlags)
      .innerJoin(documents, eq(riskFlags.documentId, documents.id))
      .where(and(
        eq(riskFlags.companyId, company.id),
        or(eq(documents.userId, session.user.id), eq(documents.isSeeded, true)),
      ));
    const [{ value: docCount }] = await db.select({ value: count() })
      .from(documents)
      .where(and(
        eq(documents.companyId, company.id),
        or(eq(documents.userId, session.user.id), eq(documents.isSeeded, true)),
      ));
    return {
      ...company,
      metrics: metricRow?.metrics || null,
      riskCount: Number(riskCount),
      documentCount: Number(docCount),
    };
  }));

  return NextResponse.json({ companies: companiesWithData });
}
