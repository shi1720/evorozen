import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import type { CookieOptions, Request, Response } from 'express';
import type { Queryable } from './db';
import type { User } from '../shared/types';

// Firebase Hosting forwards only this cookie to a Cloud Run rewrite.
export const COOKIE_NAME = '__session';
const SESSION_DAYS = 7;
// OWASP's 32 MiB configuration balances memory use on small hosts with offline-attack cost.
// https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#scrypt
const SCRYPT_COST = 32_768;
const SCRYPT_PARALLELISM = 3;
export type UserRow = {
  id: string;
  email: string;
  name: string;
  workspace_name: string;
  currency: User['currency'];
  is_demo: boolean;
  password_hash: string;
  recovery_hash: string;
};
export const publicUser = (row: UserRow): User => ({
  id: row.id,
  email: row.email,
  name: row.name,
  workspaceName: row.workspace_name,
  currency: row.currency,
  isDemo: row.is_demo,
});
export const sha256 = (text: string): string => createHash('sha256').update(text).digest('hex');
const derive = (
  value: string,
  salt: string,
  cost = SCRYPT_COST,
  parallelism = SCRYPT_PARALLELISM,
): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scryptCallback(
      value,
      salt,
      64,
      { N: cost, r: 8, p: parallelism, maxmem: 64 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
export async function hashSecret(value: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${SCRYPT_COST}$8$${SCRYPT_PARALLELISM}$${salt}$${(await derive(value, salt)).toString('hex')}`;
}
export async function verifySecret(value: string, encoded: string): Promise<boolean> {
  const parts = encoded.split('$');
  // Read the initial local-development format as well; all new records are self-describing.
  const legacy = parts.length === 3;
  const [algorithm, costText, blockText, parallelText, saltText, keyText] = parts;
  const cost = legacy ? 16_384 : Number(costText);
  const parallelism = legacy ? 1 : Number(parallelText);
  const salt = legacy ? parts[1] : saltText;
  const key = legacy ? parts[2] : keyText;
  if (
    algorithm !== 'scrypt' ||
    (!legacy && (parts.length !== 6 || blockText !== '8')) ||
    ![16_384, 32_768].includes(cost) ||
    ![1, 3].includes(parallelism) ||
    !/^[a-f0-9]{32}$/.test(salt ?? '') ||
    !/^[a-f0-9]{128}$/.test(key ?? '')
  )
    return false;
  const actual = await derive(value, salt, cost, parallelism);
  const expected = Buffer.from(key, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export const generateRecoveryCode = (): string =>
  randomBytes(20)
    .toString('hex')
    .match(/.{1,5}/g)!
    .join('-');
export const normalizeRecoveryCode = (value: string): string =>
  value.toLowerCase().replace(/[\s-]/g, '');
export function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DAYS * 86_400_000,
  };
}
export async function createSession(
  tx: Queryable,
  userId: string,
  response: Response,
): Promise<void> {
  const token = randomBytes(32).toString('hex');
  await tx.query('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,$3)', [
    sha256(token),
    userId,
    new Date(Date.now() + SESSION_DAYS * 86_400_000),
  ]);
  response.cookie(COOKIE_NAME, token, cookieOptions());
}
export function clearSession(response: Response) {
  const { maxAge: _maxAge, ...options } = cookieOptions();
  response.clearCookie(COOKIE_NAME, options);
}
export async function authenticate(tx: Queryable, request: Request): Promise<UserRow | null> {
  const token = request.cookies?.[COOKIE_NAME];
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return null;
  const result = await tx.query<UserRow>(
    'SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token_hash=$1 AND s.expires_at > NOW()',
    [sha256(token)],
  );
  return result.rows[0] ?? null;
}
