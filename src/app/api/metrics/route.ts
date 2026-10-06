import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray, or } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { companies, documents, financialMetrics } from "@/db/schema";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const companyIds = searchParams.get("companyIds")?.split(",").filter(Boolean) || [];
  const documentId = searchParams.get("documentId");
  const visibility = or(eq(documents.userId, session.user.id), eq(documents.isSeeded, true));

  const base = db.select({ metrics: financialMetrics, company: companies })
    .from(financialMetrics)
    .innerJoin(documents, eq(financialMetrics.documentId, documents.id))
    .leftJoin(companies, eq(financialMetrics.companyId, companies.id));
  const metrics = documentId
    ? await base.where(and(eq(financialMetrics.documentId, documentId), visibility))
    : companyIds.length > 0
      ? await base.where(and(inArray(financialMetrics.companyId, companyIds), visibility))
      : await base.where(visibility);

  return NextResponse.json({ metrics });
}
