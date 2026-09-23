import type { Database } from './db';
import { sha256 } from './auth';
import { ApiError } from './repository';

function configuredLimit(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  if (!/^\d+$/.test(raw) || Number(raw) > 100_000)
    throw new Error(`${name} must be an integer between 0 and 100000.`);
  return Number(raw);
}
/** Reserve one outbound AI request, not merely one analysis. Fallbacks consume another reservation.
 * Shared database counters enforce both limits across processes; failed calls remain counted. */
export async function reserveAiCall(
  db: Database,
  userId: string,
  limits?: { global: number; user: number },
): Promise<void> {
  const globalLimit = limits?.global ?? configuredLimit('AI_MAX_DAILY_CALLS', 30);
  const userLimit = limits?.user ?? configuredLimit('AI_MAX_DAILY_CALLS_PER_USER', 10);
  const day = new Date().toISOString().slice(0, 10);
  const expiry = new Date(`${day}T00:00:00.000Z`);
  expiry.setUTCDate(expiry.getUTCDate() + 1);
  await db.transaction(async (tx) => {
    for (const [scope, identity, max] of [
      ['global', 'all', globalLimit],
      ['workspace', userId, userLimit],
    ] as const) {
      const bucket = sha256(`ai-daily:${scope}:${identity}:${day}`);
      const result = await tx.query<{ hits: number }>(
        'INSERT INTO rate_limits(bucket,hits,expires_at) VALUES($1,1,$2) ON CONFLICT(bucket) DO UPDATE SET hits=rate_limits.hits+1 RETURNING hits',
        [bucket, expiry],
      );
      if (result.rows[0].hits > max)
        throw new ApiError(
          429,
          scope === 'global'
            ? 'The pilot has reached its shared daily AI budget. Your documents are saved. Try again after midnight UTC, or ask the operator to raise AI_MAX_DAILY_CALLS.'
            : 'This workspace has reached its daily AI budget. Your documents are saved. Try again after midnight UTC.',
          'AI_DAILY_BUDGET',
        );
    }
  });
}
