// Research Agent — answers multi-part financial questions with citations
import { db } from "@/db";
import { chatMessages, documents, documentChunks, financialMetrics, riskFlags, companies, agentLogs, researchSessions } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { DEFAULT_GEMINI_MODEL, generateWithGemini } from "./gemini";
import { searchDocumentChunks } from "./documentAgent";

interface Citation {
  documentName: string;
  section: string;
  excerpt: string;
}

async function buildLocalResearchAnswer(
  sessionId: string,
  question: string
): Promise<{ answer: string; citations: Citation[]; reasoning: string }> {
  const sessionDocs = await db
    .select()
    .from(documents)
    .where(eq(documents.sessionId, sessionId));
  const companyIds = [...new Set(sessionDocs.map((doc) => doc.companyId).filter(Boolean))] as string[];
  const companiesData = companyIds.length > 0
    ? await db.select().from(companies).where(inArray(companies.id, companyIds))
    : [];
  const metricsData = companyIds.length > 0
    ? await db.select().from(financialMetrics).where(inArray(financialMetrics.companyId, companyIds))
    : [];
  const risksData = companyIds.length > 0
    ? await db.select().from(riskFlags).where(inArray(riskFlags.companyId, companyIds))
    : [];

  const relevantChunks: Array<{ documentName: string; section: string; excerpt: string }> = [];
  for (const doc of sessionDocs.slice(0, 5)) {
    const chunks = await searchDocumentChunks(doc.id, question, 3);
    chunks.forEach((chunk) => relevantChunks.push({
      documentName: doc.fileName,
      section: chunk.section,
      excerpt: chunk.content.slice(0, 300),
    }));
  }

  const metricsText = metricsData.slice(0, 10).map((metric) => {
    const company = companiesData.find((item) => item.id === metric.companyId);
    return `- ${company?.name || "Unknown company"}: revenue ${metric.revenue || "N/A"}M, net income ${metric.netIncome || "N/A"}M, gross margin ${metric.grossMargin || "N/A"}, operating margin ${metric.operatingMargin || "N/A"}, ROE ${metric.roe || "N/A"}`;
  }).join("\n");
  const risksText = risksData.slice(0, 8).map((risk) => `- [${risk.severity}] ${risk.title}: ${risk.description}`).join("\n");
  const citations = relevantChunks.slice(0, 5);
  const answer = `**Local Research Mode**

Gemini is currently unavailable, so this answer uses the uploaded documents and stored analysis data.

**Question:** ${question}

**Available financial metrics**
${metricsText || "No extracted financial metrics are available for this session."}

**Risk indicators**
${risksText || "No stored risk indicators are available for this session."}

**Relevant document evidence**
${citations.map((citation) => `- ${citation.documentName} (${citation.section}): ${citation.excerpt}`).join("\n") || "No matching document passages were found."}

For full AI-generated reasoning, restore Gemini API quota or configure a key with available quota.`;

  return {
    answer,
    citations,
    reasoning: `Local fallback searched ${sessionDocs.length} documents, found ${relevantChunks.length} relevant passages, analyzed ${metricsData.length} metric sets, and reviewed ${risksData.length} risks.`,
  };
}

