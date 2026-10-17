// Optional Google Safe Browsing lookup. A noncommercial API key must be configured
// server-side in Vercel. This endpoint is not used without explicit client consent.
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "POST") return res.status(405).json({ status: "method-not-allowed" });
  const allowed = process.env.PHISHGUARD_WEBSITE_URL;
  if (allowed && req.headers.origin && req.headers.origin !== new URL(allowed).origin)
    return res.status(403).json({ status: "forbidden-origin" });
  const key = process.env.PHISHGUARD_SAFE_BROWSING_KEY;
  if (!key)
    return res
      .status(503)
      .json({ status: "unavailable", detail: "No noncommercial reputation provider configured" });
  const raw = req.body?.url;
  if (typeof raw !== "string" || raw.length > 2048)
    return res.status(400).json({ status: "invalid-url" });
  let target;
  try {
    target = new URL(raw);
    if (!["http:", "https:"].includes(target.protocol) || target.username || target.password)
      throw new Error("Unsupported URL");
  } catch {
    return res.status(400).json({ status: "invalid-url" });
  }
  // Never send local/network-private hostnames or known academic fixtures to third parties.
  const host = target.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".test") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    /^\d+\.\d+\.\d+\.\d+$/.test(host) ||
    host.startsWith("[") ||
    !host.includes(".")
  )
    return res
      .status(200)
      .json({ status: "unavailable", detail: "Private or test hostname not queried" });
  try {
    const request = await fetch(
      "https://safebrowsing.googleapis.com/v4/threatMatches:find?key=" + encodeURIComponent(key),
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          client: { clientId: "phishguard-fyp", clientVersion: "4.2.0" },
          threatInfo: {
            threatTypes: ["SOCIAL_ENGINEERING"],
            platformTypes: ["ANY_PLATFORM"],
            threatEntryTypes: ["URL"],
            threatEntries: [{ url: target.href }],
          },
        }),
        signal: AbortSignal.timeout(3500),
      },
    );
    if (!request.ok)
      return res
        .status(200)
        .json({ status: "unavailable", detail: "Reputation provider returned an error" });
    const body = await request.json();
    return res
      .status(200)
      .json({
        status: Array.isArray(body.matches) && body.matches.length ? "malicious" : "no-match",
        provider: "Google Safe Browsing",
      });
  } catch {
    return res
      .status(200)
      .json({ status: "unavailable", detail: "Reputation service timeout or error" });
  }
}
