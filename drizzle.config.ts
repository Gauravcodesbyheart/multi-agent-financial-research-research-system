import "dotenv/config";
import { defineConfig } from "drizzle-kit";

/**
 * Migrations must run against Neon's DIRECT (unpooled) endpoint.
 *
 * PgBouncer runs in transaction mode and does not preserve session state, so DDL
 * statements sent through the pooled endpoint can fail or behave unexpectedly.
 * Set DIRECT_URL to the non-pooled connection string and keep DATABASE_URL pooled
 * for application traffic.
 */
const url =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@127.0.0.1:5432/app_db";

if (process.env.DATABASE_URL && url === process.env.DATABASE_URL && /neon\.tech/i.test(url) && /-pooler\./i.test(url)) {
  console.warn(
    "\n[drizzle] DATABASE_URL is a Neon *pooled* endpoint and DIRECT_URL is not set.\n" +
      "[drizzle] Migrations should use the direct endpoint. Add to .env:\n" +
      "[drizzle]   DIRECT_URL=\"postgresql://user:pass@ep-xxx.<region>.aws.neon.tech/db?sslmode=require\"\n",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
});
