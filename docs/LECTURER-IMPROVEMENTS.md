# Lecturer feedback implementation and research methodology

**Scope:** PhishGuard 4.2.0 FYP candidate, October 2026. This is a _prototype_, not a scientifically validated production phishing classifier.

## Threat scope: two categories

1. **Credential phishing:** deceptive login/password-collection pages, suspicious password-form destinations and insecure login transport.
2. **Brand impersonation:** URLs with unverified labels pretending to be familiar brands or single-edit domain lookalikes.

URL syntax and reputation intelligence are **cross-cutting evidence**, not additional "threat categories". The browser extension does not detect malware, ransomware, every scam, unsafe downloads, or every possible phishing technique.

## Multi-stage decision process

| Stage                      | Implementation                                                                                                           | Evidence, assumptions and limitations                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| 1. URL structure           | URL protocol, keyword tokens from path/query, IP hostnames, URL length, depth, userinfo, punycode marker                 | A keyword alone adds only 6 _provisional_ points, remaining LOW                                                              |
| 2. Domain verification     | Exact official-domain boundaries and simple brand-label matching/single-edit detection                                   | Brand match is a suspicious indicator, not legal proof of impersonation; incomplete curated brand/TLD coverage               |
| 3. Credential-page signals | Counts of password fields, forms, iframes, password-form cross-origin destinations                                       | Content script reads _no password values_ or page text; cross-origin forms can be legitimate                                 |
| 4. Reputation check        | OFF by default; optional same-origin reputation proxy calls Google Safe Browsing when key is configured                  | Requires end-user consent, FYP noncommercial API key and operator configuration; unavailable/no-match is NOT proof of safety |
| 5. Final risk              | Add explainable rules, cap at 100, LOW 0–30, MEDIUM 31–70, HIGH 71–100; verified threat-intel match raises minimum to 90 | **Weights and cutoffs are FYP hypotheses, not measurements or calibrated probabilities**                                     |

Current example contributions (see `shared/risk.js`): HTTP +12; IP hostname +20; keyword in URL +6; brand lookalike +40; password on HTTP +35; password-form cross-origin +20; excessive forms/iframes +6 each. These numbers encode a _relative initial severity ordering_. They were not taken from a paper and should NOT be described as validated. In particular, HTTPS alone is not a safe indicator.

**Known limitations:** The prototype uses a small curated set of brand roots, naïve single-edit matching instead of a full public-suffix or IDN confusable library, and post-load content inspection. A compromised official domain, visually cloned page without a lookalike URL, or new unknown phish can remain LOW. False positives can occur from legitimate cross-origin login systems or similar brand strings. Reputation timeouts/no-match cause neutral evidence, not reduced risk.

## Evidence: credential phishing (three research sources)

1. Zhang, Y., Hong, J., and Cranor, L. F. (2007). _CANTINA: A Content-Based Approach to Detecting Phishing Web Sites._ WWW '07. https://doi.org/10.1145/1242572.1242659 — content and supplementary heuristic evidence, plus false-positive controls. **Our implementation does not claim to reproduce its TF-IDF method.**
2. Xiang, G., Hong, J., Rose, C. P., and Cranor, L. (2011). _CANTINA+: A Feature-Rich Machine Learning Framework for Detecting Phishing Web Sites._ ACM TISSEC 14(2). https://doi.org/10.1145/2019599.2019606 — layered features and filtering to lower false positives. **Our implementation is not CANTINA+ or a trained ML model.**
3. Sahingoz, O. K. et al. (2019). _Machine learning based phishing detection from URLs._ Expert Systems with Applications 117, 345–357. https://doi.org/10.1016/j.eswa.2018.09.029 — URL lexical features. **Not a source for our exact weights.**

## Evidence: brand impersonation (three sources)

1. Afroz, S. and Greenstadt, R. (2011). _PhishZoo: Detecting Phishing Websites by Looking at Them._ IEEE ICSC. https://doi.org/10.1109/ICSC.2011.52 — brand/page similarity motivates identity-mismatch evidence. **Our code does NOT implement visual image matching.**
2. Unicode Consortium. _Unicode Technical Standard #39: Unicode Security Mechanisms._ https://www.unicode.org/reports/tr39/ — confusables and script-based spoofing risks. **Current implementation detects punycode only as a weak indicator, not full UTS#39 spoof checks.**
3. Lain, D. et al. (2025). _URL Inspection Tasks: Helping Users Detect Phishing Links in Emails._ USENIX Security. https://www.usenix.org/system/files/usenixsecurity25-lain.pdf — correctly identifying the actual hostname matters. **A user-study reference, not a weight-calibration study.**

