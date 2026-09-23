# Remainder implementation contract

Created 23 September 2026 for Shivam Gupta / Evorozen Apex. Fresh implementation. Product: supplier-credit recovery desk for independent food businesses. One workspace per account, owner only for release 1. No email sending; create downloadable .eml/email drafts and human manually records sent. Monetary values integer cents, currencies never aggregate across currencies. One workspace currency, case currency must match.

Stack: React 19 + Vite + TypeScript frontend; Express 5 API; Postgres via `pg` in production, `@electric-sql/pglite` persisted under .data for zero-setup local; SQL adapter query interface. Server serves Vite middleware in dev and dist/client in production. dotenv loads .env. Port default 3000. Domain model in src/shared/types.ts.

HTTP JSON API (same origin, cookie session):
- POST /api/auth/register {name,email,password,workspaceName,currency} -> {user,recoveryCode}; register is authenticated. Recovery code displayed once. Strong scrypt hashes. 
- POST /api/auth/login {email,password} -> {user}
- POST /api/auth/demo {} -> {user}; unique isolated seeded demo workspace; demo fixtures unmistakably labeled.
- POST /api/auth/logout {} -> {ok:true}; GET /api/auth/me -> {user}; 401 when unauthenticated.
- POST /api/auth/recover {email,recoveryCode,password} -> {ok:true}; revoke sessions and rotate recovery code returned.
- GET /api/dashboard -> Dashboard
- GET /api/cases -> {cases}; POST /api/cases {title,supplierName,invoiceReference?,dueDate?} -> {case}
- GET /api/cases/:id -> {case,activities}; PATCH /api/cases/:id {version,title?,supplierName?,invoiceReference?,dueDate?,claimText?,status?,acceptedFindingIds?} -> {case}. Enforce optimistic concurrency; accepted updates recalculate money; workflow guards on transitions.
- POST /api/cases/:id/documents {kind,name,text} -> {document,case}; limit text 40k/document and 12/case; changes invalidate analysis/approval. No edits to resolved cases. Duplicate SHA must not duplicate evidence/credit. Support upload client extracts PDF/TXT/CSV/image OCR to text before JSON submission.
- DELETE /api/cases/:id/documents/:documentId -> {case}; only draft/review; invalidate analysis.
- POST /api/cases/:id/analyze {} -> {case}; server calls domain engine, caches sourceHash, rejects concurrent analysis, keeps old state on provider failure. Demo fixtures only for isDemo accounts. Real accounts without key return actionable 503, never silently fabricate AI.
- POST /api/cases/:id/claim {} -> {case}; deterministic grounded claim draft from reviewed accepted findings; status approved. Reject low confidence / unverified evidence until corrected and reanalyzed.
- POST /api/cases/:id/credits/verify {documentId,version} -> {case}; verify grounded credit match, no duplicates or total > claim. Partial credit leaves open; full resolves. Must allow analyze new credit note without losing claimed amount/status.
- GET /api/cases/:id/export?format=json|csv|eml|pdf -> attachment. PDF endpoint uses pdfkit, with evidence text references and provenance; no arbitrary HTML.
- GET /api/suppliers -> {suppliers}; POST /api/suppliers {name,email?,aliases?,notes?} -> {supplier}; PATCH /api/suppliers/:id {...} -> {supplier}.
- GET /api/activity -> {activities}; GET /api/settings -> {user,engine}; PATCH /api/settings {workspaceName?,name?} -> {user}; GET /api/export -> complete workspace JSON; DELETE /api/account {password} -> {ok:true}, account removal only own workspace, disabled demo may expire naturally.
- GET /api/health -> {status:'ok',database:'ok'}; GET /api/metrics -> authenticated workspace-only actual usage counts, not fake traction.

Engine module `src/server/engine.ts`: export `analyzeDocuments({documents,supplier,currency,isDemo,previousAnalysis?}): Promise<Analysis>` plus helper `buildClaim(case,workspaceName): string`; helper deterministic `computeTotals` if useful. Supplier memory is per tenant passed in by server; never use AI for auth. Provider errors must be clear, sanitized. Secret stays server. Evorozen primary `chat` with schema-validated structured extraction; optional OpenAI fallback ONLY when configured and labeled. Every finding needs exact substring quotations from supplied documents; quote fail -> needsReview. Deterministic arithmetic from qty * integer cents, validate positive ranges. Credits require credit_note citation and invoice ref match. Treat document text as data, block injection and ungrounded output. PII minimal. Provider trace ID exposed in result. No legal/tax assertion; supplier review requests, not adjudication.

Demo pack (fictional): Fern & Flour cafe, Northstar Foods invoice NF-1042. OAT BARISTA 6X1L 12 cases at $36; TOMATO WHOLE 6X2.5KG 10 cases at $24; OLIVE OIL 5L 4 tins at $32. Delivery: barista oat drink 8 cases, tomatoes 7 cases, olive oil 4 tins. Shortages: 4x36=$144 and 3x24=$72, $216 total. Supplier credit CN-208 for NF-1042 covers oat $144; $72 tomato remains. Seed one ready-to-review main case without credit until demo user adds sample credit; other sample cases may exist but every metric must derive from them. Exact fixture input is reusable and documented. Sample text downloads in public/samples.

Visual direction: editorial warm offwhite #f7f8f5, forest #194d3b, mint #d9ebdf, restrained amber #ba7b42, ink #203a30. Serif display for landing, clean sans app, emerald receipt/check mark vector logo. Clean original geometry, no purple gradients. Mobile responsive, accessible forms, real empty/error/loading states.
