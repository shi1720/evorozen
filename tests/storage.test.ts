import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { expect, it } from 'vitest';
import { createDatabase, type Database } from '../src/server/db';
import { reserveAiCall } from '../src/server/budget';

it('persists committed data across local restarts and rolls back failed transactions', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'remainder-storage-'));
  let db: Database | undefined;
  try {
    db = await createDatabase({ dataDir: directory });
    await db.query(
      "INSERT INTO users(id,email,name,workspace_name,currency,password_hash,recovery_hash) VALUES('persistent-owner','persistence@example.com','Owner','Cafe','USD','unused-hash','unused-hash')",
    );
    await expect(
      db.transaction(async (tx) => {
        await tx.query(
          "UPDATE users SET workspace_name='Incomplete update' WHERE id='persistent-owner'",
        );
        throw new Error('Simulated interrupted operation');
      }),
    ).rejects.toThrow('Simulated interrupted operation');
    await db.close();
    db = await createDatabase({ dataDir: directory });
    const row = (
      await db.query<{ workspace_name: string }>(
        "SELECT workspace_name FROM users WHERE id='persistent-owner'",
      )
    ).rows[0];
    expect(row.workspace_name).toBe('Cafe');
    expect((await db.query('SELECT version FROM schema_migrations')).rows).toHaveLength(3);
  } finally {
    await db?.close();
    await rm(directory, { recursive: true, force: true });
  }
}, 30_000);

it('atomically enforces shared and workspace AI budgets across concurrent requests', async () => {
  const db = await createDatabase({ memory: true });
  try {
    const attempts = await Promise.allSettled(
      ['first', 'first', 'first', 'second', 'second'].map((id) =>
        reserveAiCall(db, id, { global: 3, user: 2 }),
      ),
    );
    expect(attempts.filter((result) => result.status === 'fulfilled')).toHaveLength(3);
    expect(attempts.filter((result) => result.status === 'rejected')).toHaveLength(2);
    for (const result of attempts)
      if (result.status === 'rejected') expect(result.reason.code).toBe('AI_DAILY_BUDGET');
    expect(
      (
        await db.query<{ hits: number }>('SELECT hits FROM rate_limits ORDER BY hits DESC')
      ).rows.map((row) => row.hits),
    ).toEqual([3, 2, 1]);
  } finally {
    await db.close();
  }
});
