/**
 * Database connection helpers.
 *
 * Kept separate from the pool itself so the host/SSL decisions are unit-testable
 * without opening a connection. Getting these wrong is the usual cause of
 * "works locally, fails on Neon" deployments.
 */

/** Neon connection strings look like `ep-xxx-<id>.<region>.aws.neon.tech`. */
export function isNeonUrl(url: string): boolean {
  return /neon\.tech/i.test(url);
}

/** Neon's PgBouncer endpoint always includes `-pooler` in the hostname. */
export function isNeonPooled(url: string): boolean {
  return isNeonUrl(url) && /-pooler\./i.test(url);
}

/**
 * Hosted providers (Neon, Supabase, Render, Vercel) require TLS. Local servers and
 * CI containers normally do not, so decide from the host rather than forcing SSL
 * everywhere — forcing it breaks local Postgres.
 */
export function needsSsl(url: string): boolean {
  if (/[?&]sslmode=(disable|allow|prefer)/i.test(url)) return false;
  if (/[?&]sslmode=(require|verify-ca|verify-full)/i.test(url)) return true;
  return !/@(localhost|127\.0\.0\.1|\[::1\]|host\.docker\.internal|db|postgres)[:/]/i.test(url);
}

/**
 * Serverless platforms start many short-lived instances, each with its own pool.
 * Neon's guidance is 1–2 client connections per serverless instance, letting
 * PgBouncer multiplex onto the real Postgres backends.
 */
export function isServerlessRuntime(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.VERCEL || env.AWS_LAMBDA_FUNCTION_NAME || env.NETLIFY || env.CF_PAGES);
}

export function defaultPoolMax(env: Record<string, string | undefined> = process.env): number {
  return isServerlessRuntime(env) ? 2 : 10;
}

/** Configuration problems worth warning about at startup. */
export function neonWarnings(url: string): string[] {
  if (!isNeonUrl(url)) return [];
  const warnings: string[] = [];
  if (!/sslmode=require/i.test(url)) {
    warnings.push(
      "DATABASE_URL points at Neon but has no `sslmode=require`. Neon rejects non-TLS connections; add it to the connection string.",
    );
  }
  if (!isNeonPooled(url)) {
    warnings.push(
      "DATABASE_URL uses Neon's DIRECT endpoint. For serverless deployments use the pooled host " +
        "(`...-pooler.<region>.aws.neon.tech`) to avoid exhausting Neon's connection limit. " +
        "Keep the direct URL in DIRECT_URL for migrations.",
    );
  }
  return warnings;
}
