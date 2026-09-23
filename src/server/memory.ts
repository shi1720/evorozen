import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import type { RecoveryCase } from '../shared/types';
import { buildClaim, observedProductLabel } from './engine';

const TABLE = 'remainder_review_memory_v1';
// A cold recall can need schema + select. Keep optional memory under ten network
// seconds so it leaves room for inference within Firebase Hosting's 60-second limit.
const MEMORY_REQUEST_TIMEOUT_MS = 5_000;
const aliasSchema = z
  .object({
    canonical: z.string().min(3).max(200),
    observed: z.string().min(3).max(200),
    unit: z.string().min(1).max(40),
  })
  .strict();
const payloadSchema = z
  .object({
    version: z.literal(1),
    recordedAt: z.iso.datetime(),
    aliases: z.array(aliasSchema).min(1).max(20),
  })
  .strict();
const recordSchema = z
  .object({
    event_id: z.string().regex(/^[a-f0-9]{64}$/),
    workspace_key: z.string().regex(/^[a-f0-9]{64}$/),
    supplier_key: z.string().regex(/^[a-f0-9]{64}$/),
    payload: z.string().max(12_000),
    signature: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .passthrough();
type Context = { workspaceId: string; beforeRequest?: () => Promise<void>; force?: boolean };
type SupplierContext = Context & { supplierId: string };
const schemaPromises = new Map<string, Promise<void>>();

export class MemoryError extends Error {
  constructor(
    message: string,
    public code = 'MEMORY_UNAVAILABLE',
  ) {
    super(message);
    this.name = 'MemoryError';
  }
}
export function memoryConfiguration(): { enabled: boolean; configured: boolean } {
  return {
    enabled: process.env.EVOROZEN_MEMORY_ENABLED === 'true',
    configured:
      !!process.env.EVOROZEN_API_KEY &&
      (process.env.EVOROZEN_MEMORY_SIGNING_KEY?.length ?? 0) >= 32,
  };
}
function configuration(force = false): { apiKey: string; signingKey: string } | null {
  const state = memoryConfiguration();
  if (!state.enabled && !force) return null;
  if (!state.configured)
    throw new MemoryError(
      'Evorozen memory requires an API key and a signing key of at least 32 characters.',
      'MEMORY_CONFIGURATION',
    );
  return {
    apiKey: process.env.EVOROZEN_API_KEY!,
    signingKey: process.env.EVOROZEN_MEMORY_SIGNING_KEY!,
  };
}
function digest(key: string, value: string): string {
  return createHmac('sha256', key).update(value).digest('hex');
}
function scope(context: SupplierContext | Context, key: string) {
  return {
    workspace_key: digest(key, `workspace:${context.workspaceId}`),
    ...('supplierId' in context
      ? { supplier_key: digest(key, `supplier:${context.workspaceId}:${context.supplierId}`) }
      : {}),
  };
}
function signature(
  record: { event_id: string; workspace_key: string; supplier_key: string; payload: string },
  key: string,
): string {
  return digest(
    key,
    JSON.stringify([record.event_id, record.workspace_key, record.supplier_key, record.payload]),
  );
}
function sameHex(a: string, b: string): boolean {
  return a.length === b.length && timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}
async function request(
  action: string,
  data_payload: unknown,
  context: Context,
): Promise<{ value: Record<string, unknown>; traceId: string }> {
  const config = configuration(context.force);
  if (!config) throw new MemoryError('Evorozen memory is disabled.', 'MEMORY_DISABLED');
  await context.beforeRequest?.();
  try {
    const response = await fetch('https://pulse.evorozen.com/api/neural', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action_type: action,
        prompt: 'Execute a deterministic workspace-scoped reviewed-product memory operation.',
        data_payload,
      }),
      signal: AbortSignal.timeout(MEMORY_REQUEST_TIMEOUT_MS),
    });
    if (!response.ok)
      throw new MemoryError(
        `Evorozen memory is temporarily unavailable (HTTP ${response.status}).`,
      );
    const text = await response.text();
    if (text.length > 500_000)
      throw new MemoryError(
        'Evorozen memory response exceeds the bounded read limit.',
        'MEMORY_INVALID_RESPONSE',
      );
    const value: Record<string, unknown> = JSON.parse(text);
    if (value.action !== action)
      throw new MemoryError(
        'Evorozen memory returned an unexpected operation.',
        'MEMORY_INVALID_RESPONSE',
      );
    const traceId =
      typeof value.trace_id === 'string'
        ? value.trace_id
        : typeof value.traceId === 'string'
          ? value.traceId
          : '';
    return { value, traceId: traceId.slice(0, 200) };
  } catch (error) {
    if (error instanceof MemoryError) throw error;
    throw new MemoryError(
      'Evorozen memory could not be reached. Local case records remain authoritative.',
    );
  }
}
async function ensureSchema(context: Context): Promise<void> {
  const config = configuration(context.force);
  if (!config) return;
  const key = digest(config.signingKey, config.apiKey);
  let pending = schemaPromises.get(key);
  if (!pending) {
    pending = (async () => {
      const response = await request(
        'create_schema',
        {
          tables: [
            {
              name: TABLE,
              columns: [
                { name: 'event_id', type: 'text', primary: true },
                { name: 'workspace_key', type: 'text' },
                { name: 'supplier_key', type: 'text' },
                { name: 'payload', type: 'text' },
                { name: 'signature', type: 'text' },
              ],
            },
          ],
        },
        context,
      );
      if (
        response.value.executed !== true ||
        (Array.isArray(response.value.errors) && response.value.errors.length)
      )
        throw new MemoryError('Evorozen could not prepare the reviewed-product memory table.');
    })();
    schemaPromises.set(key, pending);
    pending.catch(() => {
      schemaPromises.delete(key);
    });
  }
  await pending;
}

