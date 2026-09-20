import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { chatMessages } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { answerResearchQuestion } from "@/lib/agents/researchAgent";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

  const messages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(asc(chatMessages.createdAt));

  return NextResponse.json({ messages });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId, content } = await req.json();
  if (!sessionId || !content) {
    return NextResponse.json({ error: "sessionId and content required" }, { status: 400 });
  }

  // Save user message
  const [userMsg] = await db
    .insert(chatMessages)
    .values({
      sessionId,
      userId: session.user.id,
      role: "user",
      content,
    })
    .returning();

  // Check if AI is configured
  const hasAI = process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.startsWith("AIzaSyDemo");

  if (!hasAI) {
    // Demo mode response
    const demoResponse = `**Demo Mode Response**

I can see your question: "${content}"

To enable full AI-powered analysis, please configure your **GEMINI_API_KEY** in the environment variables.

**What the Research Agent would do:**
1. Search through all documents in this session
2. Extract relevant passages using semantic search
3. Cross-reference financial metrics and risk data
4. Provide step-by-step reasoning with exact source citations

**Sample insight from loaded documents:**
Based on the Apple Inc. 2023 Annual Report, total revenue was $394.3B with a net margin of 24.6%. Microsoft showed stronger growth at 6.9% YoY with superior operating margins of 41.8%.

Please add your GEMINI_API_KEY to unlock full AI capabilities.`;

    const [aiMsg] = await db
      .insert(chatMessages)
      .values({
        sessionId,
        userId: session.user.id,
        role: "assistant",
        content: demoResponse,
        agentType: "Research Agent (Demo)",
        citations: [],
      })
      .returning();

    return NextResponse.json({ userMessage: userMsg, aiMessage: aiMsg });
  }

  try {
    // Get conversation history
    const history = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(asc(chatMessages.createdAt));

    const conversationHistory = history.slice(-10).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Run Research Agent
    const { answer, citations, reasoning } = await answerResearchQuestion(
      sessionId,
      session.user.id,
      content,
      conversationHistory
    );

    const [aiMsg] = await db
      .insert(chatMessages)
      .values({
        sessionId,
        userId: session.user.id,
        role: "assistant",
        content: answer,
        citations: citations as unknown as Record<string, unknown>[],
        agentType: "Research Agent",
        reasoning,
      })
      .returning();

    return NextResponse.json({ userMessage: userMsg, aiMessage: aiMsg });
  } catch (error) {
    const errorMsg = `I encountered an error while processing your question: ${String(error)}. Please try again or check your API configuration.`;

    const [aiMsg] = await db
      .insert(chatMessages)
      .values({
        sessionId,
        userId: session.user.id,
        role: "assistant",
        content: errorMsg,
        agentType: "Research Agent (Error)",
      })
      .returning();

    return NextResponse.json({ userMessage: userMsg, aiMessage: aiMsg });
  }
}
