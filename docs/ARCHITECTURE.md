# Architecture and trust boundaries

The extension content script observes a page and sends bounded structural counts. The extension background obtains the authoritative URL from the browser sender, checks the current tab URL, scores the indicators, writes history under the authenticated user ID, and redirects medium/high assessments. No website can request account operations: privileged messages require an extension-origin sender. Warning pages carry opaque random IDs; destination/level are loaded from trusted session storage, never query-string assertions.

Authentication uses the bundled official Supabase SDK. Only the background handles extension credentials. Session storage is restricted to trusted contexts; local storage is similarly restricted where the API supports it. Content scripts are not given tokens. The queue serialises requests and storage writes to prevent lost updates and refresh-token races. SDK refresh is invoked through session access when required rather than background timers that cannot survive a suspended worker.

History keys are `history:<authenticated user id>`. Each visit's document ID identifies an assessment; later structural changes replace that assessment instead of counting the same document multiple times. The dashboard displays the most recent 200 assessments since its last clear; report history is separate from that display cutoff. Reports and dashboard use the same owned history and month deletion affects both.

The website authenticates independently using the same Supabase project and accesses browser registration rows protected by RLS. It does not read extension browsing history. Download packages are public. The website and extension are separately authenticated sessions, not seamless single sign-on.

## Rule catalogue

| Indicator | Weight | Rationale and limitation |
|---|---:|---|
| HTTP connection | +35 | Transport lacks HTTPS; does not itself prove phishing |
| Keyword in URL | +20 | Account/verification/brand bait; common on legitimate pages |
| IP hostname, IPv4 or IPv6 | +25 | No ordinary domain name; also common in development |
| Password input over HTTP | +20 | Credentials may travel unencrypted; values are never read |
| More than 3 iframes | +10 | Embedded-page complexity; legitimate sites can qualify |
| More than 5 forms | +10 | Structural complexity; legitimate sites can qualify |
| Exact/subdomain known-domain match | -30 | Context indicator only; no suffix lookalikes accepted |

Scores cap at 100. LOW: 0–30; MEDIUM: 31–70; HIGH: 71–100. No rule learning, threat feed or malware classifier is present. A convincing HTTPS phishing page can score LOW. Weights are prototype assumptions, not calibrated probabilities.

## Privacy and retention

No password values, page text or form contents are captured. Assessment URL credentials, fragments and query strings are removed; paths can still be sensitive. Local records are bounded by count and age. Export creates a separate local PDF, which is outside browser deletion controls. Auth email/name and installation metadata are sent to Supabase. The installation UUID is randomly generated, not a fingerprint.

## Browser variants

Chrome/Edge use a Manifest V3 service worker. Firefox uses a supported background-script event page. APIs are addressed via `browser` where present, otherwise `chrome`; asynchronous message responses preserve the callback channel. Firefox Android is declared as a candidate but must pass device tests before being listed as supported. Both packages bundle executable dependencies locally; there is no remotely hosted JavaScript.
