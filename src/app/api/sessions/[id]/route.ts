import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { researchSessions } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [rs] = await db
    .select()
    .from(researchSessions)
    .where(and(eq(researchSessions.id, id), eq(researchSessions.userId, session.user.id)))
    .limit(1);

  if (!rs) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ session: rs });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const allowedFields: Record<string, unknown> = {};
  if (body.name) allowedFields.name = body.name;
  if (body.description !== undefined) allowedFields.description = body.description;
  if (body.status) allowedFields.status = body.status;
  if (body.tags) allowedFields.tags = body.tags;
  allowedFields.updatedAt = new Date();

  const [updated] = await db
    .update(researchSessions)
    .set(allowedFields)
    .where(and(eq(researchSessions.id, id), eq(researchSessions.userId, session.user.id)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ session: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await db
    .delete(researchSessions)
    .where(and(eq(researchSessions.id, id), eq(researchSessions.userId, session.user.id)));

  return NextResponse.json({ success: true });
}
