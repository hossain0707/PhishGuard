# PhishGuard user guide

Install the correct development package using the steps in README. Firefox's development installation is temporary. Official permanent installation will use signed/store-approved packages after review.

After installation, the account page opens. Choose **Continue with local protection (no account)** to scan HTTP/HTTPS pages and use private guest reports without connecting to Supabase. For optional account registration, choose Sign Up, enter a name, email and a password with at least 12 characters. Follow the verification email on the configured website, then return to the extension and log in. If an email does not arrive, check spam and contact the project operator. Accounts require an active configured Supabase project.

In guest or signed-in mode, open an HTTP/HTTPS page. The extension automatically evaluates the URL and page structure. Browser settings/store/internal pages cannot be scanned. LOW means few current indicators, not guaranteed safety. MEDIUM displays a warning and permits an exact-page exception in that tab for five minutes. HIGH redirects to a warning without a proceed option. The webpage may have loaded before either warning.

The popup shows the active tab's assessment. The dashboard lists your most recent 200 local assessments. Dashboard Clear hides earlier entries from that view but keeps report history. You can open Profile to edit your name, register the browser, erase your own history, or log out. Firefox browser registration is optional and needs technical-data consent; refusing it does not disable local protection. Closing the browser requires logging in again to resume account mode; guest risk scanning continues without login. Your account's local history is retained, separate from guest history.

Reports let you choose a calendar month in the device's local time zone and download a PDF, including an empty report. Use Print when your name contains scripts outside the downloaded PDF's standard Latin font. From v4.2.0 onward, assessments are also saved in an independent local IndexedDB archive, allowing older months to be regenerated even after rolling history expires. Removed browser data, storage-quota eviction, or explicitly deleted monthly records cannot be recovered. Deleting a month removes those records from your local history and dashboard. Exported PDFs remain separate files until you delete them.

Forgot Password sends a recovery email. Complete the new-password form on the website, then log into the extension using the new password. The website also lets you edit your profile and view recorded browser registrations; it does not show browsing histories from your devices.

Your history remains on this browser and is separated by account. URLs omit credentials, queries and fragments, but paths can contain personal information. Rolling records are limited by count and age; independent monthly records remain device-local, subject to available browser storage and explicit deletion. If storage is full, monitoring still runs but a notice warns that records could not be saved. Erasing local history is permanent.

PhishGuard is an explainable rule-based FYP implementation. It can miss phishing pages and flag legitimate sites. Do not enter credentials solely because a score is LOW, and continue using normal browser security controls.

## Phone use (4.2.0 candidate)

On an iPhone, open the PhishGuard website and choose **Check a URL**. Optionally add it to the Home Screen from Safari's Share menu. The checker parses URLs only; it cannot inspect webpage contents or automatically monitor Safari or Edge. Opt in separately if you wish to send the URL to an optional reputation checker; the feature is unavailable unless the operator configures a noncommercial Google API key.

The Firefox Android package is an experimental compatibility candidate and needs real-device testing plus Mozilla signing; do not call it generally supported until those tests pass.
