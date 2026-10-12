# Demonstration guide

The README animation and screenshots show the actual application with isolated mocked Supabase and synthetic assessments. They are a reproducible demonstration of the interface and controls, not a record of real users, live threats or measured production accuracy.

## Recreate the media

```bash
npm ci
npm run demo
```

Windows uses installed Edge by default. Linux/macOS use Playwright Chromium; install it with `npx playwright install --with-deps chromium`. Override the browser using `TEST_BROWSER_CHANNEL`. The demo starts an isolated local website on port 4173, runs a temporary extension profile, captures screenshots, checks eight screens with axe, closes its processes and removes its temporary browser profile. It makes no live Supabase account/table mutations.

`tools/demo.mjs` captures the UI; `tools/make-demo-animation.mjs` creates a script-free SVG slideshow with reduced-motion support. Assets belong in `docs/assets`; full accessibility findings go to ignored `test-results/accessibility.json`.

## Presentation walkthrough

| Stage | Show                                        | Explain                                                                    |
| ----- | ------------------------------------------- | -------------------------------------------------------------------------- |
| 1     | Website, downloads, extension install       | One source project builds browser-specific packages                        |
| 2     | Signup, verification and login              | Live email verification requires the configured Supabase project           |
| 3     | Low-indicator HTTPS fixture                 | A low score is not a safety guarantee                                      |
| 4     | HTTP/IP fixture → medium warning            | Exact-page exception works in this tab for five minutes                    |
| 5     | HTTP/IP/login fixture → high warning        | UI hides proceed, and the background also rejects bypass requests          |
| 6     | Add forms/iframes to a controlled page      | Dynamic structural changes trigger reassessment                            |
| 7     | Switch Alice/Bob test accounts              | Histories are separated by authenticated user ID                           |
| 8     | Choose month, export PDF and print          | Readable reports include retained local assessments only                   |
| 9     | Explain a false positive and false negative | The project evaluates heuristics rather than claiming guaranteed detection |

For a live academic demonstration, use two verified test accounts and harmless fixtures. Do not expose evaluators to active phishing pages or display real passwords, tokens or personal browsing histories.

## What the screenshots do not establish

Desktop screenshots do not establish Android support, successful store review, production email delivery, deployed RLS or broad phishing accuracy. Verify those independently using [TEST-PLAN](TEST-PLAN.md) and [RELEASE-READINESS](RELEASE-READINESS.md).
