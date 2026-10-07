// Document Agent — parses, chunks, and indexes financial documents
import { db } from "@/db";
import { documents, documentChunks, agentLogs } from "@/db/schema";
import { asc, eq, inArray } from "drizzle-orm";
import { cosineSimilarity, keywordRelevance } from "./analysisUtils";
import { getEmbeddingModelId } from "./embeddingAgent";

export function chunkText(text: string, chunkSize = 1500, overlap = 200): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;
  }
  return chunks;
}

export function extractSections(text: string): Array<{ section: string; content: string }> {
  const sectionPatterns = [
    /^(BUSINESS OVERVIEW|OVERVIEW OF BUSINESS|COMPANY OVERVIEW)/im,
    /^(RISK FACTORS|RISK FACTOR SUMMARY)/im,
    /^(MANAGEMENT.{0,30}DISCUSSION)/im,
    /^(FINANCIAL STATEMENTS|CONSOLIDATED STATEMENTS)/im,
    /^(LIQUIDITY|LIQUIDITY AND CAPITAL)/im,
    /^(RESULTS OF OPERATIONS)/im,
    /^(NOTES TO FINANCIAL STATEMENTS)/im,
  ];

  const sections: Array<{ section: string; content: string }> = [];
  const lines = text.split("\n");
  let currentSection = "General";
  let currentContent: string[] = [];

  for (const line of lines) {
    let matched = false;
    for (const pattern of sectionPatterns) {
      if (pattern.test(line)) {
        if (currentContent.length > 0) {
          sections.push({ section: currentSection, content: currentContent.join("\n") });
        }
        currentSection = line.trim();
        currentContent = [];
        matched = true;
        break;
      }
    }
    if (!matched) {
      currentContent.push(line);
    }
  }

  if (currentContent.length > 0) {
    sections.push({ section: currentSection, content: currentContent.join("\n") });
  }

  return sections;
}

