import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GEMINI_PRO_MODEL,
  buildModelCandidates,
  getGeminiApiKey,
  isAiConfigured,
  recordAiFailure,
  recordAiNotice,
  recordAiSuccess,
} from "./aiStatus";

export {
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GEMINI_PRO_MODEL,
  DEFAULT_GEMINI_EMBEDDING_MODEL,
  isAiConfigured,
} from "./aiStatus";

let genAI: GoogleGenerativeAI | null = null;
let cachedApiKey: string | null = null;

const MAX_RETRIES = 3;
export const AI_NOT_CONFIGURED_MESSAGE =
  "GEMINI_API_KEY is not configured. Add a valid key to .env and restart the server.";

type ErrorKind = "transient" | "model_unavailable" | "permanent";

/**
 * Classify a Gemini failure so the caller can choose between retrying the same
 * model (rate limit / cold start), moving to another model (retired or unknown
 * model name), or giving up immediately (bad key, malformed request).
 */
function classifyGeminiError(error: unknown): ErrorKind {
  const message = String(error).toLowerCase();

  const isModelProblem =
    message.includes("not found") ||
    message.includes("is not supported") ||
    message.includes("unsupported") ||
    message.includes("invalid model") ||
    message.includes("does not exist") ||
    message.includes("deprecated") ||
    message.includes("no longer available") ||
    message.includes("404");

  // Google returns 404 for models this key cannot see, including retired ones.
  if (isModelProblem) return "model_unavailable";

  const isTransient =
    message.includes("503") ||
    message.includes("429") ||
    message.includes("unavailable") ||
    message.includes("high demand") ||
    message.includes("overloaded") ||
    message.includes("deadline") ||
    message.includes("timeout") ||
    message.includes("econnreset");
  if (isTransient) return "transient";

  return "permanent";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getGeminiClient(): GoogleGenerativeAI {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error(AI_NOT_CONFIGURED_MESSAGE);
  // Rebuild the client if the key changed (e.g. after a hot reload or config fix).
  if (!genAI || cachedApiKey !== apiKey) {
    genAI = new GoogleGenerativeAI(apiKey);
    cachedApiKey = apiKey;
  }
  return genAI;
}

interface GenerationRequest {
  model: string;
  systemInstruction?: string;
  prompt: string;
  json: boolean;
}

/**
 * Run one generation, walking the fallback model chain when a model has been
 * retired or is not visible to this API key. A retired model name would
 * otherwise silently disable every agent while the app still reported "ok".
 */
async function runGeneration({ model, systemInstruction, prompt, json }: GenerationRequest) {
  const client = getGeminiClient();
  const candidates = buildModelCandidates(model);
  let lastError: unknown;

  for (const candidate of candidates) {
    const generativeModel = client.getGenerativeModel({
      model: candidate,
      systemInstruction: systemInstruction || "You are an expert financial analyst AI assistant.",
      ...(json ? { generationConfig: { responseMimeType: "application/json" } } : {}),
    });

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      try {
        const result = await generativeModel.generateContent(prompt);
        // Generation may complete with a blocked/empty response rather than throwing.
        const text = result.response.text();
        if (!text || !text.trim()) throw new Error("The model returned an empty response.");
        recordAiSuccess();
        if (candidate !== model) {
          recordAiNotice(`Configured model "${model}" was unavailable; succeeded with "${candidate}".`);
        }
        return result;
      } catch (error) {
        lastError = error;
        const kind = classifyGeminiError(error);

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

export async function generateWithGemini(
  prompt: string,
  systemInstruction?: string,
  modelName = DEFAULT_GEMINI_MODEL,
): Promise<string> {
  const result = await runGeneration({ model: modelName, systemInstruction, prompt, json: false });
  return result.response.text();
}

export async function generateJSON<T>(
  prompt: string,
  systemInstruction: string,
  modelName = DEFAULT_GEMINI_MODEL,
): Promise<T> {
  const result = await runGeneration({ model: modelName, systemInstruction, prompt, json: true });
  const text = result.response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    // Models occasionally wrap JSON in Markdown fences despite the MIME type.
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) return JSON.parse(fenced[1]) as T;
    const start = text.search(/[[{]/);
    const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
    if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1)) as T;
    recordAiFailure("The model response was not valid JSON.");
    throw new Error("The model response was not valid JSON.");
  }
}
