// Research Agent — decomposes compound questions, retrieves source chunks, and returns verified citations.
import { and, desc, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { agentLogs, documents, researchSessions } from "@/db/schema";
import { DEFAULT_LLM_MODEL, generateJsonLlm } from "./llmClient";
import { searchDocumentCollection, type RetrievedChunk } from "./documentAgent";
import { tryCreateQueryEmbedding } from "./embeddingAgent";
import { describeAiUnavailable, isLlmConfigured } from "./aiStatus";
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
  searchedDocumentCount: number,
): { answer: string; citations: Citation[]; reasoning: string } {
  const citations = buildCitations(chunks);

  if (citations.length === 0) {
    // Distinguish "no documents at all" from "documents exist but nothing matched":
    // both used to return the same message, which sent users chasing the wrong fix.
    const answer = searchedDocumentCount === 0
      ? "There are no documents in your workspace yet, so there is nothing to cite. Upload a financial document on the Documents page (it is indexed automatically), then ask again."
      : `I couldn't find matching evidence for this question across ${searchedDocumentCount} indexed document(s). Try naming a specific company, metric, or fiscal period, or confirm the targeted documents finished processing. No answer has been inferred from outside sources.`;
    return {
      answer,
      citations: [],
      reasoning: `Searched ${searchedDocumentCount} document(s) across ${searchSteps.length} retrieval step(s); no source passages passed the relevance filter.`,
    };
  }

  const evidence = citations.map((citation) =>
    `[${citation.citationId}] ${citation.documentName} — ${citation.section}, chunk ${citation.chunkIndex + 1}: "${citation.excerpt}"`
  ).join("\n\n");
  // Say why there is no synthesis (missing key vs. provider error) instead of a bare apology.
  const reason = isLlmConfigured()
    ? "AI synthesis failed for this request, so the retrieved passages are shown verbatim."
    : describeAiUnavailable();
  const answer = `I could not generate a synthesized answer for “${question}”. ${reason}\n\nThe passages below were retrieved from your documents; they are source evidence, not conclusions.\n\n${evidence}`;
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
  // Retrieval scope: the documents linked to this session, PLUS the user's
  // session-less ("workspace") documents. The Documents page defaults to
  // "No session", and those uploads were previously unreachable by every agent —
  // the document was indexed but no question could ever cite it.
  const searchableDocs = await db.select({ id: documents.id })
    .from(documents)
    .where(and(
      eq(documents.userId, userId),
      or(eq(documents.sessionId, sessionId), isNull(documents.sessionId)),
    ))
    .orderBy(desc(documents.createdAt));
  const documentIds = searchableDocs.map((document) => document.id);
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
    const fallback = buildLocalResearchAnswer(question, searchSteps, relevantChunks, documentIds.length);
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
    const systemPrompt = `You are a careful financial research analyst. Use only the supplied indexed-document excerpts. Return valid JSON matching the requested schema, with no Markdown fences.
Each retrieval step must be answered with atomic claims. Every factual claim must include one or more citation_ids and an exact supporting_quotes value for every cited source ID. Each quote must be a contiguous exact excerpt of at least 12 characters from that source. Preserve numbers and units exactly as written; do not convert, calculate, or infer. Do not use outside knowledge or conversation history as evidence. If no excerpt supports a step, set not_supported to true and return an empty claims array. Do not give investment advice.`;
    const prompt = `Return one JSON object with this shape:
{
  "steps": [
    {
      "question": "the corresponding retrieval step",
      "claims": [
        {
          "text": "one source-supported factual claim",
          "citation_ids": ["S1"],
          "supporting_quotes": {"S1": "exact contiguous quote copied from source S1"}
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

Each step must have its own claims. Split compound reasoning into atomic claims. Every number in a claim must appear verbatim in at least one of its exact supporting quotes. When a comparison relies on multiple sources, cite and quote each one.`;
    const rawResponse = await generateJsonLlm<unknown>(prompt, systemPrompt, DEFAULT_LLM_MODEL);
    const validated = validateGroundedResearchAnswer(rawResponse, citations);
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
    const fallback = buildLocalResearchAnswer(question, searchSteps, relevantChunks, documentIds.length);
    await db.insert(agentLogs).values({
      sessionId,
      agentName: "Research Agent",
      action: "Answered with local evidence fallback",
      status: "partial",
      details: `AI model unavailable or failed citation validation: ${String(error).slice(0, 500)}`,
      duration: Date.now() - startedAt,
    });
    return fallback;
  }
}
