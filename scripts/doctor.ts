/**
 * Setup doctor — `npm run doctor`
 *
 * Checks the environment, database, schema, and AI configuration, then prints the
 * exact reason each agent would fall back to local logic. Run this first whenever
 * "the agents don't work": every failure mode in this app degrades silently, so
 * this script turns a vague symptom into an actionable list.
 */
import "dotenv/config";
import { Pool } from "pg";
import {
  getAiStatus,
  getEmbeddingConfig,
  isLlmConfigured,
} from "../src/lib/agents/aiStatus";

type CheckResult = { name: string; ok: boolean; detail: string; fix?: string };

const results: CheckResult[] = [];

function check(name: string, ok: boolean, detail: string, fix?: string) {
  results.push({ name, ok, detail, fix });
}

/**
 * Values copied straight out of .env.example are syntactically valid, so they pass
 * shape checks and only fail later as a confusing "password authentication failed".
 * Detect them up front: this is by far the most common first-run mistake.
 */
const PLACEHOLDERS = [
  { pattern: /ep-xxx/i, label: "ep-xxx" },
  { pattern: /user:password/i, label: "user:password" },
  { pattern: /replace-with-a-long-random-secret/i, label: "replace-with-a-long-random-secret" },
  { pattern: /^gsk_your_real_key|your-groq-api-key|^gsk_mock/i, label: "a placeholder API key" },
];

function findPlaceholder(value: string | undefined): string | null {
  if (!value) return null;
  for (const { pattern, label } of PLACEHOLDERS) {
    if (pattern.test(value)) return label;
  }
  return null;
}

const REQUIRED_TABLES = [
  "users",
  "companies",
  "documents",
  "document_chunks",
  "document_processing_jobs",
  "financial_metrics",
  "risk_flags",
  "research_sessions",
  "chat_messages",
  "analysis_reports",
  "benchmark_comparisons",
  "agent_logs",
];

