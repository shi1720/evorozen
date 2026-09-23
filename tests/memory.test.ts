import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash, randomUUID } from 'node:crypto';
import { analyzeDocuments } from '../src/server/engine';
import { forgetWorkspaceMemory, memoryConfiguration, recallSupplierMemory, rememberReviewedCase } from '../src/server/memory';
import { DEMO_SUPPLIER, SAMPLE_DOCUMENTS } from '../src/shared/samples';
import type { RecoveryCase } from '../src/shared/types';

async function reviewedCase(): Promise<RecoveryCase> {
  const documents = SAMPLE_DOCUMENTS.map((document, index) => ({ ...document, id: `document-${index}`, caseId: 'case-a', sha256: createHash('sha256').update(document.text).digest('hex'), createdAt: '2026-09-23T00:00:00Z' }));
  const analysis = await analyzeDocuments({ documents, currency: 'USD', supplier: { ...DEMO_SUPPLIER, id: 'supplier-a', createdAt: '2026-09-23T00:00:00Z' }, isDemo: true });
  analysis.findings.forEach(finding => { finding.accepted = true; });
  return { id: 'case-a', title: 'Fictional review', supplierId: 'supplier-a', supplierName: 'Northstar Foods', invoiceReference: 'NF-1042', currency: 'USD', status: 'approved', dueDate: null, documents, analysis, claimText: '', claimedCents: 21600, creditedCents: 0, remainingCents: 21600, createdAt: '2026-09-23T00:00:00Z', updatedAt: '2026-09-23T00:00:00Z', version: 1 };
}
const context = { workspaceId: 'workspace-a', supplierId: 'supplier-a' };
function remote() {
  const rows: Record<string, string>[] = [];
  const calls: { action: string; payload: Record<string, unknown> }[] = [];
  const fetcher = vi.fn(async (_url, init) => {
    const input = JSON.parse(String(init.body));
    expect(input.prompt.length).toBeGreaterThan(0);
    calls.push({ action: input.action_type, payload: input.data_payload });
    const result: Record<string, unknown> = { action: input.action_type, trace_id: `trace-${calls.length}` };
    if (input.action_type === 'create_schema') Object.assign(result, { executed: true, errors: [] });
    if (input.action_type === 'insert_data') { rows.push(input.data_payload.record); result.row = input.data_payload.record; }
    // Deliberately ignore provider filters to test the independent local boundary.
    if (input.action_type === 'select_data') result.data = rows;
    if (input.action_type === 'delete_data') result.deleted_count = 1;
    return new Response(JSON.stringify(result));
  });
  vi.stubGlobal('fetch', fetcher);
  return { rows, calls, fetcher };
}
beforeEach(() => {
  vi.stubEnv('EVOROZEN_MEMORY_ENABLED', 'true');
  vi.stubEnv('EVOROZEN_MEMORY_SIGNING_KEY', 'synthetic-test-signing-key-at-least-32-characters');
  vi.stubEnv('EVOROZEN_API_KEY', `test-${randomUUID()}`);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('signed Evorozen reviewed supplier memory', () => {
  it('is disabled by default and makes no network request', async () => {
    vi.stubEnv('EVOROZEN_MEMORY_ENABLED', 'false'); const { fetcher } = remote();
    expect(memoryConfiguration().enabled).toBe(false);
    expect(await recallSupplierMemory(context)).toEqual({ aliases: [], traceId: '' });
    expect(await forgetWorkspaceMemory(context)).toEqual({ deleted: 0, traceId: '' });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('requires a signing key and never performs an unscoped delete', async () => {
    vi.stubEnv('EVOROZEN_MEMORY_SIGNING_KEY', ''); const { fetcher } = remote();
    await expect(forgetWorkspaceMemory(context)).rejects.toMatchObject({ code: 'MEMORY_CONFIGURATION' });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('mirrors reviewed aliases, signs them, recalls them, and scopes deletion', async () => {
    const { rows, calls } = remote(); const beforeRequest = vi.fn(async () => {});
    expect(await rememberReviewedCase({ ...context, eventId: 'approval-a', case: await reviewedCase(), beforeRequest })).toEqual({ stored: true, traceId: 'trace-2' });
    const recall = await recallSupplierMemory({ ...context, beforeRequest });
    expect(recall.aliases).toContain('OAT BARISTA 6X1L = barista oat drink');
    expect(rows[0].workspace_key).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(rows)).not.toContain('workspace-a');
    expect(rows[0].payload).not.toMatch(/NF-1042|21600|14400|36\.00|@/);
    expect(await forgetWorkspaceMemory({ ...context, beforeRequest })).toEqual({ deleted: 1, traceId: 'trace-4' });
    expect(calls[3].payload.filter).toEqual({ workspace_key: rows[0].workspace_key });
    expect(beforeRequest).toHaveBeenCalledTimes(4);
    expect(calls.filter(call => call.action === 'create_schema')).toHaveLength(1);
  });
  it('discards altered signatures and foreign workspace/supplier records even if the provider ignores filters', async () => {
    const { rows } = remote();
    await rememberReviewedCase({ ...context, eventId: 'approval-a', case: await reviewedCase() });
    const original = { ...rows[0] };
    rows[0].payload = rows[0].payload.replace('OAT BARISTA', 'POISONED PRODUCT');
    expect((await recallSupplierMemory(context)).aliases).toEqual([]);
    rows[0] = original;
    expect((await recallSupplierMemory({ ...context, workspaceId: 'workspace-b' })).aliases).toEqual([]);
    expect((await recallSupplierMemory({ ...context, supplierId: 'supplier-b' })).aliases).toEqual([]);
  });
  it('can remove previously stored memory after the feature is disabled, but still requires the signing key', async () => {
    const { calls } = remote();
    await rememberReviewedCase({ ...context, eventId: 'approval-a', case: await reviewedCase() });
    vi.stubEnv('EVOROZEN_MEMORY_ENABLED', 'false');
    expect((await forgetWorkspaceMemory({ workspaceId: context.workspaceId, force: true })).deleted).toBe(1);
    expect(calls.at(-1)?.action).toBe('delete_data');
    vi.stubEnv('EVOROZEN_MEMORY_SIGNING_KEY', '');
    await expect(forgetWorkspaceMemory({ workspaceId: context.workspaceId, force: true })).rejects.toMatchObject({ code: 'MEMORY_CONFIGURATION' });
  });
  it('does not promote unreviewed or unsupported findings to memory', async () => {
    const { fetcher } = remote(); const draft = await reviewedCase(); draft.status = 'review';
    await expect(rememberReviewedCase({ ...context, eventId: 'a', case: draft })).rejects.toMatchObject({ code: 'MEMORY_UNREVIEWED' });
    const forged = await reviewedCase(); forged.analysis!.findings[0].amountCents = 99999;
    await expect(rememberReviewedCase({ ...context, eventId: 'b', case: forged })).rejects.toMatchObject({ code: 'UNVERIFIED_FINDINGS' });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('counts network attempts and propagates application quota rejection unchanged', async () => {
    const { fetcher } = remote(); const rejection = Object.assign(new Error('quota reached'), { status: 429 });
    await expect(recallSupplierMemory({ ...context, beforeRequest: async () => { throw rejection; } })).rejects.toBe(rejection);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('rejects provider errors and malformed response without exposing response bodies', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('secret-provider-body', { status: 500 })));
    await expect(recallSupplierMemory(context)).rejects.toThrow('HTTP 500');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ action: 'delete_data', deleted_count: 'all' }))));
    await expect(forgetWorkspaceMemory(context)).rejects.toMatchObject({ code: 'MEMORY_INVALID_RESPONSE' });
  });
});
