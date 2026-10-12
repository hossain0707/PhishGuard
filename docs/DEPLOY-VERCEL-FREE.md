# PhishGuard — free FYP deployment handoff

**Status:** Deployment is not yet performed. This source branch prepares the project; it does not register a domain, purchase services or create a live database.

## Repair existing Supabase configuration

The historical backend hostname in `shared/config.js` was reported unreachable on 12 October 2026. Confirm the correct project in the Supabase dashboard and use its **current** active project URL and **publishable** key. A resumed project is not necessarily the same project as the URL bundled in PhishGuard. Do not put a secret or service-role key in the website or extension.

1. Check Project Status, API URL/key and network response to `/auth/v1/health`; use browser Network tools to distinguish DNS/network failures from 4xx and project-paused responses.
2. Configure email/password auth, confirmation, production/test SMTP and exact allowed redirect URLs. The built-in email sender may only support project-authorized recipients; confirm by testing real mailbox delivery.
3. Back up and inspect the live database before applying `database/001_accounts.sql`. Validate the deployed RLS policies with **two real accounts**.
4. Run local checks (`npm ci`, `npm run check`, `npm run audit:all`) and install the current browser extension. **Local guest scanning does not depend on a running Supabase account service.**

## Free Vercel website

Vercel Hobby is appropriate for a small non-commercial FYP demo within platform limits. No custom domain is required. Import `hossain0707/PhishGuard` at https://vercel.com/new, after the feature pull request is reviewed and merged.

| Property | Setting |
| --- | --- |
| Plan | Hobby / free |
| Git branch | Reviewed `main` |
| Root | `.` |
| Framework | Other |
| Install | `npm ci --include=dev` |
| Build | `npm run build` |
| Output directory | `website` |
| Public URL | Actual assigned `*.vercel.app` HTTPS domain |

Set these public variables under Vercel Project Settings > Environment Variables **before deploying**:

```dotenv
PHISHGUARD_SUPABASE_URL=https://YOUR-ACTIVE-PROJECT.supabase.co
PHISHGUARD_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
PHISHGUARD_WEBSITE_URL=https://YOUR-VERCEL-PROJECT.vercel.app/
```

A Vercel build intentionally fails when any of these variables is missing rather than publishing the historical, potentially inactive auth backend. Update Supabase Auth Site URL and allowed redirect URLs to **the exact deployed HTTPS URL**. Rebuild/reinstall extension ZIPs after production configuration changes.

## Acceptance tests before sharing the URL

- Website serves over HTTPS with the expected security headers; policy, download ZIPs and checksums work.
- Local guest test page is scanned, warned and recorded even with Supabase unavailable; logging in does not expose guest history.
- Two real Supabase users can register/verify/sign in; reset email works; database RLS denies cross-account access.
- Current Chrome and Edge packages work on real browsers, and Firefox package passes the lint plus real Firefox validation.
- Dependency audit is clean or remaining advisories are triaged and documented with exact scope.
- Privacy/operator support identity, permission justification and branding are approved.
- A representative held-out phishing evaluation is documented before any protection-effectiveness marketing claims.

## Store links

The website keeps development ZIP downloads until a verified store listing exists. Only then set the optional public variable for the relevant store: `PHISHGUARD_STORE_CHROME_URL`, `PHISHGUARD_STORE_EDGE_URL`, `PHISHGUARD_STORE_FIREFOX_URL`. Chrome store account registration may require a one-time fee, which is separate from free hosting. Store review, signing and publication are not implied by a working website.

## Cannot be completed from source alone

Real project credentials and live backend ownership, email sender configuration, the official GMI image and permission to use it, a final PhishGuard brand asset, verified operator contact, deployment authorization, representative detection accuracy testing and external store approvals require the team to act or provide assets. Do not claim these external gates are passed.
