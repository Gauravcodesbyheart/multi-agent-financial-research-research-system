import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { financialMetrics, companies } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const companyIds = searchParams.get("companyIds")?.split(",").filter(Boolean) || [];
  const documentId = searchParams.get("documentId");

  let metrics;
  if (documentId) {
    metrics = await db
      .select({ metrics: financialMetrics, company: companies })
      .from(financialMetrics)
      .leftJoin(companies, eq(financialMetrics.companyId, companies.id))
      .where(eq(financialMetrics.documentId, documentId));
  } else if (companyIds.length > 0) {
    metrics = await db
      .select({ metrics: financialMetrics, company: companies })
      .from(financialMetrics)
      .leftJoin(companies, eq(financialMetrics.companyId, companies.id))
      .where(inArray(financialMetrics.companyId, companyIds));
  } else {
    metrics = await db
      .select({ metrics: financialMetrics, company: companies })
      .from(financialMetrics)
      .leftJoin(companies, eq(financialMetrics.companyId, companies.id));
  }

  return NextResponse.json({ metrics });
}
