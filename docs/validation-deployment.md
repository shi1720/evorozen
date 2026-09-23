# Public deployment verification

Verified on **23 September 2026** against [the live Remainder preview](https://remainder-apex.onrender.com), using fictional business records and a disposable normal account. This was a real hosted API and browser run, not demo replay or a mocked provider.

## Deployed code and persistence

The working release at commit `45c45d17fa50b2b025138bd8d359bdeafb433a11` processed the case. A subsequent deployment of `01570e9177fbc56dde90bab0a9c39e68e152d209` added final public links, sharing metadata, and pilot data-use copy. The account session, documents, approved claim, verified credit, and outstanding amount survived that redeploy. Both commits passed GitHub CI, including **82 automated tests and 6 browser tests**. Later documentation and generated-asset updates preserve this record without changing those verified application sources.

The service uses Render's free web-service plan and an external Neon PostgreSQL 17 database. `/api/health` returned HTTP 200 with a successful database query. Cookies were verified as `Secure`, `HttpOnly`, and `SameSite=Lax`.

## Real workflow

1. Registered a fresh GBP workspace, saved supplier aliases, and attached an invoice, receiving record, and credit note.
2. Requested live analysis through the public application API. Gemini `gemini-3.5-flash-lite` returned trace **`3lazaunTF9aX3boP8JmV4A0`**.
3. Reviewed and selected the supported findings, prepared the claim, and recorded the synthetic request as sent. No correspondence was actually sent.
4. Verified the matching supplier credit note. The case remained `partial`:

| Measure | Verified value |
| --- | ---: |
| Approved claim | GBP 63.55 |
| Credit note verified | GBP 18.75 |
| Still outstanding | GBP 44.80 |

5. Downloaded real PDF, CSV, JSON, and EML exports. The follow-up email draft asked only for **GBP 44.80**.
6. The approval hook stored reviewed aliases in signed Evorozen memory. The actual application activity recorded trace **`39ec7cd2-2a5e-49a3-9881-4190f0eb42a1`**. No original documents or amounts were sent to the optional memory store.
7. After redeploy, opened the saved account in a real Chromium session over HTTPS. The case rendered the correct GBP 44.80 remainder with **zero uncaught JavaScript errors**. [Captured screen](../public/media/live-deployment.png).

8. Deleted the disposable account through the public password-confirmed endpoint. Its session returned HTTP 401 afterward. Direct database checks confirmed zero remaining rows for that account in users, sessions, suppliers, cases, verified credits, and activities. Signed remote-memory cleanup completed as part of deletion.

[Sanitized machine-readable record](validation/deployed-workflow.json).

This evidence concerns issued credit-note matching, not a bank payment, customer savings, or live commercial traction.

## Database restore rehearsal

A PostgreSQL custom-format `pg_dump` was made over verified TLS using an unpooled connection. PostgreSQL client 18.6 restored the 22,032-byte archive with `pg_restore` into a separate, disposable schema-only Neon branch. The restored case contained exactly **6355 / 1875 / 4480** integer pence. The production database was not overwritten or modified by the restore exercise.

This is a successful manual restore rehearsal. It is **not** an automatic backup schedule, off-site backup system, disaster-recovery SLA, or proof of retention beyond the provider's plan. The temporary branch and private archive are cleaned up after verification. Set an appropriate recurring backup and retention policy before real customer onboarding.

## Additional release checks

- Build, typechecking, formatting, dependency audit, unit/API/storage tests, and six browser tests pass.
- Real PDF text extraction and PNG OCR passed in a browser with the production content-security policy; no uncaught page errors were observed.
- Automated axe checks found no WCAG 2A/2AA violations in the tested landing, authentication, recovery, privacy, terms, dashboard, mobile case, and deletion-dialog states. This is not a complete accessibility certification.
- A separate [six-case live model evaluation](validation-model-eval.md) recorded supported, blocked, and incorrect model proposals, including a wrong-supplier suggestion caught by the application.

## Remaining launch limits

The public preview sleeps when idle and has bounded provider quotas. The current Gemini account uses unpaid-service data terms: use fictional or non-confidential, redacted records. Confidential customer documents require suitable provider data terms, backup operations, and hosting availability. See [deployment guidance](deployment.md) and [privacy](https://remainder-apex.onrender.com/privacy).

No real customers, revenue, applied credits, or retained users are claimed. Narration, the final hosted video URL, eligibility, and the Devpost submission receipt remain separate from these technical checks.
