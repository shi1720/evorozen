import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

export interface Queryable {
  query<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: T[]; rowCount: number }>;
}
export interface Database extends Queryable {
  transaction<T>(work: (tx: Queryable) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

const schema = `
CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS users (
 id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
 workspace_name TEXT NOT NULL, currency TEXT NOT NULL CHECK (currency IN ('USD','INR','GBP','EUR')),
 password_hash TEXT NOT NULL, recovery_hash TEXT NOT NULL, is_demo BOOLEAN NOT NULL DEFAULT FALSE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS memory_cleanup_required BOOLEAN NOT NULL DEFAULT FALSE;
CREATE TABLE IF NOT EXISTS sessions (
 token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);
CREATE TABLE IF NOT EXISTS suppliers (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 data JSONB NOT NULL, normalized_name TEXT NOT NULL,
 UNIQUE(user_id, normalized_name)
);
CREATE INDEX IF NOT EXISTS suppliers_user_idx ON suppliers(user_id);
CREATE TABLE IF NOT EXISTS recovery_cases (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 data JSONB NOT NULL, version INTEGER NOT NULL DEFAULT 1,
 analysis_token TEXT, analysis_started_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS cases_user_idx ON recovery_cases(user_id, updated_at DESC);
CREATE TABLE IF NOT EXISTS verified_credits (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 case_id TEXT NOT NULL REFERENCES recovery_cases(id) ON DELETE CASCADE,
 supplier_key TEXT NOT NULL, reference_key TEXT NOT NULL, document_sha TEXT NOT NULL,
 amount_cents BIGINT NOT NULL CHECK (amount_cents > 0), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(user_id,supplier_key,reference_key), UNIQUE(user_id,document_sha)
);
CREATE INDEX IF NOT EXISTS verified_credits_case_idx ON verified_credits(user_id,case_id);
CREATE TABLE IF NOT EXISTS activities (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 case_id TEXT, case_title TEXT, action TEXT NOT NULL, detail TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS activities_user_idx ON activities(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS rate_limits (
 bucket TEXT PRIMARY KEY, hits INTEGER NOT NULL, expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS rate_limits_expiry_idx ON rate_limits(expires_at);
INSERT INTO schema_migrations(version) VALUES(1),(2),(3) ON CONFLICT DO NOTHING;
`;

export async function createDatabase(
  options: { url?: string; dataDir?: string; memory?: boolean } = {},
): Promise<Database> {
  // Explicit test/local options must never connect to an inherited production database.
  const url = options.memory
    ? undefined
    : (options.url ?? (options.dataDir ? undefined : process.env.DATABASE_URL));
  let db: Database;
  if (url) {
    const pool = new pg.Pool({
      connectionString: url,
      max: Number(process.env.DB_POOL_SIZE || 5),
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
      // The connection URL controls TLS (e.g. sslmode=require); certificates are never disabled here.
    });
    pool.on('error', (error) => console.error('Database pool error:', error.message));
    const wrap = (client: pg.Pool | pg.PoolClient): Queryable => ({
      async query<T>(sql: string, params: unknown[] = []) {
        const result = await client.query(sql, params);
        return { rows: result.rows as T[], rowCount: result.rowCount ?? result.rows.length };
      },
    });
    db = {
      ...wrap(pool),
      async transaction<T>(work: (tx: Queryable) => Promise<T>) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const result = await work(wrap(client));
          await client.query('COMMIT');
          return result;
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      },
      close: () => pool.end(),
    };
  } else {
    if (
      process.env.NODE_ENV === 'production' &&
      !options.memory &&
      (process.env.ALLOW_LOCAL_DATABASE !== '1' || !(options.dataDir ?? process.env.DATA_DIR))
    ) {
      throw new Error(
        'Production requires DATABASE_URL for durable Postgres storage. For a persistent-volume deployment, explicitly set ALLOW_LOCAL_DATABASE=1 and DATA_DIR.',
      );
    }
    const dataDir = options.memory
      ? undefined
      : (options.dataDir ?? process.env.DATA_DIR ?? path.resolve('.data/remainder'));
    if (dataDir) await mkdir(dataDir, { recursive: true, mode: 0o700 });
    const local = new PGlite(dataDir);
    await local.waitReady;
    const wrap = (client: Pick<PGlite, 'query'>): Queryable => ({
      async query<T>(sql: string, params: unknown[] = []) {
        const result = await client.query<T>(sql, params);
        return { rows: result.rows, rowCount: result.affectedRows ?? result.rows.length };
      },
    });
    db = {
      ...wrap(local),
      transaction: (work) => local.transaction((tx) => work(wrap(tx as Pick<PGlite, 'query'>))),
      close: () => local.close(),
    };
  }
  // Fixed, versioned application SQL only. Never interpolate input into SQL statements.
  await db.transaction(async (tx) => {
    if (url) await tx.query('SELECT pg_advisory_xact_lock(739182640)');
    // PGlite cannot prepare multiple statements; execute migration statements separately.
    for (const statement of schema.split(';').filter((value) => value.trim()))
      await tx.query(statement);
  });
  return db;
}
