import { NextRequest, NextResponse } from "next/server";
import { processDueDocumentJobs } from "@/lib/agents/orchestrator";

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "Document worker is not configured" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const results = await processDueDocumentJobs(1);
    return NextResponse.json({
      success: true,
      processed: results.filter((result) => result.claimed).length,
      completed: results.filter((result) => result.status === "completed").length,
      retrying: results.filter((result) => result.status === "retrying").length,
      failed: results.filter((result) => result.status === "failed" || result.status === "partial").length,
      skipped: results.filter((result) => !result.claimed).length,
    });
  } catch (error) {
    console.error("Scheduled document worker failed:", error);
    return NextResponse.json({ error: "Worker run failed. Check server logs." }, { status: 500 });
  }
}
