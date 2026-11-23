import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The database.
 *
 * SQLite, through Node's own built-in `node:sqlite` module — no dependency, no native
 * build step, no licence to check, and the whole database is one file you can copy.
 * For a product with no users yet, a database server would be pure overhead.
 *
 * Every query in the app goes through this file. If SQLite ever needs to become
 * Postgres, this is the only file that changes — which is the entire reason it is
 * shaped this way.
 *
 * Note: `node:sqlite` is still marked experimental in Node. That is an accepted,
 * contained risk: we pin the Node version, and the surface we use (exec, prepare,
 * run, get, all) is the oldest and least likely part of it to move.
 */

const here = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH ?? resolve(here, '../data/motion.db');

mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);

// Write-ahead logging lets reads continue while a write is in progress. Foreign keys
// are off by default in SQLite, which quietly lets orphaned rows accumulate.
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

/**
 * Schema.
 *
 * Written as "create if not absent" so starting the server is always safe, whether the
 * database is brand new or years old.
 */
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE,
    name          TEXT NOT NULL,
    plan          TEXT NOT NULL DEFAULT 'free',
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    created_at    INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS videos (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title      TEXT NOT NULL,
    prompt     TEXT NOT NULL,
    spec       TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS brands (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    description TEXT,
    audience    TEXT,
    voice       TEXT,
    avoid       TEXT,
    color       TEXT,
    mode        TEXT NOT NULL DEFAULT 'dark',
    tone        TEXT,
    website     TEXT,
    logo_id     TEXT,
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS assets (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind       TEXT NOT NULL,
    mime       TEXT NOT NULL,
    bytes      BLOB NOT NULL,
    width      INTEGER,
    height     INTEGER,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_videos_user   ON videos(user_id, updated_at DESC);
  CREATE INDEX IF NOT EXISTS idx_brands_user   ON brands(user_id, updated_at DESC);
  CREATE INDEX IF NOT EXISTS idx_assets_user   ON assets(user_id);
`);

/**
 * Add a column that older databases will not have.
 *
 * SQLite has no "ADD COLUMN IF NOT EXISTS", and a schema change must never lose
 * somebody's data. Checking first and swallowing the duplicate error is the smallest
 * honest migration that works on a database of any age.
 */
const addColumn = (table: string, column: string, definition: string): void => {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (columns.some((c) => c.name === column)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
};

// Videos made before brands existed simply have none.
addColumn('videos', 'brand_id', 'TEXT');

/* ---------- row shapes ---------- */

export type UserRow = {
  id: string;
  email: string;
  name: string;
  plan: string;
  password_hash: string;
  password_salt: string;
  created_at: number;
};

export type VideoRow = {
  id: string;
  user_id: string;
  title: string;
  prompt: string;
  /** The VideoSpec, stored as JSON text. */
  spec: string;
  brand_id: string | null;
  created_at: number;
  updated_at: number;
};

export type BrandRow = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  audience: string | null;
  voice: string | null;
  avoid: string | null;
  color: string | null;
  mode: string;
  tone: string | null;
  website: string | null;
  logo_id: string | null;
  created_at: number;
  updated_at: number;
};

export type AssetRow = {
  id: string;
  user_id: string;
  kind: string;
  mime: string;
  bytes: Uint8Array;
  width: number | null;
  height: number | null;
  created_at: number;
};

export type SessionRow = {
  token: string;
  user_id: string;
  created_at: number;
  expires_at: number;
};

/**
 * Drop expired sessions.
 *
 * Run at start-up and then daily. Without it the sessions table grows forever, and an
 * expired row sitting in the database is a credential that only *looks* dead.
 */
export const pruneSessions = (): number => {
  const result = db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
  return Number(result.changes ?? 0);
};

export const closeDb = (): void => {
  try {
    db.close();
  } catch {
    // Already closed, or never opened. Nothing useful to do during shutdown.
  }
};
