// Capture actual application screens with labelled synthetic data; no real account or browsing record is used.
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { server } from "./serve.mjs";
import { mockAuthTransport } from "../tests/fixtures/mock-auth.js";
const root = fileURLToPath(new URL("..", import.meta.url));
const assets = path.join(root, "docs", "assets");
const channel =
  process.env.TEST_BROWSER_CHANNEL || (process.platform === "win32" ? "msedge" : "chromium");
const profile = await mkdtemp(path.join(os.tmpdir(), "phishguard-demo-"));
await mkdir(assets, { recursive: true });
await mkdir(path.join(root, "test-results"), { recursive: true });
await new Promise((resolve) => server.listen(4173, "127.0.0.1", resolve));
let extension, webBrowser;
const checks = [];
async function capture(page, filename) {
  await page.screenshot({ path: path.join(assets, filename), fullPage: false });
}
async function accessibility(page, name) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  checks.push({
    name,
    violations: result.violations.map(({ id, impact, description, nodes }) => ({
      id,
      impact,
      description,
      targets: nodes.map((node) => node.target),
    })),
  });
}
try {
  webBrowser = await chromium.launch({ channel, headless: true });
  const website = await webBrowser.newContext({ viewport: { width: 1280, height: 800 } });
  await website.addInitScript(mockAuthTransport);
  const home = await website.newPage();
  await home.goto("http://127.0.0.1:4173/");
  await capture(home, "website.png");
  await accessibility(home, "Website home");
  await home.locator('[data-view="login"]').first().click();
  await accessibility(home, "Website login");
  await home.locator('#login-form [name="email"]').fill("alice@example.test");
  await home.locator('#login-form [name="password"]').fill("correct-password");
  await home.locator('#login-form [type="submit"]').click();
  await home.locator("#view-dashboard").waitFor({ state: "visible" });
  await capture(home, "account.png");
  await accessibility(home, "Website account");
  const build = path.join(root, "dist", "chrome-edge");
  extension = await chromium.launchPersistentContext(profile, {
    channel,
    headless: true,
    viewport: { width: 1280, height: 800 },
    ignoreDefaultArgs: ["--disable-extensions"],
    args: [`--disable-extensions-except=${build}`, `--load-extension=${build}`],
  });
  const worker = extension.serviceWorkers()[0] || (await extension.waitForEvent("serviceworker"));
  await worker.evaluate(mockAuthTransport);
  const base = `chrome-extension://${new URL(worker.url()).hostname}/`;
  const page = await extension.newPage();
  await page.goto(base + "auth.html");
  await capture(page, "login.png");
  await accessibility(page, "Extension login");
  await page.locator("#email").fill("alice@example.test");
  await page.locator("#password").fill("correct-password");
  await page.locator("#submit-button").click();
  await page.waitForURL("**/dashboard.html");
  const state = await page.evaluate(() => chrome.runtime.sendMessage({ type: "GET_STATE" }));
  const now = new Date();
  const fixtures = [
    ["https://example.test/guide", 0, "LOW", []],
    [
      "http://127.0.0.1:4173/plain",
      60,
      "MEDIUM",
      ["Unencrypted HTTP connection: +35 pts", "IP address used as hostname: +25 pts"],
    ],
    [
      "http://127.0.0.1:4173/login",
      80,
      "HIGH",
      [
        "Unencrypted HTTP connection: +35 pts",
        "URL keyword (login): +20 pts",
        "IP address used as hostname: +25 pts",
      ],
    ],
    ["https://example.test/news", 0, "LOW", []],
    [
      "https://example.test/verify",
      40,
      "MEDIUM",
      [
        "URL keyword (verify): +20 pts",
        "More than three embedded frames: +10 pts",
        "More than five forms: +10 pts",
      ],
    ],
    ["https://example.test/docs", 0, "LOW", []],
  ].map(([url, score, threatLevel, reasons], index) => ({
    scanId: `demo-${index}`,
    timestamp: new Date(now.getTime() - index * 3600000).toISOString(),
    url,
    hostname: new URL(url).hostname,
    score,
    threatLevel,
    reasons,
    ruleVersion: "4.1.0",
  }));
  await page.evaluate(
    ({ id, fixtures }) => chrome.storage.local.set({ [`history:${id}`]: fixtures }),
    { id: state.user.id, fixtures },
  );
  await page.reload();
  await page.locator("#stat-total").filter({ hasText: "6" }).waitFor();
  await capture(page, "dashboard.png");
  await accessibility(page, "Extension dashboard");
  await extension.route("http://127.0.0.1:4173/plain", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><h1>Controlled risk fixture</h1>",
    }),
  );
  const warning = await extension.newPage();
  await warning.goto("http://127.0.0.1:4173/plain");
  await warning.waitForURL("**/warning.html?id=**");
  await warning.locator("#title").filter({ hasText: "Review" }).waitFor();
  await capture(warning, "warning-medium.png");
  await accessibility(warning, "Medium warning");
  await warning.goto("http://127.0.0.1:4173/login").catch(() => {});
  await warning.waitForURL("**/warning.html?id=**");
  await warning.locator("#title").filter({ hasText: "High-risk" }).waitFor();
  await capture(warning, "warning-high.png");
  await accessibility(warning, "High warning");
  await page.goto(base + "report.html");
  await page.locator("#content").waitFor({ state: "visible" });
  await page.emulateMedia({ media: "print" });
  await capture(page, "report.png");
  await page.emulateMedia({ media: "screen" });
  await accessibility(page, "Monthly report");
  await website.close();
} finally {
  await writeFile(
    path.join(root, "test-results", "accessibility.json"),
    JSON.stringify(
      {
        generated: new Date().toISOString(),
        scope:
          "Automated WCAG A/AA checks on controlled desktop screens, not an accessibility certification",
        checks,
      },
      null,
      2,
    ),
  );
  await extension?.close();
  await webBrowser?.close();
  await new Promise((resolve) => server.close(resolve));
  if (
    path.dirname(path.resolve(profile)) === path.resolve(os.tmpdir()) &&
    path.basename(profile).startsWith("phishguard-demo-")
  )
    await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 });
}
console.log(
  `Captured ${checks.length} real UI screens/checks with synthetic data. See docs/assets and test-results/accessibility.json.`,
);
if (checks.some((check) => check.violations.length))
  throw new Error("Accessibility violations detected; see test-results/accessibility.json.");
