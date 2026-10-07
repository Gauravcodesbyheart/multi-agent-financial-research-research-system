/**
 * Pure planning helpers for the demo seeder.
 *
 * These exist because the seeder used to bail out entirely when *any* user row
 * existed, while the API still reported success — so a database created by
 * registering an account first (the normal order on a new install) silently got
 * no demo data at all. Keeping the "what is missing?" decision in pure functions
 * lets `npm test` guard it without needing a database.
 */

export interface NamedEntity {
  name: string;
}

/** Entities declared in the seed set that are not present yet, plus the ones reused. */
export function planByName<T extends NamedEntity>(
  existingNames: string[],
  declared: T[],
): { toCreate: T[]; existing: T[] } {
  const present = new Set(existingNames);
  const toCreate: T[] = [];
  const existing: T[] = [];
  for (const entity of declared) {
    (present.has(entity.name) ? existing : toCreate).push(entity);
  }
  return { toCreate, existing };
}

/** Demo accounts that still need to be created, matched by email (case-insensitive). */
export function planAccounts<T extends { email: string }>(
  existingEmails: string[],
  accounts: T[],
): { toCreate: T[]; existing: T[] } {
  const present = new Set(existingEmails.map((email) => email.trim().toLowerCase()));
  const toCreate: T[] = [];
  const existing: T[] = [];
  for (const account of accounts) {
    (present.has(account.email.trim().toLowerCase()) ? existing : toCreate).push(account);
  }
  return { toCreate, existing };
}

/** A seed run is a no-op only when every declared entity already exists. */
export function isSeedNoop(counts: {
  accounts: number;
  companies: number;
  documents: number;
}): boolean {
  return counts.accounts === 0 && counts.companies === 0 && counts.documents === 0;
}
