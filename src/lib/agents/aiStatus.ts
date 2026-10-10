// AI status registry — the single source of truth for whether the LLM-backed
// agents can run, which model/provider they will use, and why they last failed.
//
// The chat provider is any OpenAI-compatible endpoint; Groq is the default.
// This is a leaf module: it must not import any other agent module, so that every
// agent (and the health endpoint) can depend on it without creating cycles.

/*
 * ── Chat / completion models ───────────────────────────────────────────────────
 * Groq hosts open-weight models. The listed alternates are the documented fallback
 * chain: if the configured model is rejected (renamed, retired, or not enabled for
 * this key) the client walks down the list instead of silently disabling every agent.
 */
export const FALLBACK_CHAT_MODEL = "openai/gpt-oss-120b";

export const CHAT_MODEL_FALLBACKS = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
];

/**
 * Default OpenAI-compatible endpoint. Groq has no embeddings API, so embeddings
 * are configured separately (see below) and are entirely optional.
 */
export const DEFAULT_LLM_BASE_URL = "https://api.groq.com/openai/v1";

/** Placeholder values shipped in docs/templates are treated as "not configured". */
const PLACEHOLDER_PATTERN = /^(your-|replace-|changeme|xxx|gsk_xxx)/i;

function readSecret(...names: string[]): string | null {
  for (const name of names) {
    const value = (process.env[name] || "").trim();
    if (value && !PLACEHOLDER_PATTERN.test(value)) return value;
  }
  return null;
}

export function getLlmBaseUrl(): string {
  return (process.env.LLM_BASE_URL || "").trim().replace(/\/+$/, "") || DEFAULT_LLM_BASE_URL;
}

export const DEFAULT_LLM_MODEL = (process.env.GROQ_MODEL || process.env.LLM_MODEL || "").trim() || FALLBACK_CHAT_MODEL;
export const DEFAULT_LLM_PRO_MODEL =
  (process.env.GROQ_MODEL_PRO || process.env.LLM_MODEL_PRO || "").trim() || DEFAULT_LLM_MODEL;

/** Returns the configured chat API key, or null when absent/placeholder. */
export function getLlmApiKey(): string | null {
  return readSecret("GROQ_API_KEY", "LLM_API_KEY");
}

export function isLlmConfigured(): boolean {
  return getLlmApiKey() !== null;
}

/*
 * ── Optional embeddings ────────────────────────────────────────────────────────
 * Groq does not serve an embeddings endpoint. Semantic search stays off unless a
 * dedicated embedding provider is configured; lexical retrieval always works, so
 * this is an enhancement rather than a requirement.
 */
export function getEmbeddingConfig(): { baseUrl: string; apiKey: string; model: string } | null {
  const apiKey = readSecret("EMBEDDING_API_KEY");
  const baseUrl = (process.env.EMBEDDING_BASE_URL || "").trim().replace(/\/+$/, "");
  const model = (process.env.EMBEDDING_MODEL || "").trim();
  if (!apiKey || !baseUrl || !model) return null;
  return { baseUrl, apiKey, model };
}

export function isEmbeddingConfigured(): boolean {
  return getEmbeddingConfig() !== null;
}

export type AiState = "unconfigured" | "ready" | "degraded";

export interface AiStatusSnapshot {
  provider: string;
  configured: boolean;
  state: AiState;
  chatModel: string;
  proModel: string;
  baseUrl: string;
  /** null when no embedding provider is configured (lexical search only). */
  embedding: { model: string; baseUrl: string } | null;
  lastError: string | null;
  lastErrorAt: string | null;
  lastNotice: string | null;
  lastSuccessAt: string | null;
}

let lastError: { message: string; at: string } | null = null;
let lastNotice: string | null = null;
let lastSuccessAt: string | null = null;

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
 * Human-readable reason the LLM-backed agents cannot synthesize an answer.
 * Used in user-facing fallback messages so a missing key is never mistaken
 * for "the documents contain nothing relevant".
 */
export function describeAiUnavailable(): string {
  if (!isLlmConfigured()) {
    return "AI synthesis is disabled because GROQ_API_KEY is not set. Add your Groq key to .env and restart the server; retrieval and evidence display keep working meanwhile.";
  }
  if (lastError) return `The last AI request failed: ${lastError.message}`;
  return "AI synthesis is unavailable for an unknown reason.";
}

/**
 * Human-readable reason a narrative report fell back to the evidence-only local
 * template. Raw provider errors must never be pasted into a report: they leak
 * internal wording, and reports generated by pre-Groq builds embedded stale advice
 * such as "GEMINI_API_KEY is not configured", which is wrong for the current
 * Groq-based app. Recognize those cases and explain the real fix instead.
 */
export function describeNarrativeFallbackReason(error?: unknown): string {
  const raw = error === undefined || error === null ? "" : String(error);
  if (/gemini_api_key|google_api_key|@google\/generative|generativeai/i.test(raw)) {
    return "an earlier build used the retired Gemini provider; this app now uses Groq — set GROQ_API_KEY and generate the report again";
  }
  if (/(api[_ ]key|bearer|unauthori[sz]ed|401|403)/i.test(raw) && /(not configured|missing|invalid|rejected|expired)/i.test(raw)) {
    return "the AI provider key is missing or was rejected; set GROQ_API_KEY (the default provider is Groq) and generate the report again";
  }
  if (!isLlmConfigured()) {
    return "GROQ_API_KEY is not configured, so AI narrative generation is disabled; the metrics and risk evidence above come from the document pipeline";
  }
  const detail = raw.replace(/^Error:\s*/i, "").trim().slice(0, 200) || "unknown provider error";
  return `the AI request failed (${detail}); the stored metrics and risk evidence above were not affected`;
}

function providerLabel(baseUrl: string): string {
  if (baseUrl.includes("api.groq.com")) return "Groq";
  if (baseUrl.includes("openrouter.ai")) return "OpenRouter";
  if (baseUrl.includes("api.openai.com")) return "OpenAI";
  if (baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1")) return "Local (OpenAI-compatible)";
  return "OpenAI-compatible provider";
}

export function getAiStatus(): AiStatusSnapshot {
  const configured = isLlmConfigured();
  const state: AiState = !configured ? "unconfigured" : lastError ? "degraded" : "ready";
  const baseUrl = getLlmBaseUrl();
  const embedding = getEmbeddingConfig();
  return {
    provider: providerLabel(baseUrl),
    configured,
    state,
    chatModel: DEFAULT_LLM_MODEL,
    proModel: DEFAULT_LLM_PRO_MODEL,
    baseUrl,
    embedding: embedding ? { model: embedding.model, baseUrl: embedding.baseUrl } : null,
    lastError: lastError?.message ?? null,
    lastErrorAt: lastError?.at ?? null,
    lastNotice,
    lastSuccessAt,
  };
}

/** Candidate order for a configured model: the requested one first, then known-good fallbacks. */
export function buildModelCandidates(preferred: string): string[] {
  return [preferred, ...CHAT_MODEL_FALLBACKS].filter(
    (model, index, all) => Boolean(model) && all.indexOf(model) === index,
  );
}