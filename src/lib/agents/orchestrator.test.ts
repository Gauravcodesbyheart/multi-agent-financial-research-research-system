import test from "node:test";
import assert from "node:assert/strict";
import { computeDocumentRetryAt, executeDocumentStages } from "./orchestrator";

test("document pipeline awaits Document, Extraction, Red Flag, then embeddings in order", async () => {
  const events: string[] = [];
  const result = await executeDocumentStages({
    document: async () => { events.push("document:start"); await Promise.resolve(); events.push("document:end"); },
    extraction: async () => { events.push("extraction"); },
    redFlags: async () => { events.push("red-flags"); },
    embeddings: async () => { events.push("embeddings"); },
  });

  assert.deepEqual(events, ["document:start", "document:end", "extraction", "red-flags", "embeddings"]);
  assert.deepEqual(result, { status: "completed", failures: [] });
});

test("document indexing failure stops downstream stages", async () => {
  const events: string[] = [];
  const result = await executeDocumentStages({
    document: async () => { events.push("document"); throw new Error("chunk storage failed"); },
    extraction: async () => { events.push("extraction"); },
    redFlags: async () => { events.push("red-flags"); },
    embeddings: async () => { events.push("embeddings"); },
  });

  assert.deepEqual(events, ["document"]);
  assert.equal(result.status, "failed");
  assert.match(result.failures[0], /Document indexing failed/);
});

test("extraction failure is reported but red flags and optional embeddings still run", async () => {
  const events: string[] = [];
  const result = await executeDocumentStages({
    document: async () => { events.push("document"); },
    extraction: async () => { events.push("extraction"); throw new Error("provider error"); },
    redFlags: async () => { events.push("red-flags"); },
    embeddings: async () => { events.push("embeddings"); },
  });

  assert.deepEqual(events, ["document", "extraction", "red-flags", "embeddings"]);
  assert.equal(result.status, "partial");
  assert.match(result.failures[0], /Extraction Agent: Error: provider error/);
});

test("schedules exponential retries after a partial agent failure and stops at the attempt limit", () => {
  const now = new Date("2026-10-07T00:00:00.000Z");
  assert.equal(computeDocumentRetryAt(1, 3, now)?.getTime(), now.getTime() + 30_000);
  assert.equal(computeDocumentRetryAt(2, 3, now)?.getTime(), now.getTime() + 60_000);
  assert.equal(computeDocumentRetryAt(3, 3, now), null);
});

test("embedding failure does not fail keyword-search document processing", async () => {
  const result = await executeDocumentStages({
    document: async () => undefined,
    extraction: async () => undefined,
    redFlags: async () => undefined,
    embeddings: async () => { throw new Error("embedding unavailable"); },
  });

  assert.deepEqual(result, { status: "completed", failures: [] });
});
