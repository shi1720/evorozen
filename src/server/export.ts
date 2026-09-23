import PDFDocument from 'pdfkit';
import path from 'node:path';
import type { RecoveryCase, User } from '../shared/types';

const formatMoney = (cents: number, currency: string) => `${currency} ${(cents / 100).toFixed(2)}`;
// Spreadsheet formula injection is independent of CSV quoting.
const cell = (value: unknown) => `"${String(value ?? '').replace(/^(?:[\s\uFEFF]*[=+@-]|[\t\r\n])/, (prefix) => `'${prefix}`).replace(/"/g, '""')}"`;
export function caseCsv(value: RecoveryCase): string {
  const headers = ['case_id', 'invoice_reference', 'currency', 'product', 'kind', 'invoiced_quantity', 'received_quantity', 'unit', 'unit_price_cents', 'amount_cents', 'accepted', 'needs_review', 'evidence'];
  const rows = (value.analysis?.findings ?? []).map((finding) => [value.id, value.invoiceReference, value.currency, finding.product, finding.kind, finding.invoicedQuantity, finding.receivedQuantity, finding.unit, finding.unitPriceCents, finding.amountCents, finding.accepted, finding.needsReview, finding.evidence.map((citation) => `${citation.documentId}: ${citation.quote}`).join(' | ')]);
  return '\uFEFF' + [headers, ...rows].map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n';
}
/** Keep the original approved request immutable; derive later correspondence from the ledger. */
export function currentCorrespondence(value: RecoveryCase, workspaceName: string): { subject: string; body: string } {
  const reference = value.invoiceReference || value.title;
  if (value.creditedCents > 0 && ['partial', 'resolved'].includes(value.status)) {
    const credits = value.analysis?.credits.filter((credit) => credit.verified) ?? [];
    const resolved = value.remainingCents === 0;
    const subject = `${resolved ? 'Credit reconciliation complete' : 'Outstanding credit review'} - invoice ${reference}`;
    const body = `Hello ${value.supplierName} team,\n\nThank you for the credit notes issued against invoice ${reference}. We have recorded the following matching credits:\n\n${credits.map((credit) => `- ${credit.reference}: ${formatMoney(credit.amountCents, value.currency)}`).join('\n')}\n\nOriginal reviewed request: ${formatMoney(value.claimedCents, value.currency)}\nVerified credit notes: ${formatMoney(value.creditedCents, value.currency)}\nOutstanding balance: ${formatMoney(value.remainingCents, value.currency)}\n\n${resolved ? 'Our reviewed request is now fully matched to issued credit notes. Thank you for helping us reconcile this delivery.' : `Please review the remaining ${formatMoney(value.remainingCents, value.currency)} and confirm whether a further credit note will be issued. If your records differ, please share the details so we can reconcile the remaining balance. The credits listed above have already been deducted from this follow-up.`}\n\nThese figures refer to issued credit notes, not cash received or credits applied to a bill.\n\nThank you,\n${workspaceName}`;
    return { subject, body };
  }
  return {
    subject: `Supplier review request - ${reference}`,
    body: value.claimText.replace(/^Subject:[^\r\n]*\r?\n\s*\r?\n/i, '') || `Please review the attached evidence for ${reference}.\n\n${workspaceName}`,
  };
}
export function caseEmail(value: RecoveryCase, user: User): string {
  const { subject, body } = currentCorrespondence(value, user.workspaceName);
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject.replace(/[\r\n]/g, ' ')).toString('base64')}?=`;
  return [`Subject: ${encodedSubject}`, 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', 'X-Unsent: 1', '', Buffer.from(body).toString('base64').match(/.{1,76}/g)!.join('\r\n'), ''].join('\r\n');
}
export async function casePdf(value: RecoveryCase, user: User): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48, bufferPages: true, info: { Title: `Remainder evidence pack - ${value.invoiceReference || value.title}`, Author: user.workspaceName, Subject: 'Supplier review request with source evidence' } });
    doc.registerFont('Body', path.resolve('assets/fonts/NotoSans-Regular.ttf'));
    doc.registerFont('BodyBold', path.resolve('assets/fonts/NotoSans-Bold.ttf'));
    const buffers: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);
    const section = (title: string) => { if (doc.y > 640) doc.addPage(); doc.moveDown(0.8).font('BodyBold').fontSize(12).fillColor('#194d3b').text(title).moveDown(0.4).font('Body').fontSize(10).fillColor('#263a31'); };
    const text = (content: string) => doc.font('Body').fontSize(10).fillColor('#263a31').text(content, { lineGap: 3 });
    doc.font('BodyBold').fontSize(26).fillColor('#194d3b').text('Remainder');
    doc.font('Body').fontSize(10).fillColor('#63736b').text('SUPPLIER CREDIT EVIDENCE PACK').moveDown();
    doc.font('BodyBold').fontSize(19).fillColor('#263a31').text(value.title);
    text(`${user.workspaceName}  |  ${value.supplierName}\nInvoice: ${value.invoiceReference || 'Not yet extracted'}  |  Currency: ${value.currency}\nStatus: ${value.status}  |  Generated: ${new Date().toISOString()}`);
    if (user.isDemo) text('FICTIONAL DEMO DATA - for product evaluation only.');
    section('Recovery position');
    text(`Approved request total: ${formatMoney(value.claimedCents, value.currency)}\nVerified supplier credits: ${formatMoney(value.creditedCents, value.currency)}\nOutstanding balance: ${formatMoney(value.remainingCents, value.currency)}`);
    text('Verified credits refer to credit-note evidence, not cash received or credits applied to an invoice.');
    if (value.creditedCents > 0) {
      section(value.remainingCents > 0 ? 'Current follow-up draft' : 'Credit reconciliation');
      const correspondence = currentCorrespondence(value, user.workspaceName);
      text(correspondence.body);
    }
    if (value.claimText) {
      section(value.creditedCents > 0 ? 'Original approved request (historical record)' : 'Supplier review request');
      if (value.creditedCents > 0) text('The request below is retained for the audit trail. Issued credits are deducted in the current recovery position above.');
      text(value.claimText);
    }
    section('Findings and source references');
    if (!value.analysis) text('Analysis has not been completed.');
    for (const [index, finding] of (value.analysis?.findings ?? []).entries()) {
      if (doc.y > 650) doc.addPage();
      doc.font('BodyBold').fontSize(11).text(`${index + 1}. ${finding.product} - ${formatMoney(finding.amountCents, value.currency)}`);
      text(`${finding.kind} | ${finding.accepted ? 'Included' : 'Excluded'} | Confidence: ${finding.confidence}${finding.needsReview ? ' | REQUIRES REVIEW' : ''}\n${finding.explanation}`);
      text(`Invoice quantity ${finding.invoicedQuantity}; delivered ${finding.receivedQuantity}; unit ${finding.unit}; unit price ${formatMoney(finding.unitPriceCents, value.currency)}.`);
      for (const citation of finding.evidence) {
        const source = value.documents.find((document) => document.id === citation.documentId);
        text(`Source: ${source?.name ?? citation.documentId}\n"${citation.quote}"`);
      }
      doc.moveDown(0.6);
    }
    if (value.analysis?.credits.length) {
      section('Credit reconciliation');
      for (const credit of value.analysis.credits) text(`${credit.reference}: ${formatMoney(credit.amountCents, value.currency)} - ${credit.verified ? 'verified' : 'pending verification'}\n${credit.evidence.map((citation) => `"${citation.quote}"`).join('\n')}`);
    }
    section('AI provenance and review');
    if (value.analysis) text(`Provider: ${value.analysis.provider}\nTrace: ${value.analysis.traceId}\nAnalyzed: ${value.analysis.analyzedAt}\nSource fingerprint: ${value.analysis.sourceHash}\n${value.analysis.warnings.join('\n')}`);
    text('This pack requests supplier review of submitted evidence. It is not a legal, tax, or accounting determination. The workspace owner approves findings before requesting a credit.');
    section('Evidence inventory');
    for (const source of value.documents) text(`${source.name} (${source.kind})\nID: ${source.id}\nSHA-256: ${source.sha256}\nAdded: ${source.createdAt}\n`);
    const pages = doc.bufferedPageRange();
    for (let index = pages.start; index < pages.start + pages.count; index++) {
      doc.switchToPage(index);
      doc.font('Body').fontSize(8).fillColor('#63736b').text(`Remainder | ${value.invoiceReference || 'Evidence pack'} | ${index + 1} / ${pages.count}`, 48, 790, { lineBreak: false });
    }
    doc.end();
  });
}
