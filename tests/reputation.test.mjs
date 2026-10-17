import test from "node:test";
import assert from "node:assert/strict";
import handler from "../api/reputation.js";
function response() {
  return {
    code: 200,
    headers: {},
    body: null,
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    },
    status(code) {
      this.code = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    end() {
      return this;
    },
  };
}
const origin = "https://phishgurd.vercel.app";
test("reputation endpoint is fail-closed without a noncommercial provider key", async () => {
  const beforeKey = process.env.PHISHGUARD_SAFE_BROWSING_KEY;
  const beforeSite = process.env.PHISHGUARD_WEBSITE_URL;
  try {
    delete process.env.PHISHGUARD_SAFE_BROWSING_KEY;
    process.env.PHISHGUARD_WEBSITE_URL = origin + "/";
    const res = response();
    await handler(
      { method: "POST", headers: { origin }, body: { url: "https://example.org/login" } },
      res,
    );
    assert.equal(res.code, 503);
    assert.equal(res.body.status, "unavailable");
    const denied = response();
    await handler(
      { method: "POST", headers: { origin: "https://attacker.test" }, body: {} },
      denied,
    );
    assert.equal(denied.code, 403);
    const options = response();
    await handler({ method: "OPTIONS", headers: { origin }, body: {} }, options);
    assert.equal(options.code, 204);
  } finally {
    if (beforeKey === undefined) delete process.env.PHISHGUARD_SAFE_BROWSING_KEY;
    else process.env.PHISHGUARD_SAFE_BROWSING_KEY = beforeKey;
    if (beforeSite === undefined) delete process.env.PHISHGUARD_WEBSITE_URL;
    else process.env.PHISHGUARD_WEBSITE_URL = beforeSite;
  }
});
test("opted-in server lookup strips URL query tokens and never treats no-match as malicious", async () => {
  const oldKey = process.env.PHISHGUARD_SAFE_BROWSING_KEY,
    oldSite = process.env.PHISHGUARD_WEBSITE_URL;
  const oldFetch = globalThis.fetch;
  let sent = null;
  try {
    process.env.PHISHGUARD_SAFE_BROWSING_KEY = "unit-test-only";
    process.env.PHISHGUARD_WEBSITE_URL = origin + "/";
    globalThis.fetch = async (url, options) => {
      assert.equal(new URL(url).origin, "https://safebrowsing.googleapis.com");
      sent = JSON.parse(options.body);
      return {
        ok: true,
        async json() {
          return {};
        },
      };
    };
    const res = response();
    await handler(
      {
        method: "POST",
        headers: { origin },
        body: { url: "https://example.org/login?token=never-send#private" },
      },
      res,
    );
    assert.equal(res.code, 200);
    assert.equal(res.body.status, "no-match");
    assert.equal(sent.threatInfo.threatEntries[0].url, "https://example.org/login");
    const local = response();
    await handler(
      { method: "POST", headers: { origin }, body: { url: "http://127.0.0.1/" } },
      local,
    );
    assert.equal(local.body.status, "unavailable");
  } finally {
    globalThis.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.PHISHGUARD_SAFE_BROWSING_KEY;
    else process.env.PHISHGUARD_SAFE_BROWSING_KEY = oldKey;
    if (oldSite === undefined) delete process.env.PHISHGUARD_WEBSITE_URL;
    else process.env.PHISHGUARD_WEBSITE_URL = oldSite;
  }
});
