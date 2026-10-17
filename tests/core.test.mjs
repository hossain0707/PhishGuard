import test from "node:test";
import assert from "node:assert/strict";
import { analyze, isSafeDomain, inspectDomain, levelFor, redactUrl } from "../shared/risk.js";
import { appendHistory, countRisks, historyKey, monthKey, selectMonth } from "../shared/history.js";
import { makeReport } from "../shared/pdf.js";
test("exact-domain matching rejects attacker suffixes", () => {
  assert.equal(isSafeDomain("evilgoogle.com"), false);
  assert.equal(isSafeDomain("google.com.attacker.test"), false);
  assert.equal(isSafeDomain("accounts.google.com"), true);
  assert.equal(isSafeDomain("GOOGLE.COM."), true);
  assert.equal(inspectDomain("paypa1.com").impersonatedBrand, "paypal");
  assert.equal(inspectDomain("login.paypal.com.attacker.test").impersonatedBrand, "paypal");
  assert.equal(inspectDomain("accounts.google.com").impersonatedBrand, null);
  assert.equal(inspectDomain("applepie.example.org").impersonatedBrand, null);
});
test("threshold boundaries remain explicit prototype levels", () => {
  assert.deepEqual([0, 30, 31, 70, 71, 100].map(levelFor), ["LOW", "LOW", "MEDIUM", "MEDIUM", "HIGH", "HIGH"]);
});
test("multi-stage evidence requires corroboration for higher scores", () => {
  assert.equal(analyze("https://example.org/").score, 0);
  assert.equal(analyze("http://example.org/").score, 12);
  assert.equal(analyze("https://example.org/login").score, 6);
  assert.equal(analyze("https://[::1]/").score, 20);
  assert.equal(analyze("http://127.0.0.1/login", { inputCount: 1 }).score, 73);
  assert.equal(analyze("http://127.0.0.1/login", { inputCount: 1 }).threatLevel, "HIGH");
  assert.equal(analyze("https://paypa1.com/verify", { inputCount: 1 }).threatLevel, "MEDIUM");
  assert.equal(analyze("https://paypa1.com/verify", { inputCount: 1, crossOriginPasswordForm: 1 }).threatLevel, "MEDIUM");
  assert.equal(analyze("https://example.org/", {}, { reputation: "malicious" }).threatLevel, "HIGH");
  assert.equal(analyze("https://example.org/", {}, { reputation: "not-found" }).score, 0);
  assert.equal(analyze("https://example.org/login").stages.length, 4);
  assert.throws(() => analyze("javascript:alert(1)"));
});
test("URLs stored in history exclude sensitive URL components", () => {
  assert.equal(redactUrl("https://name:password@example.org/path?token=secret#private"), "https://example.org/path");
  assert.equal(redactUrl("data:text/html,secret"), "");
});
test("non-finite counts do not inflate scores", () => {
  assert.equal(analyze("https://example.org", { iframeCount: Infinity, inputCount: "100", formCount: NaN }).score, 0);
});
test("history separates account owners", () => {
  assert.notEqual(historyKey("account-a"), historyKey("account-b"));
  assert.throws(() => historyKey("../../user"));
});
test("same-document rescans replace events, retention is bounded", () => {
  const now = Date.now(), timestamp = new Date(now).toISOString();
  let log = appendHistory([], { scanId: "doc", timestamp, score: 0 }, now);
  log = appendHistory(log, { scanId: "doc", timestamp, score: 55 }, now);
  assert.equal(log.length, 1); assert.equal(log[0].score, 55);
  const many = Array.from({ length: 5000 }, (_, i) => ({ scanId: `scan-${i}`, timestamp }));
  assert.equal(appendHistory(many, { scanId: "new", timestamp }, now).length, 5000);
  assert.equal(appendHistory([{ scanId: "old", timestamp: "2000-01-01" }], { scanId: "new", timestamp }, now).length, 1);
});
test("calendar months are independent", () => {
  const log = [{timestamp: new Date(2026, 9, 1).toISOString(), threatLevel:"LOW"}, {timestamp:new Date(2026,10,1).toISOString(),threatLevel:"HIGH"}];
  assert.equal(selectMonth(log,"2026-10").length,1);
  assert.deepEqual(countRisks(selectMonth(log,"2026-10")),{LOW:1,MEDIUM:0,HIGH:0});
  assert.throws(()=> selectMonth(log,"2026-99")); assert.equal(monthKey(new Date(2026,9,12)),"2026-10");
});
test("PDF exporter produces paginated and empty reports", async () => {
  const user={name:"Test User",email:"tester@example.test"};
  const log=Array.from({length:150},(_,i)=>({timestamp:new Date().toISOString(), url:`https://example.test/${"long-path/".repeat(15)}${i}`,score:55,threatLevel:"MEDIUM",reasons:["Evidence-based prototype rule"]}));
  const pdf=await makeReport(log,user,"2026-10");
  assert.ok(pdf.pageCount>1);assert.equal(Buffer.from(pdf.bytes).subarray(0,5).toString(),"%PDF-");
  assert.equal((await makeReport([],user,"2026-10")).pageCount,1);
});
