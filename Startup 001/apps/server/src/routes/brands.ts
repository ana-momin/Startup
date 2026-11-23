import { paletteFor, reportFor } from '@motion/planner';
import type { Brand, Palette, Tone } from '@motion/planner';
import { readWebsite } from '../ai/website.ts';
import { db } from '../db.ts';
import type { AssetRow, BrandRow } from '../db.ts';
import { badRequest, notFound, readJson, sendJson } from '../http.ts';
import type { Req, Res } from '../http.ts';
import { newId, requireUser } from '../session.ts';

/**
 * Brand kits.
 *
 * A brand is the answer to "who is this video for" — logo, colour, voice, the things a
 * company already knows about itself. Kept per user and per brand, because an agency
 * or a freelancer works for several clients and "one company per account" would force
 * them into several accounts.
 *
 * Everything here filters by the signed-in user's id in the SQL itself, not in a
 * wrapper, so there is no code path where a forgotten check exposes one customer's
 * brand to another.
 */

/** The default look, used when a brand has no colour of its own. */
const DEFAULT_PALETTE: Palette = {
  bg: '#06070F',
  accent: '#6C9BFF',
  accentSoft: '#A7C2FF',
  text: '#FFFFFF',
  muted: '#8B90A6',
};

export type PublicBrand = Brand & {
  /** The finished, contrast-checked palette this brand produces. */
  palette: Palette;
  /** What we changed about their colour, and why. */
  paletteReport: ReturnType<typeof reportFor>;
  createdAt: number;
  updatedAt: number;
};

/* ---------- reading ---------- */

export const listBrands = (req: Req, res: Res): void => {
  const user = requireUser(req);

  const rows = db
    .prepare('SELECT * FROM brands WHERE user_id = ? ORDER BY updated_at DESC LIMIT 50')
    .all(user.id) as BrandRow[];

  sendJson(res, 200, { brands: rows.map(toPublic) });
};

export const getBrand = (req: Req, res: Res, id: string): void => {
  const user = requireUser(req);
  const row = findBrand(id, user.id);
  sendJson(res, 200, { brand: toPublic(row) });
};

/* ---------- writing ---------- */

type BrandBody = Partial<Record<keyof Brand, unknown>>;

