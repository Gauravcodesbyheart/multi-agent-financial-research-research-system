import assert from "node:assert/strict";
import test from "node:test";
import { generateJSON, getTextAIProvider } from "./llm";

function setEnvironment(values: Record<string, string | undefined>): () => void {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(values)) {
    previous.set(key, process.env[key]);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  return () => {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
}

test("auto provider selection prefers Groq, supports Gemini, and honors disablement", () => {
  const restore = setEnvironment({
    AI_PROVIDER: "auto",
    GROQ_API_KEY: "gsk_test",
    GEMINI_API_KEY: "AIzaSyTest",
  });
  try {
    assert.equal(getTextAIProvider(), "groq");
    process.env.GROQ_API_KEY = "";
    assert.equal(getTextAIProvider(), "gemini");
    process.env.AI_PROVIDER = "none";
    assert.equal(getTextAIProvider(), null);
  } finally {
    restore();
  }
});

test("Groq JSON generation sends an authenticated JSON-mode request and parses the completion", async () => {
  const restore = setEnvironment({
    AI_PROVIDER: "groq",
    GROQ_API_KEY: "gsk_test_key",
    GROQ_MODEL: "openai/gpt-oss-20b",
    GROQ_MAX_COMPLETION_TOKENS: "2048",
  });
  const originalFetch = globalThis.fetch;
  let requestedUrl = "";
  let requestedHeaders: HeadersInit | undefined;
  let requestBody: Record<string, unknown> | undefined;
  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input);
    requestedHeaders = init?.headers;
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(JSON.stringify({
      choices: [{ message: { content: "{\"supported\":true}" } }],
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  try {
    const result = await generateJSON<{ supported: boolean }>(
      "Return a small JSON object.",
      "Return valid JSON only.",
    );
    assert.deepEqual(result, { supported: true });
    assert.equal(requestedUrl, "https://api.groq.com/openai/v1/chat/completions");
    assert.equal(new Headers(requestedHeaders).get("authorization"), "Bearer gsk_test_key");
    assert.equal(requestBody?.model, "openai/gpt-oss-20b");
    assert.deepEqual(requestBody?.response_format, { type: "json_object" });
    assert.equal(requestBody?.reasoning_format, "hidden");
    assert.equal(requestBody?.max_completion_tokens, 2048);
    const messages = requestBody?.messages as Array<{ role: string; content: string }>;
    assert.equal(messages.length, 1);
    assert.equal(messages[0].role, "user");
    assert.match(messages[0].content, /INSTRUCTIONS:[\s\S]*Return valid JSON only\.[\s\S]*REQUEST:/);
  } finally {
    globalThis.fetch = originalFetch;
    restore();
  }
});

test("explicit Groq selection fails clearly when its key is missing", () => {
  const restore = setEnvironment({ AI_PROVIDER: "groq", GROQ_API_KEY: undefined });
  try {
    assert.throws(() => getTextAIProvider(), /GROQ_API_KEY is missing/);
  } finally {
    restore();
  }
});
