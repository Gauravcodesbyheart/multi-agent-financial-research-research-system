import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { documents, financialMetrics, riskFlags, documentChunks } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, session.user.id)))
    .limit(1);

  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const metrics = await db.select().from(financialMetrics).where(eq(financialMetrics.documentId, id));
  const risks = await db.select().from(riskFlags).where(eq(riskFlags.documentId, id));
  const chunks = await db
    .select({ chunkIndex: documentChunks.chunkIndex, section: documentChunks.section })
    .from(documentChunks)
    .where(eq(documentChunks.documentId, id));

  return NextResponse.json({ document: doc, metrics, risks, chunks });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await db.delete(documents).where(and(eq(documents.id, id), eq(documents.userId, session.user.id)));

  return NextResponse.json({ success: true });
}
