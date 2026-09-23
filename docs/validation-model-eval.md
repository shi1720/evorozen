# Six-case live model and evidence-control evaluation

**Result: the pipeline produced the expected claimable amounts on all six fixed fictional cases.** Three legitimate shortages were supported; all three problematic cases produced zero claimable money. The model proposed a shortage on a wrong-supplier document pair, and the application blocked it. This is evidence that the deterministic checks matter, not a claim of perfect model accuracy.

The run used Gemini `gemini-3.5-flash-lite` on September 23, 2026, from **04:37:02.406 to 04:37:14.695 UTC**, with one request per case: **six inference requests total**, no retries, no alternate provider, and no Evorozen or remote-memory requests. The production engine was unchanged for this evaluation.

## Inputs and measured outcomes

These are six new examples, separate from the Northstar and Harbor fixtures. The [complete fictional inputs and expected results](validation/model-eval-fixtures.json) were written before the requests. The result archive records their SHA-256 fingerprint, actual provider traces, exact source quotations, durations, and findings. [Inspect the sanitized results](validation/model-eval-results.json).

| Scenario | Expected claimable amount | Observed supported amount | Supported / blocked findings | Outcome |
| --- | ---: | ---: | ---: | --- |
| INR CSV invoice: 12 lentil tins billed, 9 received, INR 185.50 each; another item fully received | INR 556.50 (`55650` paise) | INR 556.50 | 1 / 0 | Correct product, quantities, unit price, citations, and integer total |
| EUR Markdown tables: 6 flour bags billed, 4 received, EUR 17.35 each; supplier explicitly confirms different product labels | EUR 34.70 (`3470` cents) | EUR 34.70 | 1 / 0 | Explicit alias and exact table evidence supported the match |
| USD aligned text: 1.250 kg billed, 0.875 kg received, USD 48.00 per kg | USD 18.00 (`1800` cents) | USD 18.00 | 1 / 0 | Fractional quantity and integer-money calculation correct |
| Receiving record from a different supplier, despite matching invoice reference and product | USD 0.00 | USD 0.00 | 0 / 1 | Model proposed a four-bag shortage; supplier identity check blocked it |
| Cases invoiced, loose bottles counted; no conversion or complete receiving count | GBP 0.00 | GBP 0.00 | 0 / 1 | Model returned an unmatched item; incompatible units remained unclaimable |
| One item fully received and another overdelivered | EUR 0.00 | EUR 0.00 | 0 / 1 | Model returned an unmatched overdelivery; no shortage entered the claimable total |

Across this run:

- **3 expected supported findings, 3 observed supported findings**, all with the expected product and exact integer amount.
- **0 missed expected supported findings; 0 wrongly supported findings.** These counts describe this fixed sample only.
- **3 blocked findings** across the problematic cases. “Blocked” means `needsReview` or low confidence, excluded from the supported total and claim approval.
- **1 incorrect shortage proposal caught by the application:** four bags on the wrong-supplier pair would be USD 76.00. The candidate amount remains visible in the diagnostic archive, but its `needsReview: true` status prevents it from becoming claimable money.
- **1 unnecessary review card for an overdelivery.** It carries no claimable amount; this is a remaining usability limitation rather than a valid shortage.

The model supplies candidate product matches and quotations. Local rules verify document identity, issuer, invoice reference, complete product labels, quantities, units, and price evidence. Local integer arithmetic computes the money. A syntactically valid model response alone is insufficient to approve a finding.

## Reproduce the run

With a configured server-side `GEMINI_API_KEY`:

```sh
npx tsx scripts/evaluate-model.ts --live
```

Without `--live`, the script makes no request. With it, the script uses only Gemini, makes at most six requests, and writes sanitized results to `docs/validation/model-eval-results.json`. Running it again replaces that artifact with the new measured outcomes. It does not create product accounts, approve or send claims, write remote memory, or publish credentials.

The model and provider can vary across runs. A future run fails its checks if expected findings are missed, unexpected findings become supported, a request fails, or the requested provider is not used. Raw provider responses and API keys are excluded from the public archive.

## What this does and does not establish

This is a small curated integration evaluation of the **combined model and application checks**. It includes three text layouts, four supported currencies, one explicit product alias, fractional quantities, an issuer mismatch, ambiguous units, and a delivery with no shortage. It is not a randomized or representative benchmark, independent third-party assessment, or estimate of field accuracy.

All documents are fictional English-language text. The run does not measure image/OCR reliability, handwriting, arbitrary supplier layouts, tax handling, multi-invoice reconciliation, adversarial success rates, or performance at scale. There was one sample per case and no model tuning after observing these outputs. The recorded sample walkthrough, earlier live checks, and this evaluation remain distinct; none is evidence of real users or recovered customer cash.
