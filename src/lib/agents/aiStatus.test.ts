import test from "node:test";
import assert from "node:assert/strict";
import {
  CHAT_MODEL_FALLBACKS,
  buildModelCandidates,
  describeAiUnavailable,
  getAiStatus,
  isAiConfigured,
  recordAiFailure,
  recordAiSuccess,
} from "./aiStatus";

test("model candidates keep the configured model first and never duplicate entries", () => {
  const candidates = buildModelCandidates("gemini-3.8-flash");
  assert.equal(candidates[0], "gemini-3.8-flash");
  assert.equal(candidates.length, new Set(candidates).size, "candidates must be unique");
  assert.ok(candidates.length > 1, "a fallback must always be available");
});

test("a retired or unknown configured model still has known-good fallbacks after it", () => {
  const candidates = buildModelCandidates("gemini-does-not-exist");
  assert.equal(candidates[0], "gemini-does-not-exist");
  assert.ok(candidates.includes(CHAT_MODEL_FALLBACKS[0]));
  assert.ok(candidates.length >= 2);
});

test("placeholder API keys are treated as unconfigured", () => {
  const original = process.env.GEMINI_API_KEY;
  try {
    delete process.env.GEMINI_API_KEY;
    assert.equal(isAiConfigured(), false, "an absent key is unconfigured");

    process.env.GEMINI_API_KEY = "   ";
    assert.equal(isAiConfigured(), false, "a blank key is unconfigured");

    process.env.GEMINI_API_KEY = "AIzaSyDemoKeyFromTheReadme";
    assert.equal(isAiConfigured(), false, "a template placeholder is unconfigured");

    process.env.GEMINI_API_KEY = "AIzaSyRealLookingKeyValue123";
    assert.equal(isAiConfigured(), true, "a real-looking key is configured");
  } finally {
    if (original === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = original;
  }
});

test("a missing key explains the fix instead of blaming the documents", () => {
  const original = process.env.GEMINI_API_KEY;
  try {
    delete process.env.GEMINI_API_KEY;
    const reason = describeAiUnavailable();
    assert.match(reason, /GEMINI_API_KEY/);
    assert.match(reason, /retrieval/i, "the message should say retrieval still works");
  } finally {
    if (original === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = original;
  }
});

test("health status reports unconfigured state and records provider failures", () => {
  const original = process.env.GEMINI_API_KEY;
  try {
    delete process.env.GEMINI_API_KEY;
    const unconfigured = getAiStatus();
    assert.equal(unconfigured.configured, false);
    assert.equal(unconfigured.state, "unconfigured");
    assert.equal(unconfigured.lastError, null);

    process.env.GEMINI_API_KEY = "AIzaSyRealLookingKeyValue123";
    recordAiFailure("404 models/gemini-3.6-flash is not found");
    const degraded = getAiStatus();
    assert.equal(degraded.configured, true);
    assert.equal(degraded.state, "degraded");
    assert.match(degraded.lastError || "", /404/);

    recordAiSuccess();
    assert.equal(getAiStatus().state, "ready", "a later success clears the degraded state");
  } finally {
    if (original === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = original;
  }
});
