import { randomUUID } from 'node:crypto';
import { renderToMp4 } from '@motion/renderer';
import { getBrowser } from '../browser.ts';
import { specFrames, specSize, specSlug } from '@motion/planner';
import type { VideoSpec } from '@motion/planner';
import { badRequest, notFound, readJson, sendJson } from '../http.ts';
import type { Req, Res } from '../http.ts';
import { db } from '../db.ts';
import type { VideoRow } from '../db.ts';
import { currentUser } from '../session.ts';

/**
 * Rendering, as a job you can watch.
 *
 * A render takes tens of seconds, which is far too long to hold an HTTP request open —
 * the browser would simply sit there with no idea whether anything was happening. So a
 * request starts a job and returns immediately; the page then asks how it is going and
 * can show a real progress bar instead of a frozen button.
 *
 * One warm browser is kept for the life of the process. Launching Chrome costs about a
 * second, and paying that on every export would be the slowest part of the pipeline.
 */

const STUDIO_URL = process.env.STUDIO_URL ?? 'http://localhost:5173';

const LIMITS = {
  maxFrames: 60 * 60 * 2, // two minutes at 60fps
  maxPixels: 3840 * 2160,
};

/** Finished jobs are kept briefly so the page has time to collect the file. */
const JOB_TTL_MS = 10 * 60 * 1000;

type Job = {
  id: string;
  status: 'rendering' | 'done' | 'error';
  done: number;
  total: number;
  filename: string;
  buffer?: Buffer;
  error?: string;
  startedAt: number;
  finishedAt?: number;
};

const jobs = new Map<string, Job>();

/* ---------- start a render ---------- */

type RenderBody = {
  /** Render a saved video by id… */
  videoId?: unknown;
  /** …or an unsaved spec directly, for someone who is not signed in. */
  spec?: unknown;
  quality?: unknown;
};

export const startRender = async (req: Req, res: Res): Promise<void> => {
  const body = await readJson<RenderBody>(req);
  const spec = resolveSpec(req, body);

  const { width, height } = specSize(spec);
  const totalFrames = specFrames(spec);

  if (totalFrames > LIMITS.maxFrames) {
    throw badRequest(`Too long: ${totalFrames} frames exceeds the limit.`);
  }
  if (width * height > LIMITS.maxPixels) {
    throw badRequest('Resolution above 4K is not supported yet.');
  }

  const job: Job = {
    id: randomUUID(),
    status: 'rendering',
    done: 0,
    total: totalFrames,
    filename: `${specSlug(spec)}.mp4`,
    startedAt: Date.now(),
  };
  jobs.set(job.id, job);

  console.log(`render ${job.id.slice(0, 8)}: ${width}x${height} · ${totalFrames} frames`);

  // Deliberately not awaited: the response goes back now, the work continues behind it.
  void runJob(job, spec, width, height, totalFrames, body.quality === 'lossless');

  sendJson(res, 202, { jobId: job.id, totalFrames, filename: job.filename });
};

const runJob = async (
  job: Job,
  spec: VideoSpec,
  width: number,
  height: number,
  totalFrames: number,
  lossless: boolean,
): Promise<void> => {
  try {
    const { buffer, durationMs } = await renderToMp4({
      baseUrl: STUDIO_URL,
      browser: await getBrowser(),
      spec,
      width,
      height,
      fps: spec.fps,
      totalFrames,
      quality: lossless ? 'lossless' : 'standard',
      onProgress: (done) => {
        job.done = done;
      },
    });

    job.buffer = buffer;
    job.status = 'done';
    job.finishedAt = Date.now();
    console.log(
      `render ${job.id.slice(0, 8)}: done in ${(durationMs / 1000).toFixed(1)}s · ${size(buffer.length)}`,
    );
  } catch (error) {
    job.status = 'error';
    job.error = error instanceof Error ? error.message : 'Render failed.';
    job.finishedAt = Date.now();
    console.error(`render ${job.id.slice(0, 8)}: failed —`, job.error);
  }
};

/* ---------- watch and collect ---------- */

export const renderStatus = (_req: Req, res: Res, id: string): void => {
  const job = jobs.get(id);
  if (!job) throw notFound('No such render job.');

  sendJson(res, 200, {
    status: job.status,
    done: job.done,
    total: job.total,
    filename: job.filename,
    error: job.error,
    // Elapsed time lets the page estimate what is left without the server guessing.
    elapsedMs: (job.finishedAt ?? Date.now()) - job.startedAt,
  });
};

export const renderFile = (_req: Req, res: Res, id: string): void => {
  const job = jobs.get(id);
  if (!job) throw notFound('No such render job.');
  if (job.status === 'error') throw badRequest(job.error ?? 'Render failed.');
  if (job.status !== 'done' || !job.buffer) throw badRequest('That render is not finished.');

  res.writeHead(200, {
    'Content-Type': 'video/mp4',
    'Content-Length': job.buffer.length,
    'Content-Disposition': `attachment; filename="${job.filename}"`,
  });
  res.end(job.buffer);
};

/** Finished videos are megabytes each; without this the process leaks memory all day. */
export const pruneJobs = (): void => {
  const cutoff = Date.now() - JOB_TTL_MS;
  for (const [id, job] of jobs) {
    if (job.finishedAt && job.finishedAt < cutoff) jobs.delete(id);
  }
};

/* ---------- what to render ---------- */

/**
 * A saved id is looked up against the signed-in user, so nobody can render somebody
 * else's video by guessing an id. A raw spec is accepted too, which is what lets
 * someone use the product before making an account.
 */
const resolveSpec = (req: Req, body: RenderBody): VideoSpec => {
  if (typeof body.videoId === 'string') {
    const user = currentUser(req);
    if (!user) throw notFound('No such video.');

    const row = db
      .prepare('SELECT * FROM videos WHERE id = ? AND user_id = ?')
      .get(body.videoId, user.id) as VideoRow | undefined;

    if (!row) throw notFound('No such video.');
    return JSON.parse(row.spec) as VideoSpec;
  }

  if (body.spec && typeof body.spec === 'object') {
    return validateSpec(body.spec as Record<string, unknown>);
  }

  throw badRequest('Send either a videoId or a spec.');
};

/**
 * Check a spec that came straight from a browser.
 *
 * This endpoint spends real CPU and memory on whatever it is told, so it does not get
 * to trust its input.
 */
const validateSpec = (value: Record<string, unknown>): VideoSpec => {
  const { fps, format, scenes, palette } = value;

  if (typeof fps !== 'number' || fps < 1 || fps > 60) {
    throw badRequest('fps must be between 1 and 60.');
  }
  if (format !== 'landscape' && format !== 'vertical' && format !== 'square') {
    throw badRequest('Unknown format.');
  }
  if (!Array.isArray(scenes) || scenes.length === 0) {
    throw badRequest('A video needs at least one scene.');
  }
  if (scenes.length > 40) throw badRequest('That is too many scenes.');
  if (!palette || typeof palette !== 'object') throw badRequest('A palette is required.');

  return value as unknown as VideoSpec;
};

const size = (bytes: number): string =>
  bytes > 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`;
