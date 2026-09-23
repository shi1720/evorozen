# Firebase deployment verification

App: [remainder-desk.web.app](https://remainder-desk.web.app)

The hosted application was tested through Firebase Hosting against Cloud Run revision `remainder-00002-d9d` on September 23, 2026. This was a normal disposable account using fictional documents, not the sample replay. All normal test accounts were deleted through the password-confirmed API after testing. Credentials and recovery keys were kept only in process memory.

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

The mobile grid now allows its column to shrink, and the recovery ring stacks above the two balance labels on the narrowest screens. The full recovery browser regression now checks the USD 144 credited / USD 72 remaining dashboard at 320 pixels. That test passed locally. The final hosted layout check is pending deployment of this correction.

## Final hosted follow-up

Run after the corrected revision is published:

```sh
node scripts/verify-hosted-followup.mjs --live --base=https://remainder-desk.web.app
```

This follow-up makes **zero live model requests**. It verifies password recovery, key rotation, revocation of an existing Firebase session, login, persistence, deletion of a disposable normal account, and the same partial-credit layout using a clearly labeled sample replay. It checks landing, dashboard, case, and settings at 320, 390, 768, and 1440 pixels, with automated mobile accessibility checks. Its sanitized result is written to `docs/validation/firebase-followup.json`.

The sample workspace is logged out and its ID is reported for immediate administrative cleanup. If it is not removed administratively, the application's seven-day demo expiry applies. Sample workspaces are not reported as real customer traction.

The complete live workflow can be repeated explicitly with:

```sh
node scripts/verify-hosted.mjs --live --base=https://remainder-desk.web.app
```

That command creates and deletes a disposable normal account and uses at most two live analyses. It should not be included in ordinary CI runs.

## Public-route checks

Unauthenticated dashboard and workspace export requests returned HTTP 401 with JSON and `Cache-Control: no-store`. A cross-origin mutation returned HTTP 403. Health, privacy, terms, and application deep links returned their expected responses through Firebase.

These checks demonstrate specific hosted workflows using fictional records. They do not establish broad model accuracy, guaranteed uptime, or customer traction.