async function main() {
  // --- Environment ---------------------------------------------------------
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const dbPlaceholder = findPlaceholder(databaseUrl);
  check(
    "DATABASE_URL",
    Boolean(databaseUrl) && !dbPlaceholder,
    dbPlaceholder
      ? `still the .env.example placeholder (${dbPlaceholder}) — no real credentials yet`
      : databaseUrl
        ? `set (${databaseUrl.replace(/:[^:@/]*@/, ":***@")})`
        : "missing",
    dbPlaceholder
      ? "Open .env and replace DATABASE_URL with YOUR Neon pooled connection string (Neon dashboard → Connect → Pooled connection)."
      : databaseUrl
        ? undefined
        : "Copy .env.example to .env and paste your Neon pooled connection string.",
  );

  const directUrl = process.env.DIRECT_URL?.trim();
  if (databaseUrl && /neon\.tech/i.test(databaseUrl)) {
    const directPlaceholder = findPlaceholder(directUrl);
    check(
      "DIRECT_URL (migrations)",
      Boolean(directUrl) && !directPlaceholder,
      directPlaceholder
        ? `still the .env.example placeholder (${directPlaceholder})`
        : directUrl
          ? "set — migrations will use the direct endpoint"
          : "not set — migrations will run through the pooled endpoint",
      directPlaceholder
        ? "Replace DIRECT_URL with YOUR Neon direct connection string (Neon dashboard → Connect → Direct connection)."
        : directUrl
          ? undefined
          : "Add DIRECT_URL (Neon direct, non-pooler host) so DDL is not sent through PgBouncer.",
    );
  }

  const secret = process.env.NEXTAUTH_SECRET?.trim();
  const secretPlaceholder = findPlaceholder(secret);
  const secretOk = Boolean(secret && secret.length >= 16) && !secretPlaceholder;
  check(
    "NEXTAUTH_SECRET",
    secretOk,
    secretPlaceholder
      ? "still the .env.example placeholder — it is public, so treat it as unset"
      : secret
        ? `set (${secret.length} chars)`
        : "missing — using the insecure development fallback",
    secretOk ? undefined : "Generate one with: openssl rand -base64 32 and paste it into .env",
  );

  // --- Unrecognised AI settings -------------------------------------------
  // A well-formed .env can still be wrong: if a variable the app never reads is set,
  // it is silently ignored and the symptom shows up much later as "no provider
  // configured" or a missing key. Name the mistake here instead.
  const UNSUPPORTED: Array<{ name: string; hint: string }> = [
    { name: "AI_PROVIDER", hint: "Not used — the provider is inferred from GROQ_API_KEY / LLM_BASE_URL. Remove it." },
    { name: "EMBEDDING_PROVIDER", hint: "Not used — set EMBEDDING_BASE_URL, EMBEDDING_API_KEY and EMBEDDING_MODEL instead." },
    { name: "GROQ_EMBEDDING_MODEL", hint: "Groq has no embeddings API. Point EMBEDDING_BASE_URL at another provider (OpenAI, Ollama, Jina, Voyage) and set EMBEDDING_MODEL to its model id." },
    { name: "GROQ_EMBEDDING_BASE_URL", hint: "Groq has no embeddings API. Use EMBEDDING_BASE_URL with a provider that offers one." },
    { name: "GROQ_MAX_COMPLETION_TOKENS", hint: "Not used — each agent sets its own token budget. Remove it." },
    { name: "MAX_COMPLETION_TOKENS", hint: "Not used — each agent sets its own token budget. Remove it." },
    { name: "GROQ_API_URL", hint: "Use LLM_BASE_URL (defaults to https://api.groq.com/openai/v1)." },
    { name: "GROQ_KEY", hint: "Use GROQ_API_KEY." },
    { name: "GOOGLE_API_KEY", hint: "This app uses Groq. Set GROQ_API_KEY and remove the Gemini key." },
    { name: "GEMINI_API_KEY", hint: "This app uses Groq. Set GROQ_API_KEY and remove the Gemini key." },
  ];
  const ignored = UNSUPPORTED.filter(({ name }) => (process.env[name] || "").trim().length > 0);
  if (ignored.length > 0) {
    check(
      "Unrecognised AI settings",
      false,
      `${ignored.length} variable(s) set that this app never reads: ${ignored.map((entry) => entry.name).join(", ")} — they have no effect`,
      ignored.map((entry) => `${entry.name}: ${entry.hint}`).join("\n                                "),
    );
  } else {
    check("Unrecognised AI settings", true, "none — every AI variable set in .env is read by the app");
  }

  const ai = getAiStatus();
  const aiOk = isLlmConfigured();
  check(
    "GROQ_API_KEY",
    aiOk,
    aiOk ? `configured — ${ai.provider}, model ${ai.chatModel}` : "missing — every AI agent will use local fallbacks only",
    aiOk ? undefined : "Create a key at https://console.groq.com/keys and set GROQ_API_KEY in .env.",
  );

  const embedding = getEmbeddingConfig();
  check(
    "Embeddings",
    true,
    embedding
      ? `semantic search enabled (${embedding.model})`
      : "not configured — keyword retrieval only (Groq has no embeddings API; this is optional)",
    embedding ? undefined : "To enable, set EMBEDDING_BASE_URL / EMBEDDING_API_KEY / EMBEDDING_MODEL to any OpenAI-compatible embeddings provider.",
  );

  // These two are the most common causes of a failing Neon deployment.
  if (databaseUrl && /neon\.tech/i.test(databaseUrl)) {
    check(
      "Neon pooled endpoint",
      /-pooler\./i.test(databaseUrl),
      /-pooler\./i.test(databaseUrl)
        ? "using the pooled (-pooler) host"
        : "using a DIRECT Neon host — serverless deployments can exhaust the connection limit",
      /-pooler\./i.test(databaseUrl) ? undefined : "Switch DATABASE_URL to the pooled endpoint; keep the direct URL in DIRECT_URL for migrations.",
    );
    check(
      "Neon TLS",
      /sslmode=require/i.test(databaseUrl),
      /sslmode=require/i.test(databaseUrl) ? "sslmode=require present" : "sslmode=require missing",
      /sslmode=require/i.test(databaseUrl) ? undefined : "Append ?sslmode=require to the connection string.",
    );
  }
  if (ai.lastError) {
    check("Last AI error", false, ai.lastError, "Verify the key, billing, and model name.");
  }
  if (ai.lastNotice) {
    check("Model fallback", true, ai.lastNotice);
  }

  // --- Database ------------------------------------------------------------
  if (databaseUrl) {
    const pool = new Pool({
      connectionString: databaseUrl,
      connectionTimeoutMillis: 10_000,
      max: 1,
      ...(/(neon\.tech|supabase\.co|render\.com|vercel)/i.test(databaseUrl)
        ? { ssl: { rejectUnauthorized: false } }
        : {}),
    });
    try {
      await pool.query("SELECT 1");
      check("Database connection", true, "connected");

      const tables = await pool.query<{ tablename: string }>(
        "SELECT tablename FROM pg_tables WHERE schemaname = 'public'",
      );
      const present = new Set(tables.rows.map((row) => row.tablename));
      const missing = REQUIRED_TABLES.filter((table) => !present.has(table));
      const schemaOk = missing.length === 0;
      check(
        "Schema / migrations",
        schemaOk,
        schemaOk ? `all ${REQUIRED_TABLES.length} tables present` : `missing: ${missing.join(", ")}`,
        schemaOk ? undefined : "Run: npm run db:push  (or npm run db:migrate)",
      );

      if (schemaOk) {
        const counts = await pool.query<{ documents: string; chunks: string; companies: string }>(
          `SELECT
             (SELECT count(*) FROM documents) AS documents,
             (SELECT count(*) FROM document_chunks) AS chunks,
             (SELECT count(*) FROM companies) AS companies`,
        );
        const { documents, chunks, companies } = counts.rows[0];
        const hasContent = documents !== "0";
        check(
          "Content",
          hasContent,
          `${documents} document(s), ${chunks} chunk(s), ${companies} company/companies`,
          hasContent ? undefined : "Seed demo data with: curl http://localhost:3000/api/seed",
        );

        // The single most common "agents can't see my document" cause.
        const orphaned = await pool.query<{ count: string }>(
          "SELECT count(*) AS count FROM documents WHERE session_id IS NULL",
        );
        if (Number(orphaned.rows[0].count) > 0) {
          check(
            "Session-less documents",
            true,
            `${orphaned.rows[0].count} document(s) uploaded under "Workspace" — the Research Agent searches these in every session`,
          );
        }
      }
    } catch (error) {
      check(
        "Database connection",
        false,
        String(error instanceof Error ? error.message : error).slice(0, 200),
        "Confirm the server is running and the host/port/credentials are correct. Local Postgres default: postgresql://postgres:postgres@127.0.0.1:5432/app_db",
      );
    } finally {
      await pool.end().catch(() => {});
    }
  }

  // --- Report --------------------------------------------------------------
  const pad = Math.max(...results.map((result) => result.name.length));
  let failures = 0;
  console.log("\nFinResearch AI — setup doctor\n");
  for (const result of results) {
    if (!result.ok) failures += 1;
    console.log(`${result.ok ? "  OK  " : " FAIL "} ${result.name.padEnd(pad)}  ${result.detail}`);
    if (result.fix) console.log(`${" ".repeat(pad + 9)}→ ${result.ok ? "hint" : "fix"}: ${result.fix}`);
  }

  console.log(
    failures === 0
      ? "\nAll checks passed. Agents are fully operational.\n"
      : `\n${failures} check(s) need attention. Agents still respond, but they fall back to local, non-AI logic until the items above are fixed.\n`,
  );
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((error) => {
  console.error("Doctor failed to run:", error);
  process.exitCode = 1;
});
