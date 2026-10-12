# PhishGuard website

This is the single website in the PhishGuard repository. Its authored behaviour is in src/script.js; npm run build at the repository root produces the bundled script.js and browser downloads.

Deploy the whole repository on Vercel with root directory '.', framework Other and the root vercel.json settings. The output directory is website. Do not configure an old version-named folder as the project root.

Guest mode enables local extension scans even if account service is down. For a public Vercel build the active Supabase URL, publishable key and exact website URL must all be set explicitly. Store links switch to official listings only once a verified official listing URL is provided; otherwise development ZIPs remain available.

Authentication uses the configured public Supabase URL/key in config.js. Configure a working project, email verification/recovery redirects and production SMTP. Browsing histories remain in the extension; this website shows account information and recorded browser registrations. Downloads are public development packages.

See the repository README and docs for database setup, testing, installation, privacy and release limitations. Generated scripts, dependency notices and downloads are ignored by Git and rebuilt during deployment.
