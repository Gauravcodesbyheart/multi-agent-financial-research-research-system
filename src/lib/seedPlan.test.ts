import assert from "node:assert/strict";
import test from "node:test";
import { isSeedNoop, planAccounts, planByName } from "./seedPlan";

/**
 * Regression guard: seeding used to abort whenever any user row existed
 * (`if (existingUsers.length > 0) return;`) while the endpoint still answered
 * "seeded successfully". Registering an account before seeding therefore
 * produced an empty demo dataset. An unrelated existing user must never
 * suppress demo accounts, companies or documents.
 */
test("planAccounts does not let an unrelated user suppress demo accounts", () => {
  const demo = [{ email: "demo@finresearch.ai" }, { email: "student@finresearch.ai" }];
  const plan = planAccounts(["someone.else@example.com"], demo);
  assert.equal(plan.toCreate.length, 2, "both demo accounts must still be planned");
  assert.equal(plan.existing.length, 0);
});

test("planAccounts reuses demo accounts that already exist, case-insensitively", () => {
  const demo = [{ email: "Demo@FinResearch.ai" }, { email: "student@finresearch.ai" }];
  const plan = planAccounts(["demo@finresearch.ai"], demo);
  assert.deepEqual(plan.toCreate.map((a) => a.email), ["student@finresearch.ai"]);
  assert.equal(plan.existing.length, 1);
});

test("planByName creates only the missing companies and documents", () => {
  const declared = [{ name: "AAPL" }, { name: "MSFT" }, { name: "TSLA" }];
  assert.equal(planByName([], declared).toCreate.length, 3);
  const partial = planByName(["MSFT"], declared);
  assert.deepEqual(partial.toCreate.map((e) => e.name), ["AAPL", "TSLA"]);
  assert.equal(planByName(["AAPL", "MSFT", "TSLA"], declared).toCreate.length, 0);
});

test("isSeedNoop is true only when nothing was created", () => {
  assert.equal(isSeedNoop({ accounts: 0, companies: 0, documents: 0 }), true);
  assert.equal(isSeedNoop({ accounts: 0, companies: 1, documents: 0 }), false);
  assert.equal(isSeedNoop({ accounts: 2, companies: 0, documents: 0 }), false);
});
