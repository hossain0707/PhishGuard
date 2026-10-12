# Security reporting

Report suspected vulnerabilities privately to the repository owner rather than including secrets or personal browsing data in a public issue. If GitHub private vulnerability reporting is enabled for this repository, use its **Security → Report a vulnerability** entry; otherwise contact the owner through the agreed project channel.

Include the affected version, browser/version, controlled reproduction steps, expected behaviour and impact. Do not send passwords, service-role keys, session tokens or real victim URLs containing credentials. Use harmless fixtures whenever possible.

PhishGuard is an academic implementation candidate. Its heuristic scores can produce false positives and false negatives, and scanning occurs after loading. This repository does not promise a vulnerability-response SLA or guaranteed phishing prevention. See [release readiness](docs/RELEASE-READINESS.md) for unverified external release gates.

Only public Supabase publishable/anon keys may enter browser bundles. Privileged keys belong in trusted administration/server environments. Local histories are account-separated on a device, but exports are separate files and browser/profile administrators can inspect local storage.
