import { randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { db } from './db.ts';
import type { UserRow } from './db.ts';
import { readCookie, unauthorized } from './http.ts';
import type { Req, Res } from './http.ts';
import { clearCookie, setCookie } from './http.ts';

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/**
 * Passwords and sessions.
 *
 * Real security, not a placeholder — using only `node:crypto`, which is built in.
 * Password hashing libraries are the usual answer, but scrypt is in the standard
 * library, is a genuine memory-hard algorithm, and adds no dependency to audit.
 */

export const SESSION_COOKIE = 'motion_session';
const SESSION_DAYS = 30;

/**
 * scrypt parameters.
 *
 * N is the work factor: 2^16 takes roughly a tenth of a second per hash here. That is
 * unnoticeable when one person logs in, and brutally expensive for someone trying
 * millions of guesses against a stolen database. maxmem has to be raised because
 * Node's default is below what these parameters need.
 */
const SCRYPT = { N: 65536, r: 8, p: 1, maxmem: 128 * 65536 * 8 * 2 };
const KEY_LENGTH = 64;

/* ---------- passwords ---------- */

export const hashPassword = async (
  password: string,
): Promise<{ hash: string; salt: string }> => {
  // A per-user random salt means two people with the same password get different
  // hashes, so one cracked password never reveals another.
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, KEY_LENGTH, SCRYPT);
  return { hash: hash.toString('hex'), salt: salt.toString('hex') };
};

export const verifyPassword = async (
  password: string,
  hashHex: string,
  saltHex: string,
): Promise<boolean> => {
  try {
    const expected = Buffer.from(hashHex, 'hex');
    const actual = await scryptAsync(
      password,
      Buffer.from(saltHex, 'hex'),
      expected.length,
      SCRYPT,
    );
    // A plain === comparison returns faster when the first bytes differ, which leaks
    // how much of a guess was right. This one always takes the same time.
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
};

/* ---------- sessions ---------- */

export const createSession = (userId: string, res: Res): string => {
  // 32 random bytes is far beyond guessable. randomBytes is cryptographically secure;
  // Math.random would not be, and is how session tokens get predicted.
  const token = randomBytes(32).toString('hex');
  const now = Date.now();
  const expiresAt = now + SESSION_DAYS * 24 * 60 * 60 * 1000;

  db.prepare(
    'INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
  ).run(token, userId, now, expiresAt);

  setCookie(res, SESSION_COOKIE, token, {
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    httpOnly: true,
    sameSite: 'Lax',
    secure: process.env.NODE_ENV === 'production',
  });

  return token;
};

export const destroySession = (req: Req, res: Res): void => {
  const token = readCookie(req, SESSION_COOKIE);
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  clearCookie(res, SESSION_COOKIE);
};

/** The signed-in user, or null. Used where being signed out is a valid state. */
export const currentUser = (req: Req): UserRow | null => {
  const token = readCookie(req, SESSION_COOKIE);
  if (!token) return null;

  const row = db
    .prepare(
      `SELECT u.* FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > ?`,
    )
    .get(token, Date.now()) as UserRow | undefined;

  return row ?? null;
};

/** The signed-in user, or a 401. Used to guard anything that touches their data. */
export const requireUser = (req: Req): UserRow => {
  const user = currentUser(req);
  if (!user) throw unauthorized();
  return user;
};

/* ---------- shapes sent to the browser ---------- */

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  plan: string;
};

/**
 * Strip a user row down to what the browser is allowed to see.
 *
 * Password hash and salt must never leave this process. Doing the filtering in one
 * named function — rather than remembering at every call site — is what makes that
 * reliable.
 */
export const toPublicUser = (row: UserRow): PublicUser => ({
  id: row.id,
  email: row.email,
  name: row.name,
  plan: row.plan,
});

export const newId = (): string => randomUUID();
