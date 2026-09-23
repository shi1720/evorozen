import type { Database } from './db';
import { sha256 } from './auth';
import { MemoryError, memoryConfiguration, recallSupplierMemory, rememberReviewedCase, forgetWorkspaceMemory } from './memory';
import { addActivity } from './repository';
import type { RecoveryCase } from '../shared/types';

export const defaultMemory = { configuration: memoryConfiguration, recall: recallSupplierMemory, remember: rememberReviewedCase, forget: forgetWorkspaceMemory };
export type MemoryPort = typeof defaultMemory;
function limit(name: string, fallback: number) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  if (!/^\d+$/.test(raw) || Number(raw) > 100_000) throw new MemoryError(`${name} must be an integer from 0 to 100000.`, 'MEMORY_CONFIGURATION');
  return Number(raw);
}
/** Reserve the upper bound (schema + operation) before taking a workspace lock.
 * This intentionally counts two slots even when the schema is already cached. */
export async function reserveMemoryOperation(db: Database): Promise<() => Promise<void>> {
  const day = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(`${day}T00:00:00Z`); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  await db.transaction(async (tx) => {
    for (const [scope, maximum, expiry] of [
      [`day:${day}`, limit('EVOROZEN_MEMORY_MAX_DAILY_CALLS', 6), tomorrow],
      ['lifetime:v1', limit('EVOROZEN_MEMORY_MAX_TOTAL_CALLS', 12), new Date('2100-01-01')],
    ] as const) {
      const row = await tx.query<{ hits: number }>('INSERT INTO rate_limits(bucket,hits,expires_at) VALUES($1,2,$2) ON CONFLICT(bucket) DO UPDATE SET hits=rate_limits.hits+2 RETURNING hits', [sha256(`evorozen-memory:${scope}`), expiry]);
      if (row.rows[0].hits > maximum) throw new MemoryError('Optional Evorozen memory has reached its reserved-call allowance. Local supplier memory remains available.', 'MEMORY_BUDGET');
    }
  });
  let requests = 0;
  return async () => { if (++requests > 2) throw new MemoryError('Memory operation exceeded its reserved request count.', 'MEMORY_BUDGET'); };
}

export async function rememberApprovedCase(db: Database, memory: MemoryPort, workspaceId: string, value: RecoveryCase) {
  if (!memory.configuration().enabled || !value.supplierId) return;
  let beforeRequest: () => Promise<void>;
  try { beforeRequest = await reserveMemoryOperation(db); }
  catch (error) { await addActivity(db, workspaceId, 'memory.skipped', error instanceof MemoryError ? error.message : 'Optional memory was unavailable; the approved claim remains saved.', value); return; }
  // Lock before the remote write, and recheck account existence. Account deletion takes
  // the same lock, so a delayed write cannot recreate aliases after cleanup completes.
  await db.transaction(async (tx) => {
    const owner = await tx.query<{ memory_cleanup_required: boolean }>('SELECT memory_cleanup_required FROM users WHERE id=$1 FOR UPDATE', [workspaceId]);
    if (!owner.rows[0]) return;
    await tx.query('UPDATE users SET memory_cleanup_required=TRUE WHERE id=$1', [workspaceId]);
    try {
      const result = await memory.remember({ workspaceId, supplierId: value.supplierId!, eventId: `${value.id}:approved`, case: value, beforeRequest });
      if (!result.stored && !owner.rows[0].memory_cleanup_required) await tx.query('UPDATE users SET memory_cleanup_required=FALSE WHERE id=$1', [workspaceId]);
      await addActivity(tx, workspaceId, result.stored ? 'memory.stored' : 'memory.skipped', result.stored ? `Confirmed product aliases stored in signed Evorozen memory. Trace ${result.traceId || 'not supplied'}.` : 'No new product aliases required remote memory.', value);
    } catch (error) {
      // Keep the cleanup flag: a timed-out remote write may still have succeeded.
      await addActivity(tx, workspaceId, 'memory.unavailable', error instanceof MemoryError ? error.message : 'Optional memory could not be confirmed; the approved claim remains saved.', value);
    }
  });
}