export const createBrand = async (req: Req, res: Res): Promise<void> => {
  const user = requireUser(req);
  const body = await readJson<BrandBody>(req);

  const name = text(body.name, 60) || 'Untitled brand';
  const now = Date.now();
  const id = newId();

  db.prepare(
    `INSERT INTO brands
       (id, user_id, name, description, audience, voice, avoid, color, mode, tone, website, logo_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    user.id,
    name,
    text(body.description, 600) ?? null,
    text(body.audience, 200) ?? null,
    text(body.voice, 200) ?? null,
    text(body.avoid, 300) ?? null,
    hex(body.color) ?? null,
    mode(body.mode),
    tone(body.tone) ?? null,
    text(body.website, 300) ?? null,
    ownedAsset(body.logoId, user.id) ?? null,
    now,
    now,
  );

  sendJson(res, 201, { brand: toPublic(findBrand(id, user.id)) });
};

export const updateBrand = async (req: Req, res: Res, id: string): Promise<void> => {
  const user = requireUser(req);
  const existing = findBrand(id, user.id);
  const body = await readJson<BrandBody>(req);

  // Only fields actually present in the request are touched, so a screen that edits one
  // thing cannot wipe the rest by omission.
  const next = {
    name: 'name' in body ? text(body.name, 60) || existing.name : existing.name,
    description: pick(body, 'description', existing.description, 600),
    audience: pick(body, 'audience', existing.audience, 200),
    voice: pick(body, 'voice', existing.voice, 200),
    avoid: pick(body, 'avoid', existing.avoid, 300),
    color: 'color' in body ? (hex(body.color) ?? null) : existing.color,
    mode: 'mode' in body ? mode(body.mode) : existing.mode,
    tone: 'tone' in body ? (tone(body.tone) ?? null) : existing.tone,
    website: pick(body, 'website', existing.website, 300),
    logo_id:
      'logoId' in body ? (ownedAsset(body.logoId, user.id) ?? null) : existing.logo_id,
  };

  db.prepare(
    `UPDATE brands SET
       name = ?, description = ?, audience = ?, voice = ?, avoid = ?,
       color = ?, mode = ?, tone = ?, website = ?, logo_id = ?, updated_at = ?
     WHERE id = ? AND user_id = ?`,
  ).run(
    next.name,
    next.description,
    next.audience,
    next.voice,
    next.avoid,
    next.color,
    next.mode,
    next.tone,
    next.website,
    next.logo_id,
    Date.now(),
    id,
    user.id,
  );

  sendJson(res, 200, { brand: toPublic(findBrand(id, user.id)) });
};

export const deleteBrand = (req: Req, res: Res, id: string): void => {
  const user = requireUser(req);

  const result = db
    .prepare('DELETE FROM brands WHERE id = ? AND user_id = ?')
    .run(id, user.id);

  if (Number(result.changes ?? 0) === 0) throw notFound('No such brand.');

  // Videos keep working; they simply stop belonging to a brand.
  db.prepare('UPDATE videos SET brand_id = NULL WHERE brand_id = ? AND user_id = ?').run(
    id,
    user.id,
  );

  sendJson(res, 200, { ok: true });
};

/* ---------- importing from a website ---------- */

/**
 * Read a brand off its own website.
 *
 * Nothing is saved here — it returns a draft for the person to confirm. Silently
 * creating a brand from a guess would mean the first thing they see is our mistakes
 * presented as fact.
 */
export const importWebsite = async (req: Req, res: Res): Promise<void> => {
  const user = requireUser(req);
  const body = await readJson<{ website?: unknown }>(req);

  const website = text(body.website, 300);
  if (!website) throw badRequest('Give me a website address.');

  let found;
  try {
    found = await readWebsite(website);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not read that site.';
    throw badRequest(message);
  }

  // Store the logo now, while we still have its URL — the page it came from may be
  // behind a login or a redirect by the time anyone clicks save.
  let logoId: string | undefined;
  if (found.logoUrl) {
    logoId = (await storeRemoteImage(found.logoUrl, user.id)) ?? undefined;
  }

  /*
   * A scraped site does not always give up a name.
   *
   * Everything downstream — the palette, the briefing the director reads — is typed to
   * expect one, and `undefined` was flowing straight through because the server was
   * never type-checked. The domain is the honest fallback: it is what the person typed,
   * it is almost always the brand anyway, and it is far better than a blank where a
   * company name should be.
   */
  const draft = {
    name: found.name ?? hostName(found.website),
    description: found.description,
    color: found.color,
    mode: found.mode ?? 'dark',
    website: found.website,
    logoId,
    /*
     * The headline and the call to action travel with the draft.
     *
     * Both were already being scraped and then dropped on the floor right here, so the
     * confirmation screen could only ever show a name, a description and a colour — and
     * the two most telling things on anybody's homepage, the sentence they lead with and
     * the button they actually want pressed, never reached the person deciding whether
     * we had understood their site.
     */
    tagline: found.tagline,
    action: found.action,
  };

  const palette = paletteFor(draft, DEFAULT_PALETTE);

  sendJson(res, 200, {
    draft,
    // Every colour we found, so they can pick rather than accept our guess. Each comes
    // with the palette it would produce, so the choice is made on the finished result
    // instead of on a swatch.
    colorOptions: found.colorOptions.map((color) => ({
      color,
      palette: paletteFor({ ...draft, color }, DEFAULT_PALETTE),
    })),
    palette,
    paletteReport: reportFor(draft, palette),
  });
};

/* ---------- assets ---------- */

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

const ALLOWED_IMAGE = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
  'image/gif',
]);

/**
 * Upload a logo, sent as a data URL.
 *
 * Base64 in JSON rather than multipart form data: a logo is small, and parsing
 * multipart by hand would be a hundred lines of fiddly code to save a third of the
 * bytes on a file that only ever gets uploaded once.
 */
export const uploadAsset = async (req: Req, res: Res): Promise<void> => {
  const user = requireUser(req);
  const body = await readJson<{ dataUrl?: unknown; width?: unknown; height?: unknown }>(req);

  if (typeof body.dataUrl !== 'string') throw badRequest('No image was sent.');

  const match = body.dataUrl.match(/^data:([\w/+.-]+);base64,(.+)$/);
  if (!match) throw badRequest('That image could not be read.');

  const [, mime, base64] = match;
  if (!ALLOWED_IMAGE.has(mime)) throw badRequest('Use a PNG, JPG, WebP or SVG.');

  const bytes = Buffer.from(base64, 'base64');
  if (bytes.length === 0) throw badRequest('That image is empty.');
  if (bytes.length > MAX_IMAGE_BYTES) throw badRequest('That image is over 2 MB.');

  const id = saveAsset(user.id, mime, bytes, num(body.width), num(body.height));
  sendJson(res, 201, { assetId: id, url: `/api/assets/${id}` });
};

/**
 * Serve a stored image.
 *
 * Deliberately not behind a session check: the renderer loads these URLs inside a
 * headless browser that carries no cookies, and the ids are random UUIDs rather than
 * anything guessable.
 */
export const serveAsset = (_req: Req, res: Res, id: string): void => {
  const row = db.prepare('SELECT * FROM assets WHERE id = ?').get(id) as
    | AssetRow
    | undefined;

  if (!row) throw notFound('No such image.');

  const bytes = Buffer.from(row.bytes);
  res.writeHead(200, {
    'Content-Type': row.mime,
    'Content-Length': bytes.length,
    // Immutable: the id changes whenever the image does, so this can never go stale.
    'Cache-Control': 'public, max-age=31536000, immutable',
    /*
     * Always permissive, even when nobody asked.
     *
     * The general CORS handling only sets this header when the request carries an
     * Origin, which a plain `<img>` does not. That produced a genuinely nasty bug: one
     * ordinary image tag anywhere in the app cached a copy of the logo WITHOUT this
     * header, and every later `crossOrigin` load — the one the brand mark uses to read
     * the pixels and pick its background — reused that cached copy, found no header, and
     * failed. The logo silently became a letter on a coloured square, but only after
     * visiting a page that happened to contain a plain image tag.
     *
     * These are public, immutable images with no credentials attached, so `*` is both
     * safe and the only value that makes one cached copy usable by every kind of
     * request. `Vary: Origin` is deliberately NOT set: the answer never varies, and
     * saying it does would split the cache again for no reason.
     */
    'Access-Control-Allow-Origin': '*',
  });
  res.end(bytes);
};

const saveAsset = (
  userId: string,
  mime: string,
  bytes: Buffer,
  width?: number,
  height?: number,
): string => {
  const id = newId();
  db.prepare(
    `INSERT INTO assets (id, user_id, kind, mime, bytes, width, height, created_at)
     VALUES (?, ?, 'logo', ?, ?, ?, ?, ?)`,
  ).run(id, userId, mime, bytes, width ?? null, height ?? null, Date.now());
  return id;
};

/** Fetch a logo we found on a website and keep our own copy of it. */
const storeRemoteImage = async (url: string, userId: string): Promise<string | null> => {
  try {
    /*
     * An inline SVG arrives as a data URL, already in hand.
     *
     * `fetch` does handle data URLs, but going through it here would mean an inline mark
     * silently taking the same failure paths as a network request. It is the highest
     * quality logo we can get — vector, transparent, the exact mark from their own
     * header — so it is decoded directly.
     */
    if (url.startsWith('data:image/svg+xml')) {
      const comma = url.indexOf(',');
      if (comma === -1) return null;
      const payload = url.slice(comma + 1);
      const markup = url.slice(0, comma).includes(';base64')
        ? Buffer.from(payload, 'base64').toString('utf8')
        : decodeURIComponent(payload);

      const bytes = Buffer.from(markup, 'utf8');
      if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) return null;
      return saveAsset(userId, 'image/svg+xml', bytes);
    }

    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;

    const mime = (response.headers.get('content-type') ?? '').split(';')[0].trim();
    if (!ALLOWED_IMAGE.has(mime)) return null;

    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) return null;

    return saveAsset(userId, mime, bytes);
  } catch {
    // A missing logo is a small loss; a failed import over it would be a large one.
    return null;
  }
};

/* ---------- shared helpers ---------- */

export const findBrand = (id: string, userId: string): BrandRow => {
  const row = db
    .prepare('SELECT * FROM brands WHERE id = ? AND user_id = ?')
    .get(id, userId) as BrandRow | undefined;

  if (!row) throw notFound('No such brand.');
  return row;
};

export const toPublic = (row: BrandRow): PublicBrand => {
  const brand: Brand = {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    audience: row.audience ?? undefined,
    voice: row.voice ?? undefined,
    avoid: row.avoid ?? undefined,
    color: row.color ?? undefined,
    mode: row.mode === 'light' ? 'light' : 'dark',
    tone: (row.tone as Tone | null) ?? undefined,
    website: row.website ?? undefined,
    logoId: row.logo_id ?? undefined,
  };

  const palette = paletteFor(brand, DEFAULT_PALETTE);

  return {
    ...brand,
    palette,
    paletteReport: reportFor(brand, palette),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

/* ---------- validation ---------- */

const text = (value: unknown, max: number): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const cleaned = value.replace(/\s+/g, ' ').trim().slice(0, max);
  return cleaned.length > 0 ? cleaned : undefined;
};

/** An explicit null clears a field; an absent key leaves it alone. */
const pick = (
  body: BrandBody,
  key: keyof Brand,
  current: string | null,
  max: number,
): string | null => (key in body ? (text(body[key], max) ?? null) : current);

const hex = (value: unknown): string | undefined =>
  typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value.trim())
    ? value.trim().toUpperCase()
    : undefined;

const mode = (value: unknown): 'dark' | 'light' => (value === 'light' ? 'light' : 'dark');

const tone = (value: unknown): Tone | undefined =>
  value === 'clean' || value === 'bold' || value === 'editorial' || value === 'kinetic'
    ? value
    : undefined;

const num = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;

/** Only allow pointing at an image this user actually owns. */
const ownedAsset = (value: unknown, userId: string): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const row = db
    .prepare('SELECT id FROM assets WHERE id = ? AND user_id = ?')
    .get(value, userId) as { id: string } | undefined;
  return row?.id;
};

/**
 * A company name from a URL, for when the page did not offer one.
 *
 * "https://www.northwind.co.uk/about" becomes "Northwind". Crude, and right far more
 * often than it is wrong, because a domain is usually the brand with the punctuation
 * taken out.
 */
const hostName = (website: string): string => {
  try {
    const host = new URL(website).hostname.replace(/^www\./, '');
    const label = host.split('.')[0] ?? host;
    return label.charAt(0).toUpperCase() + label.slice(1);
  } catch {
    return 'Untitled brand';
  }
};
