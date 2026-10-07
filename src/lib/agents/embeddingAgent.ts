import { TaskType } from "@google/generative-ai";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { agentLogs, documentChunks, documents } from "@/db/schema";
import { getGeminiClient } from "./gemini";
import {
  missingEmbeddingConfigurationMessage,
  parseGroqEmbeddingVectors,
  resolveEmbeddingConfiguration,
  type EmbeddingConfiguration,
} from "./embeddingUtils";

const GROQ_EMBEDDINGS_API_URL = "https://api.groq.com/openai/v1/embeddings";
const EMBEDDING_BATCH_SIZE = 32;
const MAX_EMBEDDING_INPUT_CHARACTERS = 8000;

export function isEmbeddingConfigured(): boolean {
  try {
    return resolveEmbeddingConfiguration() !== null;
  } catch {
    return false;
  }
}

/** The identifier stored beside vectors, including provider to avoid cross-model comparisons. */
export function getConfiguredEmbeddingModelIdentifier(): string | null {
  try {
    return resolveEmbeddingConfiguration()?.modelIdentifier ?? null;
  } catch {
    return null;
  }
}

async function requestGroqEmbeddings(texts: string[], config: EmbeddingConfiguration): Promise<number[][]> {
  const response = await fetch(GROQ_EMBEDDINGS_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      input: texts,
      encoding_format: "float",
    }),
  });

  const raw = await response.text();
  let payload: unknown = null;
  if (raw) {
    try {
      payload = JSON.parse(raw) as unknown;
    } catch {
      if (response.ok) throw new Error("Groq embeddings API returned a non-JSON response.");
    }
  }

  if (!response.ok) {
    const bodyError = payload && typeof payload === "object"
      ? (payload as { error?: unknown }).error
      : null;
    const details = typeof bodyError === "string"
      ? bodyError
      : bodyError && typeof bodyError === "object" && typeof (bodyError as { message?: unknown }).message === "string"
        ? (bodyError as { message: string }).message
        : raw.slice(0, 500) || response.statusText;
    throw new Error(`Groq embeddings API error (${response.status}): ${details}`);
  }

  return parseGroqEmbeddingVectors(payload, texts.length);
}

function validateGeminiVector(values: unknown): number[] {
  if (!Array.isArray(values) || values.length === 0 ||
    values.some((value) => typeof value !== "number" || !Number.isFinite(value))) {
    throw new Error("Gemini embeddings API returned an invalid vector.");
  }
  return values as number[];
}

async function createEmbeddingBatch(
  texts: string[],
  taskType: TaskType.RETRIEVAL_QUERY | TaskType.RETRIEVAL_DOCUMENT,
  config: EmbeddingConfiguration,
): Promise<number[][]> {
  const boundedTexts = texts.map((text) => text.slice(0, MAX_EMBEDDING_INPUT_CHARACTERS));
  if (config.provider === "groq") return requestGroqEmbeddings(boundedTexts, config);

  const model = getGeminiClient().getGenerativeModel({ model: config.model });
  const response = await model.batchEmbedContents({
    requests: boundedTexts.map((text) => ({
      content: { role: "user", parts: [{ text }] },
      taskType,
    })),
  });
  if (response.embeddings.length !== boundedTexts.length) {
    throw new Error(`Gemini embeddings API returned ${response.embeddings.length} vectors; expected ${boundedTexts.length}.`);
  }
  return response.embeddings.map((embedding) => validateGeminiVector(embedding.values));
}

export async function createTextEmbedding(
  text: string,
  taskType: TaskType.RETRIEVAL_QUERY | TaskType.RETRIEVAL_DOCUMENT = TaskType.RETRIEVAL_QUERY,
): Promise<number[]> {
  const config = resolveEmbeddingConfiguration();
  if (!config) {
    throw new Error(missingEmbeddingConfigurationMessage());
  }
  const [vector] = await createEmbeddingBatch([text], taskType, config);
  return vector;
}

/**
 * Build/rebuild the semantic-search index for an already indexed document.
 * Set EMBEDDING_PROVIDER=groq to use Groq's Nomic embedding model, or leave it
 * as auto to prefer Groq when GROQ_API_KEY is configured. Keyword retrieval
 * remains available if no embedding provider is configured.
 */
export async function indexDocumentEmbeddings(documentId: string): Promise<{ indexed: number; status: string }> {
  const startedAt = Date.now();
  const [document] = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
  if (!document) throw new Error("Document not found");

  const config = resolveEmbeddingConfiguration();
  if (!config) {
    const details = missingEmbeddingConfigurationMessage();
    await db.update(documents).set({ embeddingStatus: "unavailable", updatedAt: new Date() }).where(eq(documents.id, documentId));
    await db.insert(agentLogs).values({
      documentId,
      agentName: "Embedding Agent",
      action: "Embedding skipped",
      status: "skipped",
      details,
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
    details: `Embedding chunks with ${config.model} via ${config.provider}...`,
  });

  try {
    const chunks = await db
      .select({ id: documentChunks.id, content: documentChunks.content, embedding: documentChunks.embedding, embeddingModel: documentChunks.embeddingModel })
      .from(documentChunks)
      .where(eq(documentChunks.documentId, documentId));
    const pending = chunks.filter((chunk) => !chunk.embedding || chunk.embeddingModel !== config.modelIdentifier);

    if (pending.length === 0) {
      await db.update(documents).set({ embeddingStatus: "completed", updatedAt: new Date() }).where(eq(documents.id, documentId));
      await db.insert(agentLogs).values({
        documentId,
        agentName: "Embedding Agent",
        action: "Semantic indexing already current",
        status: "completed",
        details: `All ${chunks.length} chunks already have embeddings for ${config.modelIdentifier}.`,
        duration: Date.now() - startedAt,
      });
      return { indexed: chunks.length, status: "completed" };
    }

    let indexed = chunks.length - pending.length;
    for (let offset = 0; offset < pending.length; offset += EMBEDDING_BATCH_SIZE) {
      const batch = pending.slice(offset, offset + EMBEDDING_BATCH_SIZE);
      const vectors = await createEmbeddingBatch(
        batch.map((chunk) => chunk.content),
        TaskType.RETRIEVAL_DOCUMENT,
        config,
      );
      if (vectors.length !== batch.length) {
        throw new Error(`Embedding response count mismatch: expected ${batch.length}, got ${vectors.length}`);
      }

      for (let index = 0; index < batch.length; index += 1) {
        await db.update(documentChunks)
          .set({ embedding: vectors[index], embeddingModel: config.modelIdentifier })
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
      details: `Stored embeddings for ${indexed} chunks using ${config.modelIdentifier}.`,
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
  try {
    const config = resolveEmbeddingConfiguration();
    if (!config) return null;
    return await createTextEmbeddingWithConfig(query, TaskType.RETRIEVAL_QUERY, config);
  } catch (error) {
    console.warn("Query embedding failed; using lexical retrieval for this request:", error);
    return null;
  }
}

async function createTextEmbeddingWithConfig(
  text: string,
  taskType: TaskType.RETRIEVAL_QUERY | TaskType.RETRIEVAL_DOCUMENT,
  config: EmbeddingConfiguration,
): Promise<number[]> {
  if (config.provider === "groq") {
    const [vector] = await createEmbeddingBatch([text], taskType, config);
    return vector;
  }

  const model = getGeminiClient().getGenerativeModel({ model: config.model });
  const response = await model.embedContent({
    content: { role: "user", parts: [{ text: text.slice(0, MAX_EMBEDDING_INPUT_CHARACTERS) }] },
    taskType,
  });
  return validateGeminiVector(response.embedding.values);
}
