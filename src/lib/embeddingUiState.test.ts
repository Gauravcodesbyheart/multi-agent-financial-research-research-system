import assert from "node:assert/strict";
import test from "node:test";
import { canBuildEmbeddings, isEmbeddingsUnavailable } from "./embeddingUiState";

/**
 * Regression guard for a confusing first-run experience: the "Build embeddings"
 * button used to check only the document's own status, so a document at
 * "pending"/"failed" showed a clickable button that always answered 400
 * ("No embedding provider is configured") - which looks like a broken feature
 * rather than a missing optional setting.
 */
test("no provider configured disables the button even when the document looks ready", () => {
  assert.equal(isEmbeddingsUnavailable(false, "pending"), true);
  const canBuild = canBuildEmbeddings({
    configured: false,
    embeddingStatus: "pending",
    processingStatus: "completed",
    chunkCount: 12,
    busy: false,
  });
  assert.equal(canBuild, false, "a click could never succeed, so the button must be disabled");
});

test("an unknown provider state does not block a document whose status allows it", () => {
  assert.equal(isEmbeddingsUnavailable(null, "pending"), false);
  assert.equal(
    canBuildEmbeddings({ configured: null, embeddingStatus: "pending", chunkCount: 5, busy: false }),
    true,
  );
});

test("document-level unavailable still disables the button when a provider exists", () => {
  assert.equal(isEmbeddingsUnavailable(true, "unavailable"), true);
  assert.equal(
    canBuildEmbeddings({ configured: true, embeddingStatus: "unavailable", chunkCount: 5, busy: false }),
    false,
  );
});

test("the button is enabled once a provider exists and the document has chunks", () => {
  assert.equal(
    canBuildEmbeddings({ configured: true, embeddingStatus: "pending", chunkCount: 5, busy: false }),
    true,
  );
  assert.equal(
    canBuildEmbeddings({ configured: true, embeddingStatus: "completed", chunkCount: 5, busy: false }),
    true,
    "rebuilding existing embeddings stays possible",
  );
});

test("busy, in-progress and chunk-less documents stay disabled", () => {
  const base = { configured: true, embeddingStatus: "pending", chunkCount: 5, busy: false };
  assert.equal(canBuildEmbeddings({ ...base, busy: true }), false);
  assert.equal(canBuildEmbeddings({ ...base, embeddingStatus: "processing" }), false);
  assert.equal(canBuildEmbeddings({ ...base, chunkCount: 0 }), false);
  assert.equal(canBuildEmbeddings({ ...base, chunkCount: undefined }), false);
});
