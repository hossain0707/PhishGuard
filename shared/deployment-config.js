export function validateDeploymentConfig(input) {
  const url = new URL(input.SUPABASE_URL);
  if (
    url.protocol !== "https:" ||
    !/^[a-z0-9-]+\.supabase\.co$/.test(url.hostname) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  ) {
    throw new Error("Use the HTTPS root URL of a Supabase project.");
  }
  const key = input.SUPABASE_PUBLISHABLE_KEY || "";
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) {
    let role;
    try {
      role = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString()).role;
    } catch {
      throw new Error("Use a public publishable or anon key, never a secret key.");
    }
    if (role !== "anon")
      throw new Error("Secret/service-role keys must never be bundled into browser clients.");
  }
  if (input.WEBSITE_URL) {
    const website = new URL(input.WEBSITE_URL);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(website.hostname);
    if (
      website.username ||
      website.password ||
      website.hash ||
      website.search ||
      !(website.protocol === "https:" || (local && website.protocol === "http:"))
    ) {
      throw new Error(
        "Use HTTPS for production email callbacks, or HTTP on localhost for development.",
      );
    }
  }
  return { ...input, SUPABASE_URL: url.origin };
}
