import { eq } from "drizzle-orm";
import { db } from "@/db";
import { agentLogs, documentChunks, documents } from "@/db/schema";
import { isEmbeddingConfigured, getEmbeddingConfig, requestEmbeddings } from "./llmClient";

const EMBEDDING_BATCH_SIZE = 32;

/**
 * Embeddings are optional and provider-agnostic.
 *
 * Groq does not serve an embeddings endpoint, so semantic search requires a
 * separate provider (OpenAI, Voyage, Jina, Ollama, …) configured through
 * EMBEDDING_BASE_URL / EMBEDDING_API_KEY / EMBEDDING_MODEL. When it is absent the
 * pipeline still indexes documents and the Research Agent falls back to keyword
 * retrieval, which needs no external service at all.
 */
export function getEmbeddingModelId(): string | null {
  return getEmbeddingConfig()?.model ?? null;
}

export async function createTextEmbedding(text: string): Promise<number[]> {
  const config = getEmbeddingConfig();
  if (!config) throw new Error("EMBEDDING_BASE_URL/EMBEDDING_API_KEY/EMBEDDING_MODEL are not configured.");
  const [vector] = await requestEmbeddings([text.slice(0, 8000)], config.apiKey, config.baseUrl, config.model);
  return vector;
}

/**
 * Build/rebuild the semantic-search index for an already indexed document.
 * Vectors are stored in JSONB so standard PostgreSQL works without pgvector;
 * search is performed in application memory, which suits small/medium collections.
 */
export async function indexDocumentEmbeddings(documentId: string): Promise<{ indexed: number; status: string }> {
  const startedAt = Date.now();
  const [document] = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
  if (!document) throw new Error("Document not found");

  const config = getEmbeddingConfig();
  if (!config) {
    await db.update(documents).set({ embeddingStatus: "unavailable", updatedAt: new Date() }).where(eq(documents.id, documentId));
    await db.insert(agentLogs).values({
      documentId,
      agentName: "Embedding Agent",
      action: "Embedding skipped",
      status: "skipped",
      details: "No embedding provider configured (Groq does not offer an embeddings API). Keyword retrieval remains fully available.",
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
    details: `Embedding chunks with ${config.model}...`,
  });

  try {
    const chunks = await db
      .select({ id: documentChunks.id, content: documentChunks.content, embedding: documentChunks.embedding, embeddingModel: documentChunks.embeddingModel })
      .from(documentChunks)
      .where(eq(documentChunks.documentId, documentId));
    const pending = chunks.filter((chunk) => !chunk.embedding || chunk.embeddingModel !== config.model);

    if (pending.length === 0) {
      await db.update(documents).set({ embeddingStatus: "completed", updatedAt: new Date() }).where(eq(documents.id, documentId));
      await db.insert(agentLogs).values({
        documentId,
        agentName: "Embedding Agent",
        action: "Semantic indexing already current",
        status: "completed",
        details: `All ${chunks.length} chunks already have embeddings for ${config.model}.`,
        duration: Date.now() - startedAt,
      });
      return { indexed: chunks.length, status: "completed" };
    }

    let indexed = chunks.length - pending.length;
    for (let offset = 0; offset < pending.length; offset += EMBEDDING_BATCH_SIZE) {
      const batch = pending.slice(offset, offset + EMBEDDING_BATCH_SIZE);
      const vectors = await requestEmbeddings(
        batch.map((chunk) => chunk.content.slice(0, 8000)),
        config.apiKey,
        config.baseUrl,
        config.model,
      );

      for (let index = 0; index < batch.length; index += 1) {
        await db.update(documentChunks)
          .set({ embedding: vectors[index], embeddingModel: config.model })
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
      details: `Stored embeddings for ${indexed} chunks using ${config.model}.`,
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

/** Returns null when no embedding provider is configured or the call fails. */
export async function tryCreateQueryEmbedding(query: string): Promise<number[] | null> {
  if (!isEmbeddingConfigured()) return null;
  try {
    return await createTextEmbedding(query);
  } catch (error) {
    console.warn("Query embedding failed; using lexical retrieval for this request:", error);
    return null;
  }
}
