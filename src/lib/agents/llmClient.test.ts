import assert from "node:assert/strict";
import test from "node:test";
import { computeRetryDelayMs, withJsonModeInstruction } from "./llmClient";

/**
 * Groq returns 400 `json_validate_failed` when response_format=json_object is sent
 * without the word "JSON" in the messages. These tests pin the guard that keeps
 * every JSON-mode caller compatible with the real API.
 */
test("adds the JSON instruction when neither system nor prompt mentions JSON", () => {
  const system = withJsonModeInstruction("You are a financial analyst.", "Extract the revenue figures.");
  assert.match(system ?? "", /\bJSON\b/);
});

test("works when there is no system instruction at all", () => {
  assert.match(withJsonModeInstruction(undefined, "Extract everything.") ?? "", /\bJSON\b/);
});

test("leaves an already-compliant system instruction untouched", () => {
  const original = "Return a JSON object with the extracted metrics.";
  assert.equal(withJsonModeInstruction(original, "Extract."), original);
});

test("accepts JSON wording that appears only in the user prompt", () => {
  const original = "Extract the metrics.";
  assert.equal(withJsonModeInstruction(original, "Respond as JSON."), original);
});

test("errs toward adding the instruction when JSON is only lowercase", () => {
  // Groq documents the requirement as the word "JSON"; the guard is deliberately
  // case-sensitive so a lowercase "json" still triggers the extra instruction
  // rather than risking a 400 from a stricter server.
  const system = withJsonModeInstruction("return json please", "Extract.");
  assert.match(system ?? "", /\bJSON\b/);
});

test("rate-limit retry uses Groq's fractional-second body hint plus a safety cushion", () => {
  assert.equal(computeRetryDelayMs(0, { body: "Please try again in 7.41s." }), 7660);
});

test("rate-limit retry accepts Retry-After seconds, milliseconds, and Groq reset headers", () => {
  assert.equal(computeRetryDelayMs(0, { retryAfter: "2" }), 2250);
  assert.equal(computeRetryDelayMs(0, { retryAfterMs: "900" }), 1250);
  assert.equal(computeRetryDelayMs(0, { resetTokens: "5s" }), 5250);
});

test("transient failures retain exponential backoff when the provider gives no hint", () => {
  assert.equal(computeRetryDelayMs(2), 4250);
});
