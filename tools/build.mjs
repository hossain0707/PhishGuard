import { build } from "esbuild";
import { zipSync } from "fflate";
import { readFile, writeFile, mkdir, readdir, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { CONFIG } from "../shared/config.js";
import { validateDeploymentConfig } from "../shared/deployment-config.js";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const at = (...parts) => path.join(root, ...parts);
const output = at("dist"),
  website = at("website");
async function files(folder, prefix = "") {
  const result = [];
  for (const item of await readdir(folder, { withFileTypes: true })) {
    if (item.name.startsWith(".")) continue;
    const name = prefix + item.name;
    if (item.isDirectory()) result.push(...(await files(path.join(folder, item.name), name + "/")));
    else result.push([name, await readFile(path.join(folder, item.name))]);
  }
  return result;
}
const lock = JSON.parse(await readFile(at("package-lock.json"), "utf8"));
let notices =
  "PhishGuard third-party notices. Bundled dependency versions are locked in package-lock.json.\n\n";
for (const [directory, metadata] of Object.entries(lock.packages)) {
  if (!directory.startsWith("node_modules/") || metadata.dev) continue;
  const folder = at(directory);
  try {
    const pkg = JSON.parse(await readFile(path.join(folder, "package.json"), "utf8"));
    notices += `\n=== ${pkg.name} ${pkg.version} (${pkg.license || "see package license"}) ===\n`;
    for (const name of await readdir(folder))
      if (/^(license|copying)(\.|$)/i.test(name))
        notices += (await readFile(path.join(folder, name), "utf8")) + "\n";
  } catch {
    /* Optional platform dependency not installed. */
  }
}
const template = JSON.parse(await readFile(at("extension", "manifest.json"), "utf8"));
const version = JSON.parse(await readFile(at("package.json"), "utf8")).version;
const config = validateDeploymentConfig({
  ...CONFIG,
  SUPABASE_URL: process.env.PHISHGUARD_SUPABASE_URL || CONFIG.SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY:
    process.env.PHISHGUARD_SUPABASE_PUBLISHABLE_KEY || CONFIG.SUPABASE_PUBLISHABLE_KEY,
  WEBSITE_URL: process.env.PHISHGUARD_WEBSITE_URL || CONFIG.WEBSITE_URL,
  VERSION: version,
});
// Fail closed on public deployment rather than silently bundling an old paused project.
if (process.env.VERCEL === "1" &&
    (!process.env.PHISHGUARD_SUPABASE_URL || !process.env.PHISHGUARD_SUPABASE_PUBLISHABLE_KEY || !process.env.PHISHGUARD_WEBSITE_URL))
  throw new Error("Vercel deploy requires the three PHISHGUARD_* public environment values. Set active Supabase project details and the exact production website URL.");
const storeHosts = {
  chrome: ["chromewebstore.google.com"],
  edge: ["microsoftedge.microsoft.com"],
  firefox: ["addons.mozilla.org"],
};
const stores = {};
for (const [key, hosts] of Object.entries(storeHosts)) {
  const value = process.env[`PHISHGUARD_STORE_${key.toUpperCase()}_URL`];
  if (!value) continue;
  const url = new URL(value);
  if (url.protocol !== "https:" || !hosts.includes(url.hostname) || url.username || url.password || url.hash)
    throw new Error(`Invalid ${key} store URL. Only genuine official HTTPS store listings are allowed.`);
  stores[key] = url.href;
}
const define = { __PHISHGUARD_CONFIG__: JSON.stringify(config) };
template.content_security_policy.extension_pages =
  template.content_security_policy.extension_pages.replace(
    /connect-src [^;]+;/,
    `connect-src ${config.SUPABASE_URL};`,
  );
const manifests = {
  "chrome-edge": { ...template, version },
  firefox: {
    ...template,
    version,
    background: { scripts: ["background.js"] },
    browser_specific_settings: {
      gecko: {
        id: "phishguard@gmi.edu.my",
        strict_min_version: "142.0",
        data_collection_permissions: {
          required: ["personallyIdentifyingInfo", "authenticationInfo"],
          optional: ["technicalAndInteraction"],
        },
      },
      gecko_android: { strict_min_version: "142.0" },
    },
  },
};
delete manifests.firefox.minimum_chrome_version;
await mkdir(output, { recursive: true });
await mkdir(path.join(website, "downloads"), { recursive: true });
const hashes = [];
for (const [browser, manifest] of Object.entries(manifests)) {
  const destination = at("dist", browser);
  await mkdir(destination, { recursive: true });
  for (const folder of ["pages", "assets"]) {
    for (const [name, bytes] of await files(at("extension", folder))) {
      const target = path.join(destination, name);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, bytes);
    }
  }
  await copyFile(path.join(website, "logo.svg"), path.join(destination, "logo.svg"));
  await writeFile(
    path.join(destination, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  await writeFile(path.join(destination, "THIRD-PARTY-NOTICES.txt"), notices);
  for (const name of [
    "background",
    "content",
    "auth",
    "dashboard",
    "profile",
    "popup",
    "warning",
    "report",
  ]) {
    await build({
      entryPoints: [at("extension", "src", name + ".js")],
      outfile: path.join(destination, name + ".js"),
      bundle: true,
      format: "iife",
      platform: "browser",
      target: ["chrome120", "firefox142"],
      legalComments: "eof",
      define,
    });
  }
  const archive = Object.fromEntries(
    (await files(destination)).map(([name, bytes]) => [name, new Uint8Array(bytes)]),
  );
  const filename = browser === "firefox" ? "PhishGuard-Firefox.zip" : "PhishGuard-Chrome-Edge.zip";
  const bytes = zipSync(archive, { level: 9 });
  await writeFile(path.join(website, "downloads", filename), bytes);
  hashes.push(`${createHash("sha256").update(bytes).digest("hex")}  ${filename}`);
}
await copyFile(path.join(website, "logo.svg"), path.join(website, "favicon.svg"));
await writeFile(path.join(website, "THIRD-PARTY-NOTICES.txt"), notices);
await build({
  entryPoints: [at("website", "src", "script.js")],
  outfile: path.join(website, "script.js"),
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["chrome120", "firefox142"],
  legalComments: "eof",
  define,
});
await writeFile(
  path.join(website, "config.js"),
  `window.PHISHGUARD_CONFIG = ${JSON.stringify(config, null, 2)};\nwindow.PHISHGUARD_STORES = ${JSON.stringify(stores, null, 2)};\n`,
);
await writeFile(path.join(website, "downloads", "SHA256SUMS.txt"), hashes.join("\n") + "\n");
await mkdir(at("test-results"), { recursive: true });
await writeFile(
  at("test-results", "build.json"),
  JSON.stringify(
    {
      version,
      generated: new Date().toISOString(),
      source: "extension/src",
      website: "website",
      generatedBuilds: ["dist/chrome-edge", "dist/firefox"],
    },
    null,
    2,
  ),
);
console.log(`Built PhishGuard ${version}: one source project, two browser targets, one website.`);
