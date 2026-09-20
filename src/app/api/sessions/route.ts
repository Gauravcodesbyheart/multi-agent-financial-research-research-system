import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { researchSessions, documents, chatMessages } from "@/db/schema";
import { eq, desc, count } from "drizzle-orm";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessions = await db
    .select()
    .from(researchSessions)
    .where(eq(researchSessions.userId, session.user.id))
    .orderBy(desc(researchSessions.updatedAt));

  // Get document counts for each session
  const sessionsWithCounts = await Promise.all(
    sessions.map(async (s) => {
      const [{ docCount }] = await db
        .select({ docCount: count() })
        .from(documents)
        .where(eq(documents.sessionId, s.id));

      const [{ msgCount }] = await db
        .select({ msgCount: count() })
        .from(chatMessages)
        .where(eq(chatMessages.sessionId, s.id));

      return { ...s, documentCount: Number(docCount), messageCount: Number(msgCount) };
    })
  );

  return NextResponse.json({ sessions: sessionsWithCounts });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, description, tags } = await req.json();
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const [newSession] = await db
    .insert(researchSessions)
    .values({
      userId: session.user.id,
      name,
      description: description || null,
      tags: tags || [],
      status: "active",
    })
    .returning();

  return NextResponse.json({ session: newSession }, { status: 201 });
}
