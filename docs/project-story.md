# Remainder

**Tagline:** The supplier promised a credit. Keep track of what is still owed.

**Primary track:** Autonomous B2B SaaS

## Inspiration

A café receives its morning delivery. Four cases of oat milk and three cases of tomatoes are missing. The supplier says, "We'll credit you."

Days later, a credit note arrives. It covers the oat milk. What happens to the tomatoes?

That small question became Remainder. An invoice, a receiving note, a supplier email, and a credit note each tell part of the story. When those records live in different places, a partial credit can feel like a finished task.

We wanted to build something with a clear, measurable purpose for an independent business: make the evidence easier to review and keep the unresolved amount visible. A convincing email draft is useful, but the job continues after the email is written.

## What it does

Remainder is a supplier-credit desk for independent cafés, restaurants, and food retailers. It follows a quantity-shortage case from the original documents to the credit note that arrives later.

1. **Bring the evidence.** Upload a PDF or photo, or paste the text from an invoice and receiving record. Review the extracted text before saving it.
2. **Review the findings.** AI interprets product descriptions and proposes shortages. Each finding points back to source quotations. The owner chooses which supported findings to include.
3. **Prepare the claim.** Download an email draft and evidence PDF, then send them through the business's existing email workflow.
4. **Check the credit.** Add the supplier's credit note. Remainder checks its supplier, invoice reference, currency, and amount before the owner verifies it.
5. **Keep the remainder open.** A partial credit reduces the balance without closing the case. The next draft asks only about the amount still outstanding.

In our clearly labeled fictional example, Fern & Flour claims **$216**. A **$144** oat-milk credit leaves **$72** for the tomatoes. That is the moment the product is built around.

A verified credit note is evidence that the supplier issued a credit. It is not proof of cash received or a credit applied in the accounting system.

## How we built it

Shivam Gupta built Remainder with AI-assisted research, engineering, and testing. The app uses React and TypeScript, an Express API, and PostgreSQL for durable records. PGlite provides persistent local development without a separate database installation.

The public release uses **https://remainder-desk.web.app**. Firebase Hosting forwards requests to a dedicated Cloud Run service, with PostgreSQL retaining the records across releases. Its verified analysis provider is **OpenAI GPT-5.4 mini**. Provider keys stay on the server. Every analysis records the provider it actually used, its timestamp, and its source fingerprint.

The AI proposes an interpretation. Application code checks the evidence, calculates amounts in integer minor units, prevents duplicate credits, and controls case transitions. Approval locks the original claim so a later credit cannot quietly rewrite it.

Evorozen Neural Pulse also provides optional signed supplier-alias memory. It stores owner-reviewed product-name relationships for future cases, without raw invoices or financial amounts. Its live memory operations were verified separately from inference. The Evorozen inference adapter is implemented, but we do not claim successful sponsor inference when its upstream service was unavailable.

The application includes private workspaces, login, recovery keys, an activity record, PDF/CSV/email exports, a complete workspace export, and password-confirmed account deletion.

## Challenges we ran into

**Financial confidence had to come from evidence.** A model can return a plausible answer for the wrong supplier or infer a unit conversion that the documents never establish. We added checks for quoted evidence, supplier identity, references, currencies, units, and prices. Unsupported suggestions remain unclaimable.

**A partial credit changes the next action.** The initial claim must stay intact while the balance changes. We built a separate verification record and corrected the follow-up draft to acknowledge the credit already issued and request only the remainder.

**Provider availability and limits are real product constraints.** The sponsor's inference service failed during our verification, and its compact prompt limit required bounded extraction windows. We kept fallback behavior explicit and recorded the actual provider instead of presenting a sample result as live inference.

**A polished demo still needs a real lifecycle.** We tested account creation, document intake, exports, recovery, deletion, and persistence through redeployment. We also restored a database backup into a separate temporary environment and checked the balances.

## Accomplishments that we're proud of

The core workflow works from reviewed evidence to a partial credit with an outstanding balance. The same case can be inspected, exported, revisited, and explained without trusting a black-box total.

Our live synthetic evaluation included legitimate shortages in several currencies, a wrong supplier, ambiguous units, and overdelivery. In one case, the model proposed a wrong-supplier shortage and the application's checks blocked it. That is a useful result because the product must handle model mistakes as well as correct answers.

The public sample runs in an isolated workspace and is visibly labeled as replay. Real accounts use the configured live provider or show an actionable error. We also built a responsive interface around the operator's next action, with readable evidence and explicit approval controls.

These are working-product and synthetic-test results. We are not claiming customer revenue, broad document accuracy, or money recovered for real businesses.

## What we learned

The most valuable automation has a clear stopping point. For Remainder, AI can organize the evidence and propose a match, while the operator decides whether to stand behind the claim.

We also learned that technical correctness and commercial usefulness need different evidence. A test can establish that $216 minus $144 leaves $72. It cannot establish that a café owner will use the product every week or pay for it. That needs observed workflows and real purchase decisions.

A narrow, understandable promise helped us make better decisions about both the software and the pitch: keep the unresolved supplier credit visible.

## What's next for Remainder

Our first acquisition channel to test is hospitality bookkeepers and independent operators who already keep invoice and receiving records. We plan to start with a few consented, redacted cases, watch people complete the review, and measure corrections, time spent, and repeat use.

We will test a **$29 per location per month** pricing hypothesis after observing value. The included usage allowance will depend on measured AI requests, document size, and support time. Pricing is a proposal, not an active subscription or a claim of revenue.

Before onboarding confidential customer records, we will confirm appropriate provider data terms, backup operations, and hosting availability. Broader document layouts, better intake, and bookkeeper handoffs come next. Accounting integrations and automatic supplier outreach will follow only if the pilot shows they are worth building.

**The goal is simple: when a supplier says, "We'll credit you," the business can see exactly what remains outstanding.**

## Testing instructions

Open [Remainder](https://remainder-desk.web.app). No payment or API key is needed for the isolated sample.

1. Select **Explore the sample demo** and open **A delivery that came up short**. This path is visibly labeled as fictional sample replay.
2. Inspect the source links in **Findings**. Include the **$144** oat-milk shortage and **$72** tomato shortage in the claim.
3. Select **Prepare claim**, confirm the review, and export the evidence PDF or email draft. The approved claim is **$216**.
4. Select **Add credit note**, load the **$144 sample credit note**, and save its reviewed text. In **Findings**, select **Match new credit**, then inspect and **Verify credit**.
5. Confirm **$216 claimed**, **$144 credit-note verified**, and **$72 outstanding**. The case stays open, and the next email draft asks only for the remainder.

For real OpenAI analysis, create your own **USD** workspace and follow the [normal-account testing guide](https://github.com/shi1720/evorozen/blob/main/docs/testing-instructions.md), including its fictional PDFs and supplier-alias setup. No shared login credentials are needed. Save the recovery key shown during signup.
