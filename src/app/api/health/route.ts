import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { getAiStatus } from "@/lib/agents/aiStatus";

export async function GET() {
  const ai = getAiStatus();
  try {
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({
      // "degraded" means the app is up but the AI-backed agents cannot synthesize
      // answers (missing key or provider error) and are falling back to local logic.
      status: ai.state === "ready" ? "ok" : ai.state === "degraded" ? "degraded" : "ok",
      app: "FinResearch AI",
      version: "1.0.0",
      database: "connected",
      ai,
      agents: ["Document Agent", "Extraction Agent", "Risk Agent", "Embedding Agent", "Benchmark Agent", "Research Agent", "Report Agent"],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check database query failed:", error);
    return NextResponse.json({
      status: "error",
      error: "Database connection failed",
      ai,
      hint: "Check that DATABASE_URL is reachable and that `npm run db:push` has been applied.",
    }, { status: 500 });
  }
}
