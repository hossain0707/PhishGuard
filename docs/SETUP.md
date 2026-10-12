# Database, authentication and deployment

## Supabase

1. Back up the database. Inspect existing `profiles` and `extension_sessions` tables. The migration assumes its declared schema and aborts if an existing sessions table lacks installation IDs; do not drop existing data to force it through.
2. Review and execute `database/001_accounts.sql` in your Supabase SQL editor. It creates ownership policies, account profiles, browser registration indexes, and a profile-sync trigger. Passwords remain exclusively in Supabase Auth.
3. Enable email/password authentication and email confirmation. Configure a 12-character minimum password and appropriate password-strength/rate-limit settings. Use production SMTP and configure sender authentication before public distribution; test confirmation and recovery delivery.
4. Set Auth Site URL to the production portal URL. Allow the exact production and local development redirect URLs. Deployment example: `https://YOUR-PROJECT.vercel.app/`. If users also visit the clean `/index` route, add that exact callback too. Avoid broad production wildcards.
5. Set extension `WEBSITE_URL` to that URL, then rebuild the packages. Email links complete on the website; the user then signs into the extension. The website implements the standard Supabase implicit recovery callback and new-password form.
6. Enable your desired Auth abuse protections. Monitor failed logins and registration volume. SDK error messages must not be treated as proof of email existence.
7. Verify RLS on the actual deployed tables using two test accounts. User A must not read/update/delete user B's rows or insert records with B's user ID. Unauthenticated callers must have no table access. Service-role credentials are never shipped to clients.

Tables:

| Table | Owner | Purpose |
|---|---|---|
| `auth.users` | Supabase Auth | Credentials, verification, user metadata |
| `profiles` | `id = auth.uid()` | Display name and creation date |
| `extension_sessions` | `user_id = auth.uid()` | Installation UUID, browser, version, last-login timestamp |

Browser rows represent recorded registrations, not live connections. Repeated login upserts the same installation; logout attempts to remove that registration. Offline logout may leave a stale row. Browsing history is never stored in these tables.

## Vercel

The repository root is `PhishGuard`, with Vercel root directory `.`, framework preset Other, build command `npm run build` and output directory `website`. The root `vercel.json` includes these settings. The original Git repository is preserved at the project root. Review and upload the source files; no push or production deployment was performed by this task.

Version-named source folders, duplicate deployments and source ZIP copies were retired. Build produces browser targets in ignored `dist/` directories and website downloads. These are generated outputs of one source project, not additional versions.

A Vercel URL is adequate for an academic demonstration. A custom domain is optional and does not improve the security of detection rules. Keep a stable HTTPS URL, configure recovery redirects whenever the domain changes, and confirm hosting/service plan conditions for your usage.

## Operations

Keep dependency lockfiles. Rebuild after source or configuration changes. Test the newly generated package, not an older ZIP. Back up cloud account data according to your team's retention requirements. Local histories are deliberately not backed up to the server; explain this to users.

For incidents, disable distribution of the affected release, revoke sessions where appropriate using the Supabase administration interface, restore the previously tested website/package, and record the cause and mitigation. Never rely on PhishGuard as the sole defence against phishing.

Account deletion currently requires the project operator using Supabase administration; deleting an Auth user cascades their profile/registration rows. Local histories and previously exported PDFs require separate deletion on the user's devices. Publish a real operator contact before external release.
