import { generateSpec, mergeAnswers, questionsFor } from '@motion/planner';
import type { Answers, GenerateOptions, VideoSpec } from '@motion/planner';
import { db } from '../db.ts';
import type { VideoRow } from '../db.ts';
import { badRequest, notFound, readJson, sendJson } from '../http.ts';
import type { Req, Res } from '../http.ts';
import { newId, requireUser } from '../session.ts';

/**
 * A person's saved videos.
 *
 * What gets stored is the *plan*, not the video: a few kilobytes of JSON instead of
 * megabytes of pixels. That is what makes a video re-renderable at any size later, and
 * editable rather than disposable.
 *
 * Every query filters by the signed-in user's id in the SQL itself, not in a wrapper —
 * so there is no code path where a forgotten check exposes one person's work to another.
 */

export type PublicVideo = {
  id: string;
  title: string;
  prompt: string;
  spec: VideoSpec;
  brandId: string | null;
  createdAt: number;
  updatedAt: number;
};

/* ---------- planning, before anything is saved ---------- */

/**
 * What still needs asking about this prompt.
 *
 * Deliberately requires no account and saves nothing: this runs before someone has
 * committed to anything, including to us.
 */
export const planQuestions = async (req: Req, res: Res): Promise<void> => {
  const body = await readJson<{ prompt?: unknown }>(req);
  const prompt = asPrompt(body.prompt);
  sendJson(res, 200, { questions: questionsFor(prompt) });
};

/**
 * Turn a prompt (plus any answers) into a spec, without saving it.
 *
 * This is what lets someone use the product signed out. Planning happens here rather
 * than in the browser because this is where a real model's API key will live, and a key
 * shipped to the browser is a key given away.
 */
export const planSpec = async (req: Req, res: Res): Promise<void> => {
  const body = await readJson<PlanBody>(req);
  const prompt = asPrompt(body.prompt);
  const answers = asAnswers(body.answers);

  const merged = mergeAnswers(prompt, answers);
  const spec = generateSpec(merged, asOptions(body.options));

  sendJson(res, 200, { spec, prompt: merged });
};

/* ---------- saved videos ---------- */

export const listVideos = (req: Req, res: Res): void => {
  const user = requireUser(req);

  const rows = db
    .prepare('SELECT * FROM videos WHERE user_id = ? ORDER BY updated_at DESC LIMIT 200')
    .all(user.id) as VideoRow[];

  sendJson(res, 200, { videos: rows.map(toPublicVideo) });
};

type PlanBody = {
  prompt?: unknown;
  answers?: unknown;
  options?: unknown;
  /** A spec made while signed out, being saved now. */
  spec?: unknown;
};

/**
 * Save a video.
 *
 * Accepts either a prompt to plan from, or a finished spec — the second case is how
 * work done before signing up gets carried into the new account instead of being lost.
 */
export const createVideo = async (req: Req, res: Res): Promise<void> => {
  const user = requireUser(req);
  const body = await readJson<PlanBody>(req);

  let spec: VideoSpec;
  let prompt: string;

  if (body.spec && typeof body.spec === 'object') {
    spec = body.spec as VideoSpec;
    prompt = typeof body.prompt === 'string' ? body.prompt : spec.prompt ?? '';
  } else {
    prompt = mergeAnswers(asPrompt(body.prompt), asAnswers(body.answers));
    spec = generateSpec(prompt, asOptions(body.options));
  }

  const now = Date.now();
  const id = newId();
  // The brand comes off the spec rather than the request body: the spec is what was
  // actually built, so they can never disagree.
  const brandId = spec.brandId ?? null;

  db.prepare(
    `INSERT INTO videos (id, user_id, title, prompt, spec, brand_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, user.id, spec.title, prompt, JSON.stringify(spec), brandId, now, now);

  sendJson(res, 201, {
    video: { id, title: spec.title, prompt, spec, brandId, createdAt: now, updatedAt: now },
  });
};

/**
 * Update a video.
 *
 * Two ways in, and the difference matters:
 *   - `instruction` re-plans from the original prompt plus the new instruction, so
 *     earlier decisions survive. "Make it vertical" must not throw away the script.
 *   - `spec` saves an edit made directly in the editor, untouched.
 */
export const updateVideo = async (req: Req, res: Res, id: string): Promise<void> => {
  const user = requireUser(req);
  const body = await readJson<{ instruction?: unknown; spec?: unknown }>(req);

  const row = db
    .prepare('SELECT * FROM videos WHERE id = ? AND user_id = ?')
    .get(id, user.id) as VideoRow | undefined;

  if (!row) throw notFound('No such video.');

  let spec: VideoSpec;
  let prompt = row.prompt;

  if (body.spec && typeof body.spec === 'object') {
    spec = body.spec as VideoSpec;
  } else {
    prompt = `${row.prompt} ${asPrompt(body.instruction)}`.trim();
    spec = generateSpec(prompt);
  }

  const now = Date.now();
  const brandId = spec.brandId ?? row.brand_id;

  db.prepare(
    `UPDATE videos SET title = ?, prompt = ?, spec = ?, brand_id = ?, updated_at = ?
     WHERE id = ? AND user_id = ?`,
  ).run(spec.title, prompt, JSON.stringify(spec), brandId, now, id, user.id);

  sendJson(res, 200, {
    video: {
      id,
      title: spec.title,
      prompt,
      spec,
      brandId,
      createdAt: row.created_at,
      updatedAt: now,
    },
  });
};

export const deleteVideo = (req: Req, res: Res, id: string): void => {
  const user = requireUser(req);

  const result = db
    .prepare('DELETE FROM videos WHERE id = ? AND user_id = ?')
    .run(id, user.id);

  if (Number(result.changes ?? 0) === 0) throw notFound('No such video.');
  sendJson(res, 200, { ok: true });
};

/* ---------- validation ---------- */

const toPublicVideo = (row: VideoRow): PublicVideo => ({
  id: row.id,
  title: row.title,
  prompt: row.prompt,
  spec: JSON.parse(row.spec) as VideoSpec,
  brandId: row.brand_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const asPrompt = (value: unknown): string => {
  if (typeof value !== 'string') throw badRequest('A prompt is required.');
  const prompt = value.trim();
  if (prompt.length === 0) throw badRequest('A prompt is required.');
  if (prompt.length > 2000) throw badRequest('That prompt is too long.');
  return prompt;
};

const asAnswers = (value: unknown): Answers => {
  if (!value || typeof value !== 'object') return {};

  const answers: Answers = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw !== 'string') continue;
    const text = raw.trim().slice(0, 300);
    if (text.length > 0) answers[key as keyof Answers] = text;
  }
  return answers;
};

const asOptions = (value: unknown): GenerateOptions => {
  if (!value || typeof value !== 'object') return {};
  const { format, length } = value as Record<string, unknown>;

  return {
    format:
      format === 'vertical' || format === 'square' || format === 'landscape'
        ? format
        : undefined,
    length:
      length === 'short' || length === 'long' || length === 'standard'
        ? length
        : undefined,
  };
};
