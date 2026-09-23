/** Explicit, bounded synthetic integration check. Never runs in the normal test suite.
 * npx tsx scripts/smoke-ai.ts --live --provider=gemini
 * Uses one inference request; archives sanitized evidence, never credentials or raw provider bodies. */
import { config } from 'dotenv';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {
  analyzeDocuments,
  buildClaim,
  computeTotals,
  EngineError,
  verifyCreditMatch,
} from '../src/server/engine';
import { DEMO_SUPPLIER, SAMPLE_CREDIT_DOCUMENT, SAMPLE_DOCUMENTS } from '../src/shared/samples';
import type { Currency, EvidenceDocument, RecoveryCase, Supplier } from '../src/shared/types';

config({ quiet: true });
const args = process.argv.slice(2);
const provider =
  args.find((a) => a.startsWith('--provider='))?.slice('--provider='.length) ?? 'evorozen';
if (!args.includes('--live')) {
  console.log(
    'No network request made. Run with --live --provider=evorozen|gemini|openai to send fictional sample documents to the configured provider.',
  );
  process.exit(0);
}
if (!['evorozen', 'gemini', 'openai'].includes(provider))
  throw new Error('Unsupported smoke-test provider.');
const keyName = {
  evorozen: 'EVOROZEN_API_KEY',
  gemini: 'GEMINI_API_KEY',
  openai: 'OPENAI_API_KEY',
}[provider]!;
if (!process.env[keyName]) {
  console.error(`Missing ${keyName}; no request made.`);
  process.exit(1);
}
for (const name of ['EVOROZEN_API_KEY', 'GEMINI_API_KEY', 'OPENAI_API_KEY'])
  if (name !== keyName) delete process.env[name];
process.env.OPENAI_FALLBACK_ENABLED = 'false';
process.env.GEMINI_FALLBACK_ENABLED = 'false';
process.env.AI_PROVIDER = provider;
process.env.AI_TIMEOUT_MS = '90000';

const timestamp = new Date().toISOString();
const fixture = args.includes('--fixture=table')
  ? JSON.parse(await readFile('tests/fixtures/table-case.json', 'utf8'))
  : {
      label: 'Fictional Northstar labeled-line evaluation',
      supplier: DEMO_SUPPLIER,
      documents: [...SAMPLE_DOCUMENTS, SAMPLE_CREDIT_DOCUMENT],
      currency: 'USD',
      invoiceReference: 'NF-1042',
      expectedClaimedCents: 21600,
      expectedCreditedCents: 14400,
    };
