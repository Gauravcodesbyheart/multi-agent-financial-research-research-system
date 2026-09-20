import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI: GoogleGenerativeAI | null = null;

export const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
export const DEFAULT_GEMINI_PRO_MODEL = process.env.GEMINI_PRO_MODEL || "gemini-2.0-flash";
const MAX_RETRIES = 3;

function isTransientGeminiError(error: unknown): boolean {
  const message = String(error).toLowerCase();
  return message.includes("503") || message.includes("429") || message.includes("unavailable") || message.includes("high demand");
}

async function generateContentWithRetry(
  model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>,
  prompt: string
) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await model.generateContent(prompt);
    } catch (error) {
      if (!isTransientGeminiError(error) || attempt >= MAX_RETRIES) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt));
    }
  }
}

export function getGeminiClient(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.startsWith("AIzaSyDemo")) {
      throw new Error("GEMINI_API_KEY is not configured. Please add a valid key to .env");
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

export async function generateWithGemini(
  prompt: string,
  systemInstruction?: string,
  modelName = DEFAULT_GEMINI_MODEL
): Promise<string> {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({
    model: modelName,
    systemInstruction: systemInstruction || "You are an expert financial analyst AI assistant.",
  });

  const result = await generateContentWithRetry(model, prompt);
  return result.response.text();
}

export async function generateJSON<T>(
  prompt: string,
  systemInstruction: string,
  modelName = DEFAULT_GEMINI_MODEL
): Promise<T> {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({
    model: modelName,
    systemInstruction,
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const result = await generateContentWithRetry(model, prompt);
  const text = result.response.text();
  return JSON.parse(text) as T;
}