/** Only explicit owner-reviewed product equivalences are mirrored. No raw document,
 * monetary amount, person, email, plaintext workspace ID, or invoice number is sent. */
export async function rememberReviewedCase(
  input: SupplierContext & { eventId: string; case: RecoveryCase },
): Promise<{ stored: boolean; traceId: string }> {
  const config = configuration();
  if (!config) return { stored: false, traceId: '' };
  if (!['approved', 'sent', 'partial', 'resolved'].includes(input.case.status))
    throw new MemoryError(
      'Only approved findings can become supplier memory.',
      'MEMORY_UNREVIEWED',
    );
  buildClaim(input.case, 'Workspace'); // Recheck quotes and arithmetic; the output is never transmitted.
  const aliases = (input.case.analysis?.findings ?? [])
    .filter((finding) => finding.accepted && !finding.needsReview && finding.confidence !== 'low')
    .flatMap((finding) => {
      const delivery = finding.evidence.find(
        (citation) =>
          input.case.documents.find((document) => document.id === citation.documentId)?.kind ===
          'delivery_note',
      );
      if (!delivery) return [];
      const observed = observedProductLabel(
        delivery.quote,
        input.case.documents.find((document) => document.id === delivery.documentId),
      );
      if (
        observed.length < 3 ||
        observed.length > 200 ||
        observed.toLowerCase() === finding.product.toLowerCase()
      )
        return [];
      return [{ canonical: finding.product, observed, unit: finding.unit }];
    });
  const unique = [
    ...new Map(aliases.map((alias) => [`${alias.canonical}:${alias.observed}`, alias])).values(),
  ].slice(0, 20);
  if (!unique.length) return { stored: false, traceId: '' };
  const payload = JSON.stringify(
    payloadSchema.parse({ version: 1, recordedAt: new Date().toISOString(), aliases: unique }),
  );
  const scopes = scope(input, config.signingKey) as { workspace_key: string; supplier_key: string };
  const record = {
    event_id: digest(config.signingKey, `event:${input.workspaceId}:${input.eventId}`),
    ...scopes,
    payload,
  };
  await ensureSchema(input);
  const result = await request(
    'insert_data',
    { table: TABLE, record: { ...record, signature: signature(record, config.signingKey) } },
    input,
  );
  const row = recordSchema.safeParse(result.value.row);
  if (
    !row.success ||
    row.data.event_id !== record.event_id ||
    row.data.workspace_key !== record.workspace_key ||
    row.data.supplier_key !== record.supplier_key ||
    row.data.payload !== record.payload ||
    !sameHex(row.data.signature, signature(record, config.signingKey))
  )
    throw new MemoryError(
      'Evorozen did not confirm the exact signed memory record.',
      'MEMORY_INVALID_RESPONSE',
    );
  return { stored: true, traceId: result.traceId };
}

export async function recallSupplierMemory(
  input: SupplierContext,
): Promise<{ aliases: string[]; traceId: string }> {
  const config = configuration();
  if (!config) return { aliases: [], traceId: '' };
  await ensureSchema(input);
  const scopes = scope(input, config.signingKey) as { workspace_key: string; supplier_key: string };
  const result = await request('select_data', { table: TABLE, filter: scopes, limit: 50 }, input);
  if (!Array.isArray(result.value.data) || result.value.data.length > 50)
    throw new MemoryError(
      'Evorozen memory returned too many or unreadable records.',
      'MEMORY_INVALID_RESPONSE',
    );
  const records: { at: string; aliases: z.infer<typeof aliasSchema>[] }[] = [];
  for (const raw of result.value.data) {
    const record = recordSchema.safeParse(raw);
    if (
      !record.success ||
      record.data.workspace_key !== scopes.workspace_key ||
      record.data.supplier_key !== scopes.supplier_key
    )
      continue;
    if (!sameHex(record.data.signature, signature(record.data, config.signingKey))) continue;
    let value: unknown;
    try {
      value = JSON.parse(record.data.payload);
    } catch {
      continue;
    }
    const payload = payloadSchema.safeParse(value);
    if (!payload.success) continue;
    records.push({ at: payload.data.recordedAt, aliases: payload.data.aliases });
  }
  const aliases = new Map<string, string>();
  for (const record of records.sort((a, b) => b.at.localeCompare(a.at)))
    for (const alias of record.aliases) {
      const key = alias.observed.toLowerCase();
      if (!aliases.has(key)) aliases.set(key, `${alias.canonical} = ${alias.observed}`);
    }
  return { aliases: [...aliases.values()].slice(0, 30), traceId: result.traceId };
}

/** Call before local account removal when the feature is enabled. A missing signing key
 * must never trigger an unfiltered delete; failures preserve the local account for retry. */
export async function forgetWorkspaceMemory(
  input: Context,
): Promise<{ deleted: number; traceId: string }> {
  const config = configuration(input.force);
  if (!config) return { deleted: 0, traceId: '' };
  await ensureSchema(input);
  const filter = scope({ workspaceId: input.workspaceId }, config.signingKey);
  const result = await request('delete_data', { table: TABLE, filter }, input);
  if (!Number.isSafeInteger(result.value.deleted_count) || Number(result.value.deleted_count) < 0)
    throw new MemoryError(
      'Evorozen did not confirm scoped memory removal.',
      'MEMORY_INVALID_RESPONSE',
    );
  return { deleted: Number(result.value.deleted_count), traceId: result.traceId };
}
