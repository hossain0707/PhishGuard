import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { unzipSync } from "fflate";
test("every distributed ZIP matches the current generated extension sources", async () => {
  for (const browser of ["chrome-edge", "firefox"]) {
    const filename =
      browser === "firefox" ? "PhishGuard-Firefox.zip" : "PhishGuard-Chrome-Edge.zip";
    const bytes = await readFile(new URL(`../website/downloads/${filename}`, import.meta.url));
    const zip = unzipSync(bytes);
    for (const name of [
      "manifest.json",
      "background.js",
      "content.js",
      "auth.js",
      "warning.js",
      "report.js",
    ]) {
      assert.deepEqual(
        Buffer.from(zip[name]),
        await readFile(new URL(`../dist/${browser}/${name}`, import.meta.url)),
      );
    }
    const manifest = JSON.parse(Buffer.from(zip["manifest.json"]).toString());
    assert.equal(manifest.version, "4.2.0");
    assert.equal(manifest.web_accessible_resources, undefined);
    assert.deepEqual(manifest.permissions, ["storage", "tabs"]);
    if (browser === "firefox") {
      assert.equal(manifest.background.service_worker, undefined);
      assert.deepEqual(manifest.background.scripts, ["background.js"]);
      assert.equal(manifest.browser_specific_settings.gecko_android.strict_min_version, "142.0");
    }
  }
});
