import { TaskType } from "@google/generative-ai";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { agentLogs, documentChunks, documents } from "@/db/schema";
import { getGeminiClient } from "./gemini";

export const DEFAULT_GEMINI_EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";
const EMBEDDING_BATCH_SIZE = 32;

export function isEmbeddingConfigured(): boolean {
  const apiKey = process.env.GEMINI_API_KEY;
  return Boolean(apiKey && !apiKey.startsWith("AIzaSyDemo"));
}

export async function createTextEmbedding(
  text: string,
  taskType: TaskType.RETRIEVAL_QUERY | TaskType.RETRIEVAL_DOCUMENT = TaskType.RETRIEVAL_QUERY,
): Promise<number[]> {
  const model = getGeminiClient().getGenerativeModel({ model: DEFAULT_GEMINI_EMBEDDING_MODEL });
  const response = await model.embedContent({
    content: { role: "user", parts: [{ text: text.slice(0, 8000) }] },
    taskType,
  });
  const vector = response.embedding.values;
  if (!Array.isArray(vector) || vector.length === 0 || vector.some((value) => !Number.isFinite(value))) {
    throw new Error("Embedding provider returned an invalid vector");
  }
  return vector;
}

/**
 * Build/rebuild the semantic-search index for an already indexed document.
 * Embeddings are stored in JSONB to work with standard PostgreSQL installations
 * without requiring a pgvector extension. Search is performed in application memory,
 * which is suitable for small/medium demo collections; large deployments should use pgvector.
 */
export async function indexDocumentEmbeddings(documentId: string): Promise<{ indexed: number; status: string }> {
  const startedAt = Date.now();
  const [document] = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
  if (!document) throw new Error("Document not found");

  if (!isEmbeddingConfigured()) {
    await db.update(documents).set({ embeddingStatus: "unavailable", updatedAt: new Date() }).where(eq(documents.id, documentId));
    await db.insert(agentLogs).values({
      documentId,
      agentName: "Embedding Agent",
      action: "Embedding skipped",
      status: "skipped",
      details: "GEMINI_API_KEY is not configured; lexical search remains available.",
      duration: Date.now() - startedAt,
    });
    return { indexed: 0, status: "unavailable" };
  }

  await db.update(documents).set({ embeddingStatus: "processing", updatedAt: new Date() }).where(eq(documents.id, documentId));
  await db.insert(agentLogs).values({
    documentId,
    agentName: "Embedding Agent",
    action: "Starting semantic indexing",
    status: "running",
    details: `Embedding chunks with ${DEFAULT_GEMINI_EMBEDDING_MODEL}...`,
  });

  try {
    const chunks = await db
      .select({ id: documentChunks.id, content: documentChunks.content, embedding: documentChunks.embedding, embeddingModel: documentChunks.embeddingModel })
      .from(documentChunks)
      .where(eq(documentChunks.documentId, documentId));
    const pending = chunks.filter((chunk) => !chunk.embedding || chunk.embeddingModel !== DEFAULT_GEMINI_EMBEDDING_MODEL);

    if (pending.length === 0) {
      await db.update(documents).set({ embeddingStatus: "completed", updatedAt: new Date() }).where(eq(documents.id, documentId));
      await db.insert(agentLogs).values({
        documentId,
        agentName: "Embedding Agent",
        action: "Semantic indexing already current",
        status: "completed",
        details: `All ${chunks.length} chunks already have embeddings for ${DEFAULT_GEMINI_EMBEDDING_MODEL}.`,
        duration: Date.now() - startedAt,
      });
      return { indexed: chunks.length, status: "completed" };
    }

    const model = getGeminiClient().getGenerativeModel({ model: DEFAULT_GEMINI_EMBEDDING_MODEL });
    let indexed = chunks.length - pending.length;
    for (let offset = 0; offset < pending.length; offset += EMBEDDING_BATCH_SIZE) {
      const batch = pending.slice(offset, offset + EMBEDDING_BATCH_SIZE);
      const response = await model.batchEmbedContents({
        requests: batch.map((chunk) => ({
          content: { role: "user", parts: [{ text: chunk.content.slice(0, 8000) }] },
          taskType: TaskType.RETRIEVAL_DOCUMENT,
        })),
      });
      if (response.embeddings.length !== batch.length) {
        throw new Error(`Embedding response count mismatch: expected ${batch.length}, got ${response.embeddings.length}`);
      }

      for (let index = 0; index < batch.length; index += 1) {
        const vector = response.embeddings[index].values;
        if (!Array.isArray(vector) || vector.length === 0 || vector.some((value) => !Number.isFinite(value))) {
          throw new Error(`Invalid embedding returned for chunk ${batch[index].id}`);
        }
        await db.update(documentChunks)
          .set({ embedding: vector, embeddingModel: DEFAULT_GEMINI_EMBEDDING_MODEL })
          .where(eq(documentChunks.id, batch[index].id));
        indexed += 1;
      }
    }

    await db.update(documents).set({ embeddingStatus: "completed", updatedAt: new Date() }).where(eq(documents.id, documentId));
    await db.insert(agentLogs).values({
      documentId,
      agentName: "Embedding Agent",
      action: "Semantic indexing complete",
      status: "completed",
      details: `Stored embeddings for ${indexed} chunks using ${DEFAULT_GEMINI_EMBEDDING_MODEL}.`,
      duration: Date.now() - startedAt,
    });
    return { indexed, status: "completed" };
  } catch (error) {
    await db.update(documents).set({ embeddingStatus: "failed", updatedAt: new Date() }).where(eq(documents.id, documentId));
    await db.insert(agentLogs).values({
      documentId,
      agentName: "Embedding Agent",
      action: "Semantic indexing failed",
      status: "failed",
      details: String(error).slice(0, 1000),
      duration: Date.now() - startedAt,
    });
    throw error;
  }
}

export async function tryCreateQueryEmbedding(query: string): Promise<number[] | null> {
  if (!isEmbeddingConfigured()) return null;
  try {
    return await createTextEmbedding(query, TaskType.RETRIEVAL_QUERY);
  } catch (error) {
    console.warn("Query embedding failed; using lexical retrieval for this request:", error);
    return null;
  }
}
