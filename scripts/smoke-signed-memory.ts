/** Exercise the actual production signed-memory module using fictional data only.
 * Five requests: schema, insert, recall, scoped delete, confirm absent.
 * Run: npx tsx scripts/smoke-signed-memory.ts --live */
import { config } from 'dotenv';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { analyzeDocuments } from '../src/server/engine';
import { forgetWorkspaceMemory, recallSupplierMemory, rememberReviewedCase } from '../src/server/memory';
import { DEMO_SUPPLIER, SAMPLE_DOCUMENTS } from '../src/shared/samples';
import type { RecoveryCase } from '../src/shared/types';
config({ quiet: true });
if (!process.argv.includes('--live')) { console.log('No API calls made. Add --live for synthetic signed-memory validation.'); process.exit(0); }
if (!process.env.EVOROZEN_API_KEY) { console.error('EVOROZEN_API_KEY is not configured.'); process.exit(1); }
process.env.EVOROZEN_MEMORY_ENABLED = 'true';
process.env.EVOROZEN_MEMORY_SIGNING_KEY = randomBytes(32).toString('hex');
const run = randomUUID();
const context = { workspaceId: `synthetic-${run}`, supplierId: `supplier-${run}` };
const documents = SAMPLE_DOCUMENTS.map((document, index) => ({ ...document, id: `document-${index}`, caseId: run, sha256: createHash('sha256').update(document.text).digest('hex'), createdAt: new Date().toISOString() }));
const analysis = await analyzeDocuments({ documents, currency: 'USD', supplier: { ...DEMO_SUPPLIER, id: context.supplierId, createdAt: new Date().toISOString() }, isDemo: true });
analysis.findings.forEach(finding => { finding.accepted = true; });
const recoveryCase: RecoveryCase = { id: run, title: 'Fictional reviewed supplier mapping', supplierId: context.supplierId, supplierName: 'Northstar Foods', invoiceReference: 'NF-1042', currency: 'USD', status: 'approved', dueDate: null, documents, analysis, claimText: '', claimedCents: 21600, creditedCents: 0, remainingCents: 21600, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), version: 1 };
let calls = 0; const beforeRequest = async () => { calls++; if (calls > 5) throw new Error('Synthetic memory call budget exceeded.'); };
const checks: Record<string, unknown>[] = []; let passed = false; let removed = false;
try {
  const write = await rememberReviewedCase({ ...context, beforeRequest, eventId: `approval-${run}`, case: recoveryCase });
  assert.equal(write.stored, true); checks.push({ operation: 'rememberReviewedCase', stored: true, traceId: write.traceId });
  const read = await recallSupplierMemory({ ...context, beforeRequest });
  assert.ok(read.aliases.includes('OAT BARISTA 6X1L = barista oat drink'));
  checks.push({ operation: 'recallSupplierMemory', verifiedSignedAliases: read.aliases, traceId: read.traceId });
  const deleted = await forgetWorkspaceMemory({ workspaceId: context.workspaceId, beforeRequest });
  assert.equal(deleted.deleted, 1); removed = true; checks.push({ operation: 'forgetWorkspaceMemory', deleted: deleted.deleted, traceId: deleted.traceId });
  const absent = await recallSupplierMemory({ ...context, beforeRequest });
  assert.deepEqual(absent.aliases, []); checks.push({ operation: 'recallAfterDeletion', aliases: absent.aliases, traceId: absent.traceId });
  passed = true;
} catch (error) {
  checks.push({ failure: error instanceof assert.AssertionError ? error.message : 'Signed-memory module validation failed.', code: error && typeof error === 'object' && 'code' in error ? error.code : 'UNEXPECTED' });
  process.exitCode = 1;
} finally {
  if (!removed && calls < 5) {
    try { const result = await forgetWorkspaceMemory({ workspaceId: context.workspaceId, beforeRequest }); checks.push({ cleanupDeleted: result.deleted, traceId: result.traceId }); } catch { checks.push({ cleanup: 'Remote cleanup could not be confirmed.' }); }
  }
}
await mkdir('deliverables/private', { recursive: true, mode: 0o700 });
const path = `deliverables/private/signed-memory-${run}.json`;
await writeFile(path, JSON.stringify({ kind: 'synthetic_production_module_test', provider: 'evorozen', timestamp: new Date().toISOString(), passed, calls, checks, notes: 'Production memory module with a temporary signing key, HMAC-scoped synthetic workspace, exact signature verification and scoped deletion. Fixture analysis was deterministic demo replay; this is real VirtualDB memory, not a successful Evorozen inference run.' }, null, 2) + '\n', { mode: 0o600 });
console.log(JSON.stringify({ passed, calls, evidenceFile: path }));
