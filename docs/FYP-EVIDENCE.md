# FYP supporting evidence

The system is automatically triggered and rule based. These are different dimensions: automatic scanning does not require machine learning. Page-load scanning, structural-change reassessment and score-based redirects are implemented. Monthly report selection/export and installation remain manual. Cloud scheduling, automated report emails and pre-request blocking are not implemented.

Ask the lecturer to define the acceptance criteria for “full automation” in measurable terms. Map each criterion to code, a reproducible test, and an output or limitation. Do not describe UI placeholders as implemented functionality.

Recommended submission package:

1. Requirements and a traceability table linking each requirement to implementation and acceptance results.
2. Architecture, account ERD, data flow and trust-boundary description from the setup/architecture documents.
3. Rule catalogue, scoring examples, source of weights and rationale for thresholds.
4. Experimental methodology, holdout dataset, confusion matrix, accuracy metrics and measured latency.
5. Account security and privacy evidence: two-user isolation, RLS denials, redacted sample log, logout/retention behaviour.
6. Browser/mobile feasibility study with exact versions, actual tested devices and official API limitations.
7. PDF samples showing short, empty and multipage reports, with screenshot evidence of readability.
8. Installation/user guide, deployment instructions, release/change history and store submission status.
9. Limitations and future work: false positives/negatives, detection after load, local-only history, unsupported browsers and pending external checks.

The automated database tests are useful evidence of the migration's policy logic, but a screenshot/result from your real Supabase project is still necessary to prove its deployed configuration. Similarly, mocked email/login tests must be labelled clearly.

Presentation sequence: install → sign up → verify → log in → controlled low/medium/high pages → medium proceed → high denial → current-tab popup → account switching → monthly PDF → explain one false positive and one false negative. This is stronger evidence than showing only the homepage.
