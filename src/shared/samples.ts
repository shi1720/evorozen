import type { DocumentKind } from './types';

/** Fictional fixtures. These are never represented as live AI or customer traction. */
export const SAMPLE_INVOICE = `FICTIONAL DEMO DOCUMENT: not a real invoice
NORTHSTAR FOODS
Invoice: NF-1042
Customer: Fern & Flour cafe
Date: 2026-09-21
Currency: USD

OAT BARISTA 6X1L | Quantity: 12 cases | Unit price: USD 36.00 | Line total: USD 432.00
TOMATO WHOLE 6X2.5KG | Quantity: 10 cases | Unit price: USD 24.00 | Line total: USD 240.00
OLIVE OIL 5L | Quantity: 4 tins | Unit price: USD 32.00 | Line total: USD 128.00

Subtotal: USD 800.00
Tax: USD 0.00
Invoice total: USD 800.00
Payment terms: net 14 days. Please quote NF-1042 in all correspondence.`;

export const SAMPLE_DELIVERY = `FICTIONAL DEMO DOCUMENT: not a real delivery note
NORTHSTAR FOODS
Delivery note: DN-771
Invoice: NF-1042
Delivered to: Fern & Flour cafe
Date received: 2026-09-21
Currency: USD

barista oat drink | Received: 8 cases | Condition: good
TOMATO WHOLE 6X2.5KG | Received: 7 cases | Condition: good
OLIVE OIL 5L | Received: 4 tins | Condition: good

Receiving check: four cases of oat drink and three cases of tomatoes were missing.
Received quantities above were counted at the door.`;

export const SAMPLE_MESSAGE = `FICTIONAL DEMO DOCUMENT: not a real supplier message
From: Northstar Foods customer service
Subject: Product naming for invoice NF-1042
Date: 2026-09-22

Our invoice product OAT BARISTA 6X1L is described as barista oat drink on delivery notes.
One case contains six 1L cartons. Quantities on both documents are cases, not cartons.
Please send your receiving record with any shortage query so we can review it.`;

export const SAMPLE_CREDIT = `FICTIONAL DEMO DOCUMENT: not a real credit note
NORTHSTAR FOODS
Credit note: CN-208
For invoice: NF-1042
Customer: Fern & Flour cafe
Date: 2026-09-23
Currency: USD

OAT BARISTA 6X1L | Credited quantity: 4 cases | Unit price: USD 36.00
Credit total: USD 144.00
Reason: four cases missing from delivery DN-771.
This credit covers the oat drink shortage only. The tomato shortage remains under review.`;

export const SAMPLE_DOCUMENTS: { kind: DocumentKind; name: string; text: string }[] = [
  { kind: 'invoice', name: 'Northstar-invoice-NF-1042.txt', text: SAMPLE_INVOICE },
  { kind: 'delivery_note', name: 'Northstar-delivery-DN-771.txt', text: SAMPLE_DELIVERY },
  { kind: 'supplier_message', name: 'Northstar-product-alias.txt', text: SAMPLE_MESSAGE },
];

export const DEMO_SUPPLIER = {
  name: 'Northstar Foods',
  email: 'accounts@northstar.example',
  aliases: ['OAT BARISTA 6X1L = barista oat drink'],
  notes: 'Invoice and delivery quantities are in cases; each oat case contains six 1L cartons.',
};

export const SAMPLE_CREDIT_DOCUMENT = {
  kind: 'credit_note' as const,
  name: 'Northstar-credit-CN-208.txt',
  text: SAMPLE_CREDIT,
};
