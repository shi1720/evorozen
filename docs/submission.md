# Remainder: submission copy

Prepared for Shivam Gupta on 23 September 2026. Copy the public sections after completing the release gates at the end. Do not publish the internal checklist as a product claim.

## Project name

Remainder

## Tagline

A supplier-credit desk that keeps partial credits from becoming forgotten money.

## Track

Autonomous B2B SaaS

## Inspiration

“We'll credit you” should be the beginning of a clear record. For an independent food business, the invoice, delivery note, and eventual credit often arrive at different times and in different formats. A shortage claim may look settled even when the supplier has credited only part of it.

Remainder focuses on that last, easily missed question: what remains outstanding? We chose a small business workflow whose value can be checked against documents and measured in actual work completed.

## What it does

Remainder gives an independent cafe, restaurant, or food retailer a workspace for supplier-credit cases. The user adds invoice and receiving evidence. AI proposes the relevant matches and shortage findings with source quotations. The user reviews the findings before creating a supplier claim.

When a credit note arrives, Remainder matches it against the case and preserves any outstanding balance. In the clearly labeled fictional example, Fern & Flour claims $216. A $144 oat-drink credit leaves $72 for tomatoes open. The app can export the case as an evidence PDF, structured data, or an email draft for the owner to send.

The product distinguishes a verified credit note from credit applied in the accounts or cash received. It does not independently verify those later accounting steps. Every sample business and dollar amount in the demo is fictional.

## How it is built

