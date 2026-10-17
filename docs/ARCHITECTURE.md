# Architecture and trust boundaries

See the [README architecture diagrams](../README.md#architecture) for component flow, assessment lifecycle and account ERD. The authored implementation is in `extension/src`, `website/src` and `shared`; browser packages are generated from a single manifest template and package version.

The extension content script observes a page and sends bounded structural counts. The extension background obtains the authoritative URL from the browser sender, checks the current tab URL, scores the indicators, writes history under the authenticated user ID, and redirects medium/high assessments. No website can request account operations: privileged messages require an extension-origin sender. Warning pages carry opaque random IDs; destination/level are loaded from trusted session storage, never query-string assertions.

Authentication uses the bundled official Supabase SDK. Only the background handles extension credentials. Session storage is restricted to trusted contexts; local storage is similarly restricted where the API supports it. Content scripts are not given tokens. The queue serialises requests and storage writes to prevent lost updates and refresh-token races. SDK refresh is invoked through session access when required rather than background timers that cannot survive a suspended worker.

Local logout cleanup runs even if token refresh, registration deletion or the server logout request fails. Such a result is labelled local-only cleanup rather than proof of remote session revocation. Build-time configuration rejects privileged keys and sets the browser connection policy to the selected HTTPS Supabase project.

History keys are `history:<authenticated user id>` for signed-in users and `history:guest` for account-free use. Guest and account records are never merged automatically. Each visit's document ID identifies an assessment; later structural changes replace that assessment instead of counting the same document multiple times. The dashboard displays the most recent 200 assessments since its last clear; report history is separate from that display cutoff. Rolling reports and the dashboard use the same owner, but monthly scan records are also archived independently in local IndexedDB; explicit month or owner erasure removes archive records as well.

The website authenticates independently using the same Supabase project and accesses browser registration rows protected by RLS. It does not read extension browsing history. Download packages are public. The website and extension are separately authenticated sessions, not seamless single sign-on.

## Rule catalogue and evidence stages (4.2.0)

The `shared/risk.js` engine now processes URL lexical features, verifies curated brand-domain lookalikes, checks credential-related page-structure counts, then optionally accepts a trusted reputation match. Single URL keywords weigh +6 and cannot alone trigger a warning. HTTP transport weighs +12, an IP hostname +20, a brand lookalike +40, a password field on HTTP +35 and a cross-origin password-form destination +20. Other URL and structural signals are intentionally weak. The reputation service is OFF until the user opts in, and a verified malicious match raises the score to at least 90; missing data does not imply safety.

The LOW 0–30, MEDIUM 31–70 and HIGH 71–100 boundaries remain provisional FYP cutoffs. Feature choices are motivated by cited research but **no paper establishes these exact weights**. See [Lecturer methodology](LECTURER-IMPROVEMENTS.md) for academic sources and evaluation requirements.

## Privacy and retention

No password values, page text or form contents are captured. Assessment URL credentials, fragments and query strings are removed; paths can still be sensitive. Local records are bounded by count and age. Export creates a separate local PDF, which is outside browser deletion controls. Auth email/name and installation metadata are sent to Supabase. The installation UUID is randomly generated, not a fingerprint.

## Browser variants

Chrome/Edge use a Manifest V3 service worker. Firefox uses a supported background-script event page. APIs are addressed via `browser` where present, otherwise `chrome`; asynchronous message responses preserve the callback channel. Mobile browser-extension builds are out of scope; the minimum supported desktop Firefox version remains 142. Both packages bundle executable dependencies locally; there is no remotely hosted JavaScript.
