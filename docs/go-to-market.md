# Remainder: launch and commercial plan

**Owner: Shivam Gupta.** Prepared 23 September 2026 for Evorozen Apex. Built with AI-assisted engineering. This is an executable launch plan and a set of commercial hypotheses; it is not a record of completed outreach, paying customers, or achieved savings.

## The offer

**Remainder keeps supplier credits from falling through the cracks.** Upload the delivery evidence, review an evidence-backed claim, and see what remains when a supplier credits only part of it.

The opening story is concrete: a fictional cafe claims **$216**, receives a **$144 credit note**, and still has **$72 outstanding**. That $144 represents matched credit evidence, not proof of cash received or credit applied in the accounts. The product exports a claim and evidence pack for the owner or bookkeeper to act on.

The initial buyer is the owner or bookkeeper of one independent cafe, restaurant, or small food retailer. Start with businesses that receive frequent deliveries, retain invoices and receiving evidence, and currently track supplier issues in email or a spreadsheet. Do not spend the first week trying to sell to a national chain.

## Proposed pricing to validate

| Offer | Proposed terms | Purpose |
| --- | --- | --- |
| Guided trial | 14 days, up to 5 real claim packs, subject to a stated shared provider-call budget; no card required | Let a prospect complete a real workflow without promising unlimited inference. |
| Founding location | **$29 per location per month**, up to **100 claim packs** | Test whether predictable subscription pricing matches recurring value. |
| Higher volume or several locations | Discuss after measuring usage and support cost; no published promise yet | Avoid inventing unit economics for a workflow not observed in production. |

A proposed **pack** is one supplier/invoice recovery case, including its original evidence and subsequent credit-note reconciliation. The current release permits up to 12 documents of 40,000 characters each per case; these are application input limits, not a promise to include unlimited AI calls at a fixed price. Before selling the 100-pack plan, define and enforce a fair-use allowance, such as two successful analyses per pack plus a documented retry policy. Reanalyses after material document changes consume provider capacity.

These are pricing hypotheses. A pricing page or written proposal does not mean billing, subscription enforcement, trial automation, or payment collection is implemented. Until those are ready, use clearly agreed, manually managed pilot limits and do not accept a production subscription that cannot be fulfilled.

### What makes $29 plausible, and what would disprove it

If a customer can document $100 of additional supplier credit eventually applied because of the workflow, the monthly price is smaller than that observed benefit. This is an example calculation, not a forecast or causal claim. Likewise, at an assumed $25/hour labor value, 70 minutes of time saved is about $29.17. Obtain the customer's own time estimate and compare like-for-like tasks.

The trial must answer whether the customer has enough cases, whether Remainder improves their existing process, and whether they will pay. Do not count an ordinary credit they would have received anyway as incremental product value. If the workflow is infrequent, test a fixed-price historical review or a smaller occasional-use package instead of forcing a monthly plan.

## Unit economics: assumptions exposed

