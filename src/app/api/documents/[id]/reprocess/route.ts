import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { after } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { documents, agentLogs, documentProcessingJobs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { isUuid } from "@/lib/validation";
import { processDocumentJob } from "@/lib/agents/orchestrator";

/**
 * Re-run the processing pipeline for an existing document.
 *
 * Without this, a document processed by an earlier version of the app keeps its old
 * results forever: metrics and risk flags stay empty (or carry a stale failure such
 * as a provider error from a previous AI stack), and the only workaround was to
 * delete the document and upload it again. Re-running is safe because every stage
 * overwrites its own output rather than appending to it — the Document Agent clears
 * chunks, the Red Flag Agent clears findings, and the Extraction Agent updates the
 * existing metrics row in place.
 *
 * The stored `content` is reused, so the original file does not need to be re-uploaded.
 * The work goes through the durable job queue (exactly like an upload) so the scheduled
 * worker can recover it if this invocation is interrupted.
 */
export const maxDuration = 300;

/** A job locked more recently than this is assumed to be running right now. */
const STALE_JOB_LOCK_MS = 5 * 60 * 1000;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Invalid document id" }, { status: 400 });

  const [doc] = await db
    .select({ id: documents.id, content: documents.content, processingStatus: documents.processingStatus })
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, session.user.id)))
    .limit(1);

  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!doc.content || doc.content.trim().length === 0) {
    return NextResponse.json(
      { error: "This document has no stored text to re-process. Upload the file again." },
      { status: 409 },
    );
  }

  // Refuse to start a second run while one is already queued or running. The job row
  // is authoritative here: the document's own status moves to "indexed" as soon as
  // chunking finishes, long before extraction and risk checks are done.
  const [job] = await db
    .select({ id: documentProcessingJobs.id, status: documentProcessingJobs.status, lockedAt: documentProcessingJobs.lockedAt })
    .from(documentProcessingJobs)
    .where(eq(documentProcessingJobs.documentId, id))
    .limit(1);

  const inflight = job
    ? job.status === "queued" ||
      (job.status === "processing" && job.lockedAt !== null && Date.now() - job.lockedAt.getTime() < STALE_JOB_LOCK_MS)
    : false;
  if (inflight) {
    return NextResponse.json({ error: "This document is already being processed." }, { status: 409 });
  }

  await db.update(documents)
    .set({ processingStatus: "processing", updatedAt: new Date() })
    .where(eq(documents.id, id));
  await db.insert(agentLogs).values({
    documentId: id,
    agentName: "Pipeline Orchestrator",
    action: "Document pipeline restarted",
    status: "running",
    details: "Re-running indexing, extraction, red-flag and optional embedding stages on the stored document text.",
    duration: 0,
  });

  const [jobRow] = await db.insert(documentProcessingJobs)
    .values({ documentId: id, status: "queued", attempts: 0, nextAttemptAt: new Date(), lastError: null })
    .onConflictDoUpdate({
      target: documentProcessingJobs.documentId,
      set: { status: "queued", attempts: 0, nextAttemptAt: new Date(), lastError: null, lockedAt: null, updatedAt: new Date() },
    })
    .returning({ id: documentProcessingJobs.id });
  const jobId = jobRow.id;

  after(async () => {
    try {
      await processDocumentJob(jobId);
    } catch (error) {
      console.error(`Re-processing document ${id} failed:`, error);
    }
  });

  return NextResponse.json(
    { success: true, message: "Re-processing started. Metrics and risk findings will be refreshed." },
    { status: 202 },
  );
}
