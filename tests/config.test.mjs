import test from "node:test";
import assert from "node:assert/strict";
import { validateDeploymentConfig } from "../shared/deployment-config.js";
const valid = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
  WEBSITE_URL: "https://example.test/",
};
test("build configuration accepts public keys and normalises a Supabase root URL", () => {
  assert.equal(
    validateDeploymentConfig({ ...valid, SUPABASE_URL: valid.SUPABASE_URL + "/" }).SUPABASE_URL,
    valid.SUPABASE_URL,
  );
});
test("browser bundles reject secret keys and service-role JWTs", () => {
  assert.throws(() =>
    validateDeploymentConfig({ ...valid, SUPABASE_PUBLISHABLE_KEY: "sb_secret_never_bundle" }),
  );
  const jwt = `header.${Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url")}.signature`;
  assert.throws(
    () => validateDeploymentConfig({ ...valid, SUPABASE_PUBLISHABLE_KEY: jwt }),
    /service-role/,
  );
  const anon = `header.${Buffer.from(JSON.stringify({ role: "anon" })).toString("base64url")}.signature`;
  assert.equal(
    validateDeploymentConfig({ ...valid, SUPABASE_PUBLISHABLE_KEY: anon }).SUPABASE_PUBLISHABLE_KEY,
    anon,
  );
});
test("deployment rejects unexpected backend hosts, insecure callbacks and embedded credentials", () => {
  for (const SUPABASE_URL of [
    "http://example.supabase.co",
    "https://attacker.test",
    "https://secret@example.supabase.co",
    "https://example.supabase.co/path",
  ])
    assert.throws(() => validateDeploymentConfig({ ...valid, SUPABASE_URL }));
  assert.throws(() => validateDeploymentConfig({ ...valid, WEBSITE_URL: "http://example.test" }));
  assert.throws(() =>
    validateDeploymentConfig({ ...valid, WEBSITE_URL: "https://password@example.test" }),
  );
  assert.equal(
    validateDeploymentConfig({ ...valid, WEBSITE_URL: "http://localhost:4173/" }).WEBSITE_URL,
    "http://localhost:4173/",
  );
});