const documents: EvidenceDocument[] = (
  fixture.documents as Pick<EvidenceDocument, 'kind' | 'name' | 'text'>[]
).map((document, i) => ({
  ...document,
  id: `synthetic-document-${i}`,
  caseId: 'synthetic-ai-smoke',
  sha256: createHash('sha256').update(document.text).digest('hex'),
  createdAt: timestamp,
}));
const supplier: Supplier = { ...fixture.supplier, id: 'synthetic-supplier', createdAt: timestamp };
const currency = fixture.currency as Currency;
const outputDir = path.resolve('deliverables/private');
await mkdir(outputDir, { recursive: true, mode: 0o700 });
const file = path.join(outputDir, `ai-smoke-${provider}-${timestamp.replace(/[:.]/g, '-')}.json`);
let requestCount = 0;
let archive: Record<string, unknown> = {
  kind: 'synthetic_live_integration_check',
  attemptedProvider: provider,
  timestamp,
  passed: false,
};
try {
  const analysis = await analyzeDocuments({
    documents,
    supplier,
    currency,
    invoiceReference: fixture.invoiceReference,
    isDemo: false,
    beforeProviderRequest: async () => {
      requestCount++;
    },
  });
  archive = {
    kind: 'synthetic_live_integration_check',
    fixture: fixture.label,
    attemptedProvider: provider,
    actualProvider: analysis.provider,
    model:
      provider === 'gemini'
        ? process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'
        : provider === 'openai'
          ? process.env.OPENAI_MODEL || 'gpt-5.4-mini'
          : 'provider-managed',
    timestamp,
    traceId: analysis.traceId,
    sourceHash: analysis.sourceHash,
    durationMs: analysis.durationMs,
    findings: analysis.findings.map((f) => ({
      id: f.id,
      product: f.product,
      amountCents: f.amountCents,
      confidence: f.confidence,
      needsReview: f.needsReview,
      evidence: f.evidence,
    })),
    credits: analysis.credits,
    warnings: analysis.warnings,
    passed: false,
  };
  await writeFile(file, JSON.stringify(archive, null, 2) + '\n', { mode: 0o600 });
  assert.equal(analysis.provider, provider, 'Must use the requested live provider');
  assert.equal(
    analysis.findings.filter((f) => !f.needsReview).reduce((sum, f) => sum + f.amountCents, 0),
    fixture.expectedClaimedCents,
    'Expected the fixture total in grounded shortages',
  );
  assert.equal(
    analysis.findings.filter((f) => f.needsReview).length,
    0,
    'All synthetic findings should be fully grounded',
  );
  assert.equal(analysis.credits.length, 1, 'Expected one matched credit');
  assert.equal(analysis.credits[0].amountCents, fixture.expectedCreditedCents);
  analysis.findings.forEach((f) => {
    f.accepted = true;
  }); // Synthetic review fixture, not customer approval.
  const recoveryCase: RecoveryCase = {
    id: 'synthetic-ai-smoke',
    title: 'Synthetic supplier recovery check',
    supplierId: supplier.id,
    supplierName: supplier.name,
    invoiceReference: fixture.invoiceReference,
    currency,
    status: 'sent',
    dueDate: null,
    documents,
    analysis,
    claimText: '',
    claimedCents: fixture.expectedClaimedCents,
    creditedCents: 0,
    remainingCents: fixture.expectedClaimedCents,
    createdAt: timestamp,
    updatedAt: timestamp,
    version: 1,
  };
  const claim = buildClaim(recoveryCase, 'Synthetic Fern & Flour workspace');
  assert.ok(claim.includes(`${currency} ${(fixture.expectedClaimedCents / 100).toFixed(2)}`));
  const verified = verifyCreditMatch(analysis.credits[0], recoveryCase);
  const totals = computeTotals(analysis.findings, [verified], fixture.expectedClaimedCents);
  assert.equal(totals.remainingCents, fixture.expectedClaimedCents - fixture.expectedCreditedCents);
  archive = {
    ...archive,
    requestCount,
    passed: true,
    totals,
    checks: [
      'live provider provenance',
      'exact source grounding',
      'deterministic shortage arithmetic',
      'supplier and invoice match',
      'reviewed claim generation',
      'partial credit verification',
    ],
    disclaimer:
      'Synthetic fixtures only. This proves a live integration run, not real users, realized savings, or independent model accuracy.',
  };
  await writeFile(file, JSON.stringify(archive, null, 2) + '\n', { mode: 0o600 });
  console.log(
    JSON.stringify({
      passed: true,
      provider: analysis.provider,
      requestCount,
      traceId: analysis.traceId,
      totals,
      evidenceFile: file,
    }),
  );
} catch (error) {
  const safe =
    error instanceof EngineError
      ? { code: error.code, message: error.message }
      : {
          code: 'SMOKE_ASSERTION_FAILED',
          message:
            error instanceof assert.AssertionError ? error.message : 'Smoke test did not complete.',
        };
  await writeFile(
    file,
    JSON.stringify({ ...archive, passed: false, requestCount, error: safe }, null, 2) + '\n',
    { mode: 0o600 },
  );
  console.error(
    JSON.stringify({ passed: false, provider, requestCount, ...safe, evidenceFile: file }),
  );
  process.exitCode = 1;
}
