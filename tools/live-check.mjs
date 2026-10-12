// Read-only public-client probes. Never creates accounts or mutates cloud data.
import { CONFIG } from "../shared/config.js";
import { writeFile, mkdir } from "node:fs/promises";
const probes = [
  ["Auth health", "/auth/v1/health"],
  ["Anonymous profile access", "/rest/v1/profiles?select=id&limit=1"],
  ["Anonymous browser-registration access", "/rest/v1/extension_sessions?select=id&limit=1"],
  ["Registration schema candidate", "/rest/v1/extension_sessions?select=installation_id,last_seen&limit=0"]
];
const results = [];
for (const [name, endpoint] of probes) {
  try {
    const response = await fetch(CONFIG.SUPABASE_URL + endpoint, { headers: { apikey: CONFIG.SUPABASE_PUBLISHABLE_KEY }, signal: AbortSignal.timeout(15000) });
    const data = await response.json().catch(() => null);
    results.push({ name, status: response.status, ...(Array.isArray(data) ? { returnedRows: data.length } : { code: data?.code || null }), note: "No row values recorded. A zero-row anonymous response does not prove authenticated ownership isolation." });
  } catch (error) { results.push({ name, error: error.message }); }
}
await mkdir(new URL("../test-results/", import.meta.url), { recursive: true });
await writeFile(new URL("../test-results/live-readonly.json", import.meta.url), JSON.stringify({ generated: new Date().toISOString(), mode: "Read-only public client; no cloud writes", results }, null, 2));
console.log(JSON.stringify(results, null, 2));
