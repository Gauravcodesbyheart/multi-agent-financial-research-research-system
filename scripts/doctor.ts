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
  check(
    "DATABASE_URL",
    Boolean(databaseUrl),
    databaseUrl ? `set (${databaseUrl.replace(/:[^:@/]*@/, ":***@")})` : "missing",
    databaseUrl ? undefined : "Copy .env.example to .env and paste your Neon pooled connection string.",
  );

  const directUrl = process.env.DIRECT_URL?.trim();
  if (databaseUrl && /neon\.tech/i.test(databaseUrl)) {
    check(
      "DIRECT_URL (migrations)",
      Boolean(directUrl),
      directUrl ? "set — migrations will use the direct endpoint" : "not set — migrations will run through the pooled endpoint",
      directUrl ? undefined : "Add DIRECT_URL (Neon direct, non-pooler host) so DDL is not sent through PgBouncer.",
    );
  }

  const secret = process.env.NEXTAUTH_SECRET?.trim();
  const secretOk = Boolean(secret && secret.length >= 16);
  check(
    "NEXTAUTH_SECRET",
    secretOk,
    secret ? `set (${secret.length} chars)` : "missing — using the insecure development fallback",
    secretOk ? undefined : "Generate one with: openssl rand -base64 32",
  );

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