## Technical guidance for an academic evaluation

1. Define labeled **benign and phishing** examples with provenance, date, license and domain context. Use only authorized or safe offline fixtures; avoid loading live attack URLs in the presentation.
2. Split into training/development and **untouched holdout** sets by hostname (and where practical by time) to prevent leakage.
3. Evaluate the _old_ keyword-heavy baseline and the 4.2.0 multi-stage rules on identical examples. Independently report results for credential phishing and brand impersonation.
4. Produce TP, TN, FP, FN, precision, recall, false-positive rate, F1, total sample size, class balance and detection latency. Avoid reporting the ten synthetic fixtures as actual detection accuracy.
5. Tune rule weights and thresholds on development data; lock a final rule configuration **before** applying the holdout evaluation. Analyze important false positives (legitimate login/SSO) and false negatives (HTTPS, compromised real domains).
6. Report ablations: URL-only vs +domain vs +credential-page vs +optional reputation, and separately quantify timeout/no-match rate.
7. Distinguish browser unit/automation with mocked Supabase from real Supabase, real Firefox Android and external store approval.

## Monthly reports: historical persistence

- **Before:** month-picker and PDF export from rolling browser history, capped at 5,000 entries and 366 days.
- **After:** every newly scanned page also writes a copy to **origin-isolated IndexedDB** keyed by account, document and month. Previous saved months can be selected and regenerated as PDFs even if dashboard retention rotates older entries. The report UI lists known archived months.
- Device/browser storage quotas and extension uninstallation can still remove local data; no claim of permanent cloud backup. Account history and guest history remain separate. Explicit month deletion and account history erase remove corresponding archive records.
- Earlier history already rotated out **before the upgrade cannot be recovered**; retained older history is imported when its report is first opened.
- Exported PDF files are independent files and remain available until deleted manually.

## Mobile compatibility and acceptance

- **Firefox Android:** the generated Firefox package declares `gecko_android.strict_min_version = 142.0`. Browser CSS is responsive but must be tested on a **real Android Firefox** with extension installation, background lifecycle, web messages, consent UI, redirects, month reports, PDF save and guest/signed-in flows. Mozilla signing/AMO listing is still required for normal distribution. Do not claim Android support until actual success.
- **Edge Android:** separate Microsoft-controlled mobile extension catalog; desktop marketplace approval does not automatically mean Android support. Do not list as tested.
- **iPhone (free):** the website contains a **manual, URL-only link checker**, with a web app manifest for Home Screen installation. It performs URL analysis locally. It cannot read page DOM of other apps or automatically protect Safari/Edge browsing. Optional reputation checking transmits URLs only after explicit opt-in.
- **Safari iOS extension:** requires separate packaging and Apple testing/distribution requirements, not included.
- **Zero-cost constraint:** existing Vercel Hobby and Supabase Free may suffice within quotas. Optional Google Safe Browsing is noncommercial with an API key and quota limits; no key means reputation is explicitly unavailable, not silently "safe". No paid service or store enrollment was made by this change.

## Change map

- `shared/risk.js` — multi-stage scoring, hostname/brand evidence and explainable stages.
- `extension/src/content.js` — form structural indicators, no page text or credentials.
- `extension/src/background.js` — trusted sender, optional reputation, local monthly archive.
- `shared/archive.js` + `extension/src/report.js` — automatic IndexedDB archive and historical reports.
- `api/reputation.js` — server-side optional Safe Browsing proxy, key stays on the server.
- `website/index.html`, `website/src/script.js` — manual iPhone/Android URL checker.
- `tools/build.mjs` — Firefox Android metadata.
- `tests/` — unit and browser validation. External acceptance gates are still tracked separately.

## Before the next official browser-store upload

The Edge v4.1.0 release was already in review before this work. **Do not confuse it with the 4.2.0 development candidate.** Confirm working privacy contact, app review identity, official release package/revision and mobile support on actual devices, then submit a new extension version through the _same_ listing. Never create a duplicate listing.
