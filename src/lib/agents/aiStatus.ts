// AI status registry — the single source of truth for whether the Gemini-backed
// agents can run, which model they will use, and why they last failed.
//
// This is a leaf module: it must not import any other agent module, so that every
// agent (and the health endpoint) can depend on it without creating cycles.

/**
 * Current stable Gemini model line-up. `gemini-3.6-flash` still resolves but is a
 * previous-generation model on a short availability window, so the defaults track
 * the current stable Flash release. Override with GEMINI_MODEL / GEMINI_PRO_MODEL.
 */
export const FALLBACK_CHAT_MODEL = "gemini-3.8-flash";

/** Ordered candidates used when the configured model is rejected or retired. */
export const CHAT_MODEL_FALLBACKS = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
];

export const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || FALLBACK_CHAT_MODEL;
export const DEFAULT_GEMINI_PRO_MODEL = process.env.GEMINI_PRO_MODEL?.trim() || FALLBACK_CHAT_MODEL;
/** Stable until at least 2028; the successor `gemini-embedding-2` uses an incompatible vector space. */
export const DEFAULT_GEMINI_EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL?.trim() || "gemini-embedding-001";

export type AiState = "unconfigured" | "ready" | "degraded" | "error";

interface AiStatusSnapshot {
  configured: boolean;
  state: AiState;
  chatModel: string;
  proModel: string;
  embeddingModel: string;
  lastError: string | null;
  lastErrorAt: string | null;
  lastNotice: string | null;
  lastSuccessAt: string | null;
}

/** Keys shipped in the repo templates are treated as "not configured". */
const PLACEHOLDER_KEY_PATTERN = /^(AIzaSyDemo|your-|replace-|changeme)/i;

let lastError: { message: string; at: string } | null = null;
let lastNotice: string | null = null;
let lastSuccessAt: string | null = null;

/** Returns the configured API key, or null when absent/placeholder. */
export function getGeminiApiKey(): string | null {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) return null;
  if (PLACEHOLDER_KEY_PATTERN.test(apiKey)) return null;
  return apiKey;
}

export function isAiConfigured(): boolean {
  return getGeminiApiKey() !== null;
}

/** Record a failure so `/api/health` and agent fallbacks can explain what broke. */
export function recordAiFailure(error: unknown): void {
  lastError = { message: String(error).slice(0, 500), at: new Date().toISOString() };
}

export function recordAiSuccess(): void {
  lastSuccessAt = new Date().toISOString();
  // A successful call means the provider is healthy again. Keeping the old error
  // would leave /api/health reporting "degraded" forever after one transient blip.
  lastError = null;
}

/** Record a non-fatal substitution, e.g. a model fallback that still succeeded. */
export function recordAiNotice(message: string): void {
  lastNotice = message.slice(0, 300);
}

export function getLastAiError(): string | null {
  return lastError?.message ?? null;
}

/**
 * Human-readable reason the AI-backed agents cannot synthesize an answer.
 * Used in user-facing fallback messages so a missing key is never mistaken
 * for "the documents contain nothing relevant".
 */
export function describeAiUnavailable(): string {
  if (!isAiConfigured()) {
    return "AI synthesis is disabled because GEMINI_API_KEY is not set. Add a valid key to .env and restart the server; retrieval and evidence display keep working meanwhile.";
  }
  if (lastError) return `The last AI request failed: ${lastError.message}`;
  return "AI synthesis is unavailable for an unknown reason.";
}

export function getAiStatus(): AiStatusSnapshot {
  const configured = isAiConfigured();
  const state: AiState = !configured ? "unconfigured" : lastError ? "degraded" : "ready";
  return {
    configured,
    state,
    chatModel: DEFAULT_GEMINI_MODEL,
    proModel: DEFAULT_GEMINI_PRO_MODEL,
    embeddingModel: DEFAULT_GEMINI_EMBEDDING_MODEL,
    lastError: lastError?.message ?? null,
    lastErrorAt: lastError?.at ?? null,
    lastNotice: lastNotice,
    lastSuccessAt,
  };
}

/** Candidate order for a configured model: the requested one first, then known-good fallbacks. */
export function buildModelCandidates(preferred: string): string[] {
  return [preferred, ...CHAT_MODEL_FALLBACKS].filter(
    (model, index, all) => Boolean(model) && all.indexOf(model) === index,
  );
}
