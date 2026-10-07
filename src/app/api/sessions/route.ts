import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { researchSessions, documents, chatMessages } from "@/db/schema";
import { and, eq, desc, count } from "drizzle-orm";
import { readJsonBody } from "@/lib/validation";

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
        .where(and(eq(documents.sessionId, s.id), eq(documents.userId, session.user.id)));

      const [{ msgCount }] = await db
        .select({ msgCount: count() })
        .from(chatMessages)
        .where(and(eq(chatMessages.sessionId, s.id), eq(chatMessages.userId, session.user.id)));

      return { ...s, documentCount: Number(docCount), messageCount: Number(msgCount) };
    })
  );

  return NextResponse.json({ sessions: sessionsWithCounts });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await readJsonBody(req);
  if (!body) return NextResponse.json({ error: "Request body must be a valid JSON object" }, { status: 400 });

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description = typeof body.description === "string" ? body.description : null;
  const tags = Array.isArray(body.tags) ? body.tags.filter((tag): tag is string => typeof tag === "string").slice(0, 20) : [];
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
  if (name.length > 200) return NextResponse.json({ error: "Name must be 200 characters or fewer" }, { status: 400 });

  const [newSession] = await db
    .insert(researchSessions)
    .values({
      userId: session.user.id,
      name,
      description,
      tags,
      status: "active",
    })
    .returning();

  return NextResponse.json({ session: newSession }, { status: 201 });
}
