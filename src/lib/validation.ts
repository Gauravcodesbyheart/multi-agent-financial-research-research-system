/**
 * Shared input validation.
 *
 * Postgres rejects a malformed UUID with `invalid input syntax for type uuid`.
 * Passing unvalidated user input straight into a `where eq(uuidColumn, value)`
 * therefore surfaced as an unhandled 500 — a client typo or a stale link produced
 * a server error instead of a clean 400. Every dynamic route validates here first.
 */

/**
 * Matches any UUID Postgres will accept (8-4-4-4-12 hex). Deliberately looser than
 * a version/variant check so a legitimate-but-unusual id is never rejected.
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

/** Deduplicates and validates a list of ids (e.g. `companyIds` from a request body). */
export function parseUuidList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const ids = [...new Set(value)];
  if (ids.length === 0 || !ids.every(isUuid)) return null;
  return ids as string[];
}

/** Removes invalid entries instead of failing the whole request. */
export function filterUuidList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(isUuid))];
}

/** Parses a JSON request body, returning null instead of throwing on malformed input. */
export async function readJsonBody(req: { json: () => Promise<unknown> }): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}
