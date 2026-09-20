import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({
      status: "ok",
      app: "FinResearch AI",
      version: "1.0.0",
      database: "connected",
      agents: ["Document Agent", "Extraction Agent", "Risk Agent", "Benchmark Agent", "Research Agent"],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ status: "error", error: String(error) }, { status: 500 });
  }
}
