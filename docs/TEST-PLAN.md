# Verification plan

## Automated local tests

CI runs formatting checks, a locked build, unit/SQL tests, Firefox lint with warnings treated as errors, real Chromium scenarios with mocked Supabase, eight automated desktop accessibility checks and a production dependency audit. `npm run check` runs the core checks locally; `npm run demo` additionally recreates media and runs the accessibility checks. Demo/CI fixtures never create live accounts.

Run `npm run check` using the installed Edge browser (the default test channel), or set `TEST_BROWSER_CHANNEL=chromium` after installing Playwright Chromium. The suite includes risk boundaries and suffix impersonation, HTTP/IPv4/IPv6 inputs, sensitive-URL redaction, record retention and owner keys, month boundaries, multipage/empty PDFs, SDK refresh/revocation, package consistency, and SQL/RLS with two accounts including pre-existing permissive grants/policies.

Browser tests load the built Chromium extension in Edge and exercise signup, recovery requests, invalid/successful login, medium proceed, high bypass rejection, DOM reassessment, current-tab results, account switching, retained/deleted histories, PDF download, empty months, website login/dashboard and recovery-callback completion, and mobile layout. Supabase is an isolated mock. Results do not imply any production account or server change.

## Required live acceptance tests

| Test                      | Required result                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------- |
| Register/verify account A | Real confirmation email arrives; unverified login is rejected                         |
| Register/verify account B | Separate real account and dashboard                                                   |
| RLS requests A → B        | Read is empty; update/delete affect zero rows; forged insert denied                   |
| Expired token             | SDK refreshes a valid session; invalid refresh requires new login                     |
| Recovery email            | Exact deployed callback opens reset form; new password works, old password fails      |
| Offline auth/logout       | Useful error; local credentials removed on extension logout                           |
| Worker suspension/restart | No lost owner isolation; browser restart requires login                               |
| Browser registration      | Row upserts, website displays actual recorded registrations                           |
| Local history             | A cannot see B records; erase removes only current owner                              |
| Extension packages        | Chrome, Edge and Firefox each install and run independently                           |
| Android Firefox           | Login, content messages, warnings, reports and touch layout pass on a physical device |
| Large report              | Every retained row appears with readable labels and page numbers                      |
| Unicode user              | Print alternative preserves the user's complete name                                  |
| Vercel deployment         | HTTPS, security headers, download URLs, privacy link and email redirects work         |
| Store review              | Data disclosures match actual behaviour; reviewer can reach authenticated features    |

## Detection evaluation

Use a lawful, labelled, representative URL/page dataset and disclose its source, capture date, sample count and class balance. Separate benign login/banking pages from suspicious examples. Do not tune weights and report results on the same data: keep a holdout set. Record precision, recall, false-positive rate, confusion matrix and detection latency. Compare against a simple baseline and discuss false negatives, especially HTTPS-only attacks.

`npm run evaluate` provides a small synthetic example containing intentional false positives and false negatives. It verifies scoring mechanics, not real-world safety. Do not present its metrics as production accuracy.

For demonstration, use harmless local fixture pages, screenshots and saved results. Avoid exposing evaluators to active malicious sites.

## New release 4.2.0 acceptance cases

- Verify `login` alone stays LOW; suspicious URL and lookalike-brand evidence combine predictably; confirm cross-origin password-form behavior and known limitations.
- Hold out domains and compare confusion matrices, precision/recall and false-positive rate with legacy v4.1.0 rules. Current weights remain hypotheses until this is measured.
- Store scans from separate calendar months in IndexedDB, expire rolling history, then regenerate a prior-month PDF without data loss. Verify multi-account and guest separation, explicit deletions and low-storage warning behavior.
- Verify optional reputation defaults OFF; no URL leaves the extension when OFF. When ON, send to same-origin proxy, test provider outage/no-match and confirmed malicious fixtures with a mocked provider. Ensure the secret API key is never bundled or logged.
- Test the mobile manual URL checker in iPhone Safari, Edge iOS and Android browsers. It must NOT claim DOM inspection or automatic tab monitoring.
- Install and operate the Firefox Android build on a physical Android phone with AMO signing; developer/lint results alone are insufficient.
