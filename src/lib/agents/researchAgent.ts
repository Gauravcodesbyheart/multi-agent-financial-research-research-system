// Research Agent — decomposes compound questions, retrieves source chunks, and returns verified citations.
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { agentLogs, documents, researchSessions } from "@/db/schema";
import { generateJSON } from "./llm";
import { searchDocumentCollection, type RetrievedChunk } from "./documentAgent";
import { tryCreateQueryEmbedding } from "./embeddingAgent";
import { decomposeResearchQuestion, validateGroundedResearchAnswer } from "./analysisUtils";

export interface Citation {
  citationId: string;
  documentName: string;
  section: string;
  excerpt: string;
  chunkIndex: number;
  pageNumber: number | null;
}

interface RetrievedEvidence extends RetrievedChunk {
  queries: string[];
}

function buildCitations(chunks: RetrievedEvidence[]): Citation[] {
  return chunks.map((chunk, index) => ({
    citationId: `S${index + 1}`,
    documentName: chunk.documentName || "Uploaded document",
    section: chunk.section,
    excerpt: chunk.content.slice(0, 800),
    chunkIndex: chunk.chunkIndex,
    pageNumber: chunk.pageNumber,
  }));
}

function buildLocalResearchAnswer(
  question: string,
  searchSteps: string[],
  chunks: RetrievedEvidence[],
): { answer: string; citations: Citation[]; reasoning: string } {
  const citations = buildCitations(chunks);
  if (citations.length === 0) {
    return {
      answer: `I couldn't find matching evidence for this question in the indexed documents. Try narrowing the question or check that document processing has completed. No answer has been inferred from outside sources.`,
      citations: [],
      reasoning: `Searched ${searchSteps.length} retrieval step(s) using local keyword search; no source passages passed the relevance filter.`,
    };
  }

  const evidence = citations.map((citation) =>
    `[${citation.citationId}] ${citation.documentName} — ${citation.section}, chunk ${citation.chunkIndex + 1}: "${citation.excerpt}"`
  ).join("\n\n");
  const answer = `I could not generate a synthesized answer for “${question}”. The passages below were retrieved from your documents; they are source evidence, not conclusions.\n\n${evidence}`;
  const mode = chunks.some((chunk) => chunk.retrievalMethod === "embedding") ? "semantic embedding search" : "keyword fallback search";
  return {
    answer,
    citations,
    reasoning: `Research steps: ${searchSteps.join(" → ")}. Retrieved ${citations.length} evidence passages using ${mode}. This is a retrieval summary, not hidden chain-of-thought.`,
  };
}

