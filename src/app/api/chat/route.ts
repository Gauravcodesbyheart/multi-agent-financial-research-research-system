import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { chatMessages, researchSessions } from "@/db/schema";
import { answerResearchQuestion } from "@/lib/agents/researchAgent";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function findOwnedSession(sessionId: string, userId: string) {
  const [ownedSession] = await db.select({ id: researchSessions.id })
    .from(researchSessions)
    .where(and(eq(researchSessions.id, sessionId), eq(researchSessions.userId, userId)))
    .limit(1);
  return ownedSession;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessionId = new URL(req.url).searchParams.get("sessionId");
  if (!sessionId || !UUID_PATTERN.test(sessionId)) {
    return NextResponse.json({ error: "A valid sessionId is required" }, { status: 400 });
  }
  if (!await findOwnedSession(sessionId, session.user.id)) {
    return NextResponse.json({ error: "Research session not found" }, { status: 404 });
  }

  const messages = await db.select().from(chatMessages)
    .where(and(eq(chatMessages.sessionId, sessionId), eq(chatMessages.userId, session.user.id)))
    .orderBy(asc(chatMessages.createdAt));
  return NextResponse.json({ messages });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 });
  }
  const body = payload as { sessionId?: unknown; content?: unknown };
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!UUID_PATTERN.test(sessionId) || !content) {
    return NextResponse.json({ error: "A valid sessionId and non-empty content are required" }, { status: 400 });
  }
  if (content.length > 4000) return NextResponse.json({ error: "Question must be 4,000 characters or fewer" }, { status: 413 });
  if (!await findOwnedSession(sessionId, session.user.id)) {
    return NextResponse.json({ error: "Research session not found" }, { status: 404 });
  }

  const [userMsg] = await db.insert(chatMessages).values({
    sessionId,
    userId: session.user.id,
    role: "user",
    content,
  }).returning();

  try {
    const history = await db.select().from(chatMessages)
      .where(and(eq(chatMessages.sessionId, sessionId), eq(chatMessages.userId, session.user.id)))
      .orderBy(asc(chatMessages.createdAt));
    const conversationHistory = history.slice(-10).map((message) => ({ role: message.role, content: message.content }));
    const { answer, citations, reasoning } = await answerResearchQuestion(
      sessionId,
      session.user.id,
      content,
      conversationHistory,
    );

    const [assistantMsg] = await db.insert(chatMessages).values({
      sessionId,
      userId: session.user.id,
      role: "assistant",
      content: answer,
      citations: citations as unknown as Record<string, unknown>[],
      agentType: "Research Agent",
      reasoning,
    }).returning();
    return NextResponse.json({ userMessage: userMsg, aiMessage: assistantMsg });
  } catch (error) {
    console.error("Research Agent request failed:", error);
    return NextResponse.json({
      error: "The research request could not be completed. Your question was saved; please retry.",
      userMessage: userMsg,
    }, { status: 503 });
  }
}
