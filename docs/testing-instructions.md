# Testing Remainder


## Instructions for judges

Open **https://remainder-desk.web.app** in a current desktop or mobile browser. No payment or API key is required to explore the sample.

1. Select **Explore the sample demo**, then open **A delivery that came up short**. Each visitor gets an isolated fictional workspace. The visible banner identifies this path as sample replay.
2. In **Findings**, inspect the invoice and delivery-note source links. The two supported shortages are **$144** for oat milk and **$72** for tomatoes. Select **Include in claim** for each finding, waiting for each selection to save.
3. Select **Prepare claim**, review the confirmation, then **I reviewed it. Prepare claim.** The approved claim is **$216**.
4. Open **Claim draft** or **Export** to download the email draft and evidence PDF. Remainder does not send email. You can finish this test without marking the claim sent.
5. Select **Add credit note**, then **Load the $144 sample credit note** and **Save reviewed text**. Return to **Findings** and select **Match new credit**.
6. Under **Credits to connect**, inspect the credit's evidence, then select **Verify credit**. Confirm **$216 claimed**, **$144 credit-note verified**, and **$72 still outstanding**. The case stays open. A new email export should ask only about the $72 remainder.

To test live AI, create your own workspace with **USD** as its currency. Save the recovery key shown once during signup. Use the fictional files and account workflow in the detailed instructions below. Normal accounts use **OpenAI GPT-5.4 mini** for analysis; the provider shown in the analysis record is the actual one used. Live requests have shared usage limits, and a provider error is displayed rather than replaced by sample results.

Use fictional or appropriately redacted, non-confidential documents in this public test. A verified credit note is not proof of cash received or credit applied to a bill.

## Test a normal account with live AI

1. From the landing page, select **Start your workspace**. Enter a test name and business, an email you control, and a password of at least 12 characters. Choose **USD**. Copy the recovery key to a safe place, then select **I saved my key. Open workspace.** There are no shared login credentials.
2. Open **Suppliers**. Add **Northstar Foods**, with the known alias `OAT BARISTA 6X1L = barista oat drink`. A supplier email is optional; do not send a message as part of this test.
3. Create a **New recovery case** named `Fictional short delivery test`. Use supplier **Northstar Foods** and invoice reference **NF-1042**.
4. Download these fictional files from the deployed app, or use the copies in the repository:
   - Invoice: `https://remainder-desk.web.app/samples/northstar-invoice.pdf`
   - Delivery note: `https://remainder-desk.web.app/samples/northstar-delivery.pdf`
   - Supplier naming message: `https://remainder-desk.web.app/samples/Northstar-product-alias.txt`
   - Credit note, for the later step: `https://remainder-desk.web.app/samples/northstar-credit.pdf`
5. Use **Add document** for the invoice, delivery note, and supplier message. Select the corresponding document type each time. Check the extracted text before **Save reviewed text**. The app stores reviewed text, not the original file binaries.
6. Select **Analyze documents**. Inspect the provider record and source quotations. The expected supported shortage is **$216**. Live extraction can differ; a request needing review should not be forced into a claim. Report the case's warnings and provider details if the result differs.
7. Review and include the supported findings, prepare the claim, and download an evidence PDF and email draft. Add the credit PDF as a **Credit note**, save its reviewed text, and select **Match new credit**.
8. Inspect and verify **CN-208**. The expected balance is **$216 claimed**, **$144 verified credit**, and **$72 remaining**. Log out and back in to check the records persist.
9. When finished, export the workspace from **Settings** if you want to retain the fictional result. Delete the disposable account there using its password and the confirmation control.

This workflow uses live model requests on fictional records. It is separate from the repeatable sample replay and is not evidence of a real customer's usage or recovery.

## Additional checks

| Area | Action | Expected behavior |
| --- | --- | --- |
| Responsive interface | Open the landing page, case, and Settings on a phone or narrow viewport. | Navigation and controls remain usable; the page does not overflow horizontally. |
| Evidence intake | Upload a text PDF, or the fictional `northstar-invoice.png` image. | Text extraction or OCR finishes with editable text for review before saving. |
| Exports | Download PDF, CSV, JSON, and the email draft after the partial credit. | Exports open and retain the reviewed claim, verified credit, and remaining balance. |
| Duplicate protection | Add the same credit document a second time. | The verified credit does not increase. |
| Recovery | In a disposable account, log out and use **Forgot your password?** with its saved key. | A new password works; the old key is replaced and prior sessions are revoked. Save the replacement key. |
| Account deletion | Try a wrong password, then the correct one in the deletion dialog. | The wrong password cannot delete the account. Confirmed deletion signs the user out. |
| Authentication | Log out, then reopen a saved case URL. | The app requires sign-in instead of showing private records. |
| Failure recovery | Observe any provider limit or service error. | The message explains the failure; the existing documents and reviewed records remain available. |

The current supported financial workflow is quantity shortages with one invoice and one consolidated receiving record per case. Damage, disputed prices, ambiguous units, and multi-invoice reconciliation require further review rather than automatic approval.

## Run the automated checks locally

Use Node.js 22.13 or newer and the repository's documented environment setup.

```bash
npm ci
npm run format:check
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

The regular suite uses isolated fictional fixtures and does not need a live API key. Live-provider evaluations are explicit, separate checks and consume provider quota. See the validation documents for the dates, providers, cases, and limits of each recorded run.
