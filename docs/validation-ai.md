# Live AI and memory validation

On September 23, 2026, Remainder passed two live extraction checks using **Gemini `gemini-3.5-flash-lite`**, and separately passed live **Evorozen Neural Pulse VirtualDB** storage checks. All inputs were fictional. These are integration checks, not customer traction, realized savings, or a broad model-accuracy benchmark.

## Live extraction → reviewed claim → partial credit

Both checks invoked the production `analyzeDocuments` engine with `isDemo: false`, made one real inference request, validated exact source quotations and quantities, calculated money using integer arithmetic, marked supported findings reviewed in the test harness, generated a claim, and verified a partial credit. Provider provenance, source hashes, quotations and totals are preserved in sanitized artifacts.

| Scenario | Timestamp (UTC) | Real requests | Identified / approved | Verified credit | Remaining | Evidence |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Northstar: labeled invoice and receiving rows, product alias, partial credit | 2026-09-23 04:15:06.801 | 1 | USD 216.00 (`21600` cents) | USD 144.00 (`14400`) | USD 72.00 (`7200`) | [JSON trace](validation/gemini-northstar.json) |
| Harbor Pantry: independent CSV invoice, TSV receiving record, two product aliases, partial credit | 2026-09-23 04:16:45.752 | 1 | GBP 63.55 (`6355` pence) | GBP 18.75 (`1875`) | GBP 44.80 (`4480`) | [JSON trace](validation/gemini-harbor-table.json) |

Northstar's shortages are four oat cases at USD 36 and three tomato cases at USD 24. Harbor's are one tomato crate at GBP 18.75 and two oat cases at GBP 22.40. The model extracts evidence; the application computes the amounts. A live response is never substituted with sample output after an error.

The trace artifacts show extracted credits initially as `verified: false`; the smoke harness subsequently calls `verifyCreditMatch` and records the verified arithmetic in `totals`. Product use requires the owner to perform this review explicitly.

The [Northstar fixtures](../src/shared/samples.ts) and independent [Harbor fixture](../tests/fixtures/table-case.json) are in the repository. To repeat with your own server key:

```sh
npm run smoke:ai -- --live --provider=gemini
npm run smoke:ai -- --live --provider=gemini --fixture=table
```

Each command makes a real API request only with `--live`. The script disables other providers and fallbacks for the check, counts outbound attempts, and writes a sanitized result under ignored `deliverables/private/`. Future model outputs can differ; the harness fails if the expected grounded outcome does not hold. Provider availability and free quotas can also change. Structured output constrains the response shape; local checks remain necessary. See [Google structured output documentation](https://ai.google.dev/gemini-api/docs/generate-content/structured-output) and [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing).

## Evorozen: proven memory, unavailable inference

The live Neural Pulse `chat` operation returned HTTP 400 with an upstream-provider failure during this session. We did **not** obtain a successful live Evorozen extraction and do not claim that its inference currently powers the demonstrated extraction. The adapter supports explicit Evorozen primary selection and bounded indexed source windows, with mocked contract and adversarial tests. Because the live service accepted at most 2,000 prompt characters during validation, it includes every source line across capped windows and rejects oversized inputs before requests instead of silently truncating them.

The deployment configuration selects `AI_PROVIDER=gemini`; configuring `AI_PROVIDER=evorozen` chooses Evorozen as primary. Fallbacks require explicit enablement, and the returned analysis identifies the provider actually used. Official API reference: [Neural Pulse documentation](https://pulse.evorozen.com/docs).

Two different live memory checks passed:

1. **CRUD contract check**, 04:16:11.581 UTC: seven actual API operations created a dedicated synthetic table, wrote two workspace records, read only workspace A, deleted A, confirmed B remained, and deleted B. [Sanitized operation traces](validation/evorozen-crud.json). This isolated probe established the actual `filter` and `trace_id` contract; it alone is not product integration.
2. **Production signed-memory module**, 04:23:48.406 UTC: five actual API operations prepared the product table, wrote a reviewed product equivalence, recalled and verified its signature, deleted its workspace-scoped record, and confirmed recall was empty. [Sanitized module traces](validation/evorozen-signed-memory.json). This check calls the same `rememberReviewedCase`, `recallSupplierMemory`, and `forgetWorkspaceMemory` functions used by the application. Its fixture analysis was deterministic sample replay; the memory requests were real.

Optional memory is enabled with `EVOROZEN_MEMORY_ENABLED=true`, `EVOROZEN_API_KEY`, and a stable `EVOROZEN_MEMORY_SIGNING_KEY` of at least 32 characters. It stores only bounded reviewed product-label equivalences and metadata. It sends no complete documents, invoice numbers, prices, claim totals, account emails, or plaintext workspace identifiers. HMAC scopes and signatures are checked locally even if the remote service returns foreign rows. PostgreSQL remains authoritative for identity, documents, claims, decisions, and credits. Remembered aliases assist matching; they cannot supply financial values or approve a claim.

```sh
npx tsx scripts/smoke-evorozen-memory.ts --live
npx tsx scripts/smoke-signed-memory.ts --live
```

These commands consume seven and five sponsor API requests respectively. Run them intentionally with fictional data. The signed test uses a temporary signing key, deletes its records, and does not print secrets. Do not rotate a production signing key without first removing its remote records: changing it prevents reading or locating the old scope.

## Coverage and limits

The automated engine and memory tests cover malformed output, invented quotations and numbers, foreign document IDs, wrong supplier or invoice, duplicate credits, currency mismatches, partial recovery, integer rounding, prompt injection, scoped signatures, provider failure, quota rejection, and explicit provider selection. Table validation includes CSV, quoted CSV, TSV, Markdown tables, and aligned text. Unlabeled prices, ambiguous columns, multi-product quotations, missing receiving quantities, unsupported unit conversions, and inconsistent references do not become claimable amounts.

The current recovery engine accepts one invoice and one consolidated receiving record per case. It automates documented quantity shortages; it does not automatically calculate tax adjustments, price disputes, damage valuation, or inferred missing deliveries. Scans depend on user-reviewed OCR text. Complex layouts may need correction before analysis. Two synthetic live examples prove that the integration works on those inputs; they do not establish universal invoice compatibility or a measured accuracy rate.

The sample workspace and recorded walkthrough remain explicitly labeled deterministic replay. No real customer documents were sent during these checks. No active-user or recovered-cash claim is based on this evidence.
