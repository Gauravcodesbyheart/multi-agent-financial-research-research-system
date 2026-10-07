import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_GROQ_EMBEDDING_MODEL,
  resolveEmbeddingConfiguration,
  parseGroqEmbeddingVectors,
} from "./embeddingUtils";

test("embedding provider auto mode prefers Groq when its key is present", () => {
  const config = resolveEmbeddingConfiguration({
    EMBEDDING_PROVIDER: "auto",
    GROQ_API_KEY: "gsk_test-key",
    GEMINI_API_KEY: "AIzaSyTest-key",
  });

  assert.equal(config?.provider, "groq");
  assert.equal(config?.model, DEFAULT_GROQ_EMBEDDING_MODEL);
  assert.equal(config?.modelIdentifier, `groq:${DEFAULT_GROQ_EMBEDDING_MODEL}`);
});

test("embedding provider can be forced to Groq and configured with a custom model", () => {
  const config = resolveEmbeddingConfiguration({
    EMBEDDING_PROVIDER: "groq",
    GROQ_API_KEY: "gsk_test-key",
    GROQ_EMBEDDING_MODEL: "nomic-embed-text-v1_5",
    GEMINI_API_KEY: "AIzaSyTest-key",
  });

  assert.equal(config?.provider, "groq");
  assert.equal(config?.model, "nomic-embed-text-v1_5");
});

test("explicit embedding provider does not silently switch to another provider", () => {
  assert.equal(resolveEmbeddingConfiguration({
    EMBEDDING_PROVIDER: "groq",
    GEMINI_API_KEY: "AIzaSyTest-key",
  }), null);
});

test("embedding auto mode uses Gemini only when Groq is not configured", () => {
  const config = resolveEmbeddingConfiguration({
    EMBEDDING_PROVIDER: "auto",
    GEMINI_API_KEY: "AIzaSyTest-key",
  });

  assert.equal(config?.provider, "gemini");
});

test("embedding auto mode returns null when no API key is configured", () => {
  assert.equal(resolveEmbeddingConfiguration({ EMBEDDING_PROVIDER: "auto" }), null);
});

test("Groq embedding responses are returned in input order by index", () => {
  const vectors = parseGroqEmbeddingVectors({
    data: [
      { index: 1, embedding: [4, 5, 6] },
      { index: 0, embedding: [1, 2, 3] },
    ],
  }, 2);

  assert.deepEqual(vectors, [[1, 2, 3], [4, 5, 6]]);
});

test("Groq embedding responses reject missing or malformed vectors", () => {
  assert.throws(() => parseGroqEmbeddingVectors({ data: [] }, 1), /expected 1/);
  assert.throws(() => parseGroqEmbeddingVectors({ data: [{ index: 0, embedding: [1, Number.NaN] }] }, 1), /invalid embedding vector/);
  assert.throws(() => parseGroqEmbeddingVectors({ data: [{ index: 0, embedding: [1] }, { index: 0, embedding: [2] }] }, 2), /invalid vector index/);
});
