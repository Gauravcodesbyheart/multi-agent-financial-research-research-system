// LLM client — talks to any OpenAI-compatible /chat/completions endpoint.
// Defaults to Groq (https://api.groq.com/openai/v1).
//
// Implemented with fetch rather than a vendor SDK so that switching providers
// (Groq, Together, OpenRouter, Ollama, vLLM, OpenAI) is a base-URL change.
import {
  DEFAULT_LLM_MODEL,
  DEFAULT_LLM_PRO_MODEL,
  buildModelCandidates,
  getLlmApiKey,
  getLlmBaseUrl,
  isLlmConfigured,
  recordAiFailure,
  recordAiNotice,
  recordAiSuccess,
} from "./aiStatus";

export {
  DEFAULT_LLM_MODEL,
  DEFAULT_LLM_PRO_MODEL,
  isLlmConfigured,
  isEmbeddingConfigured,
  getEmbeddingConfig,
} from "./aiStatus";

/** Backwards-compatible aliases for the chat model names. */
export const DEFAULT_LLM_MODEL_PRIMARY = DEFAULT_LLM_MODEL;
export const DEFAULT_LLM_MODEL_PRO = DEFAULT_LLM_PRO_MODEL;

export const AI_NOT_CONFIGURED_MESSAGE =
  "GROQ_API_KEY is not configured. Add your Groq API key to .env and restart the server.";

const MAX_RETRIES = 3;
const REQUEST_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS || 60_000);

type ErrorKind = "transient" | "model_unavailable" | "permanent";

class LlmHttpError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string) {
    super(`LLM request failed (HTTP ${status}): ${body.slice(0, 300)}`);
    this.status = status;
    this.body = body;
  }
}

/**
 * Classify a provider failure so the caller can retry the same model (rate limit /
 * cold start), move to another model (unknown or decommissioned model id), or give
 * up immediately (bad key, malformed request).
 */
function classify(error: unknown): ErrorKind {
  if (error instanceof LlmHttpError) {
    // 400 with an unknown-model body, or 404 for a removed model.
    if (error.status === 404) return "model_unavailable";
    if (error.status === 400 && /model|does not exist|not found|decommission/i.test(error.body)) {
      return "model_unavailable";
    }
    if (error.status === 429) return "transient";
    if (error.status >= 500) return "transient";
    return "permanent";
  }

  const message = String(error).toLowerCase();
  if (message.includes("abort") || message.includes("timeout") || message.includes("econnreset")) {
    return "transient";
  }
  if (message.includes("model") && (message.includes("not found") || message.includes("decommission"))) {
    return "model_unavailable";
  }
  return "permanent";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface CompletionRequest {
  model: string;
  systemInstruction?: string;
  prompt: string;
  json: boolean;
  maxTokens?: number;
}

interface CompletionResult {
  text: string;
  model: string;
}

async function callOnce({ model, systemInstruction, prompt, json, maxTokens }: CompletionRequest): Promise<string> {
  const apiKey = getLlmApiKey();
  if (!apiKey) throw new Error(AI_NOT_CONFIGURED_MESSAGE);

  const messages: ChatMessage[] = [];
  if (systemInstruction) messages.push({ role: "system", content: systemInstruction });
  messages.push({ role: "user", content: prompt });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${getLlmBaseUrl()}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        ...(maxTokens ? { max_tokens: maxTokens } : {}),
        // Groq (and most OpenAI-compatible servers) accept JSON object mode.
        ...(json ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new LlmHttpError(response.status, await response.text().catch(() => ""));
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
      error?: { message?: string };
    };
    if (payload.error?.message) throw new LlmHttpError(400, payload.error.message);

    const text = payload.choices?.[0]?.message?.content ?? "";
    if (!text.trim()) throw new Error("The model returned an empty response.");
    return text;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Run one completion, walking the fallback model chain when a model id has been
 * renamed, retired, or is not enabled for this key. Without this, a single stale
 * model name silently disables every agent while the app still reports healthy.
 */
async function runCompletion(request: CompletionRequest): Promise<CompletionResult> {
  const candidates = buildModelCandidates(request.model);
  let lastError: unknown;

  for (const candidate of candidates) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      try {
        const text = await callOnce({ ...request, model: candidate });
        recordAiSuccess();
        if (candidate !== request.model) {
          recordAiNotice(`Configured model "${request.model}" was unavailable; succeeded with "${candidate}".`);
        }
        return { text, model: candidate };
      } catch (error) {
        lastError = error;
        const kind = classify(error);

        if (kind === "transient" && attempt < MAX_RETRIES) {
          await sleep(1000 * 2 ** attempt);
          continue;
        }
        if (kind === "model_unavailable") break; // try the next candidate model
        recordAiFailure(error);
        throw error;
      }
    }
  }

  recordAiFailure(lastError);
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export async function generateWithLlm(
  prompt: string,
  systemInstruction?: string,
  modelName = DEFAULT_LLM_MODEL,
): Promise<string> {
  const { text } = await runCompletion({
    model: modelName,
    systemInstruction: systemInstruction || "You are an expert financial analyst AI assistant.",
    prompt,
    json: false,
  });
  return text;
}

export async function generateJsonLlm<T>(
  prompt: string,
  systemInstruction: string,
  modelName = DEFAULT_LLM_MODEL,
): Promise<T> {
  const { text } = await runCompletion({ model: modelName, systemInstruction, prompt, json: true });
  return parseJsonResponse<T>(text);
}

/** Tolerate Markdown fences and prose preambles around the JSON payload. */
export function parseJsonResponse<T>(text: string): T {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) return JSON.parse(fenced[1]) as T;
    const start = trimmed.search(/[[{]/);
    const end = Math.max(trimmed.lastIndexOf("}"), trimmed.lastIndexOf("]"));
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1)) as T;
    throw new Error("The model response was not valid JSON.");
  }
}

/**
 * Shared OpenAI-compatible embeddings helper.
 * Groq does not expose an embeddings endpoint, so this is only used when a
 * dedicated embedding provider is configured via EMBEDDING_BASE_URL/API_KEY/MODEL.
 */
export async function requestEmbeddings(inputs: string[], apiKey: string, baseUrl: string, model: string): Promise<number[][]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/embeddings`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, input: inputs }),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new LlmHttpError(response.status, await response.text().catch(() => ""));
    }
    const payload = (await response.json()) as {
      data?: Array<{ embedding?: number[]; index?: number }>;
      error?: { message?: string };
    };
    if (payload.error?.message) throw new LlmHttpError(400, payload.error.message);

    const vectors = (payload.data || [])
      .slice()
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
      .map((row) => row.embedding);
    if (vectors.length !== inputs.length || vectors.some((vector) => !Array.isArray(vector) || vector.length === 0)) {
      throw new Error(`Embedding response mismatch: expected ${inputs.length} vectors, received ${vectors.length}.`);
    }
    for (const vector of vectors) {
      if (vector!.some((value) => !Number.isFinite(value))) {
        throw new Error("Embedding provider returned a non-numeric vector.");
      }
    }
    return vectors as number[][];
  } finally {
    clearTimeout(timer);
  }
}
