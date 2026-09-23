# Remainder judging and submission checklist

Owner: Shivam Gupta. Last prepared: 23 September 2026. This is a release checklist. The independent local review is recorded in [judge-review.md](judge-review.md); its provisional scores do not establish final-deployment readiness. Check items only after inspecting evidence from the final build.

## Rubric review

The event supplies five criteria but no numerical weights in the provided text. For internal review only, score each criterion 0-5 and record the evidence. Do not present this unweighted score as the organizer's formula.

| Criterion | Evidence a judge should see | Internal score |
| --- | --- | --- |
| Core engine and AI integration | A real provider request, source-backed extraction, meaningful item matching, review behavior on uncertainty, and exact partial-credit reconciliation. Evorozen bonus requires a successful real integration. | 3.5 / 5 — follow-up snapshot |
| Business viability and GTM | Specific buyer, a recurring job, honest competitors, $29 pricing hypothesis, finite API allowance, cost sensitivity, and a plan to obtain paid validation. | 3.5 / 5 — local snapshot |
| UI/UX and aesthetic | Clear first-run experience, calm readable layout, visible source evidence, understandable money labels, mobile behavior, accessible forms, and useful errors. | 4.0 / 5 — local snapshot |
| Scalability and code quality | Fresh repository, documented architecture, database persistence, tenant isolation, secure sessions, deterministic monetary logic, bounded uploads, test evidence, and reproducible setup. | 4.0 / 5 — follow-up snapshot |
| Pitch and video | Less than three minutes, the $216/$144/$72 workflow visibly works, narration explains the distinction between credit and cash, and GTM is concrete. | 3.5 / 5 — follow-up snapshot |

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

- [ ] Shivam records or approves the final narration.
- [ ] Final runtime is below 3:00, including intro and credits.
- [ ] Product footage shows the core job, rather than only slides.
- [ ] A real AI request is represented accurately and sample replay is labeled.
- [ ] The user can read the amounts and source evidence at 1080p.
- [ ] The last frame and description contain the verified product/repository links.
- [ ] Video permissions allow judges to watch without requesting access.
- [ ] The final recording never exposes secrets or private customer material.

## External facts and outstanding requirements

| Requirement | What must happen | Current state of this package |
| --- | --- | --- |
| Student eligibility, age, and geography | Shivam verifies against full rules, including any guardian requirement. | Unverified; do not infer eligibility. |
| Event deadline | Verify submission availability and seek clarification. [Header](https://evorozen-apex.devpost.com/): Sep 30, 2026, 11:45 PM PKT = Oct 1, 00:15 IST. [Rules sections 1.2-1.3](https://evorozen-apex.devpost.com/rules): Sep 20, 11:45 PM PDT. | Direct conflict between official pages, observed Sep 23. The later date remains unconfirmed as the governing cutoff. |
| Public app | Deploy, smoke test, and capture the final URL. | No deployment claimed by these documents. |
| Live AI | Run the configured provider successfully and preserve redacted evidence. | Two synthetic Gemini 3.5 Flash-Lite packs passed; sponsor inference was unavailable. See [validation](validation-ai.md). |
| Public video | Add narration, finalize below three minutes, upload and verify access. | Silent 170-second actual walkthrough, script and editing guide prepared. Shivam’s voice and public URL remain. |
| Actual traction | Obtain real external use and verifiable metrics, or accurately submit as pre-launch. | No traction claimed. |
| Devpost submission | Complete fields and links, review the final preview, submit before the confirmed deadline, retain receipt. | Preparation is not submission. |

## Judge review log

For each review, record the revision, test date, reviewer, criterion score, exact observed failure or strength, and action taken. Re-run the relevant scenario after a fix. Leave a criterion pending when evidence is unavailable instead of assigning a favorable score from the product description.

| Revision / date | Criterion | Observation | Action | Recheck |
| --- | --- | --- | --- | --- |
| Uncommitted local build / 23 Sep 2026 | All | Independent review: 16.5/25; complete sample and account checks pass; live-provider and final-deployment evidence absent | See [full findings and deductions](judge-review.md) | Supplier grounding and partial follow-up fixes retested; release gates remain |

Follow-up review: **18.5/25**, with two verified synthetic Gemini checks, 62 passing tests, complete documentation, and a 170-second silent product walkthrough. Final production checks, human narration, eligibility and public submission remain separate gates. See [the full evidence](judge-review.md).
