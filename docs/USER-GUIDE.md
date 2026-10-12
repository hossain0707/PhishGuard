# PhishGuard user guide

Install the correct development package using the steps in README. Firefox's development installation is temporary. Official permanent installation will use signed/store-approved packages after review.

After installation, the account page opens. Choose Sign Up, enter a name, email and a password with at least 12 characters. Follow the verification email on the configured website, then return to the extension and log in. If an email does not arrive, check spam and contact the project operator. Accounts require an active configured Supabase project.

Once signed in, open an HTTP/HTTPS page. The extension automatically evaluates the URL and page structure. Browser settings/store/internal pages cannot be scanned. LOW means few current indicators, not guaranteed safety. MEDIUM displays a warning and permits an exact-page exception in that tab for five minutes. HIGH redirects to a warning without a proceed option. The webpage may have loaded before either warning.

The popup shows the active tab's assessment. The dashboard lists your most recent 200 local assessments. Dashboard Clear hides earlier entries from that view but keeps report history. You can open Profile to edit your name, register the browser, erase your own history, or log out. Firefox browser registration is optional and needs technical-data consent; refusing it does not disable local protection. Closing the browser requires logging in again; your account's local history is retained.

Reports let you choose a calendar month in the device's local time zone and download a PDF, including an empty report. Use Print when your name contains scripts outside the downloaded PDF's standard Latin font. A report lists retained assessments only; deleted records cannot be recovered. Deleting a month removes those records from your local history and dashboard. Exported PDFs remain separate files until you delete them.

Forgot Password sends a recovery email. Complete the new-password form on the website, then log into the extension using the new password. The website also lets you edit your profile and view recorded browser registrations; it does not show browsing histories from your devices.

Your history remains on this browser and is separated by account. URLs omit credentials, queries and fragments, but paths can contain personal information. Records are limited by count, age and available browser storage. If storage is full, monitoring still runs but a notice warns that records could not be saved. Erasing local history is permanent.

PhishGuard is an explainable rule-based FYP implementation. It can miss phishing pages and flag legitimate sites. Do not enter credentials solely because a score is LOW, and continue using normal browser security controls.
