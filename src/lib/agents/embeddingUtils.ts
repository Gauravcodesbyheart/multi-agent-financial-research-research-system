export type EmbeddingProvider = "groq" | "gemini";

export interface EmbeddingConfiguration {
  provider: EmbeddingProvider;
  model: string;
  /** Stored with each vector so retrieval can reject vectors made by another provider/model. */
  modelIdentifier: string;
  /** Server-only credential; never return this from an API route or log it. */
  apiKey: string;
}

export const DEFAULT_GROQ_EMBEDDING_MODEL = "nomic-embed-text-v1_5";
export const DEFAULT_GEMINI_EMBEDDING_MODEL = "gemini-embedding-001";

function usableKey(name: "GROQ_API_KEY" | "GEMINI_API_KEY", value: string | undefined): string | null {
  const key = value?.trim();
  if (!key || /^(your[-_ ]|replace[-_ ]with|changeme)/i.test(key)) return null;
  if (name === "GEMINI_API_KEY" && key.startsWith("AIzaSyDemo")) return null;
  return key;
}

/**
 * Resolve semantic embeddings separately from the text-generation provider.
 * `auto` prefers Groq when a Groq key is available, then Gemini. Selecting a
 * provider explicitly never silently switches to the other provider.
 */
export function resolveEmbeddingConfiguration(
  env: Record<string, string | undefined> = process.env,
): EmbeddingConfiguration | null {
  const selected = (env.EMBEDDING_PROVIDER || "auto").trim().toLowerCase();
  if (selected === "none") return null;

  const groqKey = usableKey("GROQ_API_KEY", env.GROQ_API_KEY);
  const geminiKey = usableKey("GEMINI_API_KEY", env.GEMINI_API_KEY);
  const groqModel = env.GROQ_EMBEDDING_MODEL?.trim() || DEFAULT_GROQ_EMBEDDING_MODEL;
  const geminiModel = env.GEMINI_EMBEDDING_MODEL?.trim() || DEFAULT_GEMINI_EMBEDDING_MODEL;

  if (selected === "auto") {
    if (groqKey) {
      return {
        provider: "groq",
        model: groqModel,
        modelIdentifier: `groq:${groqModel}`,
        apiKey: groqKey,
      };
    }
    if (geminiKey) {
      return {
        provider: "gemini",
        model: geminiModel,
        modelIdentifier: `gemini:${geminiModel}`,
        apiKey: geminiKey,
      };
    }
    return null;
  }

  if (selected === "groq") {
    return groqKey
      ? { provider: "groq", model: groqModel, modelIdentifier: `groq:${groqModel}`, apiKey: groqKey }
      : null;
  }

  if (selected === "gemini") {
    return geminiKey
      ? { provider: "gemini", model: geminiModel, modelIdentifier: `gemini:${geminiModel}`, apiKey: geminiKey }
      : null;
  }

  throw new Error(`Unsupported EMBEDDING_PROVIDER "${selected}". Use auto, groq, gemini, or none.`);
}

export function missingEmbeddingConfigurationMessage(
  env: Record<string, string | undefined> = process.env,
): string {
  const selected = (env.EMBEDDING_PROVIDER || "auto").trim().toLowerCase();
  if (selected === "groq") return "GROQ_API_KEY is not configured; lexical search remains available.";
  if (selected === "gemini") return "GEMINI_API_KEY is not configured; lexical search remains available.";
  if (selected === "none") return "EMBEDDING_PROVIDER is set to none; lexical search remains available.";
  return "No embedding API key is configured; set GROQ_API_KEY or GEMINI_API_KEY. Lexical search remains available.";
}

/** Validate and put Groq's OpenAI-compatible embedding response in input order. */
export function parseGroqEmbeddingVectors(payload: unknown, expectedCount: number): number[][] {
  if (!payload || typeof payload !== "object") {
    throw new Error("Groq embeddings API returned an invalid response body.");
  }

  const data = (payload as { data?: unknown }).data;
  if (!Array.isArray(data) || data.length !== expectedCount) {
    throw new Error(`Groq embeddings API returned ${Array.isArray(data) ? data.length : 0} vectors; expected ${expectedCount}.`);
  }

  const vectors: Array<number[] | undefined> = new Array(expectedCount);
  data.forEach((item: unknown, position: number) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Groq embeddings API returned an invalid vector at position ${position}.`);
    }
    const entry = item as { index?: unknown; embedding?: unknown };
    const index = Number.isInteger(entry.index) ? entry.index as number : position;
    if (index < 0 || index >= expectedCount || vectors[index]) {
      throw new Error(`Groq embeddings API returned an invalid vector index ${index}.`);
    }
    if (!Array.isArray(entry.embedding) || entry.embedding.length === 0 ||
      entry.embedding.some((value) => typeof value !== "number" || !Number.isFinite(value))) {
      throw new Error(`Groq embeddings API returned an invalid embedding vector at position ${position}.`);
    }
    vectors[index] = entry.embedding as number[];
  });

  if (vectors.some((vector) => !vector)) {
    throw new Error("Groq embeddings API response omitted one or more vectors.");
  }
  const completeVectors = vectors as number[][];
  const dimensions = completeVectors[0]?.length;
  if (!dimensions || completeVectors.some((vector) => vector.length !== dimensions)) {
    throw new Error("Groq embeddings API returned vectors with inconsistent dimensions.");
  }
  return completeVectors;
}
