import { after, NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { documents, companies, researchSessions, documentProcessingJobs } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { isUuid } from "@/lib/validation";
import { processDocumentJob } from "@/lib/agents/orchestrator";
import { validateFinancialDocument, logDocumentValidation } from "@/lib/agents/validationAgent";

export const maxDuration = 300;

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
    if (!isUuid(sessionId)) return NextResponse.json({ error: "Invalid sessionId" }, { status: 400 });
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
    if (file.size <= 0 || file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File must be non-empty and no larger than 10 MB." }, { status: 413 });
    }

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
    if (!["pdf", "docx", "txt"].includes(fileExtension)) {
      return NextResponse.json({ error: "Only PDF, DOCX, and TXT files are supported." }, { status: 415 });
    }
    const storedFileType = fileExtension;
    let content = "";

    if (fileExtension === "pdf") {
      try {
        // Load the runtime parser directly; the package wrapper can run its test fixture in server bundles.
        const pdfParse = require("pdf-parse/lib/pdf-parse.js");
        const data = await pdfParse(buffer);
        content = data.text.trim();
        if (!content) {
          return NextResponse.json({ error: "This PDF contains no selectable text. OCR the scanned PDF and upload it again." }, { status: 422 });
        }
      } catch (error) {
        console.error(`PDF text extraction failed for ${file.name}:`, error);
        return NextResponse.json({ error: "Could not extract text from this PDF. Upload a searchable PDF or an OCR-processed copy." }, { status: 422 });
      }
    } else if (fileExtension === "docx") {
      try {
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ buffer });
        content = result.value.trim();
      } catch (error) {
        console.error(`DOCX text extraction failed for ${file.name}:`, error);
        return NextResponse.json({ error: "Could not extract text from this DOCX file." }, { status: 422 });
      }
    } else {
      content = buffer.toString("utf-8").trim();
    }

    if (!content) return NextResponse.json({ error: "The uploaded document is empty." }, { status: 422 });

    // --- Validation Agent: is this really a financial document? --------------
    // Runs for ALL file types (PDF, DOCX and TXT) after text extraction.
    const validation = await validateFinancialDocument(content, file.name);
    if (!validation.isFinancial) {
      return NextResponse.json(
        {
          error:
            `This file does not look like a financial document (looks like: ${validation.documentTypeGuess}). ` +
            validation.reasons.slice(0, 2).join(" ") +
            " Supported inputs: annual reports, financial statements, and regulatory filings (PDF, DOCX or TXT).",
        },
        { status: 422 },
      );
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

    // Persist the document and its durable queue record atomically before responding.
    const { doc, job } = await db.transaction(async (tx) => {
      const [createdDocument] = await tx.insert(documents)
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
          embeddingStatus: "pending",
        })
        .returning();
      const [createdJob] = await tx.insert(documentProcessingJobs)
        .values({ documentId: createdDocument.id })
        .returning();
      return { doc: createdDocument, job: createdJob };
    });

    // Validation Agent: record the type check in this document's activity trail.
    await logDocumentValidation(doc.id, validation);

    // Start immediately; the persisted queued job can also be recovered by the scheduled worker.
    after(async () => {
      try {
        await processDocumentJob(job.id);
      } catch (error) {
        console.error(`Document job ${job.id} failed before it could update its status:`, error);
      }
    });

    return NextResponse.json({ document: doc }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Upload error:", error);
    return NextResponse.json({ error: `Document upload failed: ${message}` }, { status: 500 });
  }
}