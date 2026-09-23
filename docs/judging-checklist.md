# Remainder judging and submission checklist

> **Historical baseline checklist with current release status.** The reusable checkboxes and review log below originated with the earlier Render/Gemini release. They are not a current completion receipt. Read the [round-two review](review-round-two.md) for current evidence and the [publication record](submission-handoff.md) for what is actually saved on Devpost and YouTube. Older scores, hostnames, and test counts in the historical log remain dated evidence.

Owner: Shivam Gupta. Updated 23 September 2026. Application commit `bb57baf32a47edd79c37f0852b0ad2d298f103d1` has green [CI](https://github.com/shi1720/evorozen/actions/runs/35824129185) with **118 application tests, 15 browser tests, and 2 backup tests** and is deployed as `remainder-00004-kfb`. Hosted recovery and the 16-combination layout follow-up pass. The Firebase video player is verified, YouTube is Public, and Devpost confirmed submission. See the publication record for the saved fields and receipt. Check a release item only after inspecting evidence for the intended final revision.

## Rubric review

The event supplies five criteria but no numerical weights in the provided text. For internal review only, score each criterion 0-5 and record the evidence. Do not present this unweighted score as the organizer's formula.

| Criterion                      | Evidence a judge should see                                                                                                                                                                                  | Internal score                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Core engine and AI integration | A real provider request, source-backed extraction, meaningful item matching, review behavior on uncertainty, and exact partial-credit reconciliation. Evorozen bonus requires a successful real integration. | 4.0 / 5: round-two review                                                                         |
| Business viability and GTM     | Specific buyer, a recurring job, honest competitors, $29 pricing hypothesis, finite API allowance, cost sensitivity, and a plan to obtain paid validation.                                                   | 3.5 / 5: round-two review                                                                         |
| UI/UX and aesthetic            | Clear first-run experience, calm readable layout, visible source evidence, understandable money labels, mobile behavior, accessible forms, and useful errors.                                                | 4.5 / 5: corrected UI and hosted follow-up verified                                               |
| Scalability and code quality   | Fresh repository, documented architecture, database persistence, tenant isolation, secure sessions, deterministic monetary logic, bounded uploads, test evidence, and reproducible setup.                    | 4.5 / 5: round-two review                                                                         |
| Pitch and video                | Less than three minutes, the $216/$144/$72 workflow visibly works, narration explains the distinction between credit and cash, and GTM is concrete.                                                          | 4.0 / 5: narrated film published on Firebase and YouTube, embedded in the submitted Devpost entry |

Suggested scoring anchors: **0** absent, **1** claimed without evidence, **2** partial or fragile, **3** complete core workflow with limitations, **4** well-executed and tested, **5** unusually compelling evidence and execution. Record weaknesses before revising the product. A second reviewer should attempt the demo independently.

## Product proof

- [ ] Registration, login, logout, and recovery work on the final deployment.
- [ ] Each account can access only its own workspace data.
- [ ] Demo workspaces are isolated and clearly fictional.
- [ ] A real account performs a real provider analysis, with actual provenance.
- [ ] AI output cannot silently bypass source review or monetary validation.
- [ ] $216 reviewed claim minus $144 verified credit leaves $72 outstanding.
- [ ] Duplicate credit evidence does not change the balance twice.
- [ ] Incorrect invoice/currency evidence cannot automatically settle the case.
- [ ] New evidence does not silently erase an approved claim.
- [ ] Supplier aliases remain within the workspace and require appropriate user control.
- [ ] PDF, CSV/JSON, and email-draft exports open and contain the expected data.
- [ ] Empty, loading, permission, validation, and provider-failure states are usable.
- [ ] Monetary labels distinguish reviewed claims, verified credit notes, and outstanding amounts.
- [ ] “Recovered,” “paid,” and “settled” do not imply bank cash or accounting application without evidence.

## Documentation and release

- [ ] README contains setup commands, environment variables, AI architecture, demo explanation, test commands, and deployment limitations.
- [ ] Public repository history meets the July 17, 2026 freshness requirement.
- [ ] No API key, recovery code, session cookie, private document, or credential appears in the repo or recording.
- [ ] Production persistence, HTTPS, health check, backup approach, and restart behavior are documented and checked as applicable.
- [ ] Test results refer to the final revision and distinguish automated tests from manual checks.
- [ ] Provider quota and paid-capacity assumptions are explicit.
- [ ] Pitch deck and one-page brief use the same amounts and terminology as the app.
- [ ] Attribution says “Created by Shivam Gupta with AI-assisted engineering” where appropriate, without invented human work claims.

## Commercial truth

- [ ] Competitors include Supply Verify, Supy, Canals, and accounting/spreadsheet alternatives where relevant.
- [ ] Pricing remains a hypothesis until validated.
- [ ] No invented error-rate, recovery-rate, accuracy, margin, revenue, or customer statistic appears.
- [ ] Demo activity is excluded from any real-user count.
- [ ] Any customer quotation, logo, or document has permission for publication.
- [ ] Credit notes are distinct from credit applied to bills and cash received.
- [ ] The planned 50-call provider budget is not described as a monthly free allowance.
- [ ] No claim of an established moat or product-market fit precedes real evidence.

## Video and presentation

- [ ] Final narration uses the authorized stock AI presenter voice with a clear disclosure, or a genuine human recording; no real person is impersonated.
- [ ] Final runtime is below 3:00, including intro and credits.
- [ ] Product footage shows the core job, rather than only slides.
- [ ] A real AI request is represented accurately and sample replay is labeled.
- [ ] The user can read the amounts and source evidence at 1080p.
- [ ] The last frame and description contain the verified product/repository links.
- [ ] Video permissions allow judges to watch without requesting access.
- [ ] The final recording never exposes secrets or private customer material.

## External facts and outstanding requirements

| Requirement                             | What must happen                                                                                                                                                                                                                             | Current state of this package                                                                                                                                                                                                                                                                                                                                    |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Student eligibility, age, and geography | Shivam verifies against full rules, including any guardian requirement.                                                                                                                                                                      | Unverified; do not infer eligibility.                                                                                                                                                                                                                                                                                                                            |
| Event deadline                          | Verify submission availability and seek clarification. [Header](https://evorozen-apex.devpost.com/): Sep 30, 2026, 11:45 PM PKT = Oct 1, 00:15 IST. [Rules sections 1.2-1.3](https://evorozen-apex.devpost.com/rules): Sep 20, 11:45 PM PDT. | Direct conflict between official pages, observed Sep 23. The later date remains unconfirmed as the governing cutoff.                                                                                                                                                                                                                                             |
| Public app                              | Retain the deployed revision and checks with the release.                                                                                                                                                                                    | [Canonical app](https://remainder-desk.web.app): hosted PDF/OCR, two live analyses, USD 216/144/72 reconciliation, exports, and deletion verified. The earlier overflow failure is retained as history. The [follow-up](validation/firebase-followup.json) passes recovery, login, cleanup, and 16 layout combinations. Current revision: `remainder-00004-kfb`. |
| Live AI                                 | Preserve the actual provider, traces, source checks, and limitations.                                                                                                                                                                        | OpenAI GPT-5.4 mini is verified in the hosted normal-account flow, reference packs, and six-case synthetic evaluation. Signed Evorozen memory was verified separately. Sponsor inference success is not claimed. [Hosted record](validation/firebase-browser-workflow.json), [OpenAI evaluation](validation/model-eval-openai-results.json).                     |
| Public video                            | Publish the exact final video and captions.                                                                                                                                                                                                  | **Complete.** [YouTube](https://www.youtube.com/watch?v=gRbLdG4Wa4U) is Public, with HD processing complete and English SRT captions. Watch-page and Devpost-embed playback were verified. Independent signed-out playback evidence remains scoped to the Firebase player.                                                                                       |
| Actual traction                         | Obtain real external use and verifiable metrics, or accurately submit as pre-launch.                                                                                                                                                         | No traction claimed.                                                                                                                                                                                                                                                                                                                                             |
| Devpost submission                      | Save the completed fields and retain a submission receipt.                                                                                                                                                                                   | **Complete.** [Devpost](https://devpost.com/software/remainder-vldh27) displayed **Project submitted!** Story, testing instructions, tags, links, thumbnail, gallery, video, and creator credit are saved. The publication record preserves organizer-rule discrepancies; eligibility is not adjudicated.                                                        |
| Tests and final release                 | Preserve exact commit and revision identity.                                                                                                                                                                                                 | **118 application tests, 15 browser tests, and 2 backup tests passed** in [CI run 35824129185](https://github.com/shi1720/evorozen/actions/runs/35824129185). [Release evidence](validation/firebase-release.json) maps source `bb57baf32a47edd79c37f0852b0ad2d298f103d1` to revision `remainder-00004-kfb`.                                                     |
| Backups                                 | Configure and exercise scheduled backups, private access, restore, and cleanup.                                                                                                                                                              | Nightly 03:00 UTC schedule, successful direct and scheduler-triggered executions, private archive, and isolated Neon restore verified. [Backup evidence](backups.md). Future success and a recovery SLA are not guaranteed.                                                                                                                                      |

## Historical judge review log

For each review, record the revision, test date, reviewer, criterion score, exact observed failure or strength, and action taken. Re-run the relevant scenario after a fix. Leave a criterion pending when evidence is unavailable instead of assigning a favorable score from the product description.

| Revision / date                       | Criterion | Observation                                                                                                              | Action                                              | Recheck                                                                       |
| ------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- | ----------------------------------------------------------------------------- |
| Uncommitted local build / 23 Sep 2026 | All       | Independent review: 16.5/25; complete sample and account checks pass; live-provider and final-deployment evidence absent | See [full findings and deductions](judge-review.md) | Supplier grounding and partial follow-up fixes retested; release gates remain |

Follow-up review: **18.5/25**, with two verified synthetic Gemini checks, signed Evorozen memory, 82 automated tests and 6 browser tests confirmed passing, a Render + Neon live preview, and a 170-second silent walkthrough. Final deployed-workflow checks, human narration, eligibility and submission remain separate gates. See [the full evidence](judge-review.md).

Final technical verification: the hosted normal-account AI workflow, signed memory write, four exports, persistence after redeploy, and isolated PostgreSQL dump/restore passed. See [deployment validation](validation-deployment.md). The [six-case evaluation](validation-model-eval.md) separately records three supported shortages and three safely blocked cases.

Current release assessment remains **20.5/25**. The identified application commit, hosted follow-up, public video, and Devpost submission are verified. Publication does not justify inventing a commercial score increase. The [round-two review](review-round-two.md) supersedes the historical scores above. No external customer traction, revenue, or applied-credit outcome is verified.