export async function answerResearchQuestion(
  sessionId: string,
  userId: string,
  question: string,
  conversationHistory: Array<{ role: string; content: string }>,
): Promise<{ answer: string; citations: Citation[]; reasoning: string }> {
  const startedAt = Date.now();
  const [ownedSession] = await db.select({ id: researchSessions.id })
    .from(researchSessions)
    .where(and(eq(researchSessions.id, sessionId), eq(researchSessions.userId, userId)))
    .limit(1);
  if (!ownedSession) throw new Error("Research session not found");

  await db.insert(agentLogs).values({
    sessionId,
    agentName: "Research Agent",
    action: "Processing research question",
    status: "running",
    details: question.slice(0, 300),
  });

  const searchSteps = decomposeResearchQuestion(question);
  const sessionDocs = await db.select({ id: documents.id })
    .from(documents)
    .where(and(eq(documents.sessionId, sessionId), eq(documents.userId, userId)))
    .orderBy(desc(documents.createdAt));
  const documentIds = sessionDocs.map((document) => document.id);
  const evidenceByChunk = new Map<string, RetrievedEvidence>();

  for (const step of searchSteps) {
    const queryEmbedding = await tryCreateQueryEmbedding(step);
    const matches = await searchDocumentCollection(documentIds, step, 8, queryEmbedding);
    for (const match of matches) {
      const key = `${match.documentId}:${match.chunkIndex}`;
      const existing = evidenceByChunk.get(key);
      if (existing) {
        existing.queries = [...new Set([...existing.queries, step])];
        existing.score = Math.max(existing.score, match.score);
      } else {
        evidenceByChunk.set(key, { ...match, queries: [step] });
      }
    }
  }

  const relevantChunks = [...evidenceByChunk.values()]
    .sort((left, right) => right.score - left.score)
    .slice(0, 8);
  if (relevantChunks.length === 0) {
    const fallback = buildLocalResearchAnswer(question, searchSteps, relevantChunks);
    await db.insert(agentLogs).values({
      sessionId,
      agentName: "Research Agent",
      action: "No relevant source evidence found",
      status: "completed",
      details: `Searched ${documentIds.length} documents in ${searchSteps.length} retrieval step(s).`,
      duration: Date.now() - startedAt,
    });
    return fallback;
  }

  const citations = buildCitations(relevantChunks);
  const citationContext = citations.map((citation) =>
    `[${citation.citationId}] DOCUMENT: ${citation.documentName}\nSECTION: ${citation.section}\nCHUNK: ${citation.chunkIndex + 1}\nEXCERPT: ${citation.excerpt}`
  ).join("\n\n");
  const historyText = conversationHistory
    .slice(-6)
    .map((message) => `${message.role.toUpperCase()}: ${message.content.slice(0, 1200)}`)
    .join("\n");

  try {
    const systemPrompt = `You are a careful financial research evidence assistant. Use only the supplied indexed-document excerpts. Return valid JSON matching the requested schema, with no Markdown fences.
For each retrieval step, each claim.text MUST be copied verbatim as a contiguous source quote (at least 12 characters), not paraphrased. Set supporting_quotes for the cited ID to a source quote containing that exact claim.text. The server renders only verbatim claim text that passes exact-quote validation. Preserve source numbers and units exactly. Do not calculate, infer, use outside knowledge, or use conversation history as evidence. If no excerpt supports a step, set not_supported to true and return an empty claims array. Do not give investment advice.`;
    const prompt = `Return one JSON object with this shape:
{
  "steps": [
    {
      "question": "the corresponding retrieval step",
      "claims": [
        {
          "text": "exact contiguous source quote of at least 12 characters",
          "citation_ids": ["S1"],
          "supporting_quotes": {"S1": "a longer exact quote from source S1 containing text verbatim"}
        }
      ],
      "not_supported": false
    }
  ]
}

USER QUESTION: ${question}

RETRIEVAL PLAN (create one step in the same order for each item):
${searchSteps.map((step, index) => `${index + 1}. ${step}`).join("\n")}

SOURCE EVIDENCE:
${citationContext}

RECENT CONVERSATION (context only; never cite or treat as evidence):
${historyText || "None"}

Each step must have its own claims. In each claim, the text must be a verbatim contiguous sentence or clause from a retrieved excerpt; do not rewrite it in your own words. Every cited source ID must have its own exact supporting quote containing the claim. Do not perform calculations. When a step needs multiple source documents, return separate source-quoted claims for each document.`;
    const rawResponse = await generateJSON<unknown>(prompt, systemPrompt);
    const validated = validateGroundedResearchAnswer(rawResponse, citations, searchSteps);
    if (!validated) throw new Error("Generated response did not pass source-quote and numeric citation validation");

    const usedIds = new Set(validated.usedCitationIds);
    const usedCitations = citations.filter((citation) => usedIds.has(citation.citationId));
    const retrievalMode = relevantChunks.some((chunk) => chunk.retrievalMethod === "embedding")
      ? "semantic embedding retrieval"
      : "keyword fallback retrieval";
    const reasoning = `Retrieval plan: ${searchSteps.join(" → ")}. Searched ${documentIds.length} session documents using ${retrievalMode}; validated exact source quotes and numeric tokens for ${usedIds.size} cited passages. This is a method summary, not hidden chain-of-thought.`;

    await db.insert(agentLogs).values({
      sessionId,
      agentName: "Research Agent",
      action: "Question answered with validated cited evidence",
      status: "completed",
      details: `Searched ${documentIds.length} documents, ${searchSteps.length} steps; ${usedCitations.length} validated citations used.`,
      duration: Date.now() - startedAt,
    });
    return { answer: validated.answer, citations: usedCitations, reasoning };
  } catch (error) {
    const fallback = buildLocalResearchAnswer(question, searchSteps, relevantChunks);
    await db.insert(agentLogs).values({
      sessionId,
      agentName: "Research Agent",
      action: "Answered with local evidence fallback",
      status: "partial",
      details: `Text AI unavailable or failed citation validation: ${String(error).slice(0, 500)}`,
      duration: Date.now() - startedAt,
    });
    return fallback;
  }
}