export async function answerResearchQuestion(
  sessionId: string,
  userId: string,
  question: string,
  conversationHistory: Array<{ role: string; content: string }>
): Promise<{ answer: string; citations: Citation[]; reasoning: string }> {
  const start = Date.now();

  await db.insert(agentLogs).values({
    sessionId,
    agentName: "Research Agent",
    action: "Processing research question",
    status: "running",
    details: question.slice(0, 200),
  });

  try {
    // Get all documents in this session
    const sessionDocs = await db
      .select()
      .from(documents)
      .where(eq(documents.sessionId, sessionId));

    // Get companies from session
    const companyIds = [...new Set(sessionDocs.map((d) => d.companyId).filter(Boolean))] as string[];
    const companiesData = companyIds.length > 0
      ? await db.select().from(companies).where(inArray(companies.id, companyIds))
      : [];

    // Search relevant chunks across all documents
    const relevantChunks: Array<{ documentName: string; section: string; excerpt: string; content: string }> = [];
    for (const doc of sessionDocs.slice(0, 5)) {
      const chunks = await searchDocumentChunks(doc.id, question, 3);
      chunks.forEach((chunk) => {
        relevantChunks.push({
          documentName: doc.fileName,
          section: chunk.section,
          excerpt: chunk.content.slice(0, 200),
          content: chunk.content,
        });
      });
    }

    // Get financial metrics
    const metricsData = companyIds.length > 0
      ? await db.select().from(financialMetrics).where(inArray(financialMetrics.companyId, companyIds))
      : [];

    // Get risk data
    const risksData = companyIds.length > 0
      ? await db.select().from(riskFlags).where(inArray(riskFlags.companyId, companyIds))
      : [];

    // Build context
    const context = `
AVAILABLE DOCUMENTS: ${sessionDocs.map((d) => d.fileName).join(", ")}

COMPANIES: ${companiesData.map((c) => `${c.name} (${c.ticker || "N/A"})`).join(", ")}

RELEVANT DOCUMENT EXCERPTS:
${relevantChunks.map((c) => `[${c.documentName} - ${c.section}]: ${c.content.slice(0, 400)}`).join("\n\n")}

EXTRACTED FINANCIAL METRICS:
${metricsData.map((m) => {
  const co = companiesData.find((c) => c.id === m.companyId);
  return `${co?.name || "Unknown"} (${m.fiscalYear}): Revenue=${m.revenue}M, Net Income=${m.netIncome}M, Gross Margin=${m.grossMargin}, ROE=${m.roe}`;
}).join("\n")}

IDENTIFIED RISKS:
${risksData.map((r) => `[${r.severity.toUpperCase()}] ${r.title}: ${r.description}`).join("\n")}
`;

    // Build conversation prompt
    const historyText = conversationHistory
      .slice(-6)
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n");

    const systemPrompt = `You are an expert financial research analyst AI. You answer questions about company financials
based STRICTLY on the provided document data. You NEVER make up numbers or facts not in the documents.
For every claim, cite the source document and section. Provide step-by-step reasoning.
If information is not available in the documents, say so clearly.`;

    const prompt = `${context}

CONVERSATION HISTORY:
${historyText}

CURRENT QUESTION: ${question}

Provide:
1. A comprehensive, step-by-step answer with exact numbers from the documents
2. Cite your sources with document name and section
3. Explain your reasoning process
4. If comparing companies, use a structured format

Answer in professional analyst language. Be precise and cite all numbers.`;

    const response = await generateWithGemini(prompt, systemPrompt, DEFAULT_GEMINI_MODEL);

    // Extract citations from relevant chunks
    const citations: Citation[] = relevantChunks.slice(0, 5).map((chunk) => ({
      documentName: chunk.documentName,
      section: chunk.section,
      excerpt: chunk.excerpt,
    }));

    // Extract reasoning
    const reasoning = `Agent searched ${sessionDocs.length} documents, found ${relevantChunks.length} relevant passages, analyzed ${metricsData.length} metric sets and ${risksData.length} risk factors.`;

    await db.insert(agentLogs).values({
      sessionId,
      agentName: "Research Agent",
      action: "Question answered",
      status: "completed",
      details: `Analyzed ${sessionDocs.length} docs, ${relevantChunks.length} chunks`,
      duration: Date.now() - start,
    });

    return { answer: response, citations, reasoning };
  } catch (error) {
    const fallback = await buildLocalResearchAnswer(sessionId, question);
    await db.insert(agentLogs).values({
      sessionId,
      agentName: "Research Agent",
      action: "Question answered with local fallback",
      status: "completed",
      details: `Gemini unavailable: ${String(error).slice(0, 300)}`,
      duration: Date.now() - start,
    });
    return fallback;
  }
}
