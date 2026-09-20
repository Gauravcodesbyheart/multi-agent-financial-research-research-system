import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { documents, companies, financialMetrics, riskFlags, researchSessions } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { processDocument } from "@/lib/agents/documentAgent";
import { extractFinancialMetrics } from "@/lib/agents/extractionAgent";
import { scanForRisks } from "@/lib/agents/riskAgent";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  let query = db
    .select({
      document: documents,
      company: companies,
    })
    .from(documents)
    .leftJoin(companies, eq(documents.companyId, companies.id))
    .where(eq(documents.userId, session.user.id))
    .orderBy(desc(documents.createdAt));

  if (sessionId) {
    query = db
      .select({
        document: documents,
        company: companies,
      })
      .from(documents)
      .leftJoin(companies, eq(documents.companyId, companies.id))
      .where(and(eq(documents.sessionId, sessionId), eq(documents.userId, session.user.id)))
      .orderBy(desc(documents.createdAt));
  }

  const results = await query;
  return NextResponse.json({ documents: results });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const sessionIdValue = formData.get("sessionId");
    const sessionId = typeof sessionIdValue === "string" && sessionIdValue.trim() ? sessionIdValue.trim() : null;
    const documentType = (formData.get("documentType") as string) || "Annual Report";
    const fiscalYear = formData.get("fiscalYear") ? parseInt(formData.get("fiscalYear") as string) : null;
    const companyNameValue = formData.get("companyName");
    const companyName = typeof companyNameValue === "string" ? companyNameValue.trim() : "";
    const tickerValue = formData.get("ticker");
    const ticker = typeof tickerValue === "string" ? tickerValue.trim() : "";

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    if (sessionId) {
      const [ownedSession] = await db
        .select({ id: researchSessions.id })
        .from(researchSessions)
        .where(and(eq(researchSessions.id, sessionId), eq(researchSessions.userId, session.user.id)))
        .limit(1);

      if (!ownedSession) {
        return NextResponse.json({ error: "Selected research session was not found." }, { status: 400 });
      }
    }

    // Read file content
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = file.name.toLowerCase();
    const fileExtension = fileName.includes(".") ? fileName.split(".").pop() || "unknown" : "unknown";
    const storedFileType = fileExtension === "pdf" || fileExtension === "docx" || fileExtension === "txt"
      ? fileExtension
      : "unknown";
    let content = "";

    if (file.type === "application/pdf" || fileName.endsWith(".pdf")) {
      // For PDF, try to extract text
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        // Load the runtime parser directly; the package wrapper runs its test fixture
        // when bundled by some Next.js server runtimes.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require("pdf-parse/lib/pdf-parse.js");
        const data = await pdfParse(buffer);
        content = data.text.trim();

        if (!content) {
          throw new Error("This PDF contains no selectable text. It may be scanned or image-only.");
        }
      } catch (error) {
        console.error(`PDF text extraction failed for ${file.name}:`, error);
        content = `[PDF Document: ${file.name}]\n\nText extraction failed. This PDF may be scanned or image-only; upload a searchable PDF to enable financial analysis.\n\nFile size: ${buffer.length} bytes`;
      }
    } else if (fileName.endsWith(".docx")) {
      try {
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ buffer });
        content = result.value;
      } catch {
        content = buffer.toString("utf-8");
      }
    } else {
      content = buffer.toString("utf-8");
    }

    // PostgreSQL text fields cannot contain NUL bytes. Some generated PDFs include
    // citation markers containing \x00, so remove only that invalid character.
    content = content.replace(/\u0000/g, "");

    // Reuse a company only within this user's uploaded documents. This keeps a
    // user's uploaded Microsoft report separate from the seeded demo company.
    let companyId: string | null = null;
    if (companyName) {
      const existingCompany = await db
        .select({ companyId: companies.id })
        .from(companies)
        .innerJoin(documents, eq(documents.companyId, companies.id))
        .where(and(eq(companies.name, companyName), eq(documents.userId, session.user.id)))
        .limit(1);

      if (existingCompany.length > 0) {
        companyId = existingCompany[0].companyId;
      } else {
        const [newCompany] = await db
          .insert(companies)
          .values({ name: companyName, ticker: ticker || null })
          .returning();
        companyId = newCompany.id;
      }
    }

    // Create document
    const [doc] = await db
      .insert(documents)
      .values({
        sessionId,
        companyId,
        userId: session.user.id,
        fileName: file.name,
        fileType: storedFileType,
        fileSize: file.size,
        documentType,
        fiscalYear,
        content,
        processingStatus: "processing",
      })
      .returning();

    // Run multi-agent pipeline asynchronously
    (async () => {
      try {
        // Agent 1: Document Agent — chunk and index
        await processDocument(doc.id, content);

        // Local fallbacks keep uploaded documents analyzable without Gemini.
        try {
          await extractFinancialMetrics(doc.id, content, companyId || undefined);
        } catch (error) {
          console.warn("Extraction Agent failed; document remains indexed:", error);
        }

        try {
          await scanForRisks(doc.id, content, companyId || undefined);
        } catch (error) {
          console.warn("Risk Agent failed; document remains indexed:", error);
        }

        await db
          .update(documents)
          .set({ processingStatus: "completed", updatedAt: new Date() })
          .where(eq(documents.id, doc.id));
      } catch (e) {
        console.error("Pipeline error:", e);
        await db
          .update(documents)
          .set({ processingStatus: "failed", updatedAt: new Date() })
          .where(eq(documents.id, doc.id));
      }
    })();

    return NextResponse.json({ document: doc }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Upload error:", error);
    return NextResponse.json({ error: `Document upload failed: ${message}` }, { status: 500 });
  }
}
