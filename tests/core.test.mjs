import test from "node:test";
import assert from "node:assert/strict";
import { analyze, isSafeDomain, levelFor, redactUrl } from "../shared/risk.js";
import { appendHistory, countRisks, historyKey, monthKey, selectMonth } from "../shared/history.js";
import { makeReport } from "../shared/pdf.js";
test("safe-domain boundaries reject lookalike suffixes", () => {
  assert.equal(isSafeDomain("evilgoogle.com"), false);
  assert.equal(isSafeDomain("google.com.attacker.test"), false);
  assert.equal(isSafeDomain("accounts.google.com"), true);
  assert.equal(isSafeDomain("GOOGLE.COM."), true);
});
test("threshold boundaries preserve documented ranges", () => {
  assert.deepEqual([0, 30, 31, 70, 71, 100].map(levelFor), [
    "LOW",
    "LOW",
    "MEDIUM",
    "MEDIUM",
    "HIGH",
    "HIGH",
  ]);
});
test("risk rules score controlled examples and both IP families", () => {
  assert.equal(analyze("https://example.org/").score, 0);
  assert.equal(analyze("http://example.org/").score, 35);
  assert.equal(analyze("http://127.0.0.1/login", { inputCount: 1 }).score, 100);
  assert.equal(analyze("https://[::1]/").score, 25);
  assert.equal(
    analyze("https://evilgoogle.com/verify", { iframeCount: 4, formCount: 6 }).score,
    40,
  );
  assert.throws(() => analyze("javascript:alert(1)"));
});
test("URLs stored in history exclude tokens, fragments and credentials", () => {
  assert.equal(
    redactUrl("https://name:password@example.org/path?token=secret#private"),
    "https://example.org/path",
  );
  assert.equal(redactUrl("data:text/html,secret"), "");
});
test("non-finite counts do not inflate scores", () => {
  assert.equal(
    analyze("https://example.org", { iframeCount: Infinity, inputCount: "100", formCount: NaN })
      .score,
    0,
  );
});
test("history separates owners and rejects invalid keys", () => {
  assert.notEqual(historyKey("account-a"), historyKey("account-b"));
  assert.throws(() => historyKey("../../user"));
});
test("updates replace document assessment, retention caps and expiry apply", () => {
  const now = Date.now(),
    timestamp = new Date(now).toISOString();
  let log = appendHistory([], { scanId: "doc", timestamp, score: 0 }, now);
  log = appendHistory(log, { scanId: "doc", timestamp, score: 55 }, now);
  assert.equal(log.length, 1);
  assert.equal(log[0].score, 55);
  const many = Array.from({ length: 5000 }, (_, i) => ({ scanId: `scan-${i}`, timestamp }));
  assert.equal(appendHistory(many, { scanId: "new", timestamp }, now).length, 5000);
  assert.equal(
    appendHistory([{ scanId: "old", timestamp: "2000-01-01" }], { scanId: "new", timestamp }, now)
      .length,
    1,
  );
});
test("month selection and counts handle boundaries and empty data", () => {
  const log = [
    { timestamp: new Date(2026, 9, 1, 0, 0, 0).toISOString(), threatLevel: "LOW" },
    { timestamp: new Date(2026, 10, 1, 0, 0, 0).toISOString(), threatLevel: "HIGH" },
  ];
  assert.equal(selectMonth(log, "2026-10").length, 1);
  assert.deepEqual(countRisks(selectMonth(log, "2026-10")), { LOW: 1, MEDIUM: 0, HIGH: 0 });
  assert.throws(() => selectMonth(log, "2026-99"));
  assert.equal(monthKey(new Date(2026, 9, 12)), "2026-10");
});
test("PDF exporter generates readable paginated and empty reports", async () => {
  const user = { name: "Test User", email: "tester@example.test" };
  const log = Array.from({ length: 150 }, (_, i) => ({
    timestamp: new Date().toISOString(),
    url: `https://example.test/${"long-path/".repeat(15)}${i}`,
    score: 55,
    threatLevel: "MEDIUM",
    reasons: ["HTTP: +35 pts", "URL keyword: +20 pts"],
  }));
  const report = await makeReport(log, user, "2026-10");
  assert.ok(report.pageCount > 1);
  assert.ok(Buffer.from(report.bytes).subarray(0, 5).toString().startsWith("%PDF-"));
  assert.equal((await makeReport([], user, "2026-10")).pageCount, 1);
});
