/** Seven bounded synthetic API calls to verify the actual Neural Pulse CRUD contract.
 * This probes the dedicated synthetic table only; it is not production customer memory.
 * Run: npx tsx scripts/smoke-evorozen-memory.ts --live */
import { config } from 'dotenv';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
config({ quiet: true });
if (!process.argv.includes('--live')) { console.log('No API calls made. Add --live to test synthetic Evorozen memory storage.'); process.exit(0); }
if (!process.env.EVOROZEN_API_KEY) { console.error('EVOROZEN_API_KEY is not configured.'); process.exit(1); }
const table = 'remainder_synthetic_memory_v1';
const run = randomUUID();
const scopeA = `synthetic-a-${run}`; const scopeB = `synthetic-b-${run}`;
const checks: Record<string, unknown>[] = [];
let calls = 0;
const request = async (action: string, data_payload: unknown) => {
  calls++;
  const response = await fetch('https://pulse.evorozen.com/api/neural', { method: 'POST', headers: { Authorization: `Bearer ${process.env.EVOROZEN_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action_type: action, prompt: 'Execute this deterministic synthetic memory contract test.', data_payload }), signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Neural API rejected ${action} with HTTP ${response.status}.`);
  const result = await response.json();
  checks.push({ action, httpStatus: response.status, traceId: result.traceId ?? result.trace_id ?? null });
  return result;
};
let passed = false;
try {
  const schema = await request('create_schema', { tables: [{ name: table, columns: [{ name: 'event_id', type: 'text', primary: true }, { name: 'workspace_key', type: 'text' }, { name: 'outcome', type: 'text' }] }] });
  assert.equal(schema.executed, true);
  await request('insert_data', { table, record: { event_id: `${run}-a`, workspace_key: scopeA, outcome: 'fictional approved mapping: oat barista = barista oat drink' } });
  await request('insert_data', { table, record: { event_id: `${run}-b`, workspace_key: scopeB, outcome: 'separate fictional workspace, must never be returned for A' } });
  const selected = await request('select_data', { table, filter: { workspace_key: scopeA } });
  assert.ok(Array.isArray(selected.data));
  assert.equal(selected.data.length, 1);
  assert.equal(selected.data[0].workspace_key, scopeA);
  assert.equal(selected.data[0].event_id, `${run}-a`);
  const removed = await request('delete_data', { table, filter: { workspace_key: scopeA } });
  assert.equal(removed.deleted_count, 1);
  const after = await request('select_data', { table, filter: { workspace_key: scopeB } });
  assert.equal(after.data.length, 1); assert.equal(after.data[0].workspace_key, scopeB);
  const cleanup = await request('delete_data', { table, filter: { workspace_key: scopeB } });
  assert.equal(cleanup.deleted_count, 1);
  passed = true;
} catch (error) {
  checks.push({ failure: error instanceof assert.AssertionError ? error.message : error instanceof Error && /^Neural API rejected /.test(error.message) ? error.message : 'Memory contract validation failed.' });
  process.exitCode = 1;
}
await mkdir('deliverables/private', { recursive: true, mode: 0o700 });
const path = `deliverables/private/evorozen-memory-${run}.json`;
await writeFile(path, JSON.stringify({ kind: 'synthetic_provider_contract_test', provider: 'evorozen', timestamp: new Date().toISOString(), passed, calls, checks, notes: 'Two synthetic workspaces; exact filter isolation, trace provenance, scoped deletion. No real customer data. This demonstrates virtual database operations, not a successful inference run or production memory integration.' }, null, 2) + '\n', { mode: 0o600 });
console.log(JSON.stringify({ passed, calls, evidenceFile: path }));