export async function processDocument(documentId: string, content: string): Promise<void> {
  const start = Date.now();
  try {
    await db.insert(agentLogs).values({
      documentId,
      agentName: "Document Agent",
      action: "Starting document processing",
      status: "running",
      details: `Processing document ${documentId}`,
    });

    // Clean text.
    // Only control characters that break Postgres storage, quoting, or chunking are
    // removed. Stripping the whole non-ASCII range destroyed currency symbols (€, £, ¥),
    // typographic quotes/dashes, and every non-English filing — which silently corrupted
    // the passages the Research Agent cites and broke exact-quote validation.
    const cleanedContent = content
      .replace(/\r\n?/g, "\n")
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
      .replace(/\u00A0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    // Create chunks
    const chunks = chunkText(cleanedContent, 1500, 200);
    const sections = extractSections(cleanedContent);

    // Save chunks to DB
    const chunkSize = 1500;
    const overlap = 200;
    const chunkValues = chunks.map((chunk, index) => {
      // Account for overlap when mapping a chunk back to its section.
      const charPosition = index * (chunkSize - overlap);
      let section = "General";
      let accumulated = 0;
      for (const sec of sections) {
        accumulated += sec.content.length;
        if (charPosition < accumulated) {
          section = sec.section;
          break;
        }
      }

      return {
        documentId,
        chunkIndex: index,
        content: chunk,
        section,
        // The parser currently returns document text without page boundaries. Do not fabricate page citations.
        pageNumber: null,
      };
    });

    // Reprocessing replaces all chunks and invalidates stale embeddings.
    await db.delete(documentChunks).where(eq(documentChunks.documentId, documentId));
    for (let i = 0; i < chunkValues.length; i += 50) {
      await db.insert(documentChunks).values(chunkValues.slice(i, i + 50));
    }
    await db.update(documents)
      .set({ embeddingStatus: "pending", updatedAt: new Date() })
      .where(eq(documents.id, documentId));

    // Update document status
    await db
      .update(documents)
      .set({
        processingStatus: "indexed",
        chunkCount: chunks.length,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));

    await db.insert(agentLogs).values({
      documentId,
      agentName: "Document Agent",
      action: "Document processing complete",
      status: "completed",
      details: `Created ${chunks.length} chunks from document`,
      duration: Date.now() - start,
    });
  } catch (error) {
    await db.insert(agentLogs).values({
      documentId,
      agentName: "Document Agent",
      action: "Document processing failed",
      status: "failed",
      details: String(error),
      duration: Date.now() - start,
    });

    await db
      .update(documents)
      .set({ processingStatus: "failed", updatedAt: new Date() })
      .where(eq(documents.id, documentId));
    throw error;
  }
}

export interface RetrievedChunk {
  documentId: string;
  documentName?: string;
  content: string;
  section: string;
  chunkIndex: number;
  pageNumber: number | null;
  score: number;
  retrievalMethod: "embedding" | "keyword";
}

export async function searchDocumentChunks(
  documentId: string,
  query: string,
  limit = 5,
  queryEmbedding?: number[] | null,
): Promise<RetrievedChunk[]> {
  const chunks = await db
    .select()
    .from(documentChunks)
    .where(eq(documentChunks.documentId, documentId))
    .orderBy(asc(documentChunks.chunkIndex));

  const hasCompleteEmbeddingIndex = chunks.length > 0 && Boolean(queryEmbedding?.length) && chunks.every((chunk) =>
    Array.isArray(chunk.embedding) &&
    chunk.embeddingModel === getEmbeddingModelId() &&
    chunk.embedding.length === queryEmbedding?.length
  );

  const scored = chunks.map((chunk) => {
    if (hasCompleteEmbeddingIndex && queryEmbedding && chunk.embedding) {
      return {
        chunk,
        score: cosineSimilarity(queryEmbedding, chunk.embedding),
        retrievalMethod: "embedding" as const,
      };
    }
    return {
      chunk,
      score: keywordRelevance(query, chunk.content),
      retrievalMethod: "keyword" as const,
    };
  });

  return scored
    .filter((entry) => entry.score > (entry.retrievalMethod === "embedding" ? 0.08 : 0))
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map(({ chunk, score, retrievalMethod }) => ({
      documentId: chunk.documentId,
      content: chunk.content,
      section: chunk.section || "General",
      chunkIndex: chunk.chunkIndex,
      pageNumber: chunk.pageNumber,
      score,
      retrievalMethod,
    }));
}

export async function searchDocumentCollection(
  documentIds: string[],
  query: string,
  limit = 8,
  queryEmbedding?: number[] | null,
): Promise<RetrievedChunk[]> {
  if (documentIds.length === 0) return [];
  const chunks = await db
    .select({
      documentId: documentChunks.documentId,
      documentName: documents.fileName,
      content: documentChunks.content,
      section: documentChunks.section,
      chunkIndex: documentChunks.chunkIndex,
      pageNumber: documentChunks.pageNumber,
      embedding: documentChunks.embedding,
      embeddingModel: documentChunks.embeddingModel,
    })
    .from(documentChunks)
    .innerJoin(documents, eq(documentChunks.documentId, documents.id))
    .where(inArray(documentChunks.documentId, documentIds))
    .orderBy(asc(documentChunks.documentId), asc(documentChunks.chunkIndex))
    .limit(5000);

  const useEmbeddings = chunks.length > 0 && Boolean(queryEmbedding?.length) && chunks.every((chunk) =>
    Array.isArray(chunk.embedding) &&
    chunk.embeddingModel === getEmbeddingModelId() &&
    chunk.embedding.length === queryEmbedding?.length
  );
  return chunks
    .map((chunk) => ({
      ...chunk,
      score: useEmbeddings && queryEmbedding && chunk.embedding
        ? cosineSimilarity(queryEmbedding, chunk.embedding)
        : keywordRelevance(query, chunk.content),
      retrievalMethod: useEmbeddings ? "embedding" as const : "keyword" as const,
    }))
    .filter((chunk) => chunk.score > (useEmbeddings ? 0.08 : 0))
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((chunk) => ({
      documentId: chunk.documentId,
      documentName: chunk.documentName,
      content: chunk.content,
      section: chunk.section || "General",
      chunkIndex: chunk.chunkIndex,
      pageNumber: chunk.pageNumber,
      score: chunk.score,
      retrievalMethod: chunk.retrievalMethod,
    }));
}
