import { randomUUID } from 'node:crypto';
import type { Queryable } from './db';
import type { Activity, RecoveryCase, Supplier, User } from '../shared/types';

export class ApiError extends Error {
  constructor(public status: number, message: string, public code = 'REQUEST_FAILED') { super(message); }
}
export type CaseRow = { data: RecoveryCase; version: number; analysis_token: string | null; analysis_started_at: Date | string | null };
export const now = () => new Date().toISOString();
export const normalizeName = (value: string) => value.trim().toLocaleLowerCase('en-US');
export const isFinalized = (value: RecoveryCase) => ['approved', 'sent', 'partial', 'resolved'].includes(value.status);
export const isEditable = (value: RecoveryCase) => ['draft', 'review'].includes(value.status);
export function checkVersion(value: RecoveryCase, version: number) {
  if (value.version !== version) throw new ApiError(409, 'This case changed in another tab. Refresh the case and try again.', 'VERSION_CONFLICT');
}
export function checkNotAnalyzing(row: CaseRow) {
  if (row.analysis_token && row.analysis_started_at && Date.now() - new Date(row.analysis_started_at).getTime() < 180_000) {
    throw new ApiError(409, 'Analysis is already running for this case. Please wait for it to finish.', 'ANALYSIS_IN_PROGRESS');
  }
}
export async function caseRow(tx: Queryable, userId: string, caseId: string, lock = false): Promise<CaseRow> {
  const result = await tx.query<CaseRow>(`SELECT data,version,analysis_token,analysis_started_at FROM recovery_cases WHERE id=$1 AND user_id=$2${lock ? ' FOR UPDATE' : ''}`, [caseId, userId]);
  if (!result.rows[0]) throw new ApiError(404, 'Case not found.', 'NOT_FOUND');
  return result.rows[0];
}
export async function saveCase(tx: Queryable, userId: string, value: RecoveryCase): Promise<RecoveryCase> {
  value.version += 1;
  value.updatedAt = now();
  await tx.query('UPDATE recovery_cases SET data=$1, version=$2, updated_at=$3 WHERE id=$4 AND user_id=$5', [JSON.stringify(value), value.version, value.updatedAt, value.id, userId]);
  return value;
}
export async function addActivity(tx: Queryable, userId: string, action: string, detail: string, value?: RecoveryCase): Promise<void> {
  await tx.query('INSERT INTO activities(id,user_id,case_id,case_title,action,detail) VALUES($1,$2,$3,$4,$5,$6)', [randomUUID(), userId, value?.id ?? null, value?.title ?? null, action, detail]);
}
export async function listCases(tx: Queryable, userId: string, compact = false): Promise<RecoveryCase[]> {
  // List views use document metadata only. Project away text in SQL so up to 96 MB of
  // stored evidence does not travel through application memory on every dashboard load.
  const projection = compact
    ? `jsonb_set(data, '{documents}', COALESCE((SELECT jsonb_agg(item.value || '{"text":""}'::jsonb ORDER BY item.ordinality) FROM jsonb_array_elements(data->'documents') WITH ORDINALITY AS item(value,ordinality)), '[]'::jsonb))`
    : 'data';
  const result = await tx.query<{ data: RecoveryCase }>(`SELECT ${projection} AS data FROM recovery_cases WHERE user_id=$1 ORDER BY updated_at DESC`, [userId]);
  return result.rows.map((row) => row.data);
}
export async function listSuppliers(tx: Queryable, userId: string): Promise<Supplier[]> {
  const result = await tx.query<{ data: Supplier }>('SELECT data FROM suppliers WHERE user_id=$1 ORDER BY normalized_name', [userId]);
  return result.rows.map((row) => row.data);
}
export async function listActivities(tx: Queryable, userId: string, caseId?: string, limit: number | null = 100): Promise<Activity[]> {
  const params: unknown[] = [userId];
  let filter = '';
  if (caseId) { params.push(caseId); filter = ` AND case_id=$${params.length}`; }
  let bound = '';
  if (limit !== null) { params.push(limit); bound = ` LIMIT $${params.length}`; }
  const result = await tx.query<{ id: string; case_id: string | null; case_title: string | null; action: string; detail: string; created_at: string | Date }>(
    `SELECT id,case_id,case_title,action,detail,created_at FROM activities WHERE user_id=$1${filter} ORDER BY created_at DESC,id DESC${bound}`, params,
  );
  return result.rows.map((row) => ({ id: row.id, caseId: row.case_id, caseTitle: row.case_title ?? undefined, action: row.action, detail: row.detail, createdAt: new Date(row.created_at).toISOString() }));
}
export async function findSupplier(tx: Queryable, userId: string, name: string): Promise<Supplier | null> {
  const suppliers = await listSuppliers(tx, userId);
  return suppliers.find((supplier) => normalizeName(supplier.name) === normalizeName(name) || supplier.aliases.some((alias) => normalizeName(alias) === normalizeName(name))) ?? null;
}
export async function ensureSupplier(tx: Queryable, userId: string, name: string): Promise<Supplier> {
  const existing = await findSupplier(tx, userId, name);
  if (existing) return existing;
  const supplier: Supplier = { id: randomUUID(), name, email: '', aliases: [], notes: '', createdAt: now() };
  const result = await tx.query<{ data: Supplier }>('INSERT INTO suppliers(id,user_id,data,normalized_name) VALUES($1,$2,$3,$4) ON CONFLICT(user_id,normalized_name) DO UPDATE SET normalized_name=EXCLUDED.normalized_name RETURNING data', [supplier.id, userId, JSON.stringify(supplier), normalizeName(name)]);
  return result.rows[0].data;
}
export function newCase(user: User, input: { title: string; supplierName: string; invoiceReference?: string; dueDate?: string | null }, supplier: Supplier): RecoveryCase {
  const timestamp = now();
  return { id: randomUUID(), title: input.title, supplierId: supplier.id, supplierName: supplier.name, invoiceReference: input.invoiceReference ?? '', currency: user.currency, status: 'draft', dueDate: input.dueDate ?? null, documents: [], analysis: null, claimText: '', claimedCents: 0, creditedCents: 0, remainingCents: 0, createdAt: timestamp, updatedAt: timestamp, version: 1 };
}
export async function insertCase(tx: Queryable, userId: string, value: RecoveryCase) {
  await tx.query('INSERT INTO recovery_cases(id,user_id,data,version) VALUES($1,$2,$3,$4)', [value.id, userId, JSON.stringify(value), value.version]);
}
export function invalidateAnalysis(value: RecoveryCase) {
  value.analysis = null; value.claimText = ''; value.claimedCents = 0; value.creditedCents = 0; value.remainingCents = 0; value.status = 'draft';
}
export function engineStatus() {
  const available: Record<string, boolean> = { evorozen: !!process.env.EVOROZEN_API_KEY, openai: !!process.env.OPENAI_API_KEY, gemini: !!process.env.GEMINI_API_KEY };
  const preference = process.env.AI_PROVIDER || 'auto';
  const provider = preference === 'auto' ? ['evorozen', 'openai', 'gemini'].find((name) => available[name]) ?? 'unconfigured' : preference;
  return { provider, configured: !!available[provider], memoryEnabled: true };
}
