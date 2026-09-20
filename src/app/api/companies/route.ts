import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { companies, financialMetrics, riskFlags, documents } from "@/db/schema";
import { eq, count, or } from "drizzle-orm";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userDocuments = await db
    .select({ companyId: documents.companyId })
    .from(documents)
    .where(eq(documents.userId, session.user.id));
  const userCompanyIds = userDocuments
    .map((document) => document.companyId)
    .filter((companyId): companyId is string => Boolean(companyId));

  const allCompanies = await db
    .select()
    .from(companies)
    .where(userCompanyIds.length > 0
      ? or(eq(companies.isSeeded, true), ...userCompanyIds.map((id) => eq(companies.id, id)))
      : eq(companies.isSeeded, true))
    .orderBy(companies.name);

  const companiesWithData = await Promise.all(
    allCompanies.map(async (company) => {
      const [metrics] = await db
        .select()
        .from(financialMetrics)
        .where(eq(financialMetrics.companyId, company.id))
        .limit(1);

      const [{ riskCount }] = await db
        .select({ riskCount: count() })
        .from(riskFlags)
        .where(eq(riskFlags.companyId, company.id));

      const [{ docCount }] = await db
        .select({ docCount: count() })
        .from(documents)
        .where(eq(documents.companyId, company.id));

      return {
        ...company,
        metrics: metrics || null,
        riskCount: Number(riskCount),
        documentCount: Number(docCount),
      };
    })
  );

  return NextResponse.json({ companies: companiesWithData });
}
