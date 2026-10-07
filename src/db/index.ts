import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { defaultPoolMax, neonWarnings, needsSsl } from "@/lib/dbConfig";

const connectionString = process.env.DATABASE_URL?.trim();

if (!connectionString) {
  // Fail loudly at import time. Previously this fell through to the `pg` default
  // (localhost:5432) and every route failed with an opaque ECONNREFUSED.
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env and paste your Neon connection string (Project → Connect → Pooled connection).",
  );
}

for (const warning of neonWarnings(connectionString)) {
  console.warn(`[db] ${warning}`);
}

const globalForDb = globalThis as unknown as { __finresearchPool?: Pool };

// Reuse one pool across dev-server hot reloads instead of leaking a pool per reload.
const pool = globalForDb.__finresearchPool ?? new Pool({
  connectionString,
  max: Number(process.env.DATABASE_POOL_MAX || defaultPoolMax()),
  idleTimeoutMillis: 30_000,
  // Without this, an unreachable database hangs the request until the platform
  // timeout instead of returning a diagnosable error.
  connectionTimeoutMillis: Number(process.env.DATABASE_CONNECT_TIMEOUT_MS || 10_000),
  ...(needsSsl(connectionString) ? { ssl: { rejectUnauthorized: false } } : {}),
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error);
});

if (process.env.NODE_ENV !== "production") globalForDb.__finresearchPool = pool;

export const db = drizzle(pool, { schema });
export type DB = typeof db;
