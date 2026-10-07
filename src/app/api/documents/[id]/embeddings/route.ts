import { after, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { indexDocumentEmbeddings } from "@/lib/agents/embeddingAgent";
import { isUuid } from "@/lib/validation";
import { isEmbeddingConfigured } from "@/lib/agents/aiStatus";

export const maxDuration = 300;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Invalid document id" }, { status: 400 });
  const [document] = await db.select({ id: documents.id, embeddingStatus: documents.embeddingStatus })
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, session.user.id)))
    .limit(1);
  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  if (document.embeddingStatus === "processing") {
    return NextResponse.json({ error: "Embedding generation is already running" }, { status: 409 });
  }
  // Groq has no embeddings API, so this is a configuration problem, not a server
  // fault. Say so instead of returning 202 and silently marking the document
  // "unavailable" with no explanation.
  if (!isEmbeddingConfigured()) {
    return NextResponse.json({
      error:
        "No embedding provider is configured. Groq does not offer an embeddings API — set EMBEDDING_BASE_URL, EMBEDDING_API_KEY, and EMBEDDING_MODEL to any OpenAI-compatible embeddings endpoint to enable semantic search. Keyword retrieval already works without it.",
    }, { status: 400 });
  }

  await db.update(documents).set({ embeddingStatus: "processing", updatedAt: new Date() })
    .where(eq(documents.id, id));
  after(async () => {
    try {
      await indexDocumentEmbeddings(id);
    } catch (error) {
      console.error(`Embedding backfill failed for ${id}:`, error);
    }
  });
  return NextResponse.json({ status: "processing", message: "Semantic indexing has started." }, { status: 202 });
}
