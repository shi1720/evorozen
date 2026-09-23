# Security and operating limits

This document describes controls implemented in the repository. It is not a security certification, penetration-test report, or compliance claim. Use a controlled pilot, retain original evidence, and arrange appropriate hosting and database operations before processing real business records.

## Accounts and sessions

- Registration creates one owner and one workspace. There is no shared default password or publicly reusable demo account.
- New password and recovery-code hashes use scrypt with `N=32768`, `r=8`, `p=3`, a random 128-bit salt, and a 64-byte derived key. Parameters are stored with the hash. This configuration follows an option in the [OWASP password-storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#scrypt).
- Passwords must contain 12–128 characters. Passwords are not silently truncated. MFA, SSO, email ownership verification, and breached-password lookup are not implemented.
- Session cookies hold 256-bit random tokens. The database stores only SHA-256 token hashes. Cookies are HttpOnly, SameSite=Lax, and Secure in production; sessions expire after seven days.
- Login errors do not distinguish an unknown email from an incorrect password. A dummy scrypt verification helps avoid a simple missing-user timing shortcut. Registration necessarily reports an existing email so the user can sign in or recover.
- Recovery codes contain 160 random bits, are shown once, and are stored only as scrypt hashes. A successful recovery changes the password, rotates the code, and revokes all sessions. Compare-and-update semantics prevent two concurrent recoveries from reusing the same code.
- Login rechecks the password hash under a user-row lock before creating a session, preventing an old-password login from completing after a concurrent recovery.
- Recovery currently requires the saved code. No reset email is sent, and there is no support bypass for a lost password plus lost recovery code.

## Request and tenant boundaries

All resource queries bind values as SQL parameters and scope by the authenticated account. Case IDs, supplier IDs, export requests, and analysis requests are not sufficient without owner authorization. Tests exercise cross-tenant reads and mutations. Isolation is enforced in the application; PostgreSQL row-level-security policies are not configured.

State-changing API requests require `application/json`. An unexpected `Origin` or `Sec-Fetch-Site: cross-site` is rejected. SameSite cookies add another browser boundary. Production must configure the exact `APP_ORIGIN` and HTTPS. Only set `TRUST_PROXY=1` behind the intended single-hop trusted proxy; incorrect proxy trust can weaken IP-based limits and origin handling.

Production Helmet headers include a Content Security Policy, MIME sniffing protection, frame restrictions, and HSTS. The policy allows the documented OCR CDN, blob workers, and WebAssembly compilation. It does not allow JavaScript `unsafe-eval`. Interface fonts are self-hosted. OCR runtime/language downloads still contact third-party CDN infrastructure, although document recognition runs in the browser.

API responses are marked `Cache-Control: no-store`. Secrets and raw provider payloads are never returned in settings or errors. The API does not log document bodies, passwords, session tokens, or provider keys. Hosting infrastructure may have its own access logs and retention policies.

## Input, AI, and financial controls

- Request bodies are limited to 520 KB. Document text is limited to 40,000 characters and 12 documents per case. Null characters are rejected before SQL storage.
- Client-side extraction accepts supported text/image formats, and the user reviews the extracted text. The server stores confirmed text only, not original uploaded binaries.
- Each case must have exactly one invoice and one consolidated receiving record for analysis. Additional supporting messages and credit notes are allowed. Multi-invoice and partial-delivery ambiguity is rejected.
- AI input is treated as untrusted data. It receives instructions to extract structured evidence, not execute user instructions found in documents. There are no model-controlled tool calls, dynamic URLs, SQL, outbound messages, or shell commands.
- Provider output is schema-validated. Quotations must be exact substrings of the correct source documents. Numerical support, units, issuer identity, invoice references, and currency are checked separately.
- Instruction-pattern detection is an additional heuristic, not a proof that arbitrary prompt injection is impossible. The important boundary is that model output cannot bypass the deterministic claim, ledger, and authorization checks.
- Amounts use integer cents. Quantities support up to three decimals; multiplication uses integer arithmetic and defined per-line rounding. Supported currencies are USD, INR, GBP, and EUR. No currency conversion or inferred tax calculation is performed.
- The current automatic approval path is limited to supported quantity shortages. Low-confidence, unmatched, or ungrounded findings cannot be accepted and approved by simply changing API fields.
- Invoice supplier identity is grounded in the source. Credit verification independently checks issuer, invoice reference, currency, amount, and exact evidence.
- A durable ledger prevents duplicate credit references for the same grounded source issuer, as well as duplicate text fingerprints, within a workspace. It uses database uniqueness constraints to protect concurrent cases and multiple server instances.
- Source documents cannot change after approval except for adding credit notes. Reanalysis of a new note preserves the frozen original claim and previously verified credits. A partial credit cannot silently resolve an entire case.

A “verified credit” is a matching issued credit note, not proof of money received or posting to an accounting system. Remainder does not validate authenticity with the supplier, offer legal adjudication, or connect to a bank. An owner can edit request wording before it is marked sent; they remain responsible for its accuracy and delivery.

## Rate limits and spending bounds

| Guard | Default | Storage |
| --- | --- | --- |
| Authentication POST requests | 35 per 15 minutes per client IP | Database |
| Demo workspace creation | 12 per hour per client IP | Database |
| Authenticated API requests | 500 per 5 minutes per workspace | Database |
| Analysis endpoint requests | 30 per hour per workspace | Database |
| Actual AI requests | 30 per UTC day across the deployment | Database |
| Actual AI requests per owner | 10 per UTC day per workspace | Database |
| Optional memory reserved calls | 6 per UTC day; 12 lifetime across deployment | Database |

Daily budgets count each outbound attempt, including explicit fallback attempts. Failed calls still count. Evorozen may require multiple bounded requests because of its 2,000-character prompt cap; each request counts, with a per-analysis window cap of 8 by default (`EVOROZEN_MAX_CALLS_PER_ANALYSIS`, configurable 1–12). Cached analyses and fictional demo replay consume no daily AI budget. `AI_MAX_DAILY_CALLS` and `AI_MAX_DAILY_CALLS_PER_USER` can lower or raise these caps; `0` disables new calls for that scope. A 429 budget response includes a `Retry-After` value for the next UTC day. Database counters make these limits shared across app instances.

Optional Evorozen memory reads/writes reserve two units per operation before network work, covering schema setup plus the operation even when caching uses one request. `EVOROZEN_MEMORY_MAX_DAILY_CALLS` and `EVOROZEN_MEMORY_MAX_TOTAL_CALLS` set these separate global caps. Cleanup bypasses the caps. A finite provider starter allowance must be checked before increasing the lifetime allowance.

Application limits supplement provider quotas; they do not replace project-level spend limits, billing alerts, network controls, or abuse monitoring. Budget units count requests, not tokens or dollars. The provider has independent response limits and billing rules.

## Failure and concurrency handling

Mutations lock the case row, and edits/credit verification check a version number. A stale browser cannot overwrite a newer case. External AI analysis requests run outside database transactions. Optional remote memory writes and cleanup serialize under the owner-row lock; these bounded metadata operations can briefly delay other owner-account actions. A random analysis token and three-minute lease, renewed before each provider request, prevent overlapping analysis; the final transaction checks the token and version before accepting a result.

Provider failures, quota failures, and invalid model output leave previous analysis and financial state unchanged. The analysis token is cleared on a handled failure. After a process crash, a later request may replace an expired lease; a late response from an older token cannot overwrite it. AI requests time out after 35 seconds by default, configurable up to 90 seconds on hosts with a sufficient request deadline. Each optional Evorozen memory request has a fixed five-second timeout, including response-body reading; a cold schema-plus-select recall uses at most ten seconds of network wait. The Firebase release disables sequential inference fallbacks and uses the 35-second AI timeout, leaving headroom below Hosting's 60-second gateway limit. Do not raise these limits or enable sequential fallbacks on that synchronous route without budgeting the entire request.

Budget reservations and credit verification use SQL transactions. A failed per-owner budget check rolls back its associated global reservation. Credit uniqueness violations do not partially change the case balance or audit trail.

## Storage, retention, and deletion

Local development persists under `.data/remainder`, whose directory is created with owner-only permissions when new. PGlite requires one process per data directory. Production requires `DATABASE_URL` unless a single-instance persistent-volume deployment explicitly sets `ALLOW_LOCAL_DATABASE=1` and a durable `DATA_DIR`. An ephemeral host filesystem is not acceptable persistence.

Production database transport encryption follows the configured PostgreSQL connection URL and provider certificates. The application does not disable TLS certificate verification. The Firebase release provisions dedicated runtime identities, scoped secrets, and nightly private backups in Europe. Backup transport, restricted storage, retention, and an isolated restore are documented in the [backup guide](backups.md). Operators deploying elsewhere must configure and verify equivalent controls.

Demo accounts are isolated and automatically expire after seven days. Cleanup also removes expired sessions and rate-limit records. Real accounts remain until their owner deletes them. Password-confirmed account deletion cascades through the owner's cases, supplier records, sessions, events, and credit ledger. If optional remote memory may exist, deletion first removes the HMAC-scoped remote records; upstream cleanup failure keeps the local account intact for retry. A durable flag is committed before remote writes, including those whose outcome later becomes ambiguous, and owner locking prevents a delayed write after cleanup. Workspace JSON export provides the full data and audit history before deletion. Deletion cannot remove provider-side processing logs or infrastructure backups governed by their own retention policies.

AI analysis sends confirmed document text and relevant supplier context to the selected Evorozen, OpenAI, or Gemini API; opt-in fallback may send it to an alternate configured provider. Review the selected provider's applicable data terms before uploading sensitive records. Optional Evorozen Virtual DB memory sends only owner-reviewed product aliases with signed scope metadata, not raw documents or financial values. HMAC validation protects integrity and scope; it is not encryption. Keep `EVOROZEN_MEMORY_SIGNING_KEY` private and stable until stored records have been deleted. Rotating or losing it prematurely prevents deriving their deletion scope.

Keep original invoices, photos, and receiving notes outside Remainder. SHA-256 fingerprints describe the stored text the user confirmed; they are not forensic hashes of the original binaries or proof that a supplier issued a document.

## Deployment review

Before onboarding real pilot users:

1. Configure persistent PostgreSQL, HTTPS, exact application origin, and the correct proxy setting.
2. Supply server-side keys through host secret settings; configure model access, quotas, and applicable data-handling terms.
3. Run type checks, unit/integration tests, production build, and browser tests against the deployed configuration.
4. Confirm secure cookies and a complete signup -> analysis -> approval -> partial credit -> export flow.
5. Verify database backup and restoration, account deletion, and export procedures with non-sensitive test records.
6. Keep `.env`, raw provider responses, and private smoke-test records out of Git. Rotate any exposed key promptly.

Report a suspected issue without sharing personal data, supplier documents, or credentials in a public issue. Use the repository's private vulnerability reporting channel if enabled, or contact the maintainer through an appropriate private channel.
