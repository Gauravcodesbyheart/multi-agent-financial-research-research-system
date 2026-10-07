import { NextRequest, NextResponse } from "next/server";
import { seedDatabase } from "@/lib/seed";

async function handleSeed(req: NextRequest) {
  // Demo seeding is open only in local development. Production requires an explicit secret.
  if (process.env.NODE_ENV === "production") {
    const expectedSecret = process.env.SEED_SECRET;
    const providedSecret = req.headers.get("x-seed-secret");
    if (!expectedSecret || !providedSecret || providedSecret !== expectedSecret) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  try {
    const summary = await seedDatabase();
    return NextResponse.json({
      success: true,
      alreadySeeded: summary.alreadySeeded,
      created: {
        demoUsers: summary.demoUsers,
        companies: summary.companies,
        documents: summary.documents,
        metrics: summary.metrics,
        risks: summary.risks,
      },
      skippedExisting: summary.skippedExisting,
      message: summary.alreadySeeded
        ? "Demo data already present — nothing to create"
        : `Seeded ${summary.companies} companies, ${summary.documents} documents, ${summary.metrics} metric sets, ${summary.risks} risk flags`,
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: "Seeding failed. Check server logs." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return handleSeed(req);
}

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ error: "Use the authenticated POST seeding endpoint" }, { status: 405 });
  return handleSeed(req);
}