No paid Evorozen per-call price has been verified. The public offer is the **first 50 calls free**, not a renewable production budget. Confirm paid capacity and terms before committing to customer service levels. [Provider offer](https://pulse.evorozen.com/dashboard)

The following sensitivity model evaluates one fully used $29 account. It deliberately replaces an unknown API tariff with three hypothetical rates. It is not a provider quotation, measured cost, or promised margin. The base case assumes one outbound request per analysis. The Evorozen adapter now splits longer inputs into bounded extraction windows because of its observed 2,000-character prompt limit; each window consumes another call. Therefore, this base case is not a measured cost estimate for the sponsor integration.

| Input | Planning assumption |
| --- | --- |
| Monthly paid price | $29 |
| Packs per account | 100 |
| Analyses per pack | 2: initial analysis and credit reconciliation |
| Base-case provider calls | **One request per analysis**, plus 10% retries/corrections: **220 total calls**. Multiply by the measured mean window count; fallback attempts add further calls. |
| Hosting and database allocation | $1/account/month, assuming $25 shared monthly cost spread over 25 paying accounts; obtain actual quotes |
| Routine support | 6 minutes/account/month at an assumed $25/hour: **$2.50** |
| Payment processing | Assumed 3% + $0.30: **$1.17**; actual processor, region, taxes, and fees may differ |

| Hypothetical cost per provider call | AI cost at 220 calls | Total modeled monthly cost | Contribution before excluded costs | Contribution percentage |
| --- | ---: | ---: | ---: | ---: |
| $0.005 | $1.10 | $5.77 | $23.23 | 80.1% |
| $0.025 | $5.50 | $10.17 | $18.83 | 64.9% |
| $0.100 | $22.00 | $26.67 | $2.33 | 8.0% |

Formula: `contribution = 29 - (220 × provider_cost_per_call) - 1 - 2.50 - 1.17`.

**Window-count sensitivity.** The default Evorozen window cap is eight per analysis; a cap is not an observed average. At the illustrative $0.025/call and the same other costs:

| Mean outbound calls per analysis | Monthly calls including 10% retry allowance | AI cost | Contribution before excluded costs |
| --- | ---: | ---: | ---: |
| 1 | 220 | $5.50 | $18.83 |
| 2 | 440 | $11.00 | $13.33 |
| 4 | 880 | $22.00 | $2.33 |
| 8 | 1,760 | $44.00 | **-$19.67** |

Use `calls = 100 packs × 2 analyses × mean windows × 1.10`, then add any fallback calls not already represented. At eight windows, the $29 offer loses money under these illustrative assumptions. Do not launch that allowance until observed request counts and actual provider pricing support it. An included request budget is more predictable than treating every case as equal cost.

The table excludes customer acquisition, initial onboarding, founder salaries, development, monitoring services beyond the assumed hosting budget, taxes, chargebacks, refunds, and any paid OCR/storage overage. It is a contribution sensitivity, not a complete profit-and-loss forecast. Twenty minutes of assisted onboarding at the same labor value adds **$8.33 once**, or **$2.78/month** if spread across three months; it must be included in payback analysis.

At these assumptions, preserving a 70% contribution before excluded costs requires AI spending at or below **$4.03/account/month**, approximately **$0.0183/call** at 220 calls, **$0.0092/call** at 440 calls, or **$0.0023/call** at 1,760 calls. At only five paying customers, the same assumed $25 hosting bill allocates to $5 each, reducing modeled monthly contribution by another $4 per account. At 20 support minutes per account, support rises to $8.33, reducing contribution by $5.83. Long documents, multiple credit notes, retries, or provider price changes can overturn the model.

Measure actual calls, input size, retries, latency, successful analyses, and support minutes before finalizing the plan. If the economics fail, reduce the included allowance, raise price, improve caching or extraction, or change the provider with explicit disclosure. Do not silently downgrade real accounts to fictional results.

## A finite 50-call launch budget

Optional signed Evorozen memory adds storage requests for schema setup, recall, writes and deletion. These can consume the same sponsor-key allowance as inference. The implementation applies separate conservative memory caps, but those are application safeguards rather than a provider balance meter. Include actual memory traffic in the measured cost and remaining-call ledger; the base-case tables above exclude it.

The allocation below is an initial budget for one 50-call provider allowance. Replace it with the real remaining balance after integration work; failed requests may also consume capacity. Do not create repeated accounts or keys to evade provider limits.

| Activity | Maximum planned calls | Expected use |
| --- | ---: | --- |
| Integration and failure checks | 10 | Verify response parsing, error handling, provenance, and limits. |
| Labeled evaluation examples | 12 | At most six two-stage packs at one call per analysis; fewer when windowing is required. |
| Live demo and rehearsals | 8 | At most four two-stage runs at one call per analysis, with actual provider provenance recorded. |
| Initial real-document pilot reserve | 20 | At most ten two-stage packs at one call per analysis; only one at eight windows per stage, before retries. |
| **Total** | **50** | Stop or obtain funded capacity when exhausted. |

This supports a very small pilot, not 100 packs for every visitor. With 20 calls left, for example, two five-pack trials fit only if each pack needs exactly two outbound calls and no retries. A pack requiring eight windows for each of its two analyses instead uses 16 calls; only one such pack fits. Admit pilots based on actual remaining outbound-call capacity, not the advertised number of analyses. A public fictional demo can remain useful without spending live provider quota only if it is plainly labeled as sample replay. A live AI demonstration must be recorded as such and actually invoke the configured provider.

## Acquisition: one channel before several

Start with hospitality bookkeepers and locally reachable independent operators. A bookkeeper can recognize the workflow across several clients and help distinguish a credit note from an applied credit. The commercial hypothesis is that this channel lowers explanation and onboarding effort; no partnership or referral relationship exists merely because this plan names the channel.

Offer a short evidence review using one redacted historical case, then invite a limited trial. Lead with the customer's unresolved case rather than a broad AI presentation. Let the operator review every generated claim and decide whether to send it. Supplier communication should remain clear and cooperative.

The first prospective list should contain 15 relevant independent food businesses and 5 hospitality bookkeepers, selected from public business information or the founder's existing network. This is a planned list size, not a count of contacts made. All messages below are drafts for Shivam to review and send; this work has not contacted anyone.

### Operator invitation draft

**Subject:** A simpler way to track supplier credits

Hi [name],

I'm Shivam Gupta, building Remainder for independent food businesses. It helps you compare a delivery issue with the credit note that eventually arrives, so partial credits stay visible.

I'm looking for a few operators willing to walk through one recent supplier-credit case. A redacted invoice, delivery note, and any credit note are enough to start. I'd like to understand how you handle this today and see whether the tool reduces the work.

Would a 15-minute walkthrough next week be useful? There is no obligation to buy, and I won't contact your suppliers.

Thanks,
Shivam

### Bookkeeper invitation draft

**Subject:** Testing a supplier-credit desk for independent cafes

Hi [name],

I'm Shivam Gupta. I'm building Remainder to help independent food businesses assemble shortage evidence and reconcile partial supplier credits before handing the records to their bookkeeper.

I'd value a 15-minute conversation about where this process breaks down for your clients. The tool prepares evidence and tracks the outstanding claim; it does not post accounting entries or treat a credit note as bank cash.

If this is a recurring problem, I can show a clearly labeled sample case and explore a small pilot using redacted documents.

Thanks,
Shivam

## Seven-day launch plan

The schedule assumes work begins **24 September 2026** and the event header's **1 October 2026 at 00:15 IST** deadline applies. The [header](https://evorozen-apex.devpost.com/) shows September 30 at 11:45 PM PKT, but the [rules body](https://evorozen-apex.devpost.com/rules) states September 20 at 11:45 PM PDT. Confirm the submission window with the organizer. If the later cutoff governs, aim to finish on September 30 with a buffer. Dates below are a plan, not completed milestones.

| Day | Owner action | Reviewable output | Decision or limit |
| --- | --- | --- | --- |
| **1: Sep 24** | Complete a deployable release, verify authentication and tenant isolation, review provider capacity, and run the full fictional $216/$144/$72 workflow. Prepare the prospect list. | Release checklist, public demo if deployment succeeds, remaining-call log, and 20-prospect research list. | Do not advertise live AI or production readiness based only on sample replay. |
| **2: Sep 25** | Shivam sends a small set of reviewed invitations and schedules interviews. Run two usability sessions if people accept. | Consent-based notes, observed friction, and a corrected onboarding flow. | Invitations, replies, and interviews are separate counts. No promised interview quota is a claimed outcome. |
| **3: Sep 26** | Admit one or two suitable design partners within actual quota. Process a redacted historical pack together. | Manually checked evidence labels, provider-call counts, correction log, and baseline timing. | Stop a case when source evidence is missing; do not manufacture the answer to finish the demonstration. |
| **4: Sep 27** | Observe independent use; test ambiguous item names and partial credit notes. Fix the most consequential failures. | Before/after workflow notes and regression evidence. | A blocking false credit match takes priority over adding features. |
| **5: Sep 28** | Present the proposed $29 offer after observed use. Ask for a concrete pilot decision and permission to use anonymized feedback. | Written decision record, support-time log, and updated cost model. | A positive comment is not a paid commitment; a pilot is not recurring revenue. |
| **6: Sep 29** | Record the three-minute product demonstration; capture verifiable usage only if real non-demo users exist. | Video master, script, reproducible sample pack, and dated metrics export. | If there are no real users, say so and present the validation plan. Do not substitute demo accounts. |
| **7: Sep 30** | Run release smoke checks, review accessibility and export quality, verify repository freshness and README, complete submission fields, and check the final link. | Submission-ready evidence bundle and deadline checklist. | Final submission should be completed with a buffer; verify the event's actual submission status. |

## Measurements and evidence standard

| Metric | Definition | What not to count |
| --- | --- | --- |
| Real activated workspace | A non-demo external user creates a case, uploads their own permitted evidence, and completes a review. | Founder testing, bots, sample accounts, visits, or registrations alone. |
| Weekly active workspace | A non-demo external workspace performs a substantive case action in the last seven days. | Logins alone or repeated automated checks. |
| Reviewed claim amount | Sum of accepted, reviewed findings in a single currency. | Raw AI suggestions, rejected findings, duplicated cases, or cross-currency totals. |
| Credit-note verified amount | Sum of non-duplicated, matched supplier credit evidence. | Supplier promises, generated drafts, or assumed cash receipts. |
| Applied credit / cash recovery | Separately documented confirmation from the customer's accounting or bank records, with permission. | A matched credit note alone. This is not an automatically verified release-one metric. |
| Time to reviewed pack | Elapsed time from starting a pack to completed review, with sample size and assisted/unassisted status. | AI response time presented as total administrative time saved. |
| Critical matching errors | Cases where a proposed supplier, invoice, item, or credit link would cause a materially wrong claim or balance, checked against manual labels. | A vague “accuracy” percentage without a labeled test set and denominator. |
| Paid commitment | An explicit agreed purchase or executed paid pilot; revenue requires actual payment records. | Waitlist entries, intentions, verbal praise, or hypothetical pricing. |

Release-one authenticated workspace usage counts can support individual case records. Cross-customer launch reporting requires a separate, consented evidence register or a verified aggregate query; do not claim that a platform-wide analytics dashboard exists merely because a per-workspace metrics endpoint exists.

For any traction statement, preserve its date range, denominator, demo exclusions, source export, and permission to share. Mask private documents and contact details. A complete public product with zero external users is a valid starting point; invented users undermine the submission.

## Commercial decisions after the pilot

Continue when operators independently complete the core flow, the most consequential matches are reliable under review, recurring cases exist, and paid decisions support the proposed price. Expand the evidence set before claiming accuracy across suppliers or formats.

If document capture is the obstacle, improve intake before adding autonomous follow-ups. If usage is occasional, test a different billing model. If users consistently ask for bookkeeper handoff, prioritize compatible exports and permissions before becoming a general restaurant platform. If they already have an effective solution, narrow the customer segment or stop spending on acquisition.

The potential moat is a trusted recurring workflow, tenant-specific confirmed supplier memory, a consented evaluation library, and distribution through bookkeepers. None is established at launch. Customer retention and measured outcomes should decide what gets built next.

## Claims approved for the pitch

- “Remainder helps independent food businesses review supplier claims and track partial credits.”
- “In this fictional example, a $216 claim receives a $144 credit note, leaving $72 open.”
- “The AI interprets document evidence; deterministic checks calculate amounts and preserve review controls.”
- “Our pricing hypothesis is $29 per location per month. Our first validation channel is independent operators and hospitality bookkeepers.”
- “We distinguish credit-note evidence from accounting application and cash recovery.”

The [public preview](https://remainder-apex.onrender.com) is deployed, and [synthetic live integration results](validation-ai.md) are recorded. This does not establish customer adoption. Only add a customer quote, usage count, or commercial outcome after it exists and can be checked. Public evidence and competitive context are documented in [the research note](research.md).
