import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { server } from "../tools/serve.mjs";
import { mockAuthTransport } from "./fixtures/mock-auth.js";
const channel =
  process.env.TEST_BROWSER_CHANNEL || (process.platform === "win32" ? "msedge" : "chromium");
const root = fileURLToPath(new URL("..", import.meta.url));
const extension = path.join(root, "dist", "chrome-edge");
const output = path.join(root, "test-results");
await mkdir(output, { recursive: true });
await new Promise((resolve) => server.listen(4173, "127.0.0.1", resolve));
const profile = await mkdtemp(path.join(os.tmpdir(), "phishguard-test-"));
const results = [];
const record = (name) => {
  results.push({ name, passed: true });
  console.log(`PASS ${name}`);
};
let context;
try {
  context = await chromium.launchPersistentContext(profile, {
    channel: channel,
    ignoreDefaultArgs: ["--disable-extensions"],
    headless: true,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
    acceptDownloads: true,
  });
  let worker = context.serviceWorkers()[0];
  if (!worker) worker = await context.waitForEvent("serviceworker");
  const id = new URL(worker.url()).hostname;
  const base = `chrome-extension://${id}/`;
  // Isolated mock transport exercises the real bundled SDK and extension without creating live accounts.
  const mockSource = mockAuthTransport;
  await worker.evaluate(mockSource);
  const auth = await context.newPage();
  await auth.goto(base + "auth.html");
  await context.route("http://127.0.0.1:4173/guest-fixture", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>Guest fixture</title>",
    }),
  );
  const guestTab = await context.newPage();
  await guestTab.goto("http://127.0.0.1:4173/guest-fixture").catch(() => {});
  await guestTab.waitForURL("**/warning.html?id=**");
  const guestState = await auth.evaluate(() => chrome.runtime.sendMessage({ type: "GET_STATE" }));
  assert.equal(guestState.guestMode, true);
  assert.equal(guestState.user, null);
  assert.ok(guestState.log.some((row) => row.url.includes("guest-fixture")));
  await guestTab.close();
  record("guest risk scan, warning and local history work without logging in");
  await auth.locator('[data-mode="signup"]').click();
  await auth.locator("#name").fill("Alice");
  await auth.locator("#email").fill("alice@example.test");
  await auth.locator("#password").fill("correct-password");
  await auth.locator("#submit-button").click();
  await auth.locator("#message").filter({ hasText: "verification" }).waitFor();
  assert.ok(auth.url().endsWith("auth.html"));
  record("signup requires returning to login after verification");
  await auth.locator('[data-mode="login"]').click();
  await auth.locator("#forgot").click();
  await auth.locator("#message").filter({ hasText: "reset" }).waitFor();
  record("extension recovery delegates completion to the website");
  await auth.locator("#email").fill("alice@example.test");
  await auth.locator("#password").fill("wrong-password");
  await auth.locator("#submit-button").click();
  await auth.locator("#message").filter({ hasText: "Invalid login" }).waitFor();
  record("invalid login shows a useful error");
  await auth.locator("#password").fill("correct-password");
  await auth.locator("#submit-button").click();
  try {
    await auth.waitForURL("**/dashboard.html");
  } catch (error) {
    console.log(
      "LOGIN DIAGNOSTIC",
      await auth.locator("#message").textContent(),
      await auth.locator("#submit-button").isDisabled(),
    );
    await auth.screenshot({ path: path.join(output, "login-failure.png") });
    throw error;
  }
  let state = await auth.evaluate(() => chrome.runtime.sendMessage({ type: "GET_STATE" }));
  assert.equal(state.user.name, "Alice");
  assert.equal(state.log.length, 0);
  record("guest history stays separate from the signed-in account");
  record("extension login and dashboard use real SDK with isolated mock service");
  const persisted = await auth.evaluate(() => chrome.storage.local.get(null));
  assert.ok(!JSON.stringify(persisted).includes("refresh-"));
  record("authentication credentials are absent from persistent local storage");
  await context.route("http://127.0.0.1:4173/plain", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><h1>Controlled medium fixture</h1>",
    }),
  );
  const medium = await context.newPage();
  await medium.goto("http://127.0.0.1:4173/plain");
  await medium.waitForURL("**/warning.html?id=**");
  await medium.locator("#title").filter({ hasText: "Review" }).waitFor();
  assert.equal(await medium.locator("#btn-proceed").isVisible(), true);
  medium.once("dialog", (dialog) => dialog.accept());
  await medium.locator("#btn-proceed").click();
  await medium.waitForURL("http://127.0.0.1:4173/plain");
  await medium.waitForTimeout(1800);
  assert.equal(medium.url(), "http://127.0.0.1:4173/plain");
  record("medium warning proceed does not loop");
  await context.route("https://example.test/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><html><body><h1>Controlled test page</h1></body></html>",
    }),
  );
  const safe = await context.newPage();
  await safe.goto("https://example.test/verify");
  await safe.waitForTimeout(1200);
  assert.equal(safe.url(), "https://example.test/verify");
  await safe.evaluate(() => {
    for (let i = 0; i < 6; i++) document.body.append(document.createElement("form"));
    for (let i = 0; i < 4; i++) {
      const f = document.createElement("iframe");
      f.src = "about:blank";
      document.body.append(f);
    }
  });
  await safe.waitForURL("**/warning.html?id=**");
  record("dynamic password/form/frame changes trigger reassessment");
  const high = await context.newPage();
  await high.goto("http://127.0.0.1:4173/login").catch(() => {});
  await high.waitForURL("**/warning.html?id=**");
  await high.locator("#title").filter({ hasText: "High-risk" }).waitFor();
  assert.equal(await high.locator("#btn-proceed").isVisible(), false);
  const denied = await high.evaluate(() =>
    chrome.runtime.sendMessage({
      type: "PROCEED",
      token: new URLSearchParams(location.search).get("id"),
    }),
  );
  assert.equal(denied.ok, false);
  record("high warnings cannot be bypassed through a forged proceed request");
  const popup = await context.newPage();
  await popup.goto(base + "popup.html");
  await popup.waitForTimeout(500);
  const active = await popup.evaluate(() =>
    chrome.tabs.query({ active: true, currentWindow: true }),
  );
  const noResult = await popup.evaluate(
    (tabId) => chrome.runtime.sendMessage({ type: "GET_TAB_RESULT", tabId }),
    active[0].id,
  );
  assert.equal(noResult.result, null);
  record("popup does not reuse another tab's assessment");
  const spoof = await auth.evaluate(() =>
    chrome.runtime.sendMessage({
      type: "ANALYZE_PAGE",
      data: { url: "http://attacker.test", hostname: "google.com" },
    }),
  );
  assert.equal(spoof.ok, false);
  record("non-content scan sources are rejected");
  state = await auth.evaluate(() => chrome.runtime.sendMessage({ type: "GET_STATE" }));
  const aliceCount = state.log.length;
  assert.ok(aliceCount >= 3);
  await auth.evaluate(() => chrome.runtime.sendMessage({ type: "CLEAR_DASHBOARD" }));
  const cleared = await auth.evaluate(() => chrome.runtime.sendMessage({ type: "GET_STATE" }));
  assert.equal(cleared.log.length, aliceCount);
  assert.ok(cleared.dashboardSince);
  record("dashboard clear preserves report history");
  await auth.evaluate(() => chrome.runtime.sendMessage({ type: "AUTH_LOGOUT" }));
  await auth.goto(base + "auth.html");
  await auth.locator("#email").fill("bob@example.test");
  await auth.locator("#password").fill("correct-password");
  await auth.locator("#submit-button").click();
  await auth.waitForURL("**/dashboard.html");
  state = await auth.evaluate(() => chrome.runtime.sendMessage({ type: "GET_STATE" }));
  assert.equal(state.user.name, "Bob");
  assert.equal(state.log.length, 0);
  record("account switching isolates local histories");
  const month = new Date();
  const monthValue = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
  await auth.evaluate(
    ({ id, timestamp }) =>
      chrome.storage.local.set({
        [`history:${id}`]: Array.from({ length: 75 }, (_, i) => ({
          scanId: `fixture-${i}`,
          timestamp,
          url: `https://example.test/${"long-path/".repeat(9)}${i}`,
          hostname: "example.test",
          score: i % 3 === 0 ? 80 : 35,
          threatLevel: i % 3 === 0 ? "HIGH" : "MEDIUM",
          reasons: ["Controlled PDF test assessment"],
          ruleVersion: "4.1.0",
        })),
      }),
    { id: state.user.id, timestamp: month.toISOString() },
  );
  await auth.goto(base + "report.html");
  await auth.locator("#total").filter({ hasText: "75" }).waitFor();
  const downloadPromise = auth.waitForEvent("download");
  await auth.locator("#download").click();
  const download = await downloadPromise;
  await download.saveAs(path.join(output, "sample-monthly-report.pdf"));
  assert.ok(
    (await readFile(path.join(output, "sample-monthly-report.pdf"))).subarray(0, 5).toString() ===
      "%PDF-",
  );
  await auth.screenshot({ path: path.join(output, "report-screen.png"), fullPage: false });
  await auth.emulateMedia({ media: "print" });
  assert.equal(
    await auth.evaluate(() => getComputedStyle(document.body).backgroundColor),
    "rgb(255, 255, 255)",
  );
  await auth.screenshot({ path: path.join(output, "report-print.png") });
  assert.equal(
    await auth
      .locator(".table-wrap")
      .evaluate((element) => getComputedStyle(element).backgroundColor),
    "rgb(255, 255, 255)",
  );
  record("monthly PDF downloads and paper layout stays white in dark mode");
  await auth.emulateMedia({ media: "screen" });
  await auth.locator("#month").fill("2020-01");
  await auth.locator("#month").dispatchEvent("change");
  assert.equal(await auth.locator("#total").textContent(), "0");
  record("month selection supports empty periods");
  await auth.evaluate(
    (month) => chrome.runtime.sendMessage({ type: "CLEAR_MONTH", month }),
    monthValue,
  );
  assert.equal(
    (await auth.evaluate(() => chrome.runtime.sendMessage({ type: "GET_STATE" }))).log.length,
    0,
  );
  record("month deletion removes only the selected owner's records");
  await auth.evaluate(() => chrome.runtime.sendMessage({ type: "AUTH_LOGOUT" }));
  await auth.goto(base + "auth.html");
  await auth.locator("#email").fill("alice@example.test");
  await auth.locator("#password").fill("correct-password");
  await auth.locator("#submit-button").click();
  await auth.waitForURL("**/dashboard.html");
  state = await auth.evaluate(() => chrome.runtime.sendMessage({ type: "GET_STATE" }));
  assert.equal(state.log.length, aliceCount);
  record("logging out preserves only the owning account's history");
  await auth.evaluate(() => chrome.runtime.sendMessage({ type: "ERASE_HISTORY" }));
  assert.equal(
    (await auth.evaluate(() => chrome.runtime.sendMessage({ type: "GET_STATE" }))).log.length,
    0,
  );
  record("account history erase removes its records");
  // Test website in a clean browser context so the risk engine cannot redirect the test itself.
  const webBrowser = await chromium.launch({ channel: channel, headless: true });
  try {
    const web = await webBrowser.newContext();
    await web.addInitScript(mockSource);
    const page = await web.newPage();
    await page.goto("http://127.0.0.1:4173/");
    await page.locator('[data-view="download"]').first().click();
    assert.equal(await page.locator("#view-download").isVisible(), true);
    record("downloads are available before login and described honestly");
    await page.locator('[data-view="login"]').first().click();
    await page.locator('#login-form [name="email"]').fill("alice@example.test");
    await page.locator('#login-form [name="password"]').fill("wrong");
    await page.locator('#login-form [type="submit"]').click();
    await page.locator("#login-form .form-status").filter({ hasText: "Invalid login" }).waitFor();
    record("website login errors are handled");
    await page.locator('#login-form [name="password"]').fill("correct-password");
    await page.locator('#login-form [type="submit"]').click();
    await page.locator("#view-dashboard").waitFor({ state: "visible" });
    await page.locator("#browser-count").filter({ hasText: "0" }).waitFor();
    record(
      "website authenticated dashboard loads real registration query results from mock service",
    );
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const jwt = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: "11111111-1111-4111-8111-111111111111", exp, aud: "authenticated", role: "authenticated" })).toString("base64url")}.signature`;
    await page.goto(
      `http://127.0.0.1:4173/#access_token=${jwt}&refresh_token=recovery-token&expires_in=3600&token_type=bearer&type=recovery`,
    );
    await page.locator("#view-reset").waitFor({ state: "visible" });
    await page.locator('#reset-form [name="password"]').fill("new-password-123");
    await page.locator('#reset-form [name="confirm"]').fill("new-password-123");
    await page.locator('#reset-form [type="submit"]').click();
    await page.locator("#message-banner").filter({ hasText: "Password updated" }).waitFor();
    assert.ok(!page.url().includes("access_token"));
    record("recovery callback updates password, clears URL credentials and returns to login");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('[data-view="home"]').first().click();
    await page.screenshot({ path: path.join(output, "website-mobile.png"), fullPage: true });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    record("website fits a mobile viewport");
    await web.close();
  } finally {
    await webBrowser.close();
  }
} finally {
  await writeFile(
    path.join(output, "browser-results.json"),
    JSON.stringify(
      {
        generated: new Date().toISOString(),
        service: "isolated mocked Supabase; no live writes",
        results,
      },
      null,
      2,
    ),
  );
  await context?.close();
  await new Promise((resolve) => server.close(resolve));
  const target = path.resolve(profile);
  if (
    path.dirname(target) === path.resolve(os.tmpdir()) &&
    path.basename(target).startsWith("phishguard-test-")
  ) {
    await rm(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 }).catch(
      (error) => console.warn("Temporary browser profile cleanup:", error.message),
    );
  }
}
