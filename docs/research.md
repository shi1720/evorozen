# Remainder: problem, market, and evidence

**Created by Shivam Gupta with AI-assisted engineering.** Research reviewed 23 September 2026. This document separates public evidence, product decisions, and hypotheses requiring customer validation. It does not establish customer traction or product-market fit.

## The problem we chose

A cafe reports a short delivery. Its supplier agrees to issue a credit. A different person receives the credit note days later. Nobody checks whether it covers every missing item.

Remainder gives independent food businesses one place to assemble that evidence, review a claim, and reconcile the supplier's credit against it. The central question is simple: **what is still outstanding?**

Our initial customer is an owner, manager, or bookkeeper at an independent cafe, restaurant, or small food retailer. They already have invoices and delivery notes, use email or messaging for supplier issues, and lack a reliable case-by-case record of outstanding credits. This customer profile is a hypothesis, not a completed interview finding.

The product belongs in **Autonomous B2B SaaS**. AI interprets inconsistent documents; a person approves the findings; deterministic software calculates and tracks the remainder. Remainder prepares correspondence and evidence exports. The release does not send supplier messages or post entries to an accounting system.

## What the public evidence establishes

| Evidence | What it supports | What it does not establish |
| --- | --- | --- |
| The National Restaurant Association's 2025 operations research collected responses from more than 900 US operators. Among respondents, median 2024 food and non-alcoholic beverage cost was 32.4% of sales for limited-service and 32.0% for full-service businesses. [Source](https://www.restaurant.org/research-and-media/research/restaurant-economic-insights/analysis-commentary/restaurant-operators-kept-food-cost-ratios-in-check-in-2024/) | Food purchasing is a material operating expense in the surveyed businesses. | An invoice-error rate, the prevalence of missed credits, or an average recoverable amount. These US figures should not be generalized to every geography. |
| Supply Verify markets delivery-note capture, shortage detection, human approval, and credit-request generation, explicitly including cafes and kitchens. [Source](https://www.supplyverify.ai/en/) | There are established commercial attempts to solve this workflow. | Independent proof of its results, our superiority, or demand for another product. |
| Xero documents applying supplier credits to bills, and describes different behavior when reconciling credit against a supplier account. [Source](https://central.xero.com/s/article/Apply-a-supplier-s-credit-to-a-bill) | Receiving a credit document and applying it in the accounts are separate operations. | That Remainder can verify an accounting application without the relevant records. |
| Xero documents supplier-name mismatches, currency mismatches, and other reasons a credit cannot be allocated. [Source](https://central.xero.com/0/article/Can-t-allocate-a-supplier-credit-note) | Entity matching and currency handling are concrete workflow problems. | That all ambiguous supplier names should be merged automatically. |
| QuickBooks describes recording supplier credits, applying them to bills, and separately linking certain cash refunds. [Source](https://quickbooks.intuit.com/learn-support/en-global/help-article/supplier-credits/enter-refund-supplier/L2y1KARni_ROW_en?uid=lypdf0dc) | The product must distinguish credits from bank cash and accounting settlement. | That a supplier's email promise is an issued credit. |

There is no supported market-wide claim here that restaurants lose a particular percentage of purchases to unclaimed credits. Establishing frequency, amounts, and willingness to pay is the first research task.

## Competition and honest positioning

The comparison below describes public product pages, not hands-on evaluations. A feature absent from a page may still exist. Check current capabilities with vendors before making sales comparisons.

| Alternative | Publicly described capability | Remainder's proposed reason to choose it |
| --- | --- | --- |
| [Supply Verify](https://www.supplyverify.ai/en/) | Photographs delivery notes, detects shortages, obtains approval, creates credit requests, and stores records in the customer's Drive. Pricing is quoted from setup, branch subscription, and document volume. | A focused review-to-credit workflow with partial-credit matching and a clearly visible outstanding balance. Supply Verify is a close competitor; simple scanning or shortage detection is not a unique claim. |
| [Supy](https://supy.io/product-features/invoice-receiving) | Hospitality invoice extraction, PO matching, exception review, audit records, and connected inventory/accounting workflows within a broader operations platform. | A smaller commitment for an independent operator who only needs a supplier-credit desk. This is a positioning hypothesis, not proof that Supy is unsuitable for small businesses. |
| [Canals](https://www.canals.ai/products/distributor-statement-reconciiation) | Reconciles supplier statements with ERP invoices and payments; highlights mismatches and unused credits. | An uploaded-document workflow that can be tried without ERP access, focused on the original shortage evidence and subsequent partial credits. |
| [Xero](https://central.xero.com/s/article/Apply-a-supplier-s-credit-to-a-bill) / [QuickBooks](https://quickbooks.intuit.com/learn-support/en-global/help-article/supplier-credits/enter-refund-supplier/L2y1KARni_ROW_en?uid=lypdf0dc) | Accounting records and allocation of supplier credits, alongside wider bookkeeping capabilities. | Assemble and review the operational evidence before handoff to the bookkeeper. Accounting software remains the authority for posted balances and cash. |
| Spreadsheet, shared inbox, and a general AI chat | Flexible tools the customer may already own. Their usefulness depends on the workflow the customer builds around them. | A persistent case record, source references, review controls, supplier aliases, and duplicate-resistant credit reconciliation. Validate whether these advantages justify another subscription. |

**Positioning:** Remainder is a supplier-credit recovery desk for independent food businesses. It turns delivery evidence into a reviewed claim and keeps partial credits from disappearing into a closed case.

Avoid “first,” “only,” “no competitors,” guaranteed recovery, or invented accuracy claims. The defensible story is a complete, understandable workflow, with measured results when customers are available.

## The demonstration is fictional and reproducible

Fern & Flour cafe receives invoice **NF-1042** from fictional supplier **Northstar Foods**. All amounts below are USD; taxes and adjustments are excluded from this fixture.

| Item | Invoiced | Received | Unit price | Shortage claim |
| --- | ---: | ---: | ---: | ---: |
| OAT BARISTA 6X1L / barista oat drink | 12 cases | 8 cases | $36 per case | $144 |
| TOMATO WHOLE 6X2.5KG / tomatoes | 10 cases | 7 cases | $24 per case | $72 |
| OLIVE OIL 5L / olive oil | 4 tins | 4 tins | $32 per tin | $0 |
| **Total** | | | | **$216** |

The user reviews the evidence and approves a **$216 claim**. Supplier credit **CN-208**, explicitly referencing NF-1042, covers **$144** of oat drink. Matching that credit leaves **$72 outstanding** for tomatoes.

**A verified $144 credit note is not proof of $144 cash received or a credit applied to a bill.** The release verifies the uploaded credit evidence against the case. Accounting application and bank reconciliation remain outside its verified scope. A fully credited case means the claim has been covered by verified credit notes, not that a bank transaction has occurred.

Demo workspaces, sample documents, and their derived amounts must remain labeled as fictional. They are product examples, not customer counts, real savings, endorsements, or commercial traction.

## Why AI is necessary, and where it stops

Invoices and receiving notes often use different item descriptions. AI can propose that “OAT BARISTA 6X1L” and “barista oat drink” refer to the same product, identify document roles, and extract evidence for review. Supplier alias memory provides explicit, tenant-specific context for later cases; it is not a globally trained proprietary model. An optional signed Evorozen VirtualDB module has passed a live write, recall, and deletion check using fictional aliases; this validates memory integration separately from inference.

The implementation contract requires source quotations from supplied documents, confidence handling, structured-output validation, and clear errors for unavailable providers. Amounts use integer cents. Arithmetic, currency checks, credit deduplication, authorization, and workflow transitions belong in deterministic code. A matching description alone is insufficient to establish the price, invoice reference, supplier, or credited amount.

Evorozen is an implemented extraction adapter. Its public documentation describes the `chat` action and request trace IDs. Live Gemini 3.5 Flash-Lite integration checks have passed on two synthetic packs; Evorozen inference failed upstream during verification. Neither provider documentation nor two fixture successes establish broad extraction accuracy or production latency. See [the measured validation scope](validation-ai.md). [Evorozen documentation](https://pulse.evorozen.com/docs)

The public dashboard offers the **first 50 calls free**. Treat this as a finite allowance; do not describe it as 50 calls per month or unlimited production access. A paid unit price and sustained-production agreement were not verified in the reviewed pages. The implementation also observes a 2,000-character prompt limit and may require multiple outbound extraction windows per analysis; budget requests rather than assuming one analysis equals one call. [Evorozen dashboard](https://pulse.evorozen.com/dashboard)

## Design-partner interview guide

Recruit decision-makers who handle supplier credits themselves. Obtain permission before viewing real records; let them redact personal or commercially sensitive details. Begin with recent behavior before showing the product. Do not present the demo amounts as an expected outcome.

1. Tell me about the most recent delivery that was short, damaged, or billed incorrectly. What happened next?
2. Which documents did you have at that moment? Where are they now?
3. Who raised the issue, and who checked the supplier's response?
4. How did you determine whether the credit covered the whole issue? Can you show a redacted example?
5. In the last four weeks, how many such cases occurred? Which remain unresolved? Distinguish a recalled estimate from a record-based count.
6. How much hands-on time did the last case take? Which steps were waiting rather than work?
7. What do you do with partial credits, different product names, or a supplier that uses more than one trading name?
8. Which system tells you whether a credit was applied to a bill? Who checks it?
9. What would make you unwilling to upload these documents? What retention or deletion control would you need?
10. Walk through one redacted case in Remainder. Where do you hesitate, correct the result, or leave the app?
11. What would you replace or stop doing if this worked? Who approves that decision and software spending?
12. Would you run a four-week pilot on a defined set of cases? After observing the result, present $29 per location per month and ask for a purchase decision, not just an opinion.

Record the participant's role, location count, case volume, current tools, evidence availability, actual workflow, objections, observed corrections, and next commitment. Quote feedback only with permission. Maintain a separate interview register; no interviews or commitments are claimed by this document.

## Hypotheses and falsification

| Hypothesis | Smallest useful test | A reason to reconsider |
| --- | --- | --- |
| Partial or missing supplier credits recur often enough to matter. | Inspect four weeks of redacted cases at five independent businesses. | Most businesses have no material unresolved cases, or existing tools already handle them reliably. |
| Existing documents are sufficient for safe review. | Run 20 varied, consented packs; manually label expected evidence and amounts before comparison. | Missing receiving evidence or unreadable records dominates, and capture changes are required for value. |
| Review takes less effort than the current workflow. | Time the same person's normal process and Remainder on comparable packs, documenting the differences. | Uploading and correcting results takes as long as their normal process. |
| Partial-credit matching is a meaningful differentiator. | Observe customers handling at least five actual partial-credit cases. | They rarely receive partial credits or already reconcile them effortlessly. |
| $29/location/month is acceptable. | Seek three explicit paid-pilot decisions after observed use. | Praise produces no paid commitment, or each account requires expensive ongoing manual help. |

These are study designs and decision thresholds, not results. Small pilots provide directional evidence and cannot establish broad statistical accuracy.

## Moat hypothesis

The launch product has no established moat. Its starting advantages are workflow focus, accessible presentation, and careful evidence handling. Potential durability would come from trusted user-confirmed supplier aliases, a growing library of real document failure cases, repeated use in the bookkeeping routine, and referral distribution through hospitality bookkeepers.

Customer documents and aliases remain tenant-specific. Any future shared evaluation set requires permission and appropriate anonymization; customer uploads are not automatically a proprietary training asset. A large competitor could reproduce the main features. Retention, accuracy on hard cases, onboarding cost, and distribution must become the advantage.

## Research limits

This is desk research conducted before customer validation. Competitor statements are attributed to their own pages, not independently audited. No revenue, active users, recovery rates, or supplier acceptance rates are established here. Pricing, acquisition, and cost assumptions are specified in [the go-to-market plan](go-to-market.md), where they can be replaced by measured values.
