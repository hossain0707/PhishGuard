// Multi-stage, explainable heuristics for two FYP categories: credential phishing and
// brand impersonation. These are prototype weights, NOT probabilities or calibrated accuracy.
export const RULE_VERSION = "4.2.0";
export const KEYWORDS = ["login", "signin", "verify", "account", "password", "credential", "confirm", "secure", "update", "prize", "winner"];
export const SAFE_DOMAINS = ["google.com", "youtube.com", "wikipedia.org", "github.com", "microsoft.com", "apple.com", "amazon.com", "bbc.com", "cnn.com", "stackoverflow.com", "mozilla.org", "netflix.com", "linkedin.com", "x.com", "facebook.com", "instagram.com"];
const BRANDS = [
  { name: "google", domains: ["google.com", "google.co.uk"] },
  { name: "microsoft", domains: ["microsoft.com", "live.com", "office.com"] },
  { name: "paypal", domains: ["paypal.com"] },
  { name: "apple", domains: ["apple.com", "icloud.com"] },
  { name: "amazon", domains: ["amazon.com", "amazon.co.uk"] },
  { name: "facebook", domains: ["facebook.com", "fb.com"] },
  { name: "instagram", domains: ["instagram.com"] },
  { name: "github", domains: ["github.com"] },
];
export function levelFor(score) { return score > 70 ? "HIGH" : score > 30 ? "MEDIUM" : "LOW"; }
export function isSafeDomain(host) {
  const normalized = String(host).toLowerCase().replace(/\.$/, "");
  return SAFE_DOMAINS.some((domain) => normalized === domain || normalized.endsWith(`.${domain}`));
}
export function httpUrl(raw) {
  try { const url = new URL(raw); return ["http:", "https:"].includes(url.protocol) ? url : null; }
  catch { return null; }
}
export function redactUrl(raw) {
  const url = httpUrl(raw); if (!url) return "";
  return `${url.origin}${url.pathname}`.slice(0, 2048);
}
function count(value) { return Number.isFinite(value) ? Math.max(0, Math.min(1000, Math.floor(value))) : 0; }
function editOne(a, b) {
  if (Math.abs(a.length - b.length) > 1 || a === b) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (a.length < b.length) j++;
    else { i++; j++; }
  }
  return edits + Number(i < a.length || j < b.length) === 1;
}
export function inspectDomain(host) {
  const hostname = String(host).toLowerCase().replace(/\.$/, "");
  const labels = hostname.split(".");
  const local = labels.slice(0, -1);
  if (BRANDS.some((brand) => brand.domains.some((d) => hostname === d || hostname.endsWith(`.${d}`)))) {
    return { impersonatedBrand: null, evidence: "Official domain match is context only; it does not prove safety." };
  }
  // Look at labels, not arbitrary substrings: innocent 'applepie' should not equal 'apple'.
  for (const brand of BRANDS) {
    if (local.some((label) => label.split("-").includes(brand.name)) ||
        hostname.includes(`${brand.name}.com.`)) {
      return { impersonatedBrand: brand.name, evidence: "Brand name appears in an unverified domain." };
    }
    if (brand.name.length >= 5 && local.some((label) => label.length >= 5 && editOne(label, brand.name))) {
      return { impersonatedBrand: brand.name, evidence: "Domain label resembles a protected brand (single edit)." };
    }
  }
  return { impersonatedBrand: null, evidence: "" };
}
export function analyze(raw, counts = {}, options = {}) {
  const url = httpUrl(raw);
  if (!url) throw new Error("Only HTTP and HTTPS URLs can be analysed.");
  const host = url.hostname.toLowerCase();
  const domain = inspectDomain(host);
  const stages = [];
  const reasons = [];
  let score = 0;
  function stage(name, checks) {
    const findings = [];
    let points = 0;
    for (const [condition, weight, reason] of checks) {
      if (!condition) continue;
      points += weight;
      findings.push(reason);
      reasons.push(`${reason}: +${weight} pts`);
    }
    score += points;
    stages.push({ name, points, findings });
  }
  const lexical = `${url.pathname}${url.search}`.toLowerCase();
  const bait = KEYWORDS.find((word) => new RegExp(`(^|[^a-z])${word}([^a-z]|$)`).test(lexical));
  stage("URL structure", [
    [url.protocol === "http:", 10, "Unencrypted HTTP transport (not proof of phishing)"],
    [!!bait, 6, `Context keyword in URL (${bait})`],
    [url.username !== "" || url.password !== "", 12, "URL contains userinfo"],
    [url.href.length > 150, 6, "Unusually long URL"],
    [host.split(".").length >= 5, 6, "Numerous domain labels"],
    [/^(\d{1,3}\.){3}\d{1,3}$/.test(host) || host.startsWith("["), 20, "IP address used as hostname"],
    [host.includes("xn--"), 8, "Internationalized domain requires human verification"],
  ]);
  stage("Domain verification", [
    [!!domain.impersonatedBrand, 40, `Possible ${domain.impersonatedBrand || ""} brand impersonation: ${domain.evidence}`],
  ]);
  stage("Credential-page indicators", [
    [url.protocol === "http:" && count(counts.inputCount) > 0, 35, "Password form on HTTP connection"],
    [count(counts.crossOriginPasswordForm) > 0, 20, "Password form submits to another origin"],
    [count(counts.iframeCount) > 3, 6, "Unusually many embedded frames"],
    [count(counts.formCount) > 5, 6, "Unusually many forms"],
  ]);
  // Reputation verdict can only be supplied by a trusted caller, not by webpage content.
  // Unknown/unavailable/clean does NOT subtract risk. No URL is transmitted by analyze().
  const knownMalicious = options.reputation === "malicious";
  if (knownMalicious) score = Math.max(score, 90);
  stages.push({
    name: "Reputation intelligence",
    points: knownMalicious ? 90 : 0,
    findings: [knownMalicious ? "Reported malicious by a configured trusted source" : "No verified malicious verdict available; reputation is inconclusive"],
    status: knownMalicious ? "confirmed-match" : "unavailable-or-no-match",
  });
  if (knownMalicious) reasons.push("Trusted reputation match (minimum score 90)");
  score = Math.max(0, Math.min(100, score));
  return {
    url: redactUrl(url.href), hostname: host, score, threatLevel: levelFor(score),
    reasons, stages, ruleVersion: RULE_VERSION,
    categories: [domain.impersonatedBrand ? "brand impersonation" : null, count(counts.inputCount) > 0 ? "credential phishing indicator" : null].filter(Boolean),
    reputationStatus: knownMalicious ? "confirmed-match" : "unavailable-or-no-match",
  };
}
