import { db } from "@/db";
import {
  users, companies, documents, financialMetrics, riskFlags, researchSessions, agentLogs,
} from "@/db/schema";
import bcrypt from "bcryptjs";
import { seedCompanies, seedDocumentContent, seedMetrics, seedRisks } from "./seedData";
import { processDocument } from "./agents/documentAgent";

export async function seedDatabase() {
  console.log("🌱 Starting database seeding...");

  // Create demo users
  const hashedPassword = await bcrypt.hash("demo123456", 10);

  const existingUsers = await db.select().from(users).limit(1);
  if (existingUsers.length > 0) {
    console.log("✅ Database already seeded. Skipping.");
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
      })
      .returning();

    // Process document (chunking)
    try {
      await processDocument(doc.id, content);
    } catch (e) {
      console.warn(`Warning: Document processing for ${company.name}:`, e);
    }

    // Insert pre-defined metrics
    const metrics = seedMetrics[company.name];
    if (metrics) {
      await db.insert(financialMetrics).values({
        documentId: doc.id,
        companyId: company.id,
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
        rawMetrics: {},
      });
    }

    // Insert risks
    const risks = seedRisks[company.name];
    if (risks && risks.length > 0) {
      await db.insert(riskFlags).values(
        risks.map((r) => ({
          documentId: doc.id,
          companyId: company.id,
          riskType: r.riskType,
          severity: r.severity,
          title: r.title,
          description: r.description,
          sourceText: r.sourceText,
          recommendation: r.recommendation,
        }))
      );
    }

    console.log(`✅ Seeded ${company.name}`);
  }

  // Add agent activity logs
  await db.insert(agentLogs).values([
    {
      sessionId: demoSession.id,
      agentName: "Document Agent",
      action: "Completed indexing 4 documents",
      status: "completed",
      details: "Successfully chunked and indexed all seed company documents",
      duration: 2340,
    },
    {
      sessionId: demoSession.id,
      agentName: "Extraction Agent",
      action: "Extracted metrics from 4 documents",
      status: "completed",
      details: "Revenue, margins, ratios extracted for AAPL, MSFT, TSLA, AMZN",
      duration: 5120,
    },
    {
      sessionId: demoSession.id,
      agentName: "Risk Agent",
      action: "Completed risk scan on 4 documents",
      status: "completed",
      details: "Identified 10 risk factors across all companies",
      duration: 4890,
    },
  ]);

  console.log("🎉 Database seeding complete!");
}
