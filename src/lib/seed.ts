import { db } from "@/db";
import {
  users, companies, documents, researchSessions, agentLogs,
} from "@/db/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { seedCompanies, seedDocumentContent } from "./seedData";
import { runDocumentPipeline } from "./agents/orchestrator";

export async function seedDatabase() {
  console.log("🌱 Starting database seeding...");

  // Create demo users
  const hashedPassword = await bcrypt.hash("demo123456", 10);

  const existingUsers = await db.select().from(users).limit(1);
  if (existingUsers.length > 0) {
    const seededDocuments = await db.select().from(documents).where(eq(documents.isSeeded, true));
    if (seededDocuments.length === 0) {
      console.log("✅ Database already contains user data and no seeded filings to reconcile. Skipping.");
      return;
    }
    console.log(`♻️ Reprocessing ${seededDocuments.length} existing seeded filing(s) through the live agent pipeline...`);
    for (const document of seededDocuments) {
      if (!document.content) continue;
      try {
        const result = await runDocumentPipeline(document.id, document.content, document.companyId || undefined);
        if (result.status !== "completed") {
          console.warn(`Seed pipeline for ${document.fileName} ended ${result.status}:`, result.failures.join("; "));
        }
      } catch (error) {
        console.warn(`Seed pipeline failed for ${document.fileName}:`, error);
      }
    }
    console.log("✅ Existing seeded filings reconciled with live extraction and risk checks.");
    return;
  }

  // Create users
  const [adminUser] = await db
    .insert(users)
    .values([
      {
        email: "demo@finresearch.ai",
        name: "Alex Morgan",
        password: hashedPassword,
        role: "analyst",
      },
      {
        email: "student@finresearch.ai",
        name: "Jordan Chen",
        password: hashedPassword,
        role: "student",
      },
    ])
    .returning();

  console.log("✅ Created demo users");

  // Create companies
  const createdCompanies = await db
    .insert(companies)
    .values(seedCompanies.map((c) => ({ ...c, isSeeded: true })))
    .returning();

  console.log(`✅ Created ${createdCompanies.length} seed companies`);

  // Create research session
  const [demoSession] = await db
    .insert(researchSessions)
    .values({
      userId: adminUser.id,
      name: "Big Tech Financial Analysis 2023",
      description: "Comprehensive analysis of FAANG/Big Tech companies using 2023 annual reports",
      status: "active",
      tags: ["Technology", "2023", "FAANG", "Annual Report"],
    })
    .returning();

  console.log("✅ Created demo research session");

  // Create documents and metrics for each company
  for (const company of createdCompanies) {
    const content = seedDocumentContent[company.name];
    if (!content) continue;

    // Create document
    const [doc] = await db
      .insert(documents)
      .values({
        sessionId: demoSession.id,
        companyId: company.id,
        userId: adminUser.id,
        fileName: `${company.ticker}_2023_Annual_Report.txt`,
        fileType: "text/plain",
        fileSize: content.length,
        documentType: "Annual Report (10-K)",
        fiscalYear: 2023,
        content,
        summary: `${company.name} FY2023 Annual Report — ${company.sector} sector`,
        isSeeded: true,
        processingStatus: "processing",
        embeddingStatus: "pending",
      })
      .returning();

    // Run exactly the same Document → Extraction → Red Flag stages used for uploads.
    // With no text-model key, the evidence-carrying local extractor and deterministic rules run.
    try {
      const result = await runDocumentPipeline(doc.id, content, company.id);
      if (result.status !== "completed") {
        console.warn(`Seed pipeline for ${company.name} ended ${result.status}:`, result.failures.join("; "));
      }
    } catch (error) {
      console.warn(`Seed pipeline failed for ${company.name}:`, error);
    }

    console.log(`✅ Seeded ${company.name}`);
  }

  await db.insert(agentLogs).values({
    sessionId: demoSession.id,
    agentName: "Seed Setup",
    action: "Created demo data and launched per-document agent pipelines",
    status: "completed",
    details: "Each sample filing was processed through the same pipeline stages as user uploads. Agent-level results are logged against their document IDs.",
    duration: 0,
  });

  console.log("🎉 Database seeding complete!");
}
