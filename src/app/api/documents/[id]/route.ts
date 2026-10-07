import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { documents, financialMetrics, riskFlags, documentChunks, agentLogs } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { isUuid } from "@/lib/validation";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Invalid document id" }, { status: 400 });
  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, session.user.id)))
    .limit(1);

  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const metrics = await db.select().from(financialMetrics).where(eq(financialMetrics.documentId, id));
  const risks = await db.select().from(riskFlags).where(eq(riskFlags.documentId, id));
  const chunks = await db
    .select({
      chunkIndex: documentChunks.chunkIndex,
      section: documentChunks.section,
      pageNumber: documentChunks.pageNumber,
      embeddingModel: documentChunks.embeddingModel,
    })
    .from(documentChunks)
    .where(eq(documentChunks.documentId, id));
  const embeddingCount = chunks.filter((chunk) => Boolean(chunk.embeddingModel)).length;
  const activity = await db.select({
    agentName: agentLogs.agentName,
    action: agentLogs.action,
    status: agentLogs.status,
    details: agentLogs.details,
    createdAt: agentLogs.createdAt,
    duration: agentLogs.duration,
  })
    .from(agentLogs)
    .where(eq(agentLogs.documentId, id))
    .orderBy(desc(agentLogs.createdAt))
    .limit(60);

  return NextResponse.json({ document: doc, metrics, risks, chunks, embeddingCount, activity });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Invalid document id" }, { status: 400 });
  // Scope by owner, then report honestly: a silent 200 for a no-op delete makes
  // it impossible for a client to tell whether the document was actually removed.
  const deleted = await db.delete(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, session.user.id)))
    .returning({ id: documents.id });

  if (deleted.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true, deleted: deleted.length });
}
