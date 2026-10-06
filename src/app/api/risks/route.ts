import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray, or } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { companies, documents, riskFlags } from "@/db/schema";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const companyIds = searchParams.get("companyIds")?.split(",").filter(Boolean) || [];
  const documentId = searchParams.get("documentId");
  const severity = searchParams.get("severity");
  const visibility = or(eq(documents.userId, session.user.id), eq(documents.isSeeded, true));
  const conditions = [visibility];
  if (documentId) conditions.push(eq(riskFlags.documentId, documentId));
  if (companyIds.length) conditions.push(inArray(riskFlags.companyId, companyIds));
  if (severity) conditions.push(eq(riskFlags.severity, severity));

  const risks = await db.select({ risk: riskFlags, company: companies })
    .from(riskFlags)
    .innerJoin(documents, eq(riskFlags.documentId, documents.id))
    .leftJoin(companies, eq(riskFlags.companyId, companies.id))
    .where(and(...conditions));
  return NextResponse.json({ risks });
}
