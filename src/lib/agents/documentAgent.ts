// Document Agent — parses, chunks, and indexes financial documents
import { db } from "@/db";
import { documents, documentChunks, agentLogs } from "@/db/schema";
import { eq } from "drizzle-orm";

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

    // Clean text
    const cleanedContent = content
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[^\x00-\x7F]/g, " ")
      .trim();

    // Create chunks
    const chunks = chunkText(cleanedContent, 1500, 200);
    const sections = extractSections(cleanedContent);

    // Save chunks to DB
    const chunkValues = chunks.map((chunk, index) => {
      // Estimate which section this chunk belongs to
      const charPosition = chunks.slice(0, index).join("").length;
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
        pageNumber: Math.floor(index / 3) + 1,
      };
    });

    if (chunkValues.length > 0) {
      // Delete existing chunks first
      await db.delete(documentChunks).where(eq(documentChunks.documentId, documentId));
      // Insert in batches of 50
      for (let i = 0; i < chunkValues.length; i += 50) {
        await db.insert(documentChunks).values(chunkValues.slice(i, i + 50));
      }
    }

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

export async function searchDocumentChunks(
  documentId: string,
  query: string,
  limit = 5
): Promise<Array<{ content: string; section: string; chunkIndex: number }>> {
  const chunks = await db
    .select()
    .from(documentChunks)
    .where(eq(documentChunks.documentId, documentId))
    .limit(100);

  // Simple keyword-based relevance scoring
  const queryWords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const scored = chunks.map((chunk) => {
    const text = chunk.content.toLowerCase();
    const score = queryWords.reduce((acc, word) => {
      const count = (text.match(new RegExp(word, "g")) || []).length;
      return acc + count;
    }, 0);
    return { ...chunk, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((c) => ({ content: c.content, section: c.section || "General", chunkIndex: c.chunkIndex }));
}
