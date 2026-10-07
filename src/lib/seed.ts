import { db } from "@/db";
import {
  users, companies, documents, financialMetrics, riskFlags, researchSessions, agentLogs,
} from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { seedCompanies, seedDocumentContent, seedMetrics, seedRisks } from "./seedData";
import { processDocument } from "./agents/documentAgent";
import { indexDocumentEmbeddings } from "./agents/embeddingAgent";
import { isSeedNoop, planAccounts, planByName } from "./seedPlan";

export interface SeedSummary {
  demoUsers: number;
  companies: number;
  documents: number;
  metrics: number;
  risks: number;
  skippedExisting: number;
  alreadySeeded: boolean;
}

const DEMO_ACCOUNTS = [
  { email: "demo@finresearch.ai", name: "Alex Morgan", role: "analyst" },
  { email: "student@finresearch.ai", name: "Jordan Chen", role: "student" },
];

/**
 * Idempotent demo seeder.
 *
 * This previously bailed out entirely when *any* user row existed, while the API
 * still answered "Database seeded successfully". Registering an account and then
 * seeding — the normal order for a new install — therefore appeared to succeed
 * while producing no demo data at all. Each entity is now created only when it is
 * missing, and the caller receives a summary of what actually happened.
 */
export async function seedDatabase(): Promise<SeedSummary> {
  console.log("🌱 Starting database seeding...");
  const summary: SeedSummary = {
    demoUsers: 0, companies: 0, documents: 0, metrics: 0, risks: 0, skippedExisting: 0, alreadySeeded: false,
  };

  // ── Demo users (find-or-create by email) ───────────────────────────────────
  const hashedPassword = await bcrypt.hash("demo123456", 10);
  const demoEmails = DEMO_ACCOUNTS.map((account) => account.email);
  const existingUsers = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(inArray(users.email, demoEmails));
  const usersByEmail = new Map(existingUsers.map((user) => [user.email.toLowerCase(), user.id]));

  // Only the demo accounts are considered "already seeded" — any other user row
  // is irrelevant and must not suppress demo data.
  for (const account of planAccounts(existingUsers.map((user) => user.email), DEMO_ACCOUNTS).toCreate) {
    const [created] = await db.insert(users).values({
      email: account.email,
      name: account.name,
      password: hashedPassword,
      role: account.role,
    }).returning({ id: users.id });
    usersByEmail.set(account.email.toLowerCase(), created.id);
    summary.demoUsers += 1;
  }
  if (summary.demoUsers > 0) console.log(`✅ Created ${summary.demoUsers} demo user(s)`);

  const adminUserId = usersByEmail.get(DEMO_ACCOUNTS[0].email.toLowerCase());
  if (!adminUserId) throw new Error("Could not resolve the demo admin user for seeding.");

  // ── Demo research session (find-or-create for the admin user) ──────────────
  const [existingSession] = await db
    .select({ id: researchSessions.id })
    .from(researchSessions)
    .where(and(eq(researchSessions.userId, adminUserId), eq(researchSessions.name, "Big Tech Financial Analysis 2023")))
    .limit(1);
  let demoSessionId = existingSession?.id;
  if (!demoSessionId) {
    const [createdSession] = await db.insert(researchSessions).values({
      userId: adminUserId,
      name: "Big Tech Financial Analysis 2023",
      description: "Comprehensive analysis of FAANG/Big Tech companies using 2023 annual reports",
      status: "active",
      tags: ["Technology", "2023", "FAANG", "Annual Report"],
    }).returning({ id: researchSessions.id });
    demoSessionId = createdSession.id;
    console.log("✅ Created demo research session");
  }

  // ── Companies (find-or-create by name, seeded flag on) ─────────────────────
  const seedNames = seedCompanies.map((company) => company.name);
  const existingCompanies = await db
    .select({ id: companies.id, name: companies.name })
    .from(companies)
    .where(and(inArray(companies.name, seedNames), eq(companies.isSeeded, true)));
  const companyIdByName = new Map(existingCompanies.map((company) => [company.name, company.id]));

  const companyPlan = planByName(existingCompanies.map((company) => company.name), seedCompanies);
  summary.skippedExisting += companyPlan.existing.length;
  for (const company of companyPlan.toCreate) {
    const [created] = await db.insert(companies).values({ ...company, isSeeded: true }).returning({ id: companies.id });
    companyIdByName.set(company.name, created.id);
    summary.companies += 1;
  }
  if (summary.companies > 0) console.log(`✅ Created ${summary.companies} seed compan${summary.companies === 1 ? "y" : "ies"}`);

  // ── Documents, metrics and risks per company ───────────────────────────────
  const declaredDocuments = seedCompanies
    .filter((company) => companyIdByName.has(company.name) && seedDocumentContent[company.name])
    .map((company) => ({
      name: `${company.ticker}_2023_Annual_Report.txt`,
      company,
      content: seedDocumentContent[company.name],
    }));
  const existingDocumentRows = declaredDocuments.length
    ? await db
        .select({ fileName: documents.fileName })
        .from(documents)
        .where(and(inArray(documents.fileName, declaredDocuments.map((entry) => entry.name)), eq(documents.isSeeded, true)))
    : [];
  const documentPlan = planByName(existingDocumentRows.map((row) => row.fileName), declaredDocuments);
  summary.skippedExisting += documentPlan.existing.length;

  for (const { name: fileName, company, content } of documentPlan.toCreate) {
    const companyId = companyIdByName.get(company.name);
    if (!companyId) continue;

    const [doc] = await db
      .insert(documents)
      .values({
        sessionId: demoSessionId,
        companyId,
        userId: adminUserId,
        fileName,
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
    summary.documents += 1;

    try {
      await processDocument(doc.id, content);
    } catch (error) {
      console.warn(`Warning: Document processing for ${company.name}:`, error);
    }
    try {
      await indexDocumentEmbeddings(doc.id);
    } catch (error) {
      console.warn(`Warning: Embedding index for ${company.name}:`, error);
    }

    // Curated fixture metrics. These are demo baselines, not an Extraction Agent run.
    const metrics = seedMetrics[company.name];
    if (metrics) {
      await db.insert(financialMetrics).values({
        documentId: doc.id,
        companyId,
        fiscalYear: metrics.fiscalYear,
        fiscalPeriod: "Annual",
        revenue: metrics.revenue,
        revenueGrowth: metrics.revenueGrowth,
        grossProfit: metrics.grossProfit,
        grossMargin: metrics.grossMargin,
        operatingIncome: metrics.operatingIncome,
        operatingMargin: metrics.operatingMargin,
        netIncome: metrics.netIncome,
        netMargin: metrics.netMargin,
        ebitda: metrics.ebitda,
        ebitdaMargin: metrics.ebitdaMargin,
        totalAssets: metrics.totalAssets,
        totalEquity: metrics.totalEquity,
        cashAndEquivalents: metrics.cashAndEquivalents,
        totalDebt: metrics.totalDebt,
        currentRatio: metrics.currentRatio,
        debtToEquity: metrics.debtToEquity,
        roe: metrics.roe,
        roa: metrics.roa,
        eps: metrics.eps,
        operatingCashFlow: metrics.operatingCashFlow,
        freeCashFlow: metrics.freeCashFlow,
        rawMetrics: {
          source: "curated-seed-fixture",
          note: "Demo baseline values for UI and tests; verify against original filings before using.",
        },
      });
      summary.metrics += 1;
    }

    const risks = seedRisks[company.name];
    if (risks && risks.length > 0) {
      await db.insert(riskFlags).values(
        risks.map((risk) => ({
          documentId: doc.id,
          companyId,
          riskType: risk.riskType,
          severity: risk.severity,
          title: risk.title,
          description: risk.description,
          sourceText: risk.sourceText,
          recommendation: risk.recommendation,
        })),
      );
      summary.risks += risks.length;
    }

    console.log(`✅ Seeded ${company.name}`);
  }

  // ── Demo activity logs (only when this run actually created documents) ─────
  if (summary.documents > 0) {
    await db.insert(agentLogs).values([
      {
        sessionId: demoSessionId,
        agentName: "Document Agent",
        action: `Completed indexing ${summary.documents} documents`,
        status: "completed",
        details: "Successfully chunked and indexed all seed company documents",
        duration: 2340,
      },
      {
        sessionId: demoSessionId,
        agentName: "Demo Seed Fixture",
        action: "Loaded curated financial metric baselines",
        status: "completed",
        details: "Fixture values were loaded for AAPL, MSFT, TSLA, and AMZN; the Extraction Agent was not run during seeding.",
        duration: 0,
      },
      {
        sessionId: demoSessionId,
        agentName: "Demo Seed Fixture",
        action: "Loaded curated risk examples",
        status: "completed",
        details: "Curated source-backed risk examples were loaded for demonstration; these are not a Red Flag Agent run.",
        duration: 0,
      },
    ]);
  }

  summary.alreadySeeded = isSeedNoop({ accounts: summary.demoUsers, companies: summary.companies, documents: summary.documents });
  console.log(
    summary.alreadySeeded
      ? "✅ Demo data already present. Nothing to do."
      : "🎉 Database seeding complete!",
  );
  return summary;
}
