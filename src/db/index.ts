import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL?.trim();

if (!connectionString) {
  // Fail loudly at import time. Previously this fell through to the `pg` default
  // (localhost:5432) and every route failed with an opaque ECONNREFUSED.
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env and point DATABASE_URL at your PostgreSQL database.",
  );
}

/**
 * Hosted providers (Neon, Supabase, Render, Vercel Postgres) require TLS. Local
 * servers and CI containers normally do not, so decide from the host rather than
 * forcing SSL everywhere.
 */
function needsSsl(url: string): boolean {
  if (/[?&]sslmode=(disable|allow|prefer)/i.test(url)) return false;
  if (/[?&]sslmode=(require|verify-ca|verify-full)/i.test(url)) return true;
  return !/@(localhost|127\.0\.0\.1|\[::1\]|host\.docker\.internal|db|postgres)[:/]/i.test(url);
}

const globalForDb = globalThis as unknown as { __finresearchPool?: Pool };

// Reuse one pool across dev-server hot reloads instead of leaking a pool per reload.
const pool = globalForDb.__finresearchPool ?? new Pool({
  connectionString,
  max: Number(process.env.DATABASE_POOL_MAX || 10),
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
