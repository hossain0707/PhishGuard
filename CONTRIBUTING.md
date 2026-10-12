# Contributing

Keep one maintained extension source and one website. Changes belong in `extension/src`, `extension/pages`, `website/src`, `website` assets or `shared`; generated bundles and download ZIPs must stay out of Git.

Use Node.js 22+, install with `npm ci`, and run `npm run build`. Before proposing a change, run `npm run format`, `npm run check`, and `npm audit --omit=dev`. Browser checks use isolated mocked Supabase and must not create live accounts.

Add focused regression tests for changes to scoring, user ownership, authentication, warning permissions, retention or reports. Use synthetic domains and test-only accounts. Describe the problem, resulting behaviour, checks and any migration/configuration implications in a pull request.

Propose schema changes as reviewed SQL migrations. Never silently weaken RLS, expose session credentials to page content, add unnecessary permissions, or claim real-world accuracy from a synthetic fixture set. Treat changes to data collection as product/privacy changes and update disclosures accordingly.

Before release, complete the live acceptance tests in [TEST-PLAN](docs/TEST-PLAN.md). Local or mocked checks do not replace real email, server-policy, mobile-device or store validation.
