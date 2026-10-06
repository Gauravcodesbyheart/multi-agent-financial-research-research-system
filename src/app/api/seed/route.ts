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
    await seedDatabase();
    return NextResponse.json({ success: true, message: "Database seeded successfully" });
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
