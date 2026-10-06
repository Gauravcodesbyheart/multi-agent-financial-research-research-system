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
      agents: ["Document Agent", "Extraction Agent", "Risk Agent", "Embedding Agent", "Benchmark Agent", "Research Agent", "Report Agent"],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check database query failed:", error);
    return NextResponse.json({ status: "error", error: "Database connection failed" }, { status: 500 });
  }
}
