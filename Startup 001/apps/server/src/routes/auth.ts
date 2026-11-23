import { db } from '../db.ts';
import type { UserRow } from '../db.ts';
import { badRequest, conflict, readJson, sendJson, unauthorized } from '../http.ts';
import type { Req, Res } from '../http.ts';
import {
  createSession,
  currentUser,
  destroySession,
  hashPassword,
  newId,
  requireUser,
  toPublicUser,
  verifyPassword,
} from '../session.ts';

/**
 * Accounts.
 *
 * Replaces the placeholder that lived in the browser. Same screens, same shapes — the
 * difference is that a session is now a row in the database with a hashed password
 * behind it, rather than a note the browser left for itself.
 */

type Credentials = {
  email?: unknown;
  password?: unknown;
  name?: unknown;
};

export const signup = async (req: Req, res: Res): Promise<void> => {
  const body = await readJson<Credentials>(req);
  const email = normaliseEmail(body.email);
  const password = asPassword(body.password);
  const name = asName(body.name) ?? nameFromEmail(email);

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    throw conflict('An account with that email already exists.');
  }

  const { hash, salt } = await hashPassword(password);
  const id = newId();

  db.prepare(
    `INSERT INTO users (id, email, name, plan, password_hash, password_salt, created_at)
     VALUES (?, ?, ?, 'free', ?, ?, ?)`,
  ).run(id, email, name, hash, salt, Date.now());

  createSession(id, res);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow;
  sendJson(res, 201, { user: toPublicUser(user) });
};

export const login = async (req: Req, res: Res): Promise<void> => {
  const body = await readJson<Credentials>(req);
  const email = normaliseEmail(body.email);
  const password = typeof body.password === 'string' ? body.password : '';

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as
    | UserRow
    | undefined;

  // Deliberately the same message whether the email is unknown or the password is
  // wrong. Saying "no such account" would let anyone test which emails are registered.
  const failure = unauthorized('Email or password is incorrect.');

  if (!user) {
    // Still spend the time a real check would take, so a fast rejection does not
    // reveal that the email is unregistered.
    await hashPassword(password);
    throw failure;
  }

  const ok = await verifyPassword(password, user.password_hash, user.password_salt);
  if (!ok) throw failure;

  createSession(user.id, res);
  sendJson(res, 200, { user: toPublicUser(user) });
};

export const logout = (req: Req, res: Res): void => {
  destroySession(req, res);
  sendJson(res, 200, { ok: true });
};

/** Who am I? Returns null rather than an error — being signed out is not a failure. */
export const me = (req: Req, res: Res): void => {
  const user = currentUser(req);
  sendJson(res, 200, { user: user ? toPublicUser(user) : null });
};

/**
 * Update your own profile.
 *
 * Only the display name for now. Email is an identity, not a preference — changing it
 * needs a confirmation flow to the new address, which belongs with real email sending.
 */
export const updateMe = async (req: Req, res: Res): Promise<void> => {
  const current = requireUser(req);
  const body = await readJson<{ name?: unknown }>(req);

  const name = asName(body.name);
  if (!name) throw badRequest('A name is required.');

  db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, current.id);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(current.id) as UserRow;
  sendJson(res, 200, { user: toPublicUser(user) });
};

/**
 * Delete your account, and everything in it.
 *
 * Sessions and videos go with it through ON DELETE CASCADE, which is why foreign keys
 * are switched on — otherwise this would leave orphaned rows nobody can reach but that
 * still hold someone's data.
 */
export const deleteMe = (req: Req, res: Res): void => {
  const user = requireUser(req);
  db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
  destroySession(req, res);
  sendJson(res, 200, { ok: true });
};

/* ---------- validation ---------- */

const normaliseEmail = (value: unknown): string => {
  if (typeof value !== 'string') throw badRequest('Email is required.');
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    throw badRequest('That email address does not look right.');
  }
  return email;
};

const asPassword = (value: unknown): string => {
  if (typeof value !== 'string' || value.length < 8) {
    throw badRequest('Use at least 8 characters for your password.');
  }
  // scrypt would happily chew through a megabyte-long password; nobody has one.
  if (value.length > 200) throw badRequest('That password is too long.');
  return value;
};

const asName = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const name = value.trim().slice(0, 60);
  return name.length > 0 ? name : null;
};

/** "sara.ahmed@work.com" → "Sara Ahmed". A friendly default so nobody is "user_84". */
const nameFromEmail = (email: string): string =>
  email
    .split('@')[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ') || 'There';
