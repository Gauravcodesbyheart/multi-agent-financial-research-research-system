import { and, asc, eq, gte, lt, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { agentLogs, documentProcessingJobs, documents } from "@/db/schema";
import { processDocument } from "./documentAgent";
import { extractFinancialMetrics } from "./extractionAgent";
import { scanForRisks } from "./riskAgent";
import { indexDocumentEmbeddings } from "./embeddingAgent";

export interface PipelineResult {
  status: "completed" | "partial" | "failed";
  failures: string[];
}

export interface DocumentJobResult {
  jobId: string;
  claimed: boolean;
  status: "completed" | "retrying" | "failed" | "partial" | "skipped";
  attempts?: number;
  error?: string;
}

const MAX_JOB_BATCH_SIZE = 5;
const STALE_JOB_LOCK_MS = 15 * 60 * 1000;

/** Run processing stages in order. Extraction/risk errors do not prevent later stages. */
export async function runDocumentPipeline(
  documentId: string,
  content: string,
  companyId?: string,
): Promise<PipelineResult> {
  const startedAt = Date.now();
  const failures: string[] = [];

  try {
    await processDocument(documentId, content);
  } catch (error) {
    const detail = `Document indexing failed: ${String(error).slice(0, 1000)}`;
    await db.update(documents)
      .set({ processingStatus: "failed", updatedAt: new Date() })
      .where(eq(documents.id, documentId));
    await db.insert(agentLogs).values({
      documentId,
      agentName: "Pipeline Orchestrator",
      action: "Document pipeline stopped",
      status: "failed",
      details: detail,
      duration: Date.now() - startedAt,
    });
    return { status: "failed", failures: [detail] };
  }

  try {
    await extractFinancialMetrics(documentId, content, companyId);
  } catch (error) {
    failures.push(`Extraction Agent: ${String(error).slice(0, 400)}`);
  }

  try {
    await scanForRisks(documentId, content, companyId);
  } catch (error) {
    failures.push(`Red Flag Agent: ${String(error).slice(0, 400)}`);
  }

  try {
    await indexDocumentEmbeddings(documentId);
  } catch (error) {
    // Embeddings are optional; keyword retrieval remains available when this fails.
    console.warn("Embedding indexing failed; lexical retrieval will remain enabled:", error);
  }

  const status = failures.length > 0 ? "partial" : "completed";
  await db.update(documents)
    .set({ processingStatus: status, updatedAt: new Date() })
    .where(eq(documents.id, documentId));
  await db.insert(agentLogs).values({
    documentId,
    agentName: "Pipeline Orchestrator",
    action: `Document pipeline ${status}`,
    status: status === "completed" ? "completed" : "partial",
    details: failures.length ? failures.join("; ") : "Document, extraction, red-flag, and optional embedding stages finished.",
    duration: Date.now() - startedAt,
  });
  return { status, failures };
}

/**
 * Atomically claim and process a persisted job. If the serverless invocation is
 * interrupted, the stale lock expires and the scheduled worker can retry it.
 */
export async function processDocumentJob(jobId: string): Promise<DocumentJobResult> {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - STALE_JOB_LOCK_MS);
  const [job] = await db.update(documentProcessingJobs)
    .set({
      status: "processing",
      attempts: sql`${documentProcessingJobs.attempts} + 1`,
      lockedAt: now,
      lastError: null,
      updatedAt: now,
    })
    .where(and(
      eq(documentProcessingJobs.id, jobId),
      or(
        and(
          eq(documentProcessingJobs.status, "queued"),
          lte(documentProcessingJobs.nextAttemptAt, now),
          lt(documentProcessingJobs.attempts, documentProcessingJobs.maxAttempts),
        ),
        and(
          eq(documentProcessingJobs.status, "processing"),
          lt(documentProcessingJobs.lockedAt, staleBefore),
          lt(documentProcessingJobs.attempts, documentProcessingJobs.maxAttempts),
        ),
      ),
    ))
    .returning();

  if (!job) {
    const exhaustedError = "Processing job reached its attempt limit or no longer needs processing.";
    const [exhaustedJob] = await db.update(documentProcessingJobs)
      .set({ status: "failed", lockedAt: null, lastError: exhaustedError, updatedAt: now })
      .where(and(
        eq(documentProcessingJobs.id, jobId),
        or(
          and(eq(documentProcessingJobs.status, "queued"), lte(documentProcessingJobs.nextAttemptAt, now), gte(documentProcessingJobs.attempts, documentProcessingJobs.maxAttempts)),
          and(eq(documentProcessingJobs.status, "processing"), lt(documentProcessingJobs.lockedAt, staleBefore), gte(documentProcessingJobs.attempts, documentProcessingJobs.maxAttempts)),
        ),
      ))
      .returning();
    if (!exhaustedJob) return { jobId, claimed: false, status: "skipped" };

    await db.update(documents)
      .set({ processingStatus: "partial", updatedAt: now })
      .where(eq(documents.id, exhaustedJob.documentId));
    await db.insert(agentLogs).values({
      documentId: exhaustedJob.documentId,
      agentName: "Pipeline Orchestrator",
      action: "Document pipeline retry limit reached",
      status: "failed",
      details: exhaustedError,
    });
    return { jobId, claimed: true, status: "partial", attempts: exhaustedJob.attempts, error: exhaustedError };
  }

  const [document] = await db.select().from(documents)
    .where(eq(documents.id, job.documentId))
    .limit(1);
  if (!document || !document.content) {
    const error = "Document content is missing; the processing job cannot run.";
    await db.update(documentProcessingJobs)
      .set({ status: "failed", lockedAt: null, lastError: error, updatedAt: new Date() })
      .where(eq(documentProcessingJobs.id, job.id));
    if (document) await db.update(documents)
      .set({ processingStatus: "failed", updatedAt: new Date() })
      .where(eq(documents.id, document.id));
    return { jobId, claimed: true, status: "failed", attempts: job.attempts, error };
  }

  let result: PipelineResult;
  try {
    result = await runDocumentPipeline(document.id, document.content, document.companyId || undefined);
  } catch (error) {
    result = { status: "failed", failures: [String(error).slice(0, 1000)] };
  }

  if (result.status === "completed") {
    await db.update(documentProcessingJobs)
      .set({ status: "completed", lockedAt: null, lastError: null, updatedAt: new Date() })
      .where(eq(documentProcessingJobs.id, job.id));
    return { jobId, claimed: true, status: "completed", attempts: job.attempts };
  }

  const error = result.failures.join("; ").slice(0, 2000) || `Pipeline ended with ${result.status} status`;
  if (job.attempts < job.maxAttempts) {
    const backoffMs = Math.min(30_000 * (2 ** Math.max(0, job.attempts - 1)), 5 * 60_000);
    const nextAttemptAt = new Date(Date.now() + backoffMs);
    await db.update(documentProcessingJobs)
      .set({ status: "queued", lockedAt: null, nextAttemptAt, lastError: error, updatedAt: new Date() })
      .where(eq(documentProcessingJobs.id, job.id));
    await db.update(documents)
      .set({ processingStatus: "processing", updatedAt: new Date() })
      .where(eq(documents.id, document.id));
    await db.insert(agentLogs).values({
      documentId: document.id,
      agentName: "Pipeline Orchestrator",
      action: "Document pipeline retry scheduled",
      status: "partial",
      details: `Attempt ${job.attempts}/${job.maxAttempts} did not complete; retry scheduled for ${nextAttemptAt.toISOString()}. ${error}`,
    });
    return { jobId, claimed: true, status: "retrying", attempts: job.attempts, error };
  }

  await db.update(documentProcessingJobs)
    .set({ status: "failed", lockedAt: null, lastError: error, updatedAt: new Date() })
    .where(eq(documentProcessingJobs.id, job.id));
  await db.update(documents)
    .set({ processingStatus: result.status, updatedAt: new Date() })
    .where(eq(documents.id, document.id));
  return { jobId, claimed: true, status: result.status, attempts: job.attempts, error };
}

/** Drain a small, ordered batch of due or abandoned jobs. Each claim is race-safe. */
export async function processDueDocumentJobs(limit = 2): Promise<DocumentJobResult[]> {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - STALE_JOB_LOCK_MS);
  const batchSize = Math.min(MAX_JOB_BATCH_SIZE, Math.max(1, Math.floor(limit)));
  const dueJobs = await db.select({ id: documentProcessingJobs.id })
    .from(documentProcessingJobs)
    .where(or(
      and(eq(documentProcessingJobs.status, "queued"), lte(documentProcessingJobs.nextAttemptAt, now)),
      and(eq(documentProcessingJobs.status, "processing"), lt(documentProcessingJobs.lockedAt, staleBefore)),
    ))
    .orderBy(asc(documentProcessingJobs.nextAttemptAt), asc(documentProcessingJobs.createdAt))
    .limit(batchSize);

  const results: DocumentJobResult[] = [];
  for (const job of dueJobs) results.push(await processDocumentJob(job.id));
  return results;
}
