# Remainder demo runbook

Routes and controls below were exercised with headless Chromium against `http://localhost:3210` on 23 September 2026. The full fictional case passed through partial-credit verification and export. **The final public deployment still needs its own smoke test.** The base path is `/app`; a case identifier comes from the application's case list and must not be hard-coded into a public instruction. The case route is `/app/cases/:id`.

## Recording prerequisites

1. Start the documented app command and check `/api/health` reports the database as healthy. For the final submission, use the confirmed public HTTPS deployment and test it from a fresh browser session.
2. Use a clean browser profile with no private tabs, password manager popups, or visible developer secrets. Set viewport to 1440x900 or larger for recording.
3. Keep the fictional source pack ready: `public/samples/Northstar-invoice-NF-1042.txt`, `public/samples/Northstar-delivery-DN-771.txt`, and `public/samples/Northstar-credit-CN-208.txt`. `Northstar-product-alias.txt` is optional context. Required contents appear below.
4. Confirm whether this run is **sample replay** or a **real provider request**. The visible label and narration must agree. The public sample path uses an isolated demo workspace; a real request requires a real account and a configured provider.
5. Check the provider allowance. Budget two successful analyses for the original evidence and later credit note, with capacity for failure recovery. Do not assume every request is free.

## Source pack and expected result

| Document | Required evidence |
| --- | --- |
| Northstar invoice NF-1042 | OAT BARISTA 6X1L: 12 cases at $36; TOMATO WHOLE 6X2.5KG: 10 cases at $24; OLIVE OIL 5L: 4 tins at $32. USD. |
| Receiving note for NF-1042 | Received barista oat drink: 8 cases; tomatoes: 7 cases; olive oil: 4 tins. |
| Supplier credit CN-208 | Explicitly references NF-1042 and credits $144 for oat drink. |

Expected arithmetic: `(12 - 8) × 36 = 144`, `(10 - 7) × 24 = 72`, total `216`; verified credit `144`; outstanding `72`. The fixture excludes tax and other adjustments. Do not imply that these fictional documents came from a customer.

For a normal-account live AI recording, polished upload inputs are available at `public/samples/northstar-invoice.pdf`, `northstar-delivery.pdf`, and `northstar-credit.pdf`. Their extracted PDF text matches the canonical TXT wording after whitespace normalization. `northstar-invoice.png` is a 200-dpi image of the same fictional invoice for testing OCR. Keep the fictional labels visible. The isolated demo replay uses its original fixture text and shortcuts; PDF/OCR extraction may change whitespace and page markers, so use a normal account for those uploads and a real provider request.

## Main walkthrough

| Step | Action | Expected observation |
| --- | --- | --- |
| 1 | Open `/` and click **Explore the sample demo**. | A unique fictional workspace opens at `/app`. Its banner identifies AI results as sample replay. It must not reveal another visitor's changes. |
| 2 | Open **A delivery that came up short** from the overview or case list. This is the Fern & Flour / Northstar case. | Invoice NF-1042 and the receiving note are available. The credit note has not yet been added in a fresh sample session. |
| 3 | Open **Findings**. The initial sample case may already have a replay analysis. For fresh evidence, click **Analyze documents** in the paper-trail area. | Findings show $144 oat shortage and $72 tomato shortage with exact source quotations. Live mode also records actual provider provenance. |
| 4 | Click each finding's **Invoice** and **Delivery note** evidence links. Review the text, then select **Include in claim** for each of the two supported findings. Both checkboxes start unchecked. Wait for each selection to save before selecting the next. | The accepted claim total is $216. **Prepare claim** appears after a finding is selected. No finding is included merely because the sample analysis exists. |
| 5 | Click **Prepare claim**, read the confirmation, then **I reviewed it. Prepare claim.** | The draft references the supplier, invoice, reviewed line items, and $216 requested credit. |
| 6 | Open **Claim draft** and download **Email draft** and **Evidence PDF**. These also appear under the **Export** menu. | Files download and the PDF opens legibly. The application does not send an email itself. Only use **I've sent this claim** after actually sending it yourself. |
| 7 | Click **Add credit note**, then **Load the $144 sample credit note** in a demo workspace. Click **Save reviewed text**, return to **Findings**, and click **Match new credit**. In a real workspace, upload/paste the fictional credit file instead of using a demo shortcut. | The existing $216 claimed amount survives. The proposed credit is $144 and references NF-1042. |
| 8 | Under **Credits to connect**, choose **Inspect evidence**, review CN-208, then click **Verify credit**. | The case shows $144 credit-note verified and $72 outstanding. It remains open for the tomato remainder. |
| 9 | Show the activity record and supplier aliases. | The workspace records actual actions. Alias memory does not imply shared customer data or model training. |
| 10 | End on the outstanding balance. | Narration explains that a credit note is distinct from cash received or credit applied to a bill. |

## Real-provider evidence capture

Use a fresh real account with fictional documents if no customer documents are available. This demonstrates live inference without inventing a customer. Record the provider label, request timestamp, trace ID if supplied, source quotations, and final reviewed amounts. Exclude API keys, passwords, recovery codes, and session cookies from screenshots and published logs.

The currently verified live extraction provider is Gemini 3.5 Flash-Lite. Two synthetic packs passed; the sponsor’s inference service failed upstream. A successful Gemini run does not prove Evorozen inference worked, and the separate VirtualDB probe does not establish that either. Record exactly what ran and keep the final video and submission consistent. See [AI validation](validation-ai.md).

## Quick robustness checks before filming

- Add the same credit note again. The verified amount must not increase above $144.
- Try a credit with the wrong invoice reference. It must not automatically settle this case.
- Start a fresh demo. The main sample case should return to its initial state without changing another session.
- Log out, then access a case URL. The app should require authentication.
- In a separate account, attempt to access the first account's case through the authenticated API. It must fail without exposing records.
- Confirm the exported PDF preserves the reviewed claim, credited amount, outstanding balance, evidence, and appropriate sample/provider labels.

The local sample flow, duplicate evidence, repeat verification, logout, foreign-workspace access, and exports passed the independent review on 23 September. Wrong-invoice evidence is covered by the automated engine suite. Repeat these checks on the final deployment; see [the review evidence](judge-review.md) for the exact scope and limitations.

## Recovery during a demo

If a provider fails, show the clear error and retry only when appropriate. Do not change the narration to imply a successful request. For a recording, fix the issue and record again. If a sample session has already consumed its credit note, create a fresh isolated sample session instead of manually pretending the prior state is new.

If a PDF or browser action opens a new window, wait for it to finish before moving on. Keep a pre-opened copy of the generated sample PDF available only as a recording convenience, and do not imply that it proves a new export if the export failed.

## Final checks

Repeat the route and button checks on the final public deployment, verify the public app link, and rehearse once with a timer. Pair this runbook with [the narration](video-script.md) and [submission checklist](judging-checklist.md).
