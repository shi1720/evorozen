# Firebase deployment verification

App: [remainder-desk.web.app](https://remainder-desk.web.app)

The final hosted follow-up **passed** on Cloud Run revision `remainder-00004-kfb`, serving source commit `bb57baf32a47edd79c37f0852b0ad2d298f103d1`, through Firebase Hosting on September 23, 2026. Password recovery, login, persistence, deletion, responsive layout, accessibility checks, and deliberate sample reanalysis all passed with zero additional live model requests. The [sanitized final report](validation/firebase-followup.json) records the result.

The earlier real-AI workflow was tested against revision `remainder-00002-d9d` on the same date. This was a normal disposable account using fictional documents, not the sample replay. All normal test accounts were deleted through the password-confirmed API after testing. Credentials and recovery keys were kept only in process memory.

## Real hosted workflow completed

- Browser signup and the Firebase-compatible `__session` cookie worked. The cookie was Secure, HTTP-only, and SameSite=Lax.
- Supplier product aliases and explicit case/pack notes were saved through the UI.
- Case creation, direct case links, and page reloads retained the saved record.
- A real PDF was extracted in the browser, reviewed, and saved. PNG OCR also worked under the production content security policy. The OCR result was reviewed and cancelled to avoid saving a duplicate invoice.
- The receiving note and supplier message established the delivered quantities and confirmed the product alias and pack equivalence.
- Two real OpenAI requests produced a USD 216 claim and matched a USD 144 credit. Owner selection, claim approval, and credit verification left USD 72 outstanding.
- The browser downloaded the generated evidence PDF through Firebase. PDF, CSV, JSON, email draft, and complete workspace exports worked. The email draft acknowledged the USD 144 credit and requested only USD 72.
- No browser JavaScript errors were recorded during the completed workflow.
- Account deletion succeeded. The former session and a subsequent login attempt were both rejected.

| Live request | Provider | Trace | Duration |
| --- | --- | --- | --- |
| Invoice and receiving evidence | OpenAI | `req_4efd6ed132e24ffdb6aacd1e857a19b0` | 2,710 ms |
| Arriving credit note | OpenAI | `req_8ebf05f75d9b40b1848f22f5a0a11fd6` | 5,158 ms |

The sanitized [browser-workflow report](validation/firebase-browser-workflow.json) contains the checks, amounts, export sizes, traces, and cleanup result. It deliberately retains `passed: false` for this run because the later narrow-layout check found an issue. The completed AI and export checks remain independently recorded.

## Issue found and corrected locally

The dashboard's recovery-loop legend created a minimum grid width after a partial credit. At 320 pixels, the dashboard expanded to 326 pixels. Earlier empty-balance layout tests had not exposed it.

The mobile grid now allows its column to shrink, and the recovery ring stacks above the two balance labels on the narrowest screens. The full recovery browser regression now checks the USD 144 credited / USD 72 remaining dashboard at 320 pixels. That test passed locally. The correction was subsequently verified on Cloud Run revision `remainder-00003-cpz` through Firebase. Landing, dashboard, case, and settings all fit at 320, 390, 768, and 1440 pixels. Automated WCAG 2 A/AA checks passed at 320 and 390 pixels, and no browser JavaScript errors were recorded. The [sanitized layout report](validation/firebase-sample-layout.json) also confirms that an explicit `force: true` sample rerun preserved the approved USD 216 claim, USD 144 credit, and USD 72 remainder. This follow-up used zero live model requests.

## Recovery correction verified on the final release

The hosted password recovery check confirmed that the server rotated the recovery key and revoked an existing session. It then found a separate UI issue: switching from the recovery-key screen to login retained the old React component state. The application now keys each Auth screen by mode so login mounts fresh. All 15 local browser tests passed, including a new complete recovery, login, and account-deletion regression. The correction then passed on the final hosted revision `remainder-00004-kfb`. The browser returned to a fresh login form, accepted the new password, reopened the saved case through a direct link and a reload, and exported the workspace. The disposable normal account was deleted through the correct-password API, and subsequent session and login checks returned HTTP 401. No additional live model calls were made.

To reproduce the final verification:

```sh
node scripts/verify-hosted-followup.mjs --live --base=https://remainder-desk.web.app
```

This follow-up completed successfully and makes **zero live model requests**. It verifies password recovery, key rotation, revocation of an existing Firebase session, login, persistence, deletion of a disposable normal account, and the same partial-credit layout using a clearly labeled sample replay. It checks landing, dashboard, case, and settings at 320, 390, 768, and 1440 pixels, with automated mobile accessibility checks. All 16 page/viewport combinations passed without page overflow. Automated WCAG 2 A/AA checks passed for all four pages at both 320 and 390 pixels, and no browser JavaScript errors were recorded. Its sanitized result is written to `docs/validation/firebase-followup.json`.

The final sample workspace was logged out, and its ID is reported for immediate administrative cleanup. If it is not removed administratively, the application's seven-day demo expiry applies. Sample workspaces are not reported as real customer traction.

The complete live workflow can be repeated explicitly with:

```sh
node scripts/verify-hosted.mjs --live --base=https://remainder-desk.web.app
```

That command creates and deletes a disposable normal account and uses at most two live analyses. It should not be included in ordinary CI runs.

## Public-route checks

Unauthenticated dashboard and workspace export requests returned HTTP 401 with JSON and `Cache-Control: no-store`. A cross-origin mutation returned HTTP 403. Health, privacy, terms, and application deep links returned their expected responses through Firebase.

These checks demonstrate specific hosted workflows using fictional records. They do not establish broad model accuracy, guaranteed uptime, or customer traction.
