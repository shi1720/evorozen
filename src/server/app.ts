import express, { type NextFunction, type Request, type Response } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { randomBytes, randomUUID } from 'node:crypto';
import { z, ZodError } from 'zod';
import type { Database, Queryable } from './db';
import {
  authenticate,
  clearSession,
  COOKIE_NAME,
  createSession,
  generateRecoveryCode,
  hashSecret,
  normalizeRecoveryCode,
  publicUser,
  sha256,
  verifySecret,
  type UserRow,
} from './auth';
import {
  addActivity,
  ApiError,
  caseRow,
  checkNotAnalyzing,
  checkVersion,
  engineStatus,
  ensureSupplier,
  findSupplier,
  insertCase,
  invalidateAnalysis,
  isEditable,
  isFinalized,
  listActivities,
  listCases,
  listSuppliers,
  newCase,
  normalizeName,
  now,
  saveCase,
} from './repository';
import {
  analyzeDocuments,
  analysisSourceHash,
  buildClaim,
  EngineError,
  verifyCreditMatch,
  creditSourceSupplierKey,
} from './engine';
import { SAMPLE_INVOICE, SAMPLE_DELIVERY, SAMPLE_MESSAGE, DEMO_SUPPLIER } from '../shared/samples';
import { caseCsv, caseEmail, casePdf } from './export';
import { reserveAiCall } from './budget';
import { MemoryError } from './memory';
import {
  defaultMemory,
  rememberApprovedCase,
  reserveMemoryOperation,
  type MemoryPort,
} from './memory-lifecycle';
import type {
  Analysis,
  Dashboard,
  EvidenceDocument,
  RecoveryCase,
  Supplier,
  User,
} from '../shared/types';

const name = z.string().trim().min(1).max(120);
const password = z.string().min(12, 'Use at least 12 characters for your password.').max(128);
const email = z.email().trim().toLowerCase().max(254);
const currency = z.enum(['USD', 'INR', 'GBP', 'EUR']);
const version = z.number().int().positive();
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, 'Use a valid calendar date.')
  .nullable()
  .or(z.literal(''))
  .transform((value) => value || null);
const registerSchema = z.object({ name, email, password, workspaceName: name, currency }).strict();
const supplierSchema = z
  .object({
    name,
    email: z.union([z.email().max(254), z.literal('')]).optional(),
    aliases: z.array(name).max(30).optional(),
    notes: z.string().trim().max(4000).optional(),
  })
  .strict();
const createCaseSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    supplierName: name,
    invoiceReference: z.string().trim().max(120).optional(),
    dueDate: date.optional(),
  })
  .strict();
const casePatchSchema = z
  .object({
    version,
    title: z.string().trim().min(1).max(160).optional(),
    supplierName: name.optional(),
    invoiceReference: z.string().trim().max(120).optional(),
    dueDate: date.optional(),
    claimText: z.string().trim().max(20_000).optional(),
    status: z
      .enum(['draft', 'review', 'approved', 'sent', 'partial', 'resolved', 'dismissed'])
      .optional(),
    acceptedFindingIds: z.array(z.string().max(120)).max(100).optional(),
  })
  .strict();
const documentSchema = z
  .object({
    kind: z.enum(['invoice', 'delivery_note', 'supplier_message', 'credit_note']),
    name: z.string().trim().min(1).max(180),
    text: z
      .string()
      .trim()
      .min(10, 'Add at least 10 characters of extracted document text.')
      .max(40_000, 'Each document may contain up to 40,000 characters.'),
  })
  .strict();
const authenticatedUser = (res: Response): User => publicUser(res.locals.user as UserRow);
const userRow = (res: Response): UserRow => res.locals.user as UserRow;
const param = (req: Request, key: string): string => String(req.params[key]);
const identifiedAmount = (analysis: Analysis | null) =>
  (analysis?.findings ?? [])
    .filter((finding) => !finding.needsReview && finding.confidence !== 'low')
    .reduce((sum, finding) => sum + finding.amountCents, 0);
const selectedAmount = (analysis: Analysis | null) =>
  (analysis?.findings ?? [])
    .filter((finding) => finding.accepted && !finding.needsReview && finding.confidence !== 'low')
    .reduce((sum, finding) => sum + finding.amountCents, 0);

