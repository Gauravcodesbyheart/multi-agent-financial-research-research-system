import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { riskFlags, companies } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const companyIds = searchParams.get("companyIds")?.split(",").filter(Boolean) || [];
  const documentId = searchParams.get("documentId");
  const severity = searchParams.get("severity");

  let query;
  if (documentId) {
    query = db
      .select({ risk: riskFlags, company: companies })
      .from(riskFlags)
      .leftJoin(companies, eq(riskFlags.companyId, companies.id))
      .where(eq(riskFlags.documentId, documentId));
  } else if (companyIds.length > 0) {
    query = db
      .select({ risk: riskFlags, company: companies })
      .from(riskFlags)
      .leftJoin(companies, eq(riskFlags.companyId, companies.id))
      .where(inArray(riskFlags.companyId, companyIds));
  } else {
    query = db
      .select({ risk: riskFlags, company: companies })
      .from(riskFlags)
      .leftJoin(companies, eq(riskFlags.companyId, companies.id));
  }

  const risks = await query;
  return NextResponse.json({ risks });
}
