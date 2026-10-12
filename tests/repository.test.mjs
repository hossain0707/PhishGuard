import test from "node:test";
import assert from "node:assert/strict";
import {readFile,access} from "node:fs/promises";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
const root=fileURLToPath(new URL("..",import.meta.url));
test("one source repository builds both browser targets without old version folders",async()=>{
  for(const name of ["extension/src/background.js","extension/pages/auth.html","website/src/script.js","shared/risk.js","vercel.json"]){await access(new URL(`../${name}`,import.meta.url));}
  for(const name of ["PhishGuard_v4_Chrome_Edge","PhishGuard_v4_Firefox","PhishGuard_HTML_CSS_JS_Source","releases"]){await assert.rejects(access(new URL(`../${name}`,import.meta.url)));}
  const deployment=JSON.parse(await readFile(new URL("../vercel.json",import.meta.url),"utf8"));assert.equal(deployment.outputDirectory,"website");assert.equal(deployment.buildCommand,"npm run build");
});
test("GitHub upload excludes generated builds, dependencies and test output",async()=>{
  // Runs against the actual ignore configuration rather than matching text in .gitignore.
  const paths=["node_modules/example.js","dist/chrome-edge/background.js","test-results/example.json","website/script.js","website/downloads/PhishGuard-Firefox.zip"];
  const result=execFileSync("git",["check-ignore",...paths],{cwd:root,encoding:"utf8"}).trim().split(/\r?\n/);
  assert.deepEqual(result,paths);
  const visible=execFileSync("git",["ls-files","--cached","--others","--exclude-standard"],{cwd:root,encoding:"utf8"}).split(/\r?\n/).filter(Boolean);
  assert.ok(visible.includes("extension/src/background.js"));assert.ok(visible.includes("website/src/script.js"));
  assert.ok(!visible.some(name=>name.startsWith("node_modules/")||name.startsWith("dist/")||name.startsWith("test-results/")||name.endsWith(".zip")));
});
