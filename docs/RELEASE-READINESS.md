# Release readiness — 4.1.0 candidate

Local implementation and testing do not certify the project as “100% production grade.” Release status depends on observed tests and the external checks below.

## Implemented

- Official Supabase SDK login/signup, refresh handling and website password recovery completion.
- Background-owned session credentials, account-scoped local history, profile editing and logout/erase controls.
- Correct safe-domain boundaries, authoritative scan URLs, IPv6 detection, dynamic reassessment and per-tab results.
- Opaque warnings, server-side-of-extension proceed validation, exact medium exception and high bypass denial.
- Readable paginated PDF download, print alternative, month selection and empty reports.
- Supported Firefox background manifest and Firefox Android candidate metadata.
- Ownership RLS migration, reproducible build, matching download archives, dependency lockfile and supporting documentation.
- Accurate public downloads and detection limitations; privacy page and reduced permissions.

## External release gates

1. Apply/review the migration against the live Supabase schema and verify actual two-user RLS access.
2. Configure production SMTP, email confirmation, password settings, Site URL and redirect allowlist; test recovery and expiry with real accounts.
3. Set the final deployed website URL in extension configuration and rebuild.
4. Deploy and inspect the public website, security headers and privacy/contact details.
5. Test the actual Edge and Firefox builds; validate Firefox Android on a real device.
6. Provide approved final logos, operator identity/contact and listing screenshots. Provisional project icons are included.
7. Complete browser developer-account registration, Mozilla signing and store reviews.
8. Perform a representative held-out detection evaluation; prototype heuristics have meaningful false positives and false negatives.

No live cloud settings, public deployment, Git push, developer-account purchase or store submission was made during the local implementation. Missing account access and assets are release dependencies, not passed tests. See `test-results/` for generated evidence and `docs/TEST-PLAN.md` for acceptance criteria.

## Observed live-service blocker

Cleanup: `PhishGuard` is the single repository root. Extension source lives in `extension/src`, page templates in `extension/pages`, and the website in `website`. The Git repository is at the root. Browser builds and test output are ignored; no version-named source folders or source ZIP copies are required for GitHub.

On 12 October 2026, the supplied project hostname `cubeknefkcszbnpzosxb.supabase.co` failed DNS resolution from this machine; `supabase.com` resolved successfully. Read-only Auth/table probes therefore failed before reaching the service. Verify that the Supabase project is active and that its URL/public key are current. Real authentication/database tests cannot pass until this is resolved; the local mock results are intentionally labelled.
