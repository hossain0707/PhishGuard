export const RULE_VERSION = "4.1.0";
export const KEYWORDS = [
  "login",
  "signin",
  "verify",
  "update",
  "account",
  "secure",
  "banking",
  "paypal",
  "ebay",
  "amazon",
  "apple",
  "microsoft",
  "support",
  "confirm",
  "password",
  "credential",
  "free",
  "winner",
  "click",
  "prize",
];
export const SAFE_DOMAINS = [
  "google.com",
  "youtube.com",
  "wikipedia.org",
  "github.com",
  "microsoft.com",
  "apple.com",
  "amazon.com",
  "bbc.com",
  "cnn.com",
  "stackoverflow.com",
  "mozilla.org",
  "netflix.com",
  "linkedin.com",
  "twitter.com",
  "x.com",
  "facebook.com",
  "instagram.com",
];
export function levelFor(score) {
  return score > 70 ? "HIGH" : score > 30 ? "MEDIUM" : "LOW";
}
export function isSafeDomain(host) {
  const normalized = host.toLowerCase().replace(/\.$/, "");
  return SAFE_DOMAINS.some((domain) => normalized === domain || normalized.endsWith(`.${domain}`));
}
export function httpUrl(raw) {
  try {
    const url = new URL(raw);
    return ["http:", "https:"].includes(url.protocol) ? url : null;
  } catch {
    return null;
  }
}
export function redactUrl(raw) {
  const url = httpUrl(raw);
  if (!url) return "";
  // Query strings, fragments and credentials can contain reset tokens or personal data.
  return `${url.origin}${url.pathname}`.slice(0, 2048);
}
function count(value) {
  return Number.isFinite(value) ? Math.max(0, Math.min(1000, Math.floor(value))) : 0;
}
export function analyze(raw, counts = {}) {
  const url = httpUrl(raw);
  if (!url) throw new Error("Only HTTP and HTTPS pages can be analysed.");
  let score = 0;
  const reasons = [];
  const add = (points, description) => {
    score += points;
    reasons.push(`${description}: +${points} pts`);
  };
  if (url.protocol !== "https:") add(35, "Unencrypted HTTP connection");
  const keyword = KEYWORDS.find((word) => url.href.toLowerCase().includes(word));
  if (keyword) add(20, `URL keyword (${keyword})`);
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(url.hostname) || url.hostname.startsWith("["))
    add(25, "IP address used as hostname");
  if (url.protocol !== "https:" && count(counts.inputCount)) add(20, "Password field on HTTP page");
  if (count(counts.iframeCount) > 3) add(10, "More than three embedded frames");
  if (count(counts.formCount) > 5) add(10, "More than five forms");
  if (isSafeDomain(url.hostname)) {
    score = Math.max(0, score - 30);
    reasons.push("Known domain indicator: -30 pts (not a safety guarantee)");
  }
  score = Math.min(100, score);
  return {
    url: redactUrl(url.href),
    hostname: url.hostname,
    score,
    threatLevel: levelFor(score),
    reasons,
    ruleVersion: RULE_VERSION,
  };
}
