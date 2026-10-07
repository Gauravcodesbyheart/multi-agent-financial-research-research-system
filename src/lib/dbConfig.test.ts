import test from "node:test";
import assert from "node:assert/strict";
import { defaultPoolMax, isNeonPooled, isNeonUrl, isServerlessRuntime, neonWarnings, needsSsl } from "./dbConfig";

const NEON_POOLED = "postgresql://u:p@ep-cool-rain-123456-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require";
const NEON_DIRECT = "postgresql://u:p@ep-cool-rain-123456.us-east-2.aws.neon.tech/neondb?sslmode=require";

test("identifies Neon endpoints and their pooled variant", () => {
  assert.equal(isNeonUrl(NEON_POOLED), true);
  assert.equal(isNeonPooled(NEON_POOLED), true);
  assert.equal(isNeonPooled(NEON_DIRECT), false, "the direct endpoint has no -pooler host");
  assert.equal(isNeonPooled("postgresql://postgres:postgres@127.0.0.1:5432/app_db"), false);
});

test("TLS is enabled for hosted databases and disabled for local ones", () => {
  assert.equal(needsSsl(NEON_POOLED), true);
  assert.equal(needsSsl("postgresql://u:p@db.example.com:5432/app"), true, "unknown remote hosts default to TLS");
  assert.equal(needsSsl("postgresql://postgres:postgres@127.0.0.1:5432/app_db"), false);
  assert.equal(needsSsl("postgresql://postgres:postgres@localhost:5432/app_db"), false);
  assert.equal(needsSsl("postgresql://u:p@db:5432/app"), false, "docker-compose service hosts stay plain");
  assert.equal(needsSsl("postgresql://u:p@host:5432/app?sslmode=disable"), false, "explicit opt-out wins");
  assert.equal(needsSsl("postgresql://u:p@localhost:5432/app?sslmode=require"), true, "explicit opt-in wins");
});

test("serverless runtimes get a much smaller pool so Neon is not overwhelmed", () => {
  assert.equal(isServerlessRuntime({}), false);
  assert.equal(defaultPoolMax({}), 10);

  for (const marker of ["VERCEL", "AWS_LAMBDA_FUNCTION_NAME", "NETLIFY", "CF_PAGES"]) {
    assert.equal(isServerlessRuntime({ [marker]: "1" }), true, `${marker} should be detected as serverless`);
    assert.equal(defaultPoolMax({ [marker]: "1" }), 2, "serverless pools stay small by default");
  }
});

test("startup warnings catch the two most common broken Neon setups", () => {
  assert.deepEqual(neonWarnings(NEON_POOLED), [], "a correct pooled URL produces no warnings");

  const noTls = neonWarnings("postgresql://u:p@ep-x-pooler.us-east-2.aws.neon.tech/neondb");
  assert.equal(noTls.length, 1);
  assert.match(noTls[0], /sslmode=require/);

  const direct = neonWarnings(NEON_DIRECT);
  assert.equal(direct.length, 1);
  assert.match(direct[0], /-pooler/);

  const both = neonWarnings("postgresql://u:p@ep-x.us-east-2.aws.neon.tech/neondb");
  assert.equal(both.length, 2, "a direct URL without TLS reports both problems");

  assert.deepEqual(neonWarnings("postgresql://postgres:postgres@127.0.0.1:5432/app_db"), [], "local URLs are not affected");
});