The public preview is deployed at [remainder-apex.onrender.com](https://remainder-apex.onrender.com) on Render with Neon PostgreSQL. The application uses React and TypeScript with an Express API; local PGlite supports a simple development setup. Session authentication and workspace boundaries keep the authorization logic separate from AI.

The public preview explicitly selects Gemini for inference. The application also supports Evorozen Neural Pulse and OpenAI adapters. The verified live extraction runs used Gemini 3.5 Flash-Lite on two synthetic packs, including an independent GBP case. The application validates the structured result, checks source quotations, and records the actual provider. The Evorozen `chat` adapter is implemented, but its upstream inference service failed during verification; we do not claim a successful sponsor-inference result. Deterministic code handles money in integer cents, currency checks, duplicate-credit controls, and case transitions. User-confirmed supplier aliases provide workspace-specific context on later cases. Optional Evorozen VirtualDB memory stores signed, reviewed product aliases and recalls them within the workspace. The production memory module passed a live five-request write/recall/delete check. It stores no raw invoices or financial amounts and cannot approve a claim. This is verified sponsor memory integration, separate from sponsor inference.

The architecture supports an explicitly configured alternative provider. The interface must accurately identify the provider used. Fixture replay is reserved for labeled demo workspaces. Real accounts without an available provider receive an actionable error.

The two live Gemini checks produced the expected totals: USD 216.00 claimed, 144.00 verified credit, 72.00 remaining; and GBP 63.55 claimed, 18.75 verified credit, 44.80 remaining. These are fictional integration fixtures, not customers or an accuracy benchmark. See [AI validation](validation-ai.md), the [six-case evaluation](validation-model-eval.md), and the [hosted workflow verification](validation-deployment.md) for evidence and limits.

## The hardest design choice

The important boundary was financial truth. A fluent AI response cannot decide that money has been recovered. We designed the workflow around reviewable evidence, exact arithmetic, and partial settlement. A credit note must relate to the right supplier and invoice, and uploading the same evidence twice must not increase the verified amount.

We also kept the first workflow finite. Remainder prepares records and correspondence. The owner controls supplier communication, and their accounting system remains the authority for applied credits and bank cash.

## What makes the project useful

Remainder completes a small operational job: build a reviewed claim, reconcile the reply, and preserve the remainder. It works with the documents the business already has and can hand a readable evidence pack to its bookkeeper. The case history and supplier aliases make repeated use more useful than starting a new chat each time.

There are real competitors in invoice capture, hospitality procurement, and statement reconciliation. Our initial positioning is a focused supplier-credit desk for independent operators. We do not claim an unprecedented category or established market advantage.

## Go-to-market and pricing

Our first validation channel is independent food businesses and hospitality bookkeepers. The launch plan starts with recent, redacted supplier-credit cases, observes the existing process, then compares it with Remainder. We will measure review time, corrections, repeat use, and concrete purchase decisions.

The pricing hypothesis is $29 per location per month for up to 100 claim packs, subject to a defined analysis allowance and viable provider cost. A small guided trial makes the workflow testable. Evorozen's published first 50 free calls are a finite launch allowance, so paid capacity and actual operating cost must support expansion.

We have not established commercial traction in this draft. Public usage or customer outcomes should be added only with verifiable records and permission.

## What comes next

Validate real document formats with a small number of design partners. Improve intake where customers encounter friction. Add bookkeeper handoff features when repeated use supports them. Publish measured reliability and unit costs before expanding the included allowance or promising automation beyond the evidence.

## Built with

React, TypeScript, Vite, Express, PostgreSQL, PGlite, Gemini, Evorozen Neural Pulse adapter, structured AI extraction, PDF evidence exports.

## Creator credit

Created by **Shivam Gupta**, with AI-assisted research, design, and engineering. The project uses a new codebase for Evorozen Apex. Confirm repository history against the event's full rules before submission. Do not invent a list of manual implementation work or conceal AI assistance when the organizer requests disclosure.

## Submission links and status

| Field | Current value or action |
| --- | --- |
| GitHub | [Public source repository](https://github.com/shi1720/evorozen) |
| Public working app | [Remainder live preview](https://remainder-apex.onrender.com): Render + Neon PostgreSQL. Homepage and database health returned HTTP 200 on September 23. The [hosted real-AI workflow, redeploy persistence, cleanup and restore rehearsal](validation-deployment.md) passed using fictional records. |
| Video | Silent 170-second walkthrough prepared in `deliverables/remainder-walkthrough-silent.mp4`; add Shivam’s narration and the verified public/unlisted URL. |
| Live AI evidence | Gemini 3.5 Flash-Lite: two synthetic extraction packs passed. Evorozen: signed production memory module passed live. See [validation](validation-ai.md). |
| Traction | Add only measured non-demo usage. Otherwise retain the pre-launch statement. |

## Submission gates requiring external facts or human action

- **Eligibility:** The supplied rules require student participation, age 13+, and permitted jurisdiction. Shivam must confirm his eligibility and any guardian consent required by the full rules. No identity or student-status claim has been inferred.
- **Official rules:** Verify the current event page, full rules, AI-assistance disclosure, team restrictions, and submission fields. The supplied event description is not a substitute for reading the operative rules.
- **Deadline conflict:** On September 23, the [event header](https://evorozen-apex.devpost.com/) lists **September 30, 2026, 11:45 PM PKT**, equivalent to **October 1, 00:15 IST / September 30, 18:45 UTC**. The [rules body, sections 1.2-1.3](https://evorozen-apex.devpost.com/rules), instead gives a September 15-20 window and **September 20, 11:45 PM PDT** cutoff. These are contradictory official statements. Verify that submission remains open and obtain organizer clarification before relying on the later date. The seven-day plan assumes the header applies, not that the conflict has been resolved.
- **Repository freshness:** Confirm the earliest relevant project commit is July 17, 2026 or later and that the public repository can be inspected. Do not alter dates or manufacture history.
- **Video:** Shivam records the supplied narration, or explicitly authorizes an appropriate alternative. Rendered slides and a script alone do not satisfy a live working-product video requirement. Keep the final runtime below three minutes.
- **Live service:** The public preview is deployed and its health endpoint responds. Preserve the final production smoke-test record, verify provider capacity, and check all links again before submission. A healthy endpoint alone is not a complete workflow test.
- **Traction:** No real users, customers, revenue, or recovered money are asserted by this package. Optional traction bonus requires actual evidence.
- **Final submission:** Verify all attachments and links, review the final preview, and retain the confirmation receipt after submission. A prepared entry is not a submitted entry.

## Final technical evidence for the submitter

[Deployment validation](validation-deployment.md) records the real hosted workflow, signed memory, exports, redeploy persistence, and database restore. [Six-case evaluation](validation-model-eval.md) records three correct supported shortages and three safely blocked problematic cases. These are fictional integration tests, not customer traction. The public preview uses unpaid Gemini data terms; use non-confidential records and complete the documented customer-data launch gates before onboarding real businesses.