export interface AppOptions {
  db: Database;
  analyze?: typeof analyzeDocuments;
  memory?: MemoryPort;
}
export function createApp({ db, analyze = analyzeDocuments, memory = defaultMemory }: AppOptions) {
  const app = express();
  app.disable('x-powered-by');
  if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);
  app.use(
    helmet({
      contentSecurityPolicy:
        process.env.NODE_ENV === 'production'
          ? {
              directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'wasm-unsafe-eval'", 'https://cdn.jsdelivr.net'],
                workerSrc: ["'self'", 'blob:', 'https://cdn.jsdelivr.net'],
                connectSrc: [
                  "'self'",
                  'blob:',
                  'https://cdn.jsdelivr.net',
                  'https://tessdata.projectnaptha.com',
                ],
                styleSrc: ["'self'", "'unsafe-inline'"],
                fontSrc: ["'self'", 'data:', 'blob:'],
                imgSrc: ["'self'", 'data:', 'blob:'],
                objectSrc: ["'none'"],
                frameAncestors: ["'none'"],
                baseUri: ["'self'"],
                formAction: ["'self'"],
              },
            }
          : false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(cookieParser());
  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.use('/api', (req, _res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const origin = req.get('origin');
    const expected =
      process.env.APP_ORIGIN?.replace(/\/$/, '') || `${req.protocol}://${req.get('host')}`;
    if (req.get('sec-fetch-site') === 'cross-site' || (origin && origin !== expected))
      return next(
        new ApiError(
          403,
          'This request must come from the Remainder application.',
          'ORIGIN_MISMATCH',
        ),
      );
    if (!req.is('application/json'))
      return next(new ApiError(415, 'Send this request as application/json.', 'CONTENT_TYPE'));
    next();
  });
  app.use(express.json({ limit: '520kb' }));
  app.use('/api', (req, _res, next) => {
    const pending: unknown[] = [req.body];
    while (pending.length) {
      const value = pending.pop();
      if (typeof value === 'string' && value.includes('\0'))
        return next(
          new ApiError(
            400,
            'Text contains a null character. Remove it and try again.',
            'INVALID_TEXT',
          ),
        );
      if (value && typeof value === 'object')
        for (const child of Object.values(value)) pending.push(child);
    }
    next();
  });
  const limit =
    (category: string, max: number, windowMs: number, byUser = false) =>
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const identity = byUser
          ? authenticatedUser(res).id
          : req.ip || req.socket.remoteAddress || 'unknown';
        const bucket = sha256(`${category}:${identity}`);
        const expires = new Date(Date.now() + windowMs);
        const result = await db.query<{ hits: number; expires_at: string | Date }>(
          `INSERT INTO rate_limits(bucket,hits,expires_at) VALUES($1,1,$2)
        ON CONFLICT(bucket) DO UPDATE SET hits=CASE WHEN rate_limits.expires_at <= NOW() THEN 1 ELSE rate_limits.hits+1 END,
        expires_at=CASE WHEN rate_limits.expires_at <= NOW() THEN EXCLUDED.expires_at ELSE rate_limits.expires_at END RETURNING hits,expires_at`,
          [bucket, expires],
        );
        if (result.rows[0].hits > max) {
          res.set(
            'Retry-After',
            String(
              Math.max(
                1,
                Math.ceil((new Date(result.rows[0].expires_at).getTime() - Date.now()) / 1000),
              ),
            ),
          );
          throw new ApiError(
            429,
            'Too many requests. Please wait a little before trying again.',
            'RATE_LIMITED',
          );
        }
        next();
      } catch (error) {
        next(error);
      }
    };
  app.get('/api/health', async (_req, res) => {
    await db.query('SELECT 1');
    res.json({ status: 'ok', database: 'ok' });
  });
  const authLimit = limit('auth', 35, 15 * 60_000);
  app.use('/api/auth', (req, res, next) =>
    req.method === 'POST' ? authLimit(req, res, next) : next(),
  );
  const dummyHash = hashSecret(randomBytes(24).toString('hex'));

  app.post('/api/auth/register', async (req, res) => {
    const input = registerSchema.parse(req.body);
    const recoveryCode = generateRecoveryCode();
    const [passwordHash, recoveryHash] = await Promise.all([
      hashSecret(input.password),
      hashSecret(normalizeRecoveryCode(recoveryCode)),
    ]);
    const id = randomUUID();
    const user = await db.transaction(async (tx) => {
      const inserted = await tx.query<UserRow>(
        'INSERT INTO users(id,email,name,workspace_name,currency,password_hash,recovery_hash) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(email) DO NOTHING RETURNING *',
        [
          id,
          input.email,
          input.name,
          input.workspaceName,
          input.currency,
          passwordHash,
          recoveryHash,
        ],
      );
      if (!inserted.rows[0])
        throw new ApiError(
          409,
          'An account already uses this email. Sign in or use your recovery code.',
          'EMAIL_EXISTS',
        );
      await addActivity(tx, id, 'workspace.created', 'Workspace created.');
      await createSession(tx, id, res);
      return publicUser(inserted.rows[0]);
    });
    res.status(201).json({ user, recoveryCode });
  });
  app.post('/api/auth/login', async (req, res) => {
    const input = z
      .object({ email, password: z.string().min(1).max(128) })
      .strict()
      .parse(req.body);
    const result = await db.query<UserRow>('SELECT * FROM users WHERE email=$1 AND is_demo=FALSE', [
      input.email,
    ]);
    const row = result.rows[0];
    const valid = await verifySecret(input.password, row?.password_hash ?? (await dummyHash));
    if (!row || !valid)
      throw new ApiError(401, 'Email or password is incorrect.', 'INVALID_CREDENTIALS');
    await db.transaction(async (tx) => {
      const current = await tx.query<UserRow>('SELECT * FROM users WHERE id=$1 FOR UPDATE', [
        row.id,
      ]);
      if (!current.rows[0] || current.rows[0].password_hash !== row.password_hash)
        throw new ApiError(
          401,
          'Account credentials changed. Please sign in again.',
          'INVALID_CREDENTIALS',
        );
      await createSession(tx, row.id, res);
    });
    res.json({ user: publicUser(row) });
  });
  app.post('/api/auth/recover', async (req, res) => {
    const input = z
      .object({ email, recoveryCode: z.string().min(8).max(120), password })
      .strict()
      .parse(req.body);
    const result = await db.query<UserRow>('SELECT * FROM users WHERE email=$1 AND is_demo=FALSE', [
      input.email,
    ]);
    const row = result.rows[0];
    const valid = await verifySecret(
      normalizeRecoveryCode(input.recoveryCode),
      row?.recovery_hash ?? (await dummyHash),
    );
    if (!row || !valid)
      throw new ApiError(401, 'Email or recovery code is incorrect.', 'INVALID_RECOVERY_CODE');
    const recoveryCode = generateRecoveryCode();
    const [passwordHash, recoveryHash] = await Promise.all([
      hashSecret(input.password),
      hashSecret(normalizeRecoveryCode(recoveryCode)),
    ]);
    await db.transaction(async (tx) => {
      // Compare the old hash atomically so a recovery code is single use, including concurrent requests.
      const changed = await tx.query(
        'UPDATE users SET password_hash=$1,recovery_hash=$2 WHERE id=$3 AND recovery_hash=$4',
        [passwordHash, recoveryHash, row.id, row.recovery_hash],
      );
      if (!changed.rowCount)
        throw new ApiError(
          409,
          'This recovery code was already used. Use your latest recovery code.',
          'RECOVERY_CODE_USED',
        );
      await tx.query('DELETE FROM sessions WHERE user_id=$1', [row.id]);
      await addActivity(
        tx,
        row.id,
        'account.recovered',
        'Password changed with a recovery code; all sessions revoked.',
      );
    });
    clearSession(res);
    res.json({ ok: true, recoveryCode });
  });
  app.post('/api/auth/demo', limit('demo', 12, 60 * 60_000), async (req, res) => {
    z.object({})
      .strict()
      .parse(req.body ?? {});
    const id = randomUUID();
    const secretHash = await hashSecret(randomBytes(32).toString('hex'));
    const user: User = {
      id,
      name: 'Demo Explorer',
      email: `demo-${id}@example.invalid`,
      workspaceName: 'Fern & Flour',
      currency: 'USD',
      isDemo: true,
    };
    const supplier: Supplier = { ...DEMO_SUPPLIER, id: randomUUID(), createdAt: now() };
    const value = newCase(
      user,
      {
        title: 'A delivery that came up short',
        supplierName: supplier.name,
        invoiceReference: 'NF-1042',
        dueDate: new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10),
      },
      supplier,
    );
    value.documents = [
      { kind: 'invoice' as const, name: 'Northstar invoice NF-1042.txt', text: SAMPLE_INVOICE },
      { kind: 'delivery_note' as const, name: 'Delivery note NF-1042.txt', text: SAMPLE_DELIVERY },
      { kind: 'supplier_message' as const, name: 'Supplier message.txt', text: SAMPLE_MESSAGE },
    ].map((document) => ({
      ...document,
      id: randomUUID(),
      caseId: value.id,
      sha256: sha256(document.text),
      createdAt: now(),
    }));
    value.analysis = await analyze({
      documents: value.documents,
      supplier,
      currency: user.currency,
      isDemo: true,
    });
    value.status = 'review';
    await db.transaction(async (tx) => {
      await tx.query(
        'INSERT INTO users(id,email,name,workspace_name,currency,password_hash,recovery_hash,is_demo) VALUES($1,$2,$3,$4,$5,$6,$6,TRUE)',
        [id, user.email, user.name, user.workspaceName, user.currency, secretHash],
      );
      await tx.query('INSERT INTO suppliers(id,user_id,data,normalized_name) VALUES($1,$2,$3,$4)', [
        supplier.id,
        id,
        JSON.stringify(supplier),
        normalizeName(supplier.name),
      ]);
      await insertCase(tx, id, value);
      await addActivity(
        tx,
        id,
        'demo.created',
        'Isolated demo workspace created with fictional sample documents.',
      );
      await addActivity(
        tx,
        id,
        'analysis.completed',
        'Demo analysis identified two evidence-backed shortages totaling USD 216.00.',
        value,
      );
      await createSession(tx, id, res);
    });
    res.status(201).json({ user });
  });
  app.post('/api/auth/logout', async (req, res) => {
    const token = req.cookies?.[COOKIE_NAME];
    if (typeof token === 'string')
      await db.query('DELETE FROM sessions WHERE token_hash=$1', [sha256(token)]);
    clearSession(res);
    res.json({ ok: true });
  });
  app.use('/api', async (req, res, next) => {
    const user = await authenticate(db, req);
    if (!user) throw new ApiError(401, 'Sign in to continue.', 'UNAUTHENTICATED');
    res.locals.user = user;
    next();
  });
  app.use('/api', limit('workspace', 500, 5 * 60_000, true));
  app.get('/api/auth/me', (_req, res) => res.json({ user: authenticatedUser(res) }));

  app.get('/api/dashboard', async (_req, res) => {
    const user = authenticatedUser(res);
    const [cases, suppliers, activities] = await Promise.all([
      listCases(db, user.id, true),
      listSuppliers(db, user.id),
      listActivities(db, user.id, undefined, 12),
    ]);
    const active = cases.filter((value) => value.status !== 'dismissed');
    const dashboard: Dashboard = {
      cases,
      suppliers,
      activities,
      metrics: {
        identifiedCents: active.reduce((sum, value) => sum + identifiedAmount(value.analysis), 0),
        claimedCents: active.reduce((sum, value) => sum + value.claimedCents, 0),
        creditedCents: active.reduce((sum, value) => sum + value.creditedCents, 0),
        remainingCents: active.reduce((sum, value) => sum + value.remainingCents, 0),
        openCases: active.filter((value) => value.status !== 'resolved').length,
        resolvedCases: active.filter((value) => value.status === 'resolved').length,
        documentCount: cases.reduce((sum, value) => sum + value.documents.length, 0),
      },
      engine: engineStatus(),
    };
    res.json(dashboard);
  });
  app.get('/api/cases', async (_req, res) =>
    res.json({ cases: await listCases(db, authenticatedUser(res).id, true) }),
  );
  app.post('/api/cases', async (req, res) => {
    const input = createCaseSchema.parse(req.body);
    const user = authenticatedUser(res);
    const value = await db.transaction(async (tx) => {
      await tx.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [user.id]);
      const count = await tx.query<{ count: string }>(
        'SELECT COUNT(*) AS count FROM recovery_cases WHERE user_id=$1',
        [user.id],
      );
      if (Number(count.rows[0].count) >= 200)
        throw new ApiError(
          409,
          'This workspace has reached the 200-case limit. Export your data or contact the operator.',
          'CASE_LIMIT',
        );
      const supplier = await ensureSupplier(tx, user.id, input.supplierName);
      const value = newCase(user, input, supplier);
      await insertCase(tx, user.id, value);
      await addActivity(
        tx,
        user.id,
        'case.created',
        `Opened a recovery case for ${supplier.name}.`,
        value,
      );
      return value;
    });
    res.status(201).json({ case: value });
  });
  app.get('/api/cases/:id', async (req, res) => {
    const user = authenticatedUser(res);
    const id = param(req, 'id');
    const row = await caseRow(db, user.id, id);
    res.json({ case: row.data, activities: await listActivities(db, user.id, id) });
  });
  app.patch('/api/cases/:id', async (req, res) => {
    const input = casePatchSchema.parse(req.body);
    const user = authenticatedUser(res);
    const value = await db.transaction(async (tx) => {
      const row = await caseRow(tx, user.id, param(req, 'id'), true);
      const value = row.data;
      checkVersion(value, input.version);
      checkNotAnalyzing(row);
      if (value.status === 'resolved' || value.status === 'dismissed')
        throw new ApiError(
          409,
          'Closed cases are read-only. Create a new case for new evidence.',
          'CASE_CLOSED',
        );
      if (input.supplierName !== undefined || input.invoiceReference !== undefined) {
        if (!isEditable(value))
          throw new ApiError(
            409,
            'Invoice and supplier cannot change after claim approval.',
            'CLAIM_FINALIZED',
          );
        if (input.supplierName !== undefined && input.supplierName !== value.supplierName) {
          const supplier = await ensureSupplier(tx, user.id, input.supplierName);
          value.supplierName = supplier.name;
          value.supplierId = supplier.id;
          invalidateAnalysis(value);
        }
        if (
          input.invoiceReference !== undefined &&
          input.invoiceReference !== value.invoiceReference
        ) {
          value.invoiceReference = input.invoiceReference;
          invalidateAnalysis(value);
        }
      }
      if (input.title !== undefined) value.title = input.title;
      if (input.dueDate !== undefined) value.dueDate = input.dueDate;
      if (input.acceptedFindingIds !== undefined) {
        if (!isEditable(value) || !value.analysis)
          throw new ApiError(
            409,
            'Analyze this case before reviewing findings. Approved claims cannot be changed.',
            'REVIEW_REQUIRED',
          );
        const ids = new Set(input.acceptedFindingIds);
        if ([...ids].some((id) => !value.analysis!.findings.some((finding) => finding.id === id)))
          throw new ApiError(400, 'One or more finding IDs are unknown.', 'INVALID_FINDING');
        for (const finding of value.analysis.findings) {
          if (ids.has(finding.id) && (finding.needsReview || finding.confidence === 'low'))
            throw new ApiError(
              409,
              'Correct the evidence and analyze again before accepting a finding marked for review.',
              'UNVERIFIED_FINDING',
            );
          finding.accepted = ids.has(finding.id);
        }
        value.claimText = '';
        value.claimedCents = 0;
        value.creditedCents = 0;
        value.remainingCents = 0;
      }
      if (input.claimText !== undefined) {
        if (!['review', 'approved'].includes(value.status) || !value.analysis)
          throw new ApiError(
            409,
            'Claim wording can only be edited before it is marked sent.',
            'CLAIM_READ_ONLY',
          );
        value.claimText = input.claimText;
      }
      if (input.status !== undefined && input.status !== value.status) {
        if (
          input.status === 'sent' &&
          value.status === 'approved' &&
          value.claimText &&
          value.claimedCents > 0
        )
          value.status = 'sent';
        else if (input.status === 'dismissed' && isEditable(value)) {
          value.status = 'dismissed';
          value.claimedCents = 0;
          value.remainingCents = 0;
        } else
          throw new ApiError(
            409,
            'Use claim approval and credit verification to advance this case. This status transition is not allowed.',
            'INVALID_TRANSITION',
          );
      }
      await saveCase(tx, user.id, value);
      await addActivity(
        tx,
        user.id,
        input.status === 'sent'
          ? 'claim.sent'
          : input.status === 'dismissed'
            ? 'case.dismissed'
            : input.acceptedFindingIds
              ? 'findings.reviewed'
              : 'case.updated',
        input.status === 'sent'
          ? 'Owner recorded that the supplier review request was sent.'
          : input.acceptedFindingIds
            ? 'Owner reviewed which evidence-backed findings to include.'
            : 'Case details updated.',
        value,
      );
      return value;
    });
    res.json({ case: value });
  });
  app.post('/api/cases/:id/documents', async (req, res) => {
    const input = documentSchema.parse(req.body);
    const user = authenticatedUser(res);
    const result = await db.transaction(async (tx) => {
      const row = await caseRow(tx, user.id, param(req, 'id'), true);
      const value = row.data;
      checkNotAnalyzing(row);
      if (['resolved', 'dismissed'].includes(value.status))
        throw new ApiError(409, 'Closed cases are read-only.', 'CASE_CLOSED');
      if (isFinalized(value) && input.kind !== 'credit_note')
        throw new ApiError(
          409,
          'Only credit notes can be added after claim approval. Create a new case to revise claim evidence.',
          'CLAIM_FINALIZED',
        );
      const digest = sha256(input.text);
      const existing = value.documents.find((document) => document.sha256 === digest);
      if (existing) return { document: existing, case: value, duplicate: true };
      if (value.documents.length >= 12)
        throw new ApiError(409, 'A case can contain up to 12 documents.', 'DOCUMENT_LIMIT');
      const document: EvidenceDocument = {
        ...input,
        id: randomUUID(),
        caseId: value.id,
        sha256: digest,
        createdAt: now(),
      };
      value.documents.push(document);
      if (!isFinalized(value)) invalidateAnalysis(value);
      await saveCase(tx, user.id, value);
      await addActivity(
        tx,
        user.id,
        'document.added',
        `${input.name} added as ${input.kind.replace(/_/g, ' ')}.`,
        value,
      );
      return { document, case: value, duplicate: false };
    });
    res.status(result.duplicate ? 200 : 201).json(result);
  });
  app.delete('/api/cases/:id/documents/:documentId', async (req, res) => {
    const user = authenticatedUser(res);
    const value = await db.transaction(async (tx) => {
      const row = await caseRow(tx, user.id, param(req, 'id'), true);
      const value = row.data;
      checkNotAnalyzing(row);
      if (!isEditable(value))
        throw new ApiError(
          409,
          'Documents can only be removed before claim approval.',
          'CLAIM_FINALIZED',
        );
      const document = value.documents.find((document) => document.id === param(req, 'documentId'));
      if (!document) throw new ApiError(404, 'Document not found.', 'NOT_FOUND');
      value.documents = value.documents.filter((item) => item.id !== document.id);
      invalidateAnalysis(value);
      await saveCase(tx, user.id, value);
      await addActivity(
        tx,
        user.id,
        'document.removed',
        `${document.name} removed; analysis invalidated.`,
        value,
      );
      return value;
    });
    res.json({ case: value });
  });
  app.post('/api/cases/:id/analyze', limit('analysis', 30, 60 * 60_000, true), async (req, res) => {
    z.object({})
      .strict()
      .parse(req.body ?? {});
    const user = authenticatedUser(res);
    const id = param(req, 'id');
    const token = randomUUID();
    const prepared = await db.transaction(async (tx) => {
      const row = await caseRow(tx, user.id, id, true);
      const value = row.data;
      checkNotAnalyzing(row);
      if (['resolved', 'dismissed'].includes(value.status))
        throw new ApiError(409, 'Closed cases are read-only.', 'CASE_CLOSED');
      if (
        !value.documents.some((document) => document.kind === 'invoice') ||
        !value.documents.some((document) => document.kind === 'delivery_note')
      )
        throw new ApiError(
          422,
          'Add an invoice and a delivery note before running analysis.',
          'EVIDENCE_REQUIRED',
        );
      const supplier = await findSupplier(tx, user.id, value.supplierName);
      const sourceHash = analysisSourceHash(value.documents, supplier);
      if (value.analysis?.sourceHash === sourceHash) return { value, supplier, cached: true };
      await tx.query(
        'UPDATE recovery_cases SET analysis_token=$1,analysis_started_at=NOW() WHERE id=$2 AND user_id=$3',
        [token, id, user.id],
      );
      return { value, supplier, cached: false };
    });
    if (prepared.cached) {
      res.json({ case: prepared.value, cached: true });
      return;
    }
    try {
      const renewLease = async () => {
        const renewed = await db.query(
          'UPDATE recovery_cases SET analysis_started_at=NOW() WHERE id=$1 AND user_id=$2 AND analysis_token=$3 AND version=$4 RETURNING id',
          [id, user.id, token, prepared.value.version],
        );
        if (!renewed.rowCount)
          throw new ApiError(
            409,
            'This analysis no longer owns the case. Refresh and try again.',
            'ANALYSIS_STALE',
          );
      };
      let rememberedAliases: string[] = [];
      let memoryTraceId = '';
      let memoryWarning = '';
      if (!user.isDemo && prepared.value.supplierId && memory.configuration().enabled) {
        try {
          const reservation = await reserveMemoryOperation(db);
          const recalled = await memory.recall({
            workspaceId: user.id,
            supplierId: prepared.value.supplierId,
            beforeRequest: async () => {
              await renewLease();
              await reservation();
            },
          });
          rememberedAliases = recalled.aliases;
          memoryTraceId = recalled.traceId;
        } catch (error) {
          memoryWarning =
            error instanceof MemoryError
              ? error.message
              : 'Optional remote memory was unavailable. Local supplier memory was used.';
        }
      }
      const analysis = await analyze({
        documents: prepared.value.documents,
        supplier: prepared.supplier,
        currency: user.currency,
        isDemo: user.isDemo,
        previousAnalysis: prepared.value.analysis ?? undefined,
        invoiceReference: prepared.value.invoiceReference,
        rememberedAliases,
        memoryTraceId,
        beforeProviderRequest: async () => {
          await renewLease();
          await reserveAiCall(db, user.id);
        },
      });
      if (memoryWarning) analysis.warnings.push(memoryWarning);
      const value = await db.transaction(async (tx) => {
        const row = await caseRow(tx, user.id, id, true);
        const value = row.data;
        if (row.analysis_token !== token || value.version !== prepared.value.version)
          throw new ApiError(
            409,
            'Case evidence changed while analysis was running. Please analyze again.',
            'ANALYSIS_STALE',
          );
        if (analysis.currency !== user.currency)
          throw new ApiError(
            422,
            'The analysis currency does not match the workspace. Review the invoice currency.',
            'CURRENCY_MISMATCH',
          );
        if (isFinalized(value)) {
          // Approval freezes the claim. A later extraction reconciles new credit notes without rewriting it.
          const verified = value.analysis?.credits.filter((credit) => credit.verified) ?? [];
          analysis.findings = value.analysis!.findings;
          analysis.invoiceReference = value.invoiceReference;
          analysis.credits = [
            ...verified,
            ...analysis.credits
              .filter(
                (credit) =>
                  !verified.some(
                    (old) =>
                      old.documentId === credit.documentId ||
                      normalizeName(old.reference) === normalizeName(credit.reference),
                  ),
              )
              .map((credit) => ({ ...credit, verified: false })),
          ];
        } else {
          // Preserve explicit acceptance decisions where grounded finding identifiers have stayed stable.
          const decisions = new Map(
            value.analysis?.findings.map((finding) => [finding.id, finding.accepted]) ?? [],
          );
          analysis.findings = analysis.findings.map((finding) => ({
            ...finding,
            accepted:
              !finding.needsReview &&
              finding.confidence !== 'low' &&
              (decisions.get(finding.id) ?? finding.accepted),
          }));
          analysis.credits = analysis.credits.map((credit) => ({ ...credit, verified: false }));
          value.status = 'review';
          value.invoiceReference = analysis.invoiceReference || value.invoiceReference;
          value.claimText = '';
          value.claimedCents = 0;
          value.creditedCents = 0;
          value.remainingCents = 0;
        }
        value.analysis = analysis;
        await saveCase(tx, user.id, value);
        await tx.query(
          'UPDATE recovery_cases SET analysis_token=NULL,analysis_started_at=NULL WHERE id=$1 AND user_id=$2',
          [id, user.id],
        );
        await addActivity(
          tx,
          user.id,
          'analysis.completed',
          `${analysis.provider === 'demo' ? 'Fictional demo' : analysis.provider} analysis completed: ${analysis.findings.length} findings, ${analysis.credits.length} credit notes. Trace ${analysis.traceId}.`,
          value,
        );
        return value;
      });
      res.json({ case: value });
    } catch (error) {
      await db.query(
        'UPDATE recovery_cases SET analysis_token=NULL,analysis_started_at=NULL WHERE id=$1 AND user_id=$2 AND analysis_token=$3',
        [id, user.id, token],
      );
      throw error;
    }
  });
  app.post('/api/cases/:id/claim', async (req, res) => {
    z.object({})
      .strict()
      .parse(req.body ?? {});
    const user = authenticatedUser(res);
    let newlyApproved = false;
    const value = await db.transaction(async (tx) => {
      const row = await caseRow(tx, user.id, param(req, 'id'), true);
      const value = row.data;
      checkNotAnalyzing(row);
      if (isFinalized(value)) return value;
      if (value.status !== 'review' || !value.analysis)
        throw new ApiError(
          409,
          'Analyze the case and review the findings before approving a claim.',
          'REVIEW_REQUIRED',
        );
      const supplier = await findSupplier(tx, user.id, value.supplierName);
      if (analysisSourceHash(value.documents, supplier) !== value.analysis.sourceHash)
        throw new ApiError(
          409,
          'Evidence or supplier memory changed. Analyze again before approving.',
          'ANALYSIS_STALE',
        );
      const amount = selectedAmount(value.analysis);
      if (!Number.isSafeInteger(amount) || amount <= 0)
        throw new ApiError(
          422,
          'Select at least one verified finding before approving a claim.',
          'EMPTY_CLAIM',
        );
      // buildClaim independently rejects ungrounded findings, so API clients cannot bypass evidence review.
      const generated = buildClaim(value, user.workspaceName);
      value.claimText = generated;
      value.claimedCents = amount;
      value.creditedCents = 0;
      value.remainingCents = amount;
      value.status = 'approved';
      await saveCase(tx, user.id, value);
      newlyApproved = true;
      await addActivity(
        tx,
        user.id,
        'claim.approved',
        `Owner approved a ${value.currency} ${(amount / 100).toFixed(2)} supplier review request. Nothing was sent automatically.`,
        value,
      );
      return value;
    });
    if (newlyApproved && !user.isDemo) {
      try {
        await rememberApprovedCase(db, memory, user.id, value);
      } catch {
        console.warn(
          'Optional supplier memory audit was unavailable; approved claim remains saved.',
        );
      }
    }
    res.json({ case: value });
  });
  app.post('/api/cases/:id/credits/verify', async (req, res) => {
    const input = z
      .object({ documentId: z.string().min(1).max(120), version })
      .strict()
      .parse(req.body);
    const user = authenticatedUser(res);
    const value = await db.transaction(async (tx) => {
      const row = await caseRow(tx, user.id, param(req, 'id'), true);
      const value = row.data;
      checkVersion(value, input.version);
      checkNotAnalyzing(row);
      if (
        !['approved', 'sent', 'partial'].includes(value.status) ||
        !value.analysis ||
        value.claimedCents <= 0
      )
        throw new ApiError(
          409,
          'Approve a claim before verifying supplier credits.',
          'CLAIM_REQUIRED',
        );
      const supplier = await findSupplier(tx, user.id, value.supplierName);
      if (analysisSourceHash(value.documents, supplier) !== value.analysis.sourceHash)
        throw new ApiError(
          409,
          'Analyze the new credit note before verifying it.',
          'ANALYSIS_STALE',
        );
      const matches = value.analysis.credits.filter(
        (credit) => credit.documentId === input.documentId,
      );
      if (matches.length !== 1)
        throw new ApiError(
          422,
          'This document does not have one unambiguous credit match. Review its source text and analyze again.',
          'CREDIT_AMBIGUOUS',
        );
      const match = matches[0];
      if (match.verified)
        throw new ApiError(409, 'This credit note has already been verified.', 'DUPLICATE_CREDIT');
      const verified = verifyCreditMatch(match, value);
      if (
        !Number.isSafeInteger(verified.amountCents) ||
        verified.amountCents <= 0 ||
        verified.amountCents > value.remainingCents
      )
        throw new ApiError(
          422,
          'This credit exceeds the remaining claim or has an invalid amount.',
          'CREDIT_AMOUNT',
        );
      const creditDocument = value.documents.find(
        (document) => document.id === verified.documentId,
      )!;
      // A database uniqueness constraint prevents the same note being counted in two cases,
      // including simultaneous verification requests on separate application instances.
      const ledger = await tx.query(
        'INSERT INTO verified_credits(id,user_id,case_id,supplier_key,reference_key,document_sha,amount_cents) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING RETURNING id',
        [
          randomUUID(),
          user.id,
          value.id,
          creditSourceSupplierKey(verified, value),
          verified.reference.toLowerCase().replace(/[^a-z0-9]/g, ''),
          creditDocument.sha256,
          verified.amountCents,
        ],
      );
      if (!ledger.rowCount)
        throw new ApiError(
          409,
          'This supplier credit has already been verified in this workspace. A credit can only be counted once, even across different cases.',
          'DUPLICATE_CREDIT',
        );
      value.analysis.credits = value.analysis.credits.map((credit) =>
        credit === match ? verified : credit,
      );
      value.creditedCents = value.analysis.credits
        .filter((credit) => credit.verified)
        .reduce((sum, credit) => sum + credit.amountCents, 0);
      value.remainingCents = value.claimedCents - value.creditedCents;
      value.status = value.remainingCents === 0 ? 'resolved' : 'partial';
      await saveCase(tx, user.id, value);
      await addActivity(
        tx,
        user.id,
        'credit.verified',
        `Verified ${match.reference} for ${value.currency} ${(match.amountCents / 100).toFixed(2)}. Remaining claim: ${(value.remainingCents / 100).toFixed(2)}.`,
        value,
      );
      return value;
    });
    res.json({ case: value });
  });
  app.get('/api/cases/:id/export', async (req, res) => {
    const format = z.enum(['json', 'csv', 'eml', 'pdf']).parse(req.query.format ?? 'pdf');
    const user = authenticatedUser(res);
    const value = (await caseRow(db, user.id, param(req, 'id'))).data;
    const fileName = `remainder-${(value.invoiceReference || value.id).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80)}.${format}`;
    res.attachment(fileName);
    if (format === 'json')
      res.type('application/json').send(
        JSON.stringify(
          {
            schemaVersion: 1,
            exportedAt: now(),
            workspace: user.workspaceName,
            isDemo: user.isDemo,
            case: value,
            activities: await listActivities(db, user.id, value.id, null),
          },
          null,
          2,
        ),
      );
    if (format === 'csv') res.type('text/csv; charset=utf-8').send(caseCsv(value));
    if (format === 'eml') res.type('message/rfc822').send(caseEmail(value, user));
    if (format === 'pdf') res.type('application/pdf').send(await casePdf(value, user));
  });
  app.get('/api/suppliers', async (_req, res) =>
    res.json({ suppliers: await listSuppliers(db, authenticatedUser(res).id) }),
  );
  app.post('/api/suppliers', async (req, res) => {
    const input = supplierSchema.parse(req.body);
    const user = authenticatedUser(res);
    const supplier = await db.transaction(async (tx) => {
      await tx.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [user.id]);
      const suppliers = await listSuppliers(tx, user.id);
      if (suppliers.length >= 200)
        throw new ApiError(
          409,
          'This workspace has reached the 200-supplier limit.',
          'SUPPLIER_LIMIT',
        );
      if (suppliers.some((item) => normalizeName(item.name) === normalizeName(input.name)))
        throw new ApiError(409, 'A supplier with this name already exists.', 'SUPPLIER_EXISTS');
      const supplier: Supplier = {
        id: randomUUID(),
        name: input.name,
        email: input.email ?? '',
        aliases: [...new Set(input.aliases ?? [])],
        notes: input.notes ?? '',
        createdAt: now(),
      };
      await tx.query('INSERT INTO suppliers(id,user_id,data,normalized_name) VALUES($1,$2,$3,$4)', [
        supplier.id,
        user.id,
        JSON.stringify(supplier),
        normalizeName(supplier.name),
      ]);
      await addActivity(
        tx,
        user.id,
        'supplier.created',
        `${supplier.name} added to supplier memory.`,
      );
      return supplier;
    });
    res.status(201).json({ supplier });
  });
  app.patch('/api/suppliers/:id', async (req, res) => {
    const input = supplierSchema.partial().parse(req.body);
    const user = authenticatedUser(res);
    const supplier = await db.transaction(async (tx) => {
      const found = await tx.query<{ data: Supplier }>(
        'SELECT data FROM suppliers WHERE id=$1 AND user_id=$2 FOR UPDATE',
        [param(req, 'id'), user.id],
      );
      if (!found.rows[0]) throw new ApiError(404, 'Supplier not found.', 'NOT_FOUND');
      const existing = found.rows[0].data;
      const supplier = { ...existing, ...input };
      supplier.aliases = [...new Set(supplier.aliases)];
      if (
        normalizeName(supplier.name) !== normalizeName(existing.name) &&
        !supplier.aliases.includes(existing.name)
      )
        supplier.aliases.push(existing.name);
      const conflict = await tx.query(
        'SELECT id FROM suppliers WHERE user_id=$1 AND normalized_name=$2 AND id<>$3',
        [user.id, normalizeName(supplier.name), supplier.id],
      );
      if (conflict.rowCount)
        throw new ApiError(409, 'A supplier with this name already exists.', 'SUPPLIER_EXISTS');
      await tx.query('UPDATE suppliers SET data=$1,normalized_name=$2 WHERE id=$3 AND user_id=$4', [
        JSON.stringify(supplier),
        normalizeName(supplier.name),
        supplier.id,
        user.id,
      ]);
      await addActivity(
        tx,
        user.id,
        'supplier.updated',
        `${supplier.name} supplier memory updated. Reanalyze open cases to apply it.`,
      );
      return supplier;
    });
    res.json({ supplier });
  });
  app.get('/api/activity', async (_req, res) =>
    res.json({ activities: await listActivities(db, authenticatedUser(res).id) }),
  );
  app.get('/api/settings', (_req, res) =>
    res.json({ user: authenticatedUser(res), engine: engineStatus() }),
  );
  app.patch('/api/settings', async (req, res) => {
    const input = z
      .object({ workspaceName: name.optional(), name: name.optional() })
      .strict()
      .parse(req.body);
    const user = authenticatedUser(res);
    const result = await db.transaction(async (tx) => {
      const rows = await tx.query<UserRow>(
        'UPDATE users SET name=COALESCE($1,name),workspace_name=COALESCE($2,workspace_name) WHERE id=$3 RETURNING *',
        [input.name ?? null, input.workspaceName ?? null, user.id],
      );
      await addActivity(tx, user.id, 'workspace.updated', 'Workspace settings updated.');
      return rows.rows[0];
    });
    res.json({ user: publicUser(result) });
  });
  app.get('/api/metrics', async (_req, res) => {
    const user = authenticatedUser(res);
    const [cases, suppliers, usage] = await Promise.all([
      listCases(db, user.id, true),
      listSuppliers(db, user.id),
      db.query<{ action: string; count: string }>(
        'SELECT action,COUNT(*) AS count FROM activities WHERE user_id=$1 GROUP BY action',
        [user.id],
      ),
    ]);
    const actions = Object.fromEntries(usage.rows.map((row) => [row.action, Number(row.count)]));
    res.json({
      scope: 'current_workspace',
      isDemo: user.isDemo,
      measuredAt: now(),
      caseCount: cases.length,
      documentCount: cases.reduce((sum, value) => sum + value.documents.length, 0),
      supplierCount: suppliers.length,
      analysisCount: actions['analysis.completed'] ?? 0,
      claimsApproved: actions['claim.approved'] ?? 0,
      creditsVerified: actions['credit.verified'] ?? 0,
      verifiedCreditCents: cases.reduce((sum, value) => sum + value.creditedCents, 0),
      currency: user.currency,
    });
  });
  app.get('/api/export', async (_req, res) => {
    const user = authenticatedUser(res);
    // Repeatable snapshot for a complete export, including all audit records (not the UI's recent limit).
    const data = await db.transaction(async (tx) => {
      await tx.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
      const [cases, suppliers, activities] = await Promise.all([
        listCases(tx, user.id),
        listSuppliers(tx, user.id),
        listActivities(tx, user.id, undefined, null),
      ]);
      return { schemaVersion: 1, exportedAt: now(), user, cases, suppliers, activities };
    });
    res
      .attachment('remainder-workspace.json')
      .type('application/json')
      .send(JSON.stringify(data, null, 2));
  });
  app.delete('/api/account', async (req, res) => {
    const input = z
      .object({ password: z.string().min(1).max(128) })
      .strict()
      .parse(req.body);
    const row = userRow(res);
    if (row.is_demo)
      throw new ApiError(
        409,
        'Demo workspaces expire automatically after seven days. Sign out to leave this demo.',
        'DEMO_ACCOUNT',
      );
    if (!(await verifySecret(input.password, row.password_hash)))
      throw new ApiError(401, 'Password is incorrect.', 'INVALID_CREDENTIALS');
    await db.transaction(async (tx) => {
      const current = await tx.query<UserRow & { memory_cleanup_required: boolean }>(
        'SELECT * FROM users WHERE id=$1 FOR UPDATE',
        [row.id],
      );
      if (!current.rows[0] || current.rows[0].password_hash !== row.password_hash)
        throw new ApiError(
          409,
          'The account changed. Sign in again before deleting it.',
          'ACCOUNT_CHANGED',
        );
      if (current.rows[0].memory_cleanup_required) {
        try {
          await memory.forget({ workspaceId: row.id, force: true });
        } catch {
          throw new ApiError(
            503,
            'Remote supplier memory could not be removed. Your local account has been kept so cleanup can be retried. Please try again later or contact the operator.',
            'MEMORY_CLEANUP_FAILED',
          );
        }
      }
      await tx.query('DELETE FROM users WHERE id=$1', [row.id]);
    });
    clearSession(res);
    res.json({ ok: true });
  });
  app.use('/api', (_req, _res, next) =>
    next(new ApiError(404, 'API endpoint not found.', 'NOT_FOUND')),
  );
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (res.headersSent) return;
    if (error instanceof ZodError) {
      res.status(400).json({
        error: error.issues
          .map((issue) => `${issue.path.join('.') || 'Request'}: ${issue.message}`)
          .join(' ')
          .slice(0, 1500),
        code: 'VALIDATION_ERROR',
      });
      return;
    }
    if (error instanceof ApiError || error instanceof EngineError) {
      if (error.code === 'AI_DAILY_BUDGET') {
        const tomorrow = new Date();
        tomorrow.setUTCHours(24, 0, 0, 0);
        res.set(
          'Retry-After',
          String(Math.max(1, Math.ceil((tomorrow.getTime() - Date.now()) / 1000))),
        );
      }
      res.status(error.status).json({ error: error.message, code: error.code });
      return;
    }
    const typed = error as { type?: string; status?: number; code?: string; message?: string };
    if (typed.type === 'entity.too.large') {
      res.status(413).json({
        error:
          'Request is too large. Add documents one at a time, with at most 40,000 characters each.',
        code: 'BODY_TOO_LARGE',
      });
      return;
    }
    if (typed.type === 'entity.parse.failed') {
      res.status(400).json({ error: 'Request body must be valid JSON.', code: 'INVALID_JSON' });
      return;
    }
    if (typed.code === '23505') {
      res
        .status(409)
        .json({ error: 'A record with these details already exists.', code: 'CONFLICT' });
      return;
    }
    // Do not include request bodies, document contents, tokens, SQL, or provider payloads in logs.
    console.error(
      'Request failed:',
      error instanceof Error ? error.name : 'UnknownError',
      typed.code ?? 'INTERNAL_ERROR',
    );
    res.status(500).json({
      error: 'The request could not be completed. Please try again.',
      code: 'INTERNAL_ERROR',
    });
  });
  return app;
}

export async function cleanupExpiredData(db: Database) {
  await db.transaction(async (tx: Queryable) => {
    await tx.query('DELETE FROM sessions WHERE expires_at <= NOW()');
    await tx.query('DELETE FROM rate_limits WHERE expires_at <= NOW()');
    await tx.query(
      "DELETE FROM users WHERE is_demo=TRUE AND created_at < NOW() - INTERVAL '7 days'",
    );
  });
}
