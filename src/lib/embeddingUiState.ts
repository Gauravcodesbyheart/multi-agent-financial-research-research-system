/**
 * Shared state for the "Build embeddings" affordance.
 *
 * Whether semantic indexing can run is decided by the environment (is an embeddings
 * provider configured at all?), not by the individual document. Checking only the
 * document's `embeddingStatus` left the button enabled for documents sitting at
 * "pending"/"failed", so every click returned a 400 — which reads as a broken button
 * rather than a missing setting.
 */

export const EMBEDDINGS_UNAVAILABLE_REASON =
  "No embeddings provider is configured. Groq has no embeddings API, so semantic search stays off until you set EMBEDDING_BASE_URL, EMBEDDING_API_KEY and EMBEDDING_MODEL in .env. Keyword search works without it.";

/**
 * @param configured `true`/`false` once the provider config is known, `null` while
 *   still unknown (the UI then falls back to the per-document status instead of
 *   disabling a button that might actually work).
 * @param embeddingStatus the document's own embedding status.
 */
export function isEmbeddingsUnavailable(
  configured: boolean | null,
  embeddingStatus: string | undefined,
): boolean {
  if (configured === false) return true;
  return embeddingStatus === "unavailable";
}

/** Whether the button should be clickable right now. */
export function canBuildEmbeddings(options: {
  configured: boolean | null;
  embeddingStatus: string | undefined;
  processingStatus?: string | undefined;
  chunkCount: number | undefined;
  busy: boolean;
}): boolean {
  if (options.busy) return false;
  if (isEmbeddingsUnavailable(options.configured, options.embeddingStatus)) return false;
  if (options.embeddingStatus === "processing") return false;
  if (!options.chunkCount) return false;
  return true;
}
