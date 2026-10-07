import { generateJSON as generateGeminiJSON, generateWithGemini } from "./gemini";

export type TextAIProvider = "groq" | "gemini";

export const DEFAULT_GROQ_MODEL = "openai/gpt-oss-20b";
const GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions";
const MAX_ATTEMPTS = 3;
const DEFAULT_MAX_COMPLETION_TOKENS = 4096;

function configuredKey(name: "GROQ_API_KEY" | "GEMINI_API_KEY"): string | null {
  const value = process.env[name]?.trim();
  if (!value || /^(your[-_ ]|replace[-_ ]with|changeme)/i.test(value)) return null;
  if (name === "GEMINI_API_KEY" && value.startsWith("AIzaSyDemo")) return null;
  return value;
}

/** Resolve the text-model provider without ever exposing API keys to browser code. */
export function getTextAIProvider(): TextAIProvider | null {
  const configuredProvider = (process.env.AI_PROVIDER || "auto").trim().toLowerCase();
  if (configuredProvider === "none") return null;

  if (configuredProvider === "auto") {
    if (configuredKey("GROQ_API_KEY")) return "groq";
    if (configuredKey("GEMINI_API_KEY")) return "gemini";
    return null;
  }

  if (configuredProvider === "groq") {
    if (!configuredKey("GROQ_API_KEY")) {
      throw new Error("AI_PROVIDER is set to groq, but GROQ_API_KEY is missing.");
    }
    return "groq";
  }

  if (configuredProvider === "gemini") {
    if (!configuredKey("GEMINI_API_KEY")) {
      throw new Error("AI_PROVIDER is set to gemini, but GEMINI_API_KEY is missing.");
    }
    return "gemini";
  }

  throw new Error(`Unsupported AI_PROVIDER "${configuredProvider}". Use auto, groq, gemini, or none.`);
}

function maxCompletionTokens(): number {
  const configured = Number.parseInt(process.env.GROQ_MAX_COMPLETION_TOKENS || "", 10);
  if (!Number.isFinite(configured)) return DEFAULT_MAX_COMPLETION_TOKENS;
  return Math.min(32768, Math.max(256, configured));
}

function retryDelay(response: Response | null, attempt: number): number {
  const retryAfter = response?.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.min(5000, Math.max(0, seconds * 1000));
  }
  return Math.min(4000, 500 * 2 ** attempt);
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function responseErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const error = (body as { error?: unknown }).error;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && typeof (error as { message?: unknown }).message === "string") {
    return (error as { message: string }).message;
  }
  return null;
}

async function readBody(response: Response): Promise<{ raw: string; parsed: unknown }> {
  const raw = await response.text();
  if (!raw) return { raw, parsed: null };
  try {
    return { raw, parsed: JSON.parse(raw) as unknown };
  } catch {
    return { raw, parsed: null };
  }
}

async function requestGroqCompletion(
  prompt: string,
  systemInstruction: string,
  jsonMode: boolean,
): Promise<string> {
  const apiKey = configuredKey("GROQ_API_KEY");
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured.");

  const model = process.env.GROQ_MODEL?.trim() || DEFAULT_GROQ_MODEL;
  const requestBody: Record<string, unknown> = {
    model,
    messages: [{
      role: "user",
      // GPT-OSS follows Groq's recommended user-message-only prompt format.
      content: `INSTRUCTIONS:\n${systemInstruction}\n\nREQUEST:\n${prompt}`,
    }],
    max_completion_tokens: maxCompletionTokens(),
  };
  if (jsonMode) requestBody.response_format = { type: "json_object" };
  if (jsonMode && model.startsWith("openai/gpt-oss")) requestBody.reasoning_format = "hidden";

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
    } catch (error) {
      if (attempt === MAX_ATTEMPTS - 1) throw new Error(`Groq request failed: ${String(error)}`);
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
      continue;
    }

    const { raw, parsed } = await readBody(response);
    if (!response.ok) {
      const details = responseErrorMessage(parsed) || raw.slice(0, 500) || response.statusText;
      if (isRetryableStatus(response.status) && attempt < MAX_ATTEMPTS - 1) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay(response, attempt)));
        continue;
      }
      throw new Error(`Groq API error (${response.status}): ${details}`);
    }

    if (!parsed || typeof parsed !== "object") {
      throw new Error("Groq returned an invalid response body.");
    }
    const choices = (parsed as { choices?: unknown }).choices;
    const message = Array.isArray(choices) && choices[0] && typeof choices[0] === "object"
      ? (choices[0] as { message?: unknown }).message
      : null;
    const content = message && typeof message === "object"
      ? (message as { content?: unknown }).content
      : null;
    if (typeof content !== "string" || content.trim().length === 0) {
      throw new Error("Groq returned an empty completion.");
    }
    return content;
  }

  throw new Error("Groq request failed after retries.");
}

function parseJSONResponse<T>(text: string): T {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch (error) {
    const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)?.[1];
    if (fenced) {
      try {
        return JSON.parse(fenced) as T;
      } catch {
        // Preserve the original parser error below for a clear failure path.
      }
    }
    throw new Error(`AI provider returned invalid JSON: ${String(error).slice(0, 240)}`);
  }
}

/** Generate free-form text with Groq by default, Gemini optionally, or no model when disabled. */
export async function generateWithAI(prompt: string, systemInstruction: string): Promise<string> {
  const provider = getTextAIProvider();
  if (!provider) {
    throw new Error("No text AI provider is configured. Set GROQ_API_KEY (recommended) or GEMINI_API_KEY.");
  }
  if (provider === "groq") return requestGroqCompletion(prompt, systemInstruction, false);
  return generateWithGemini(prompt, systemInstruction);
}

/** Generate JSON from the configured text provider; Groq uses its JSON-object response mode. */
export async function generateJSON<T>(prompt: string, systemInstruction: string): Promise<T> {
  const provider = getTextAIProvider();
  if (!provider) {
    throw new Error("No text AI provider is configured. Set GROQ_API_KEY (recommended) or GEMINI_API_KEY.");
  }
  if (provider === "groq") {
    const text = await requestGroqCompletion(prompt, systemInstruction, true);
    return parseJSONResponse<T>(text);
  }
  return generateGeminiJSON<T>(prompt, systemInstruction);
}
