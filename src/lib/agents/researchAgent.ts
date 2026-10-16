// Research Agent — decomposes compound questions, retrieves source chunks, and returns verified citations.
import { and, desc, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { agentLogs, documents, researchSessions } from "@/db/schema";
import { DEFAULT_LLM_MODEL, generateJsonLlm, generateWithLlm } from "./llmClient";
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

/** Strip pasted filenames and filler phrases so retrieval sees only the real question. */
function cleanResearchQuery(query: string): string {
  return query
    .replace(/[\p{L}\p{N}][\p{L}\p{N}_.-]*\.(?:pdf|txt|docx?|xlsx?|csv)/giu, " ")
    .replace(/\b(?:from|in|of|for)\s+(?:this|that|the|these|those)\s+(?:document|file|pdf|report)\b/giu, " ")
    .replace(/\b(?:give|show|tell|provide|share|find|explain|describe|summarise|summarize|list|identify|mention|discuss)\s+(?:me\s+)?(?:the\s+)?/giu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** If the question names a file (e.g. "Tesla_Annual_Report_FY2023.pdf ..."), search only that document. */
function filterDocumentsByMention(
  docs: Array<{ id: string; fileName: string | null }>,
  question: string,
): string[] | null {
  const mention = question.match(/[\p{L}\p{N}][\p{L}\p{N}_.-]*\.(?:pdf|txt|docx?|xlsx?|csv)/iu)?.[0];
  if (!mention) return null;
  const normalize = (value: string) =>
    value.toLocaleLowerCase().replace(/\.(?:pdf|txt|docx?|xlsx?|csv)$/i, "").replace(/[^a-z0-9]+/g, "");
  const target = normalize(mention);
  if (target.length < 4) return null;
  const matches = docs.filter((doc) => {
    const name = normalize(doc.fileName || "");
    return name.length > 0 && (name.includes(target) || target.includes(name));
  });
  return matches.length > 0 ? matches.map((doc) => doc.id) : null;
}

const GENERAL_NOTE = "GENERAL INFORMATION -- not from your uploaded documents and not verified against any source:";
const GENERAL_TIP = "\n\n(Tip: for cited, source-verified answers, ask about a company, metric, or report you have uploaded -- for example, \"What was the revenue in FY2024?\")";

/** Short greetings / meta questions that never need document retrieval. */
function isConversationalQuestion(question: string): boolean {
  const q = question.trim().toLowerCase().replace(/[.!?]+$/, "").replace(/\s+/g, " ");
  if (q.length > 60) return false;
  return /^(hi|hello|hey|yo|hola|namaste|good morning|good afternoon|good evening|how are you|who are you|what are you|what is this|what can you do|what do you do|how does this work|how do you work|help|thanks|thank you|thx|bye|goodbye)$/.test(q)
    || /^(what|which) (features|capabilities|agents) (do you have|are there)$/.test(q);
}

function buildConversationalAnswer(): { answer: string; citations: Citation[]; reasoning: string } {
  return {
    answer: "Hello! I am FinResearch AI's research assistant. Ask me anything about your uploaded financial documents and I will answer with [S1] citations you can verify. I can also explain general financial concepts -- try \"What is gross margin?\" or \"How do I read a cash flow statement?\". Upload filings on the Documents page and ask me anything about them.",
    citations: [],
    reasoning: "Conversational response -- no retrieval needed.",
  };
}

/** Answer general questions the documents cannot support, clearly labelled as unverified. */
async function buildGeneralAnswer(
  question: string,
  conversationHistory: Array<{ role: string; content: string }>,
  searchedDocumentCount: number,
): Promise<{ answer: string; citations: Citation[]; reasoning: string }> {
  const noEvidenceNote = searchedDocumentCount > 0
    ? `\n\n(I searched ${searchedDocumentCount} indexed document(s) and found no passages to cite for this question, so this answer is not based on them.)`
    : "";
  if (isLlmConfigured()) {
    try {
      const historyText = conversationHistory
        .slice(-4)
        .map((message) => `${message.role.toUpperCase()}: ${message.content.slice(0, 600)}`)
        .join("\n");
      const systemPrompt = "You are FinResearch AI's helpful assistant. Answer general questions helpfully and concisely (under 120 words). You may use general financial knowledge. Do not fabricate specific company figures or present them as verified; when the user needs document-backed numbers, tell them to upload the filing. Never pretend an answer is cited when it is not.";
      const prompt = `USER QUESTION: ${question}\n\nRECENT CONVERSATION (context only):\n${historyText || "None"}\n\nAnswer helpfully in plain text.`;
      const text = await generateWithLlm(prompt, systemPrompt, DEFAULT_LLM_MODEL);
      return {
        answer: `${GENERAL_NOTE}\n\n${text.trim()}${noEvidenceNote}${GENERAL_TIP}`,
        citations: [],
        reasoning: "No document evidence matched, so this was answered from general knowledge (unverified, not from your documents).",
      };
    } catch {
      // fall through to the honest offline reply below
    }
  }
  return {
    answer: `I could not find citable evidence for this question in your documents, and the AI service needed for a general answer is not available right now. Try naming a specific company, metric, or fiscal period that appears in an uploaded filing. No answer has been inferred from outside sources.${GENERAL_TIP}`,
    citations: [],
    reasoning: `Searched ${searchedDocumentCount} document(s); no source passages passed the relevance filter and no general answer could be generated.`,
  };
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

  // Greetings and meta questions never need retrieval.
  if (isConversationalQuestion(question)) {
    const conversational = buildConversationalAnswer();
    await db.insert(agentLogs).values({
      sessionId,
      agentName: "Research Agent",
      action: "Conversational response",
      status: "completed",
      details: question.slice(0, 300),
      duration: Date.now() - startedAt,
    });
    return conversational;
  }

  // Clean the question first: pasted filenames and filler words ("give me",
  // "from this document") become search terms and drown the real signal.
  const searchSteps = decomposeResearchQuestion(cleanResearchQuery(question) || question.trim());
  // Retrieval scope: the documents linked to this session, PLUS the user's
  // session-less ("workspace") documents. The Documents page defaults to
  // "No session", and those uploads were previously unreachable by every agent —
  // the document was indexed but no question could ever cite it.
  const searchableDocs = await db.select({ id: documents.id, fileName: documents.fileName })
    .from(documents)
    .where(and(
      eq(documents.userId, userId),
      or(eq(documents.sessionId, sessionId), isNull(documents.sessionId)),
    ))
    .orderBy(desc(documents.createdAt));
  // If the question names a specific file, search ONLY that document first.
  const targetedDocumentIds = filterDocumentsByMention(searchableDocs, question);
  const documentIds = targetedDocumentIds ?? searchableDocs.map((document) => document.id);
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
    // No citable passages: answer as clearly-labelled GENERAL knowledge instead
    // of refusing outright (document-backed numbers stay strictly cited).
    const general = await buildGeneralAnswer(question, conversationHistory, documentIds.length);
    await db.insert(agentLogs).values({
      sessionId,
      agentName: "Research Agent",
      action: "No document evidence; answered from general knowledge",
      status: "completed",
      details: `Searched ${documentIds.length} documents in ${searchSteps.length} retrieval step(s); 0 passages matched.`,
      duration: Date.now() - startedAt,
    });
    return general;
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
    // Everything came back "not supported": treat it as a general question and
    // answer with clearly-labelled general knowledge instead of a dead-end.
    if (usedIds.size === 0) {
      const general = await buildGeneralAnswer(question, conversationHistory, documentIds.length);
      await db.insert(agentLogs).values({
        sessionId,
        agentName: "Research Agent",
        action: "No citable claims; answered from general knowledge",
        status: "completed",
        details: `Searched ${documentIds.length} documents, ${searchSteps.length} steps; 0 validated citations.`,
        duration: Date.now() - startedAt,
      });
      return general;
    }
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