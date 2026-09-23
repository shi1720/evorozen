# Remainder — independent judge review

**Review date:** 23 September 2026. **Reviewer:** a separate AI judge agent, requested by Shivam Gupta. **Scope:** the local working app at `http://localhost:3210`, source code, tests, research, commercial plan, submission copy, script, deck, brief, preserved live integration results, and public deployment-link checks. This is a skeptical internal review, not an organizer score or prediction of winning.

**Final verdict:** Remainder now has a credible, usable hosted pilot with unusually clear financial evidence. Preserved execution records demonstrate normal-account AI analysis, signed supplier memory, partial-credit exports, persistence through redeployment, an isolated database restore, and account deletion. The submission remains incomplete until narration, eligibility, and the actual Devpost entry are finished. Customer demand, broad document accuracy, continuous availability and suitability for confidential records under the current unpaid Gemini terms remain unproven.

This final independent reassessment inspected the [deployment report](validation-deployment.md), [sanitized deployment record](validation/deployed-workflow.json), [six-case evaluation](validation-model-eval.md), [per-case results](validation/model-eval-results.json), and [production screenshot](../public/media/live-deployment.png). It independently checked the latest GitHub CI status: commit `01570e9177fbc56dde90bab0a9c39e68e152d209` [passed](https://github.com/shi1720/evorozen/actions/runs/35819019507). The hosted workflow was recorded at `45c45d17fa50b2b025138bd8d359bdeafb433a11`, then persisted through redeploy to `01570e9`. This judge made no new live-provider requests; it reviewed preserved execution evidence. Earlier local observations remain below as review history and are distinct from the deterministic replay used in the video.

## Scores against the five criteria

The event gives no numerical weights in the supplied rubric. These **0–5 internal scores** are equally weighted only to make gaps visible. They are provisional evidence scores, not percentages of production readiness.

| Criterion | Score | Evidence supporting the score | Deductions and what would change the score |
| --- | ---: | --- | --- |
| Core engine and AI integration | **4.0 / 5** | Two initial live Gemini integrations, six additional curated live cases, and a hosted normal-account workflow are preserved. Three additional shortages were supported at exact INR/EUR/USD totals; three problematic cases were blocked, including a real wrong-supplier model error. The actual approval hook wrote signed Evorozen memory and account deletion cleaned it up. Quotations, issuer checks, integer money and human review govern proposals. | Six curated cases are a small pipeline evaluation, not perfect model accuracy: the model made an incorrect proposal and an unnecessary review card. Customer-document and OCR generalization remain unmeasured. Sponsor inference failed upstream; memory integration is distinct from primary sponsor intelligence and no bonus is assumed. |
| Business viability and GTM | **3.5 / 5** | Specific buyer and recurring operational job; close competitors acknowledged; $29 price explicitly a hypothesis; finite 50-call allowance and useful cost sensitivities; practical bookkeeper-led validation plan and interview guide. | No buyer interview, willingness to pay, retention, applied-credit outcome, or actual acquisition cost verified. The close competitor Supply Verify weakens any novelty claim based on intake alone. Obtain several real case walkthroughs and one concrete paid-pilot commitment; measure support and inference cost. |
| UI/UX and design aesthetic | **4.0 / 5** | Coherent warm-paper/forest visual system; a complete readable desktop workflow; explicit sample banner; quoted evidence; review before approval; distinct claim, credit-note, and outstanding labels; functional empty-state intake and exports. | Desktop and mobile browser checks are now confirmed. The release owner also reports zero axe violations on landing, signup, login, recovery, privacy and terms pages. These are useful automated checks, not a full accessibility audit or usability study with a busy cafe operator. The recovery key and evidence-format requirements need observed first-user onboarding. |
| Technical scalability and code quality | **4.5 / 5** | **82 automated tests and 6 browser tests pass**, with green CI independently confirmed. The hosted record verifies secure session cookies, actual inference, signed-memory hooks, four exports, balances surviving redeploy, a PostgreSQL dump restored into a separate disposable branch, and account/session/case/credit and remote-memory deletion. Earlier independent checks covered tenant isolation, foreign-origin rejection, duplicate credits and stale edits. | This is strong pilot engineering, not demonstrated mass-scale operation. No load or sustained uptime evidence exists; the free host sleeps, quotas are finite, and scheduled backups are not configured. A single manual restore does not establish ongoing recovery objectives. Confidential-document onboarding also requires suitable provider data terms. |
| Pitch and video demonstration | **3.5 / 5** | Actual **170-second, 1080p silent walkthrough** now shows the working claim, source review, downloads, partial credit and remainder. It includes separately labeled live-test evidence, GTM and pricing cards. Seven-slide deck, brief, 355-word script and editing guide are aligned. | Shivam’s narration and the final uploaded video link remain outstanding. The live evidence card summarizes real tests; it is not footage of a fresh provider request. The deployed workflow now has preserved execution evidence. The final narrated video, hosted video link and submission receipt remain absent. |
| **Internal total** | **19.5 / 25** | Scores reflect observed and preserved evidence, with no traction or sponsor-inference bonus assumed. | The largest remaining gains require evidence, not more decorative features. |

## Final score rationale and remaining gates

The final total rises from **18.5 to 19.5/25**: **+0.5 for AI integration**, because new independent fixtures exercise valid findings and actual model mistakes through the unchanged pipeline; **+0.5 for technical quality**, because deployment, persistence, restore and deletion are demonstrated rather than merely documented. Business, design and pitch scores are unchanged. This is an unweighted internal assessment, not a probability of winning or an organizer endorsement.

The production screenshot shows a normal account with GBP 63.55 claimed, GBP 18.75 in verified credit notes, and GBP 44.80 outstanding, plus Gemini provenance. Verified credit-note evidence is **not proof of a credit applied to a bill or cash received**. The six-case evaluation supported three expected shortages and prevented three problematic cases from becoming claimable. One wrong-supplier model proposal for USD 76 was caught by the application. These are useful boundaries, not proof that the model itself was always correct.

Remaining gates:

- **Human submission:** Shivam must record narration, export and upload the final video within three minutes, confirm student/age/jurisdiction eligibility, and complete Devpost with a retained receipt. The release owner reports that the locked Mac blocks Devpost draft completion. No human contributions or eligibility should be invented.
- **Deadline:** the official header and rules body conflict; organizer clarification remains unresolved. Verify submission availability rather than silently choosing a date.
- **Confidential customer production use:** current unpaid Gemini terms permit submitted content to be used for product improvement. Use fictional or nonconfidential redacted records until appropriate provider terms are arranged. Free-host availability, finite quotas, scheduled backups and sustained load still need an operating plan.
- **Commercial proof:** zero customers, paid pilots, retained users or applied-credit outcomes are verified. Interviews and observed operator workflows remain more valuable than adding features. Synthetic evaluation does not substitute for field accuracy or acquisition evidence.

## Observed end-to-end evidence

The local app's `/api/health` returned a healthy database. A fresh browser selected **Explore the sample demo**, then opened **A delivery that came up short** at `/app/cases/:id`.

| Check | Actual result |
| --- | --- |
| Initial review | Two findings: 14,400 cents and 7,200 cents. Both `accepted: false`; both supported. Provider: `demo`. No Prepare claim button before selection. |
| Source review | Invoice evidence dialog exposed the actual reviewed line, including `Unit price: USD 36.00`. |
| Explicit approval | Selected each finding, opened Prepare claim, confirmed **I reviewed it. Prepare claim.** Case became approved with 21,600 claimed cents. |
| Initial PDF | Downloaded the evidence PDF through the visible UI; 25,131 bytes in this run. |
| Credit intake | Used Add credit note → Load the $144 sample credit note → Save reviewed text → Findings → Match new credit. |
| Credit review | Inspect evidence exposed CN-208. Verify credit changed status to `partial`, retaining the original approved claim. |
| Result | Claimed **21,600** cents; verified credit notes **14,400** cents; remaining **7,200** cents. |
| Duplicate document | Reuploading identical credit text returned `duplicate: true`; document count and credited amount did not increase. |
| Duplicate verification | Repeating verification returned HTTP 409 / `DUPLICATE_CREDIT`. |
| Concurrent edit protection | An old case version returned HTTP 409 / `VERSION_CONFLICT`. |
| Partial follow-up | Downloaded email now lists CN-208 at USD 144.00, the original USD 216.00 request, and **only USD 72.00 outstanding**. It explicitly distinguishes credit notes from cash and applied credits. |
| Structured exports | JSON, CSV, and PDF returned HTTP 200 with the corresponding content types. Final PDF was 27,150 bytes in this run. File sizes are observations, not assertions that later builds must match. |
| Browser errors | No page-error events in the successful complete run. |

Fresh normal-account intake was tested separately, without pressing Analyze:

- Registered a new account and created a case through the UI.
- Uploaded a generated text PDF containing the fictional invoice. Browser extraction returned 538 characters and preserved NF-1042 and the explicit unit price. Reviewed and saved it.
- Uploaded the fictional receiving note as a text file, selected its document type, and saved it.
- The API showed a draft case with exactly those two documents and `analysis: null`.
- Deleted the test account after the check. This verifies intake and storage, not AI extraction from a new document layout or image OCR quality.

## Account and isolation checks

A second normal test account could not read the first workspace's case: **404**, with no records returned. A write request carrying a foreign Origin was rejected with **403 / ORIGIN_MISMATCH**. Password recovery rotated the recovery code, revoked the previous session (**401** afterward), and allowed login with the new password. Authenticated account deletion succeeded. Logging out of the demo and reopening its case route led to `/login`.

These are targeted observations, not a penetration test or certification. They support the architecture more strongly than the presence of login screens alone.

## Engine boundary checks and iteration

`npm test` initially passed **3 files / 44 tests** and a later independent run passed **3 files / 62 tests** after additional provider, input, and budget coverage. The release owner subsequently confirmed the final **82 unit/API/storage/memory tests and 6 browser tests passing**, with isolated test databases. Separate production-policy browser checks covered PDF text extraction and PNG OCR. The suite covers deterministic money, malformed provider output, invented quotations, inappropriate currencies, prompt-like source text, wrong invoice references, duplicate evidence, and failure behavior. Mocked-provider tests validate the integration boundary; they are not live-provider evidence.

Two issues found during review were corrected in the working source and rechecked:

1. **Supplier identity on credit evidence.** The earlier credit checks did not adequately ground the issuer. The current engine requires a supplier header, preserves supplier evidence, and rechecks issuer identity during verification. An independent mocked response for a credit headed `OTHER SUPPLIER`, with otherwise matching invoice, credit reference, amount, and currency, produced **zero proposed credits**. Calling verification on the mismatched evidence threw `SUPPLIER_MISMATCH`.
2. **Follow-up after a partial credit.** The original export reused the full claim request. The current downloaded email acknowledges USD 144.00 already credited and requests only USD 72.00. This materially improves the product's central promise.

A meaningful remaining limitation was reproduced: replacing the explicit invoice wording `Quantity: 12 cases | Unit price: USD 36.00` with `12 cases | USD 36.00` makes the otherwise correct mocked extraction require review. The validator requires a supported price label, so it fails safely. The follow-up engine added tests for structured CSV, quoted CSV, TSV, and other table layouts with price headers, improving this specific limitation. A row with no usable unit-price label or column header should still fail safely. Do not claim reliable arbitrary-invoice processing until a labeled evaluation set demonstrates it; measure how often customers must correct a transcription.

The initial automation used Playwright's immediate `check()` assertion and failed because the controlled checkbox saves asynchronously. A normal click followed by waiting for the persisted state worked; subsequent case approval passed. This was an automation synchronization issue, not evidence that the review control was broken. The runbook now instructs waiting for each selection to save.

## Commercial and collateral review

The research treats competitor marketing as attributed evidence, not independent proof. Supply Verify is a close alternative; the defensible starting position is a narrower independent-operator credit desk with visible partial settlement. There is no established moat. Supplier memory may improve repeat use, but tenant-specific aliases alone are not a durable competitive barrier.

The economic model correctly distinguishes hypothetical provider prices from a quote. At the base-case 220 calls per fully used $29 account, its modeled contribution ranges from $23.23 at $0.005/call to $2.33 at $0.10/call, before explicitly excluded costs. The updated plan also accounts for multiple Evorozen extraction windows: at eight windows per analysis and the illustrative $0.025/call, 1,760 calls cost $44 in AI alone and yield a negative $19.67 contribution under the stated assumptions. Request counts must govern any included allowance. Six support minutes per month is particularly optimistic and should be measured. The published first 50 calls support a tiny launch allowance, not an unlimited public AI service or recurring monthly entitlement.

The deck and brief consistently label the case as fictional, use the same three amounts, and avoid fabricated users or recovered cash. The generated PPTX uses editable shapes and a native chart; slide previews and the one-page PDF were inspected after rendering. The 355-word script is concise enough to rehearse below three minutes. The actual silent master is exactly 170 seconds (H.264, 1920×1080), and 17 representative frames were inspected. It shows source inspection, not a claim that preloaded documents were freshly uploaded. The 2:08–2:24 card explicitly separates live Gemini tests from the sample replay footage. Human narration and final upload are still required.

The pitch should emphasize three things: **the incomplete credit**, **the source-backed review**, and **the remainder that stays visible**. More features would currently weaken the demonstration. First-customer validation and real provider reliability would strengthen it.

## Submission blockers and next evidence

| Priority | Outstanding item at this snapshot | Completion evidence |
| --- | --- | --- |
| Required | Student/age/jurisdiction eligibility | Shivam's confirmation against the full rules; no inferred status. |
| Required | Contradictory event deadline | Submission availability and organizer clarification. The header says Sep 30, 2026 11:45 PM PKT; rules body says Sep 20, 11:45 PM PDT. See [official rules](https://evorozen-apex.devpost.com/rules). |
| Passed narrowly; extend before customer launch | Live AI | Initial integrations, the hosted workflow and six additional curated cases are preserved. The [evaluation](validation-model-eval.md) separates supported findings from blocked model proposals. Broader reliability remains unmeasured; Evorozen inference success is not claimed. |
| Verified within pilot scope | Public working app | [Live preview](https://remainder-apex.onrender.com) on Render + Neon. The [hosted record](validation-deployment.md) verifies actual AI, memory, exports, redeploy persistence, isolated restore and deletion. Free-host availability and long-term operations remain unproven. |
| Required | Final video | Silent 2:50 working-product master and 355-word narration are prepared. Add Shivam’s voice, check the final duration and accessibility, and preserve accurate provider distinctions. |
| Required; session access blocked | Final entry | The release owner reports that the locked Mac prevents Devpost draft completion. Unlock the session, review links and eligibility, submit, and retain confirmation. Prepared copy is not submission. |
| Strong improvement | Generalization | The six-case curated evaluation is complete. Extend it to consented real layouts and OCR, repeated runs, ambiguous credits, and varied supplier documents; continue reporting supported, blocked, and wrong findings separately. |
| Strong improvement | Commercial validation | Consented operator/bookkeeper walkthroughs, observed review time and corrections, and a real purchase decision. Zero verified customers remains zero. |

## Follow-up evidence

The integration agent preserved real responses dated 23 September 2026 at 04:15:06 UTC and 04:16:45 UTC. The judge inspected their summary fields: actual provider `gemini`, model `gemini-3.5-flash-lite`, `passed: true`, one request each, and the expected integer totals. The second fixture uses different supplier data, CSV/TSV formatting, GBP and decimal unit prices. It is stronger evidence than replaying the first demo twice, but it is still synthetic. After the initial VirtualDB capability probe, the actual production memory module passed five live requests, including signed alias write, validated recall, scoped deletion and absent recall afterward. Its sanitized archive is [public](validation/evorozen-signed-memory.json). This establishes module-level memory integration using fictional aliases, not successful sponsor extraction or customer usage.

The intermediate review rose from **16.5 to 18.5/25** when live extraction, operating documentation, more tests and a real walkthrough became available. The final reassessment above supersedes that score with **19.5/25** after reviewing the hosted lifecycle, restore and six-case evaluation evidence. Customer validation, broad document reliability and finished narration remain limiting factors.

## Public deployment checks

On 23 September 2026, this reviewer independently fetched the public homepage, health endpoint and GitHub repository. All returned HTTP 200. `https://remainder-apex.onrender.com/api/health` returned `{"status":"ok","database":"ok"}`. The release owner confirms hosting on Render free tier with Neon PostgreSQL and a green initial CI run. Those initial link and health checks alone did not establish a deployed AI workflow. The later execution record now establishes one synthetic normal-account workflow and lifecycle; neither check establishes an uptime guarantee.

The final deck and one-page brief include clickable live-app and source-repository links. Their PDF annotations and native PowerPoint hyperlink relationships were inspected after generation, and the changed pages/slides were rendered and visually reviewed. The existing 170-second video remains labeled sample replay; the deployed app link belongs in its public description and the editing guide.

## Evidence preservation

Local diagnostic artifacts were written under `.artifacts/judge/` (workflow observations, intake observations, screenshots, and actual downloaded exports). They are development evidence, not customer traction. Private helper scripts are `.artifacts/judge-workflow.mjs`, `.artifacts/judge-intake.mjs`, and `.artifacts/judge-boundaries.ts`. They use fictional data and local accounts; the boundary helper replaces network fetch with a mock.

Reviewed engine SHA-256 at the recorded boundary check: `10f3878064d9b58ab636af319200d583df7d7697ccd48cd74834d3cb83b52a49`. Reviewed export module: `4616c2abffb9ff7190019e88a1ec833933cd08f55e56ba07aa022cd7baa9dbfe`. Later changes require targeted rechecks. The final release should retain a commit identifier and concise public verification record without credentials, recovery codes, cookies, or private source documents.

## Final release evidence reviewed

The judge inspected the release owner's [hosted workflow and restore report](validation-deployment.md) and [sanitized record](validation/deployed-workflow.json). Gemini trace `3lazaunTF9aX3boP8JmV4A0` produced GBP 63.55 / 18.75 / 44.80; approval stored signed Evorozen aliases; PDF/CSV/JSON/EML exports were correct; the account and balances survived redeploy. A real PostgreSQL dump restored into a separate disposable Neon branch with identical integer amounts. Subsequent deletion left no test account, sessions, suppliers, cases, verified credits or activities, and removed remote signed memory. Production was not overwritten by the restore rehearsal. Scheduled backups are not configured.

The judge also inspected the [six-case live evaluation](validation-model-eval.md) and [per-case results](validation/model-eval-results.json). Three legitimate shortages were supported at INR 556.50, EUR 34.70 and USD 18.00. Wrong supplier, ambiguous units and overdelivery produced zero claimable amounts. One actual wrong-supplier model proposal was blocked by the engine; an unnecessary overdelivery review card remains a UX limitation. Each fixture ran once, all data was synthetic, and there were no retries or alternate providers. These records justify the limited score increases above while leaving customer demand, universal accuracy and ongoing production operations unproven.
