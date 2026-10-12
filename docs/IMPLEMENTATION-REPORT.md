# Implementation and verification report

Date: 12 October 2026 (Asia/Seoul). Version: PhishGuard 4.1.0 release candidate.

Layout update: there is one source repository, `PhishGuard`, with `extension/`, `website/`, `shared/` and supporting folders. The Git repository is at its root. Version-named folders, duplicate deployments and source ZIP copies were retired to the Recycle Bin. Generated browser targets and test output are ignored by Git. Next.js results below are historical evidence from the retired optional wrapper, not requirements of this project.

## Outcome

The supplied prototype was updated with account-separated histories, official SDK session refresh, private browser-session token storage, profile editing, recovery completion, controlled warning exceptions, accurate current-tab results, dynamic reassessment, readable monthly PDFs and database ownership policies. Download archives are regenerated from one source build. The static website and optional Next.js portal now share the same implementation.

Package source is in `extension/src`, `website/src` and `shared`. `extension/pages` supplies maintained HTML/CSS; both browser targets are generated under ignored `dist/` directories. Packages include dependency notices. A provisional SVG shield mark and store-size PNG icons are supplied; approved GMI and final project logos remain external assets.

## Observed checks

| Check | Result | What it proves |
|---|---|---|
| Automated tests | 14 passed, no failures | Rules, redaction, retention, month selection, PDFs, session refresh/revocation, package matching and local SQL policy logic |
| Repository-layout tests | 2 additional checks passed after reorganisation | One source layout and actual Git exclusion of generated files, dependencies and ZIP copies |
| Browser scenarios | 22 passed | Actual extension and portal interactions in installed Microsoft Edge, using isolated mocked Supabase |
| PostgreSQL/RLS | Included in automated tests | Two accounts cannot cross-access records; old permissive policies/grants are constrained; anonymous access is denied |
| Firefox `web-ext lint` | 0 errors, 0 warnings | Generated package passes current automated validation; not a runtime/device/store approval |
| Next.js 16.4.0 | Production build and TypeScript passed | Optional deployment wrapper compiles |
| Local production server | Redirect, portal response, CSP/security headers and download passed | Built Next.js variant serves its portal correctly |
| Production dependency audits | No reported vulnerabilities in both package roots | Current advisory checks passed; not a complete security audit |
| PDF sample | 75 rows, 7 pages | All rows, repeated headers/page numbers, no text clipping; every page visually inspected |
| Website mobile layout | 390px viewport passed | Responsive layout, not mobile extension compatibility |
| Download archives | All copies/source entries matched | Users receive current compiled files rather than stale packages |
| Live Supabase | Blocked: supplied hostname does not resolve | Real authentication/email/table behaviour remains unverified |

The synthetic evaluation demonstrates 4 true positives, 1 false positive, 4 true negatives and 1 false negative across ten controlled examples. Its 0.8 precision/recall and 0.2 false-positive rate are illustrative and must not be presented as production phishing accuracy.

## Main fixes

- Safe-domain matches require exact domains or subdomain boundaries; suffix lookalikes no longer receive a discount.
- The background derives URLs from browser-provided sender/tab state and rejects untrusted privileged messages.
- Warning pages use random IDs backed by session storage; hiding a button is no longer the only high-risk control.
- Medium proceed applies only to the exact URL in the same tab for five minutes and no longer loops immediately.
- Tab results and histories are account-scoped. Dashboard clearing preserves reporting history; explicit month/whole-history deletion is limited to the owning account.
- Existing unowned logs are archived rather than assigned to whichever user logs in next. Old session formats/tokens are retired.
- Query strings, URL credentials and fragments are excluded from persisted assessment URLs.
- Storage write failure does not stop risk redirects and produces a visible notice.
- Signup/login selectors and recovery callbacks were tested, including a recovery link reusing an existing portal tab.
- Firefox uses supported background scripts, declares required account data, and gates optional browser metadata registration on technical-data consent.
- Report export creates a white, readable, paginated PDF with an alternative Print path for Unicode names.
- The supplied vulnerable Next.js dependencies and broken Tailwind import were updated/fixed.
- Public downloads and after-load detection are described accurately; guaranteed blocking and XML-export claims were removed.

## Remaining release dependencies

The configured URL `cubeknefkcszbnpzosxb.supabase.co` failed DNS resolution while `supabase.com` resolved. A current active Supabase project URL/public key is required. Apply/review the SQL migration, configure email confirmation/SMTP and redirects, and test live two-account ownership and recovery. No live database or cloud account was changed.

Deployment, real Chrome/Firefox installation checks, Firefox Android physical-device testing, representative holdout evaluation, institutional branding approval, operator privacy/support contact and store submissions/signing remain required. The code and local tests are complete for this candidate; these dependencies prevent an honest “100% production-grade” claim.

## Deliverables

The repository contains one complete source version under `PhishGuard/`. `npm run build` produces ignored `dist/chrome-edge` and `dist/firefox` packages, website download ZIPs and checksums. Source ZIP copies and old releases folders were removed. Ignored `test-results/` contains local verification evidence. README and docs cover setup, architecture, installation, testing, FYP evidence and publishing. Use the project root for GitHub and Vercel; generated outputs are not part of the source upload.
