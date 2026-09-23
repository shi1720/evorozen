import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { createDatabase, type Database } from '../src/server/db';
import { createApp } from '../src/server/app';
import { analyzeDocuments, analysisSourceHash, type AnalyzeInput } from '../src/server/engine';
import {
  SAMPLE_CREDIT,
  SAMPLE_DELIVERY,
  SAMPLE_INVOICE,
  SAMPLE_MESSAGE,
} from '../src/shared/samples';
import { caseCsv } from '../src/server/export';
import { MemoryError } from '../src/server/memory';
import type { Analysis, RecoveryCase } from '../src/shared/types';

let db: Database;
let server: Server;
let base: string;
let customAnalyze: ((input: AnalyzeInput) => Promise<Analysis>) | undefined;
let accountNumber = 0;
let memoryEnabled = false;
let memoryWriteFails = false;
let memoryDeleteFails = false;
let memoryForceDelete = false;
const savedKeys = {
  evorozen: process.env.EVOROZEN_API_KEY,
  openai: process.env.OPENAI_API_KEY,
  gemini: process.env.GEMINI_API_KEY,
};

type Reply = { status: number; body: any; cookie: string; headers: Headers; text: string };
async function api(
  route: string,
  method = 'GET',
  body?: unknown,
  cookie = '',
  extraHeaders: Record<string, string> = {},
): Promise<Reply> {
  const response = await fetch(`${base}${route}`, {
    method,
    headers: {
      ...(body !== undefined || method === 'DELETE' ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...extraHeaders,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return {
    status: response.status,
    body: data,
    headers: response.headers,
    text,
    cookie: response.headers.get('set-cookie')?.split(';')[0] ?? '',
  };
}
async function register() {
  const email = `owner-${++accountNumber}@example.com`;
  const reply = await api('/api/auth/register', 'POST', {
    name: 'Shivam',
    email,
    password: 'remainder-password-2026',
    workspaceName: 'Test Cafe',
    currency: 'USD',
  });
  expect(reply.status).toBe(201);
  return { ...reply, email };
}
async function demo() {
  const auth = await api('/api/auth/demo', 'POST', {});
  expect(auth.status).toBe(201);
  const dashboard = await api('/api/dashboard', 'GET', undefined, auth.cookie);
  const detail = await api(
    `/api/cases/${dashboard.body.cases[0].id}`,
    'GET',
    undefined,
    auth.cookie,
  );
  return { cookie: auth.cookie, user: auth.body.user, case: detail.body.case as RecoveryCase };
}
const caseRoute = (value: RecoveryCase, suffix = '') => `/api/cases/${value.id}${suffix}`;

beforeAll(async () => {
  delete process.env.EVOROZEN_API_KEY;
  delete process.env.OPENAI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  db = await createDatabase({ memory: true });
  const app = createApp({
    db,
    analyze: (input) => (customAnalyze ? customAnalyze(input) : analyzeDocuments(input)),
    memory: {
      configuration: () => ({ enabled: memoryEnabled, configured: true }),
      recall: async (input) => {
        await input.beforeRequest?.();
        return { aliases: [], traceId: 'test-memory-read' };
      },
      remember: async (input) => {
        await input.beforeRequest?.();
        if (memoryWriteFails) throw new MemoryError('Write outcome could not be confirmed.');
        return { stored: true, traceId: 'test-memory-write' };
      },
      forget: async (input) => {
        memoryForceDelete = input.force === true;
        if (memoryDeleteFails) throw new MemoryError('Upstream unavailable.');
        return { deleted: 1, traceId: 'test-memory-delete' };
      },
    },
  });
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
}, 30_000);
beforeEach(() => {
  customAnalyze = undefined;
  memoryEnabled = false;
  memoryWriteFails = false;
  memoryDeleteFails = false;
  memoryForceDelete = false;
});
afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await db.close();
  if (savedKeys.evorozen) process.env.EVOROZEN_API_KEY = savedKeys.evorozen;
  if (savedKeys.openai) process.env.OPENAI_API_KEY = savedKeys.openai;
  if (savedKeys.gemini) process.env.GEMINI_API_KEY = savedKeys.gemini;
});

describe('authentication and boundaries', () => {
  it('reports real database health and protects workspace routes', async () => {
    expect((await api('/api/health')).body).toEqual({ status: 'ok', database: 'ok' });
    expect((await api('/api/dashboard')).status).toBe(401);
    expect((await api('/api/auth/me')).status).toBe(401);
  });
  it('registers a real isolated account with hashed password, token, and recovery secret', async () => {
    const auth = await register();
    expect(auth.cookie).toMatch(/^__session=[a-f0-9]{64}$/);
    expect(auth.headers.get('set-cookie')).toContain('HttpOnly');
    expect(auth.headers.get('set-cookie')).toContain('SameSite=Lax');
    expect(auth.body.user).not.toHaveProperty('password_hash');
    const stored = (
      await db.query<{ password_hash: string; recovery_hash: string }>(
        'SELECT password_hash,recovery_hash FROM users WHERE id=$1',
        [auth.body.user.id],
      )
    ).rows[0];
    expect(stored.password_hash).toMatch(/^scrypt\$/);
    expect(stored.recovery_hash).not.toContain(auth.body.recoveryCode);
    const token = (
      await db.query<{ token_hash: string }>('SELECT token_hash FROM sessions WHERE user_id=$1', [
        auth.body.user.id,
      ])
    ).rows[0].token_hash;
    expect(token).not.toBe(auth.cookie.split('=')[1]);
    const dashboard = await api('/api/dashboard', 'GET', undefined, auth.cookie);
    expect(dashboard.body.cases).toEqual([]);
    expect(dashboard.body.metrics.identifiedCents).toBe(0);
    expect((await api('/api/auth/me', 'GET', undefined, auth.cookie)).body.user.email).toBe(
      auth.email,
    );
    expect(
      (await api('/api/auth/login', 'POST', { email: auth.email, password: 'wrong-password' }))
        .status,
    ).toBe(401);
    const login = await api('/api/auth/login', 'POST', {
      email: auth.email,
      password: 'remainder-password-2026',
    });
    expect(login.status).toBe(200);
    await api('/api/auth/logout', 'POST', {}, login.cookie);
    expect((await api('/api/auth/me', 'GET', undefined, login.cookie)).status).toBe(401);
  });
  it('rotates recovery codes and revokes all existing sessions', async () => {
    const auth = await register();
    const recovery = await api('/api/auth/recover', 'POST', {
      email: auth.email,
      recoveryCode: auth.body.recoveryCode,
      password: 'brand-new-password-2026',
    });
    expect(recovery.status).toBe(200);
    expect(recovery.body.recoveryCode).not.toBe(auth.body.recoveryCode);
    expect((await api('/api/auth/me', 'GET', undefined, auth.cookie)).status).toBe(401);
    expect(
      (
        await api('/api/auth/recover', 'POST', {
          email: auth.email,
          recoveryCode: auth.body.recoveryCode,
          password: 'another-password-2026',
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await api('/api/auth/login', 'POST', {
          email: auth.email,
          password: 'brand-new-password-2026',
        })
      ).status,
    ).toBe(200);
  });
  it('rejects cross-origin writes, invalid JSON, weak passwords, and overlong evidence', async () => {
    expect(
      (
        await api('/api/auth/register', 'POST', {
          name: 'S',
          email: 'a@example.com',
          password: 'tiny',
          workspaceName: 'Cafe',
          currency: 'USD',
        })
      ).status,
    ).toBe(400);
    expect(
      (await api('/api/auth/demo', 'POST', {}, '', { Origin: 'https://attacker.example' })).status,
    ).toBe(403);
    const malformed = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{broken',
    });
    expect(malformed.status).toBe(400);
    const auth = await demo();
    expect(
      (
        await api(
          caseRoute(auth.case, '/documents'),
          'POST',
          { kind: 'invoice', name: 'x', text: 'x'.repeat(40_001) },
          auth.cookie,
        )
      ).status,
    ).toBe(400);
  });
  it('never permits another tenant to read, modify, analyze, export, or attach evidence', async () => {
    const first = await demo();
    const second = await demo();
    for (const [suffix, method, body] of [
      ['', 'GET', undefined],
      ['', 'PATCH', { version: first.case.version, title: 'Stolen' }],
      ['/analyze', 'POST', {}],
      ['/export?format=json', 'GET', undefined],
      ['/documents', 'POST', { kind: 'invoice', name: 'Foreign document', text: SAMPLE_INVOICE }],
    ] as const)
      expect((await api(caseRoute(first.case, suffix), method, body, second.cookie)).status).toBe(
        404,
      );
    const supplier = first.case.supplierId;
    expect(
      (await api(`/api/suppliers/${supplier}`, 'PATCH', { notes: 'foreign memory' }, second.cookie))
        .status,
    ).toBe(404);
    const exported = await api('/api/export', 'GET', undefined, second.cookie);
    expect(exported.text).not.toContain(first.case.id);
    expect(exported.text).not.toContain(first.user.id);
    expect(exported.text).not.toContain('password_hash');
  });
});

describe('evidence-to-credit workflow', () => {
  it('does not fabricate AI when a real workspace has no provider', async () => {
    const auth = await register();
    const created = await api(
      '/api/cases',
      'POST',
      { title: 'Delivery discrepancy', supplierName: 'Northstar Foods', dueDate: '' },
      auth.cookie,
    );
    expect(created.status).toBe(201);
    expect(created.body.case.dueDate).toBeNull();
    let value = created.body.case as RecoveryCase;
    for (const [kind, text] of [
      ['invoice', SAMPLE_INVOICE],
      ['delivery_note', SAMPLE_DELIVERY],
      ['supplier_message', SAMPLE_MESSAGE],
    ]) {
      const added = await api(
        caseRoute(value, '/documents'),
        'POST',
        { kind, name: `${kind}.txt`, text },
        auth.cookie,
      );
      expect(added.status).toBe(201);
      value = added.body.case;
    }
    const reply = await api(caseRoute(value, '/analyze'), 'POST', {}, auth.cookie);
    expect(reply.status).toBe(503);
    const after = (await api(caseRoute(value), 'GET', undefined, auth.cookie)).body.case;
    expect(after.status).toBe('draft');
    expect(after.analysis).toBeNull();
    expect(after.version).toBe(value.version);
    expect(
      (
        await db.query<{ analysis_token: string | null }>(
          'SELECT analysis_token FROM recovery_cases WHERE id=$1',
          [value.id],
        )
      ).rows[0].analysis_token,
    ).toBeNull();
    const savedBudget = process.env.AI_MAX_DAILY_CALLS;
    process.env.AI_MAX_DAILY_CALLS = '0';
    customAnalyze = async (input) => {
      await input.beforeProviderRequest?.();
      throw new Error('Quota guard should stop before provider work');
    };
    try {
      const quota = await api(caseRoute(value, '/analyze'), 'POST', {}, auth.cookie);
      expect(quota.status).toBe(429);
      expect(quota.body.code).toBe('AI_DAILY_BUDGET');
      expect(Number(quota.headers.get('retry-after'))).toBeGreaterThan(0);
      const saved = (await api(caseRoute(value), 'GET', undefined, auth.cookie)).body.case;
      expect(saved.version).toBe(value.version);
      expect(saved.analysis).toBeNull();
    } finally {
      if (savedBudget === undefined) delete process.env.AI_MAX_DAILY_CALLS;
      else process.env.AI_MAX_DAILY_CALLS = savedBudget;
      customAnalyze = undefined;
    }
  });
  it('uses cached evidence by default but allows an explicit fresh analysis', async () => {
    const auth = await demo();
    let calls = 0;
    customAnalyze = async (input) => {
      calls += 1;
      return analyzeDocuments(input);
    };
    const cached = await api(caseRoute(auth.case, '/analyze'), 'POST', {}, auth.cookie);
    expect(cached.body.cached).toBe(true);
    expect(calls).toBe(0);
    const fresh = await api(caseRoute(auth.case, '/analyze'), 'POST', { force: true }, auth.cookie);
    expect(fresh.status).toBe(200);
    expect(calls).toBe(1);
    expect(fresh.body.case.analysis.findings).toHaveLength(2);
    expect(fresh.body.case.version).toBeGreaterThan(auth.case.version);
    expect(
      (await api(caseRoute(auth.case, '/analyze'), 'POST', { force: 'yes' }, auth.cookie)).status,
    ).toBe(400);
  });
  it('keeps approved evidence and amounts when a fresh credit pass omits old findings', async () => {
    const auth = await demo();
    const chosen = await api(
      caseRoute(auth.case),
      'PATCH',
      {
        version: auth.case.version,
        acceptedFindingIds: auth.case.analysis!.findings.map((finding) => finding.id),
      },
      auth.cookie,
    );
    expect(chosen.status).toBe(200);
    const approved = await api(caseRoute(auth.case, '/claim'), 'POST', {}, auth.cookie);
    expect(approved.status).toBe(200);
    customAnalyze = async (input) => ({
      ...(await analyzeDocuments(input)),
      findings: [],
      summary: 'No new shortage findings.',
    });
    const fresh = await api(caseRoute(auth.case, '/analyze'), 'POST', { force: true }, auth.cookie);
    expect(fresh.status).toBe(200);
    expect(fresh.body.case.analysis.findings).toEqual(approved.body.case.analysis.findings);
    expect(fresh.body.case.analysis.summary).toContain('2 reviewed shortage findings retained');
    expect(fresh.body.case).toMatchObject({
      status: 'approved',
      claimedCents: 21600,
      remainingCents: 21600,
    });
  });
  it('uses optimistic versions and cannot jump directly to resolved', async () => {
    const auth = await demo();
    const edited = await api(
      caseRoute(auth.case),
      'PATCH',
      { version: auth.case.version, title: 'Updated title' },
      auth.cookie,
    );
    expect(edited.status).toBe(200);
    expect(
      (
        await api(
          caseRoute(auth.case),
          'PATCH',
          { version: auth.case.version, title: 'Stale edit' },
          auth.cookie,
        )
      ).status,
    ).toBe(409);
    expect(
      (
        await api(
          caseRoute(auth.case),
          'PATCH',
          { version: edited.body.case.version, status: 'resolved' },
          auth.cookie,
        )
      ).body.code,
    ).toBe('INVALID_TRANSITION');
    expect(
      (
        await api(
          caseRoute(auth.case),
          'PATCH',
          { version: edited.body.case.version, acceptedFindingIds: ['invented'] },
          auth.cookie,
        )
      ).status,
    ).toBe(400);
  });
  it('keeps duplicate evidence idempotent and invalidates analysis on a document removal', async () => {
    const auth = await demo();
    const listed = await api('/api/cases', 'GET', undefined, auth.cookie);
    expect(
      listed.body.cases[0].documents.every((document: { text: string }) => document.text === ''),
    ).toBe(true);
    expect(auth.case.documents[0].text.length).toBeGreaterThan(100);
    const existing = auth.case.documents[0];
    const duplicate = await api(
      caseRoute(auth.case, '/documents'),
      'POST',
      { kind: existing.kind, name: 'renamed.txt', text: existing.text },
      auth.cookie,
    );
    expect(duplicate.status).toBe(200);
    expect(duplicate.body.duplicate).toBe(true);
    expect(duplicate.body.case.documents).toHaveLength(3);
    expect(duplicate.body.case.version).toBe(auth.case.version);
    const removed = await api(
      caseRoute(auth.case, `/documents/${existing.id}`),
      'DELETE',
      {},
      auth.cookie,
    );
    expect(removed.status).toBe(200);
    expect(removed.body.case.analysis).toBeNull();
    expect(removed.body.case.status).toBe('draft');
    expect((await api(caseRoute(auth.case, '/claim'), 'POST', {}, auth.cookie)).status).toBe(409);
  });
  it('reconciles a partial credit exactly once, preserving the approved claim', async () => {
    const auth = await demo();
    const reviewed = await api(
      caseRoute(auth.case),
      'PATCH',
      {
        version: auth.case.version,
        acceptedFindingIds: auth.case.analysis!.findings.map((finding) => finding.id),
      },
      auth.cookie,
    );
    expect(reviewed.status).toBe(200);
    const approved = await api(caseRoute(auth.case, '/claim'), 'POST', {}, auth.cookie);
    expect(approved.status).toBe(200);
    expect(approved.body.case.claimedCents).toBe(21600);
    expect(
      (await api(caseRoute(auth.case, '/claim'), 'POST', {}, auth.cookie)).body.case.version,
    ).toBe(approved.body.case.version);
    const sent = await api(
      caseRoute(auth.case),
      'PATCH',
      { version: approved.body.case.version, status: 'sent' },
      auth.cookie,
    );
    expect(sent.status).toBe(200);
    expect(
      (
        await api(
          caseRoute(auth.case),
          'PATCH',
          { version: sent.body.case.version, acceptedFindingIds: [] },
          auth.cookie,
        )
      ).status,
    ).toBe(409);
    expect(
      (
        await api(
          caseRoute(auth.case, '/documents'),
          'POST',
          { kind: 'delivery_note', name: 'amended.txt', text: SAMPLE_DELIVERY + '\nAmended' },
          auth.cookie,
        )
      ).status,
    ).toBe(409);
    const added = await api(
      caseRoute(auth.case, '/documents'),
      'POST',
      { kind: 'credit_note', name: 'CN-208.txt', text: SAMPLE_CREDIT },
      auth.cookie,
    );
    expect(added.status).toBe(201);
    expect(added.body.case.claimedCents).toBe(21600);
    expect(added.body.case.status).toBe('sent');
    expect(
      (
        await api(
          caseRoute(auth.case, '/credits/verify'),
          'POST',
          { documentId: added.body.document.id, version: added.body.case.version },
          auth.cookie,
        )
      ).body.code,
    ).toBe('ANALYSIS_STALE');
    const analyzed = await api(caseRoute(auth.case, '/analyze'), 'POST', {}, auth.cookie);
    expect(analyzed.status).toBe(200);
    expect(analyzed.body.case.claimedCents).toBe(21600);
    const verified = await api(
      caseRoute(auth.case, '/credits/verify'),
      'POST',
      { documentId: added.body.document.id, version: analyzed.body.case.version },
      auth.cookie,
    );
    expect(verified.status).toBe(200);
    expect(verified.body.case).toMatchObject({
      status: 'partial',
      claimedCents: 21600,
      creditedCents: 14400,
      remainingCents: 7200,
    });
    const followup = await api(
      caseRoute(auth.case, '/export?format=eml'),
      'GET',
      undefined,
      auth.cookie,
    );
    const followupBody = Buffer.from(
      followup.text.split('\r\n\r\n')[1].replace(/\s/g, ''),
      'base64',
    ).toString('utf8');
    expect(followupBody).toContain('CN-208: USD 144.00');
    expect(followupBody).toContain('Outstanding balance: USD 72.00');
    expect(followupBody).toContain('Please review the remaining USD 72.00');
    expect(followupBody).not.toContain('Total requested credit: USD 216.00');
    const repeated = await api(
      caseRoute(auth.case, '/credits/verify'),
      'POST',
      { documentId: added.body.document.id, version: verified.body.case.version },
      auth.cookie,
    );
    expect(repeated.status).toBe(409);
    expect(repeated.body.code).toBe('DUPLICATE_CREDIT');
    const dashboard = await api('/api/dashboard', 'GET', undefined, auth.cookie);
    expect(dashboard.body.metrics).toMatchObject({
      identifiedCents: 21600,
      claimedCents: 21600,
      creditedCents: 14400,
      remainingCents: 7200,
      resolvedCases: 0,
    });
    // A duplicate recovery case cannot make the same supplier note count twice.
    const duplicateCase = await api(
      '/api/cases',
      'POST',
      { title: 'Duplicate invoice attempt', supplierName: 'Northstar Foods' },
      auth.cookie,
    );
    let duplicateValue = duplicateCase.body.case as RecoveryCase;
    for (const source of [
      ...auth.case.documents,
      { kind: 'credit_note', name: 'CN-208.txt', text: SAMPLE_CREDIT },
    ]) {
      const upload = await api(
        caseRoute(duplicateValue, '/documents'),
        'POST',
        { kind: source.kind, name: source.name, text: source.text },
        auth.cookie,
      );
      expect(upload.status).toBe(201);
      duplicateValue = upload.body.case;
    }
    const duplicateAnalysis = await api(
      caseRoute(duplicateValue, '/analyze'),
      'POST',
      {},
      auth.cookie,
    );
    expect(duplicateAnalysis.status).toBe(200);
    duplicateValue = duplicateAnalysis.body.case;
    await api(
      caseRoute(duplicateValue),
      'PATCH',
      {
        version: duplicateValue.version,
        acceptedFindingIds: duplicateValue.analysis!.findings.map((finding) => finding.id),
      },
      auth.cookie,
    );
    const duplicateClaim = await api(caseRoute(duplicateValue, '/claim'), 'POST', {}, auth.cookie);
    expect(duplicateClaim.status).toBe(200);
    const duplicateVerify = await api(
      caseRoute(duplicateValue, '/credits/verify'),
      'POST',
      {
        documentId: duplicateValue.documents.find((document) => document.kind === 'credit_note')!
          .id,
        version: duplicateClaim.body.case.version,
      },
      auth.cookie,
    );
    expect(duplicateVerify.status).toBe(409);
    expect(duplicateVerify.body.code).toBe('DUPLICATE_CREDIT');
    // A second independently grounded note closes precisely the remaining balance.
    const lastText =
      'NORTHSTAR FOODS\nCredit note: CN-209\nFor invoice: NF-1042\nCurrency: USD\nCredit total: USD 72.00\nReason: tomato shortage.';
    const last = await api(
      caseRoute(auth.case, '/documents'),
      'POST',
      { kind: 'credit_note', name: 'CN-209.txt', text: lastText },
      auth.cookie,
    );
    customAnalyze = async (input) => {
      const prior = input.previousAnalysis!;
      return {
        ...prior,
        sourceHash: analysisSourceHash(input.documents, input.supplier),
        credits: [
          ...prior.credits,
          {
            documentId: last.body.document.id,
            reference: 'CN-209',
            amountCents: 7200,
            verified: false,
            evidence: [{ documentId: last.body.document.id, quote: lastText }],
          },
        ],
      };
    };
    const analyzedAgain = await api(caseRoute(auth.case, '/analyze'), 'POST', {}, auth.cookie);
    expect(analyzedAgain.status).toBe(200);
    const resolved = await api(
      caseRoute(auth.case, '/credits/verify'),
      'POST',
      { documentId: last.body.document.id, version: analyzedAgain.body.case.version },
      auth.cookie,
    );
    expect(resolved.status).toBe(200);
    expect(resolved.body.case).toMatchObject({
      status: 'resolved',
      claimedCents: 21600,
      creditedCents: 21600,
      remainingCents: 0,
    });
    expect(
      (
        await api(
          caseRoute(auth.case, '/documents'),
          'POST',
          { kind: 'credit_note', name: 'CN-other', text: lastText + 'other' },
          auth.cookie,
        )
      ).status,
    ).toBe(409);
  });
  it('exports real evidence as PDF, safe CSV, JSON, and an unsent mail draft', async () => {
    const auth = await demo();
    const maliciousLabel = structuredClone(auth.case);
    maliciousLabel.analysis!.findings[0].product = '  =HYPERLINK("https://example.invalid")';
    expect(caseCsv(maliciousLabel)).toContain('"\'  =HYPERLINK(""https://example.invalid"")"');
    await api(
      caseRoute(auth.case),
      'PATCH',
      {
        version: auth.case.version,
        acceptedFindingIds: auth.case.analysis!.findings.map((finding) => finding.id),
      },
      auth.cookie,
    );
    expect((await api(caseRoute(auth.case, '/claim'), 'POST', {}, auth.cookie)).status).toBe(200);
    for (const format of ['pdf', 'csv', 'json', 'eml']) {
      const reply = await api(
        caseRoute(auth.case, `/export?format=${format}`),
        'GET',
        undefined,
        auth.cookie,
      );
      expect(reply.status).toBe(200);
      expect(reply.headers.get('content-disposition')).toContain(`.${format}`);
      if (format === 'pdf') expect(reply.text.startsWith('%PDF-')).toBe(true);
      if (format === 'json') expect(reply.body.case.analysis.provider).toBe('demo');
      if (format === 'csv') expect(reply.text).toContain('unit_price_cents');
      if (format === 'eml') expect(reply.text).toContain('X-Unsent: 1');
    }
  });
  it('locks concurrent analyses and retains prior state after a provider failure', async () => {
    const auth = await demo();
    // Change supplier memory so the previously cached analysis becomes stale.
    await api(
      `/api/suppliers/${auth.case.supplierId}`,
      'PATCH',
      { notes: 'New receiving policy.' },
      auth.cookie,
    );
    let entered!: () => void;
    let finish!: () => void;
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const blocked = new Promise<void>((resolve) => {
      finish = resolve;
    });
    customAnalyze = async () => {
      entered();
      await blocked;
      throw new Error('Simulated outage');
    };
    const first = api(caseRoute(auth.case, '/analyze'), 'POST', {}, auth.cookie);
    await started;
    expect((await api(caseRoute(auth.case, '/analyze'), 'POST', {}, auth.cookie)).body.code).toBe(
      'ANALYSIS_IN_PROGRESS',
    );
    expect(
      (
        await api(
          caseRoute(auth.case),
          'PATCH',
          { version: auth.case.version, title: 'Concurrent change' },
          auth.cookie,
        )
      ).body.code,
    ).toBe('ANALYSIS_IN_PROGRESS');
    finish();
    expect((await first).status).toBe(500);
    const retained = (await api(caseRoute(auth.case), 'GET', undefined, auth.cookie)).body.case;
    expect(retained.analysis).toEqual(auth.case.analysis);
    expect(retained.version).toBe(auth.case.version);
  });
  it('keeps approval usable and guarantees remote cleanup after an ambiguous memory write', async () => {
    memoryEnabled = true;
    memoryWriteFails = true;
    customAnalyze = async (input) => analyzeDocuments({ ...input, isDemo: true });
    const auth = await register();
    const created = await api(
      '/api/cases',
      'POST',
      { title: 'Remote memory cleanup', supplierName: 'Northstar Foods' },
      auth.cookie,
    );
    let value = created.body.case as RecoveryCase;
    for (const [kind, text] of [
      ['invoice', SAMPLE_INVOICE],
      ['delivery_note', SAMPLE_DELIVERY],
      ['supplier_message', SAMPLE_MESSAGE],
    ]) {
      const added = await api(
        caseRoute(value, '/documents'),
        'POST',
        { kind, name: `${kind}.txt`, text },
        auth.cookie,
      );
      value = added.body.case;
    }
    value = (await api(caseRoute(value, '/analyze'), 'POST', {}, auth.cookie)).body.case;
    const selected = await api(
      caseRoute(value),
      'PATCH',
      {
        version: value.version,
        acceptedFindingIds: value
          .analysis!.findings.filter((finding) => !finding.needsReview)
          .map((finding) => finding.id),
      },
      auth.cookie,
    );
    expect(selected.status).toBe(200);
    const approved = await api(caseRoute(value, '/claim'), 'POST', {}, auth.cookie);
    expect(approved.status).toBe(200);
    expect(approved.body.case.status).toBe('approved');
    expect(
      (
        await db.query<{ memory_cleanup_required: boolean }>(
          'SELECT memory_cleanup_required FROM users WHERE id=$1',
          [auth.body.user.id],
        )
      ).rows[0].memory_cleanup_required,
    ).toBe(true);
    memoryEnabled = false;
    memoryDeleteFails = true;
    const blocked = await api(
      '/api/account',
      'DELETE',
      { password: 'remainder-password-2026' },
      auth.cookie,
    );
    expect(blocked.status).toBe(503);
    expect(blocked.body.code).toBe('MEMORY_CLEANUP_FAILED');
    expect((await api('/api/auth/me', 'GET', undefined, auth.cookie)).status).toBe(200);
    memoryDeleteFails = false;
    expect(
      (await api('/api/account', 'DELETE', { password: 'remainder-password-2026' }, auth.cookie))
        .status,
    ).toBe(200);
    expect(memoryForceDelete).toBe(true);
    expect((await api('/api/auth/me', 'GET', undefined, auth.cookie)).status).toBe(401);
  });
  it('deletes only the password-confirmed owner account and cascades its records', async () => {
    const auth = await register();
    await api('/api/cases', 'POST', { title: 'Delete me', supplierName: 'Supplier' }, auth.cookie);
    expect(
      (await api('/api/account', 'DELETE', { password: 'incorrect' }, auth.cookie)).status,
    ).toBe(401);
    expect(
      (await api('/api/account', 'DELETE', { password: 'remainder-password-2026' }, auth.cookie))
        .status,
    ).toBe(200);
    expect((await api('/api/auth/me', 'GET', undefined, auth.cookie)).status).toBe(401);
    expect(
      (await db.query('SELECT id FROM recovery_cases WHERE user_id=$1', [auth.body.user.id])).rows,
    ).toHaveLength(0);
  });
});
