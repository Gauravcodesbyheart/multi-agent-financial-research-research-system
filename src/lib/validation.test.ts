import test from "node:test";
import assert from "node:assert/strict";
import { filterUuidList, isUuid, parseUuidList, readJsonBody } from "./validation";

test("accepts every UUID shape Postgres accepts", () => {
  for (const value of [
    "11111111-1111-4111-8111-111111111111",
    "53f1b1b1-965c-4e14-99f9-283cc3f9283e",
    "00000000-0000-0000-0000-000000000000",
    "ABCDEF01-2345-6789-ABCD-EF0123456789",
  ]) {
    assert.equal(isUuid(value), true, `${value} should be accepted`);
  }
});

test("rejects input that would make Postgres raise invalid input syntax", () => {
  for (const value of [
    "not-a-uuid",
    "xyz",
    "",
    "11111111-1111-4111-8111",
    "11111111-1111-4111-8111-11111111111g",
    " 11111111-1111-4111-8111-111111111111",
    null,
    undefined,
    42,
    {},
    ["11111111-1111-4111-8111-111111111111"],
  ]) {
    assert.equal(isUuid(value), false, `${JSON.stringify(value)} should be rejected`);
  }
});

test("parseUuidList dedupes and rejects the whole list on any bad entry", () => {
  assert.deepEqual(parseUuidList(["11111111-1111-4111-8111-111111111111", "11111111-1111-4111-8111-111111111111"]), [
    "11111111-1111-4111-8111-111111111111",
  ]);
  assert.equal(parseUuidList(["11111111-1111-4111-8111-111111111111", "nope"]), null);
  assert.equal(parseUuidList([]), null);
  assert.equal(parseUuidList("not-an-array"), null);
});

test("filterUuidList drops invalid entries so a request degrades instead of crashing", () => {
  assert.deepEqual(filterUuidList(["11111111-1111-4111-8111-111111111111", "nope", 5, null]), [
    "11111111-1111-4111-8111-111111111111",
  ]);
  assert.deepEqual(filterUuidList(["a", "b"]), [], "all-invalid input becomes an empty list, not a 500");
  assert.deepEqual(filterUuidList(undefined), []);
});

test("readJsonBody returns null instead of throwing on malformed input", async () => {
  const ok = await readJsonBody({ json: async () => ({ a: 1 }) });
  assert.deepEqual(ok, { a: 1 });

  assert.equal(await readJsonBody({ json: async () => { throw new SyntaxError("bad json"); } }), null, "malformed JSON");
  assert.equal(await readJsonBody({ json: async () => [1, 2, 3] }), null, "arrays are not valid bodies");
  assert.equal(await readJsonBody({ json: async () => null }), null, "null is not a valid body");
  assert.equal(await readJsonBody({ json: async () => "string" }), null, "scalars are not valid bodies");
});
