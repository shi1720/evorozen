export type DocumentKind = 'invoice' | 'delivery_note' | 'supplier_message' | 'credit_note';
export type CaseStatus = 'draft' | 'review' | 'approved' | 'sent' | 'partial' | 'resolved' | 'dismissed';
export type Currency = 'USD' | 'INR' | 'GBP' | 'EUR';
export interface User { id: string; name: string; email: string; workspaceName: string; currency: Currency; isDemo: boolean }
export interface EvidenceDocument { id: string; caseId: string; kind: DocumentKind; name: string; text: string; sha256: string; createdAt: string }
export interface Citation { documentId: string; quote: string }
export interface Finding {
  id: string; product: string; kind: 'shortage' | 'damage' | 'price_difference' | 'unmatched';
  invoicedQuantity: number; receivedQuantity: number; unitPriceCents: number; amountCents: number;
  unit: string; explanation: string; confidence: 'high' | 'medium' | 'low';
  evidence: Citation[]; accepted: boolean; needsReview: boolean;
}
export interface CreditMatch { documentId: string; reference: string; amountCents: number; evidence: Citation[]; verified: boolean }
export interface Analysis {
  summary: string; findings: Finding[]; credits: CreditMatch[]; warnings: string[];
  supplierName: string; invoiceReference: string; currency: Currency;
  provider: 'evorozen' | 'openai' | 'gemini' | 'demo'; traceId: string; durationMs: number;
  analyzedAt: string; sourceHash: string; memoryUsed: boolean;
}
export interface RecoveryCase {
  id: string; title: string; supplierId: string | null; supplierName: string; invoiceReference: string;
  currency: Currency; status: CaseStatus; dueDate: string | null;
  documents: EvidenceDocument[]; analysis: Analysis | null; claimText: string;
  claimedCents: number; creditedCents: number; remainingCents: number;
  createdAt: string; updatedAt: string; version: number;
}
export interface Supplier { id: string; name: string; email: string; aliases: string[]; notes: string; createdAt: string }
export interface Activity { id: string; caseId: string | null; caseTitle?: string; action: string; detail: string; createdAt: string }
export interface Dashboard {
  cases: RecoveryCase[]; suppliers: Supplier[]; activities: Activity[];
  metrics: { identifiedCents: number; claimedCents: number; creditedCents: number; remainingCents: number; openCases: number; resolvedCases: number; documentCount: number };
  engine: { provider: string; configured: boolean; memoryEnabled: boolean };
}
export interface ApiError { error: string; code?: string }
