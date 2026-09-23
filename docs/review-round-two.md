# Remainder: independent review, round two

Reviewed on 23 September 2026 for the Firebase and narrated-video release. This review combines source inspection, preserved live-provider evidence, the hosted financial workflow, the completed video, the client review, and the actual scheduled-backup restore record. Application commit `bb57baf32a47edd79c37f0852b0ad2d298f103d1` passed [CI](https://github.com/shi1720/evorozen/actions/runs/35824129185) with **118 application tests, 15 browser tests, and 2 backup tests** and is deployed as Cloud Run revision `remainder-00004-kfb`. The [release record](validation/firebase-release.json) identifies that exact application source; later documentation commits do not change the deployed runtime.

This is an internal product review, not an organizer score or a prediction of winning. The prior release scored **19.5/25**. The current implementation and media evidence support a provisional **20.5/25**. The Firebase app, hosted recovery and layout follow-up, and public Firebase video player are verified. YouTube publication and the completed Devpost submission remain separate gates. No score increase is assigned merely for clearing these delivery checks.

## The strongest part of the submission

The product has an understandable outcome: **$216 claimed, $144 credited, $72 still open**. Showing the changed follow-up email after the partial credit demonstrates that the workflow continues beyond a generated draft. Source quotations, owner approval, and the durable verification record make the amount inspectable.

Keep this story central. A generic list of AI features, a broad restaurant platform, or unsupported claims about market size would make the submission less clear. The credible position is a focused workflow for independent businesses and their bookkeepers. Supplier aliases are useful product context, but there is no established moat or verified demand yet.

## Rubric assessment

| Criterion | Current evidence-based score | Evidence | Remaining limit |
| --- | ---: | --- | --- |
| Core engine and AI integration | 4.0/5 | Real OpenAI GPT-5.4 mini analysis in the recorded case and through Firebase; two reference packs and six varied live evaluation cases; source and money checks; separately verified signed Evorozen memory. | Extend evaluation to consented customer layouts and repeated runs. Synthetic fixtures and a successful film do not establish broad accuracy or perfect reliability. No sponsor-inference bonus is assumed. |
| Business viability and GTM | 3.5/5 | Specific buyer and task; bookkeeper-led acquisition hypothesis; $29 proposed price with request-cost and support-time sensitivity. | No verified external customer use, retained users, paid decisions, or revenue. A more polished submission cannot substitute for customer evidence. |
| UI/UX and design | 4.5/5 | Coherent visual system plus corrected stale upload text, unsaved claim exports, session recovery, mobile focus, dates, and overflow. The client review records 20 viewport/page combinations. The latest 15 browser tests include the partial-credit case at 320 pixels and recovered-account login. The hosted follow-up passes 16 page/viewport combinations. | Continue observed usability work with operators. Automated accessibility checks and selected viewports do not establish certification or flawless behavior on every device. |
| Technical scalability and code quality | 4.5/5 | Persistent PostgreSQL; transactional balances and credit ledger; account isolation; request limits; recovery and deletion; 118 passing application tests; 2 passing backup tests; real hosted PDF/OCR, inference, exports, and deletion; scheduled private backups with an isolated restore. | The source commit has green CI and an identified deployed revision. No sustained load, uptime history, guaranteed recovery objective, or perfect model reliability is demonstrated. Instance and request caps are not a monetary spending cap. |
| Pitch and video | 4.0/5 | Completed 170.88-second narrated, captioned film using actual OpenAI calls and captured app actions. All 16 representative frames, full decode, 44 caption cues, voice disclosure, and audio levels checked. Specific story and GTM are clear. The public Firebase player passes signed-out playback, seeking, file-integrity, caption, and four-width checks; the deck and brief are refreshed. | The final video has not been uploaded to YouTube, and its Devpost video field is not verified as saved. Do not substitute the earlier silent replay master. |
| **Current total** | **20.5/25** | +0.5 for documented interface corrections and broader browser coverage; +0.5 for the completed narrated, captioned live-inference film. Hosted workflow and backup evidence strengthen the existing technical score. | This assesses the deployed product and public Firebase film, not completion of YouTube publication, Devpost submission, or commercial validation. |

## Hosted workflow: what passed and what did not

The [Firebase browser record](validation/firebase-browser-workflow.json) verifies a disposable normal account at **https://remainder-desk.web.app**. It records a Secure, HTTP-only, SameSite=Lax `__session` cookie, supplier aliases saved through the UI, case creation, a deep-link reload, browser PDF extraction, image OCR under the production content-security policy, and reviewed text saved as evidence.

Two actual OpenAI calls completed the financial workflow:

| Stage | Provider trace | Observed result |
| --- | --- | --- |
| Initial shortage analysis | `req_4efd6ed132e24ffdb6aacd1e857a19b0` | USD 144.00 oat shortage plus USD 72.00 tomato shortage |
| Later credit-note analysis | `req_8ebf05f75d9b40b1848f22f5a0a11fd6` | Matching credit CN-208 for USD 144.00 |
| Explicit owner verification | Application transaction | USD 216.00 claimed, USD 144.00 verified, USD 72.00 remaining; case `partial` |

PDF, CSV, JSON, EML, and workspace exports preserved the balances. Cleanup deleted the account, rejected its old session, and rejected login to the deleted account. The record contains no uncaught browser errors. The credit-note amount is not proof of applied accounting credit or cash received.

**The earlier hosted record remains `passed: false` as historical evidence.** It stopped on **dashboard overflow at 320 pixels**, with an empty responsive-results array. That original run has not been rewritten or silently marked successful.

The corrected layout passed a subsequent 16-combination hosted sweep on revision `00003`. The [later hosted follow-up](validation/firebase-followup.json), after the recovery-route correction, records successful recovery-key rotation, old-session revocation, login with the recovered password, persistent deep-link reload, workspace export, and account deletion. It also records **16 landing/dashboard/case/settings combinations at 320, 390, 768, and 1440 pixels with no overflow**, clean mobile axe checks, and no browser errors. Its sample partial-credit checks are explicitly labeled demo and made **zero live model requests**; the earlier normal-account evidence above establishes the real inference workflow. The [release record](validation/firebase-release.json) identifies the current deployed revision as `remainder-00004-kfb`.

## Backup operations: actual execution and restore

The [backup guide](backups.md) and [machine-readable restore record](validation/scheduled-backup-restore.json) establish more than a proposed script. A dedicated Cloud Run Job and Cloud Scheduler schedule are configured for **03:00 UTC daily**, writing to a private bucket with a **14-day lifecycle policy**. Deletion after lifecycle eligibility is asynchronous. The runtime can create objects but cannot read, list, overwrite, or delete earlier backups.

Both the direct execution `remainder-database-backup-8cvhk` and scheduler-triggered execution `remainder-database-backup-fnd7l` completed successfully. The tested archive was 18,808 bytes with 41 entries. Its checksum matched the job log. An authorized operator restored it into a separate Neon branch and verified migration versions 1, 2, and 3, eight tables, and the expected stored records. The temporary branch and local dump were cleaned up. Production was never a restore target. An anonymous object download returned HTTP 403.

This demonstrates configured scheduling, a real successful backup, and an isolated restore rehearsal. It does not guarantee every future execution, continuous monitoring, zero data loss, or a recovery SLA. Deleting an account from the live database does not immediately remove it from earlier restricted backups; those expire under the documented policy.

## Test and release status

| Check | Status at this review |
| --- | --- |
| Application unit, API, storage, memory, and provider suite | **118 passed** in the identified application commit CI |
| Playwright browser suite | **15 passed**, including partial credit at 320 pixels and recovered-account login |
| Python backup configuration tests | **2 passed** |
| Local visual review | 20 page/viewport combinations documented in the client review |
| Application commit CI | **Passed** for `bb57baf32a47edd79c37f0852b0ad2d298f103d1`: [run 35824129185](https://github.com/shi1720/evorozen/actions/runs/35824129185) |
| Corrected Firebase deployment | **Deployed**, revision `remainder-00004-kfb`, 100% traffic; health and database checks pass |
| Final MP4 and caption files | **Verified locally and publicly on Firebase**; 170.88 seconds, 44 cues, matching SHA-256, signed-out playback and seeking, four responsive widths |
| Hosted recovery and layout | **Passed** in the follow-up record; 16 page/viewport combinations, with normal-account recovery and cleanup |
| YouTube upload and YouTube playback | **Not completed or verified**; the public Firebase player is a separate verified destination |
| Devpost | Project name and pitch saved; **Draft, 2/4 steps done**. No final submission receipt |

The former 82-application-test and 6-browser-test counts belong to the earlier release. They are historical evidence, not the current suite totals.

## Publication state and remaining gates

The [publication record](submission-handoff.md) identifies exactly what was saved. Devpost accepted the project name **Remainder** and its elevator pitch, then opened the details editor showing **Draft, 2/4 steps done**. The remaining story, technologies, links, gallery, and video fields have not been verified as saved.

The signed-in YouTube channel was identified, but no YouTube upload or public YouTube watch URL has been verified. The [public Firebase video player](https://remainder-desk.web.app/demo/) is available without login. Its [verification record](validation/public-video-player.json) confirms normal playback, a seek to 165 seconds, HTTP 206 range support, 44 English caption cues, no browser errors, and no overflow or axe violations at 320, 390, 768, and 1440 pixels. The served MP4 matches SHA-256 `6f3d62515bbcf0c26d31eb9e5a44303495eb07b580dcc23bf4e006226aaa1dca`. This public player does not substitute for the requested YouTube upload. Browser control is technically blocked: the browser connection reports **`unsupported Codex auth method: apikey`**, and the native Chrome accessibility tree returns stale YouTube menu content after navigation and a fresh window. This is a tooling failure, not missing authorization to publish. Do not count attempted clicks as completed uploads or saved fields.

The next release steps are concrete:

1. Retain the verified application commit, deployment revision, CI link, hosted follow-up, and video file identity with the release. Preserve the earlier failed record as historical evidence; later documentation-only commits must not imply a different runtime was deployed.
2. Restore reliable browser control, upload the verified MP4 and SRT, and verify the public YouTube watch page and audible playback while signed out.
3. Finish the existing Devpost draft using the prepared story, technologies, app/repository links, gallery, testing instructions, and verified video URL. Save and reopen each section before recording it as complete.
4. Establish the required student, age, jurisdiction, and any guardian-consent facts before making eligibility attestations. User acceptance of platform terms does not establish those facts. Record the actual submission confirmation when completed.

## Product boundaries and prior findings

The testing instructions now include explicit supplier-alias setup for normal accounts, a saved recovery key, and a no-signup sample path. Credit reconciliation can be demonstrated after approval without falsely marking a supplier email as sent. Current provider claims should name OpenAI while retaining older Gemini reports as dated evidence.

The implemented financial workflow covers quantity shortages with one invoice and one consolidated receiving record. It does not send supplier email, post ledger entries, collect subscriptions, or automatically approve arbitrary multi-invoice claims. Proposed pricing and future integrations remain proposals.

An earlier local recording failed its expected-credit assertion and did not preserve the raw response before cleanup. Its cause is unconfirmed. A fresh instrumented capture succeeded and is the source of the final film. This supports keeping clear error handling, evidence review, and deliberate retry behavior; it does not support a claim of flawless provider reliability.

## Evidence reviewed

- [Client review](client-review-2026-09-23.md): responsive, keyboard, state-recovery, document, and claim corrections.
- [OpenAI evaluation](validation/model-eval-openai-results.json): six curated synthetic cases using GPT-5.4 mini.
- [Earlier Firebase browser workflow](validation/firebase-browser-workflow.json): proven financial and document workflow, plus its explicitly failed narrow-layout check.
- [Hosted follow-up](validation/firebase-followup.json): recovered-account login, cleanup, and the passing 16-combination layout sweep.
- [Application release](validation/firebase-release.json): exact source commit, green CI, deployed revision, health, and provider.
- [Public video player](validation/public-video-player.json): matching media hash, signed-out playback, seeking, captions, and responsive checks.
- [Firebase deployment design](firebase-deployment.md): hosting, Cloud Run, session cookie forwarding, Secret Manager, limits, and database.
- [Backup guide](backups.md) and [restore record](validation/scheduled-backup-restore.json): scheduling, execution, private access, restore, and cleanup.
- [Video verification](validation-video.md): actual normal-account requests, exports, deletion, final file identity, captions, and audio checks.
- [Submission publication record](submission-handoff.md): saved fields, browser blocker, and uncompleted publication steps.

The largest commercial uncertainty remains unchanged: no external customer use, retained users, paid commitments, or revenue is verified. Observed operator workflows and real purchase decisions are the next evidence to earn. The fictional USD 144 credit must never be presented as customer savings.
