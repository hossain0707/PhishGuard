# PhishGuard

One FYP project, version **4.1.0**. It contains one extension source, one website, account/database setup, tests and supporting documentation.

## Project layout

```text
PhishGuard/
  extension/     One extension source, page templates and icons
  website/       One website and its source script
  shared/        Authentication, risk scoring, history and PDF logic
  database/      Supabase schema and ownership policies
  docs/          Setup, user guide, testing and FYP evidence
  tests/         Automated verification
  tools/         Build and local development helpers
  package.json
  package-lock.json
  vercel.json
  .gitignore
```

The former version-named folders and source/release ZIP copies have been retired. Chrome/Edge and Firefox are two build targets of this same version, not separate source projects.

## Run locally

Use Node.js 22 or newer. From this folder:

```powershell
npm ci
npm run build
npm test
npm run serve
```

Open http://127.0.0.1:4173. Build generates `dist/chrome-edge` and `dist/firefox`; load the appropriate directory through the browser extension manager for development testing. Firefox permanent installation requires Mozilla signing. Website downloads are generated as `website/downloads/PhishGuard-Chrome-Edge.zip` and `PhishGuard-Firefox.zip`.

`npm run test:browser` runs 22 browser scenarios in installed Edge with isolated mocked Supabase. For a Playwright Chromium installation, set `TEST_BROWSER_CHANNEL=chromium`. `npm run evaluate` produces synthetic example metrics, not real-world detection accuracy.

## Upload to GitHub

Use **this PhishGuard folder as the repository root**, including its source folders, package files, README, root Vercel configuration and .gitignore. The existing Git repository/remote is preserved here. No push was performed.

Do not upload `node_modules`, `dist`, `test-results`, generated website scripts/downloads, or ZIP copies of the source. They are excluded by .gitignore and can be recreated. Your GitHub repository should show the source layout above, with one version. If you use GitHub's web upload rather than Git, select only these source files/folders and include .gitignore; web upload does not apply Git ignore rules automatically.

## Deploy on Vercel

Import the repository with root directory **.** and framework preset **Other**. Root `vercel.json` installs the locked dependencies including build tools, runs `npm run build`, and uses output directory `website`. The build creates the website bundle and browser download packages automatically. Update any existing Vercel root-directory setting that still points to an old folder.

The supplied public Supabase configuration is retained in `shared/config.js` (extension) and `website/config.js` (website). Set the final website URL in the extension config, configure email callbacks/SMTP in Supabase, and review/apply `database/001_accounts.sql`. Never include a secret/service-role key. See `docs/SETUP.md`.

## Behaviour and release status

Login is required for monitoring. Extension credentials live in browser-session storage; restarting the browser requires login, while histories remain local and account-separated. Rules assess HTTP/HTTPS URL and page-structure indicators after loading. Scores and redirects do not guarantee prevention of phishing. Password/form values are never captured. Persisted URLs exclude credentials, queries and fragments; paths may still contain sensitive data.

Reports support month selection, readable PDF download and Print for Unicode names. History is bounded by count, age and available browser storage. No browsing-history upload, automated email reports or universal mobile support is claimed.

Local tests passed, but live release still requires a working Supabase project, real email/database checks, physical-browser/mobile validation, approved GMI branding and store reviews. See `docs/RELEASE-READINESS.md` and `docs/IMPLEMENTATION-REPORT.md`.
