import { createServer } from 'node:http';
import { closeDb, pruneSessions } from './db.ts';
import { applyCors, HttpError, notFound, sendEmpty, sendJson } from './http.ts';
import type { Req, Res } from './http.ts';
import { aiConfigured } from './ai/groq.ts';
import { snapshot as aiSnapshot } from './ai/health.ts';
import { deleteMe, login, logout, me, signup, updateMe } from './routes/auth.ts';
import {
  createBrand,
  deleteBrand,
  getBrand,
  importWebsite,
  listBrands,
  serveAsset,
  updateBrand,
  uploadAsset,
} from './routes/brands.ts';
import { converse, edit } from './routes/chat.ts';
import { closeBrowser } from './browser.ts';
import { pruneJobs, renderFile, renderStatus, startRender } from './routes/render.ts';
import {
  createVideo,
  deleteVideo,
  listVideos,
  planQuestions,
  planSpec,
  updateVideo,
} from './routes/videos.ts';

/**
 * The API.
 *
 * Node's own http module, no framework. Every route is visible in one place, there is
 * no third-party code in the request path, and nothing to keep upgrading.
 *
 * Note which routes need an account and which do not: planning and rendering are open,
 * because asking someone to sign up before they have seen what the product does is the
 * fastest way to lose them. Only *saving* needs somewhere to save to.
 */

const PORT = Number(process.env.PORT ?? 4000);
const STUDIO_URL = process.env.STUDIO_URL ?? 'http://localhost:5173';

/** Only these origins may send cookies to us. */
const ALLOWED_ORIGINS = [STUDIO_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'];

const server = createServer(async (req: Req, res: Res) => {
  applyCors(req, res, ALLOWED_ORIGINS);

  // Browsers ask permission before sending a cross-origin request with cookies.
  if (req.method === 'OPTIONS') {
    sendEmpty(res, 204);
    return;
  }

  const method = req.method ?? 'GET';
  const path = new URL(req.url ?? '/', 'http://localhost').pathname;

  try {
    await route(method, path, req, res);
  } catch (error) {
    if (error instanceof HttpError) {
      sendJson(res, error.status, { error: error.message });
      return;
    }
    // Anything unexpected is logged in full but reported vaguely: internal messages
    // routinely contain file paths and query fragments that should not leave the box.
    console.error('unhandled error:', error);
    sendJson(res, 500, { error: 'Something went wrong on our side.' });
  }
});

const route = async (method: string, path: string, req: Req, res: Res): Promise<void> => {
  if (method === 'GET' && path === '/health') {
    // Whether the AI is configured is safe to report; the key itself never is.
    sendJson(res, 200, { ok: true, studioUrl: STUDIO_URL, ai: aiConfigured() });
    return;
  }

  /*
   * What the AI layer has worked out for itself.
   *
   * A system that manages itself still has to be inspectable — "it will sort itself out"
   * is only trustworthy if you can look at what it has sorted out. This shows which
   * models were discovered, which are proven, which have been benched and why, what each
   * job's replies actually cost, and how much allowance is left.
   *
   * No key, no prompts, no user content: only the layer's own view of its health.
   */
  if (method === 'GET' && path === '/api/ai/health') {
    sendJson(res, 200, { configured: aiConfigured(), ...aiSnapshot() });
    return;
  }

  /* --- accounts --- */
  if (method === 'POST' && path === '/api/auth/signup') return signup(req, res);
  if (method === 'POST' && path === '/api/auth/login') return login(req, res);
  if (method === 'POST' && path === '/api/auth/logout') return logout(req, res);
  if (method === 'GET' && path === '/api/auth/me') return me(req, res);
  if (method === 'PATCH' && path === '/api/auth/me') return updateMe(req, res);
  if (method === 'DELETE' && path === '/api/auth/me') return deleteMe(req, res);

  /* --- the conversation, and planning (no account needed) --- */
  if (method === 'POST' && path === '/api/chat') return converse(req, res);
  if (method === 'POST' && path === '/api/edit') return edit(req, res);
  if (method === 'POST' && path === '/api/plan/questions') return planQuestions(req, res);
  if (method === 'POST' && path === '/api/plan') return planSpec(req, res);

  /* --- brand kits --- */
  if (method === 'GET' && path === '/api/brands') return listBrands(req, res);
  if (method === 'POST' && path === '/api/brands') return createBrand(req, res);
  if (method === 'POST' && path === '/api/brands/import') return importWebsite(req, res);
  if (method === 'POST' && path === '/api/assets') return uploadAsset(req, res);

  const assetId = matchId(path, '/api/assets/');
  if (assetId && method === 'GET') return serveAsset(req, res, assetId);

  const brandId = matchId(path, '/api/brands/');
  if (brandId) {
    if (method === 'GET') return getBrand(req, res, brandId);
    if (method === 'PATCH') return updateBrand(req, res, brandId);
    if (method === 'DELETE') return deleteBrand(req, res, brandId);
  }

  /* --- saved videos --- */
  if (method === 'GET' && path === '/api/videos') return listVideos(req, res);
  if (method === 'POST' && path === '/api/videos') return createVideo(req, res);

  const videoId = matchId(path, '/api/videos/');
  if (videoId) {
    if (method === 'PATCH') return updateVideo(req, res, videoId);
    if (method === 'DELETE') return deleteVideo(req, res, videoId);
  }

  /* --- rendering (no account needed) --- */
  if (method === 'POST' && path === '/api/render') return startRender(req, res);

  const statusId = matchId(path, '/api/render/', '/status');
  if (statusId && method === 'GET') return renderStatus(req, res, statusId);

  const fileId = matchId(path, '/api/render/', '/file');
  if (fileId && method === 'GET') return renderFile(req, res, fileId);

  throw notFound(`No route for ${method} ${path}.`);
};

/**
 * Pull an id out of a path.
 *
 * With a suffix ("/status") it matches "/api/render/<id>/status"; without one it
 * matches "/api/videos/<id>" and refuses anything with a further segment, so a deeper
 * path never silently resolves to the wrong handler.
 */
const matchId = (path: string, prefix: string, suffix?: string): string | null => {
  if (!path.startsWith(prefix)) return null;
  let rest = path.slice(prefix.length);

  if (suffix) {
    if (!rest.endsWith(suffix)) return null;
    rest = rest.slice(0, -suffix.length);
  }

  return rest.length > 0 && !rest.includes('/') ? decodeURIComponent(rest) : null;
};

/* ---------- lifecycle ---------- */

const pruned = pruneSessions();
if (pruned > 0) console.log(`cleared ${pruned} expired session(s)`);

// An expired session row is a credential that only looks dead. Finished renders are
// megabytes each. Both need sweeping, and neither timer should hold the process open.
setInterval(pruneSessions, 24 * 60 * 60 * 1000).unref();
setInterval(pruneJobs, 5 * 60 * 1000).unref();

server.listen(PORT, () => {
  console.log(`api + render on  http://localhost:${PORT}`);
  console.log(`studio expected at ${STUDIO_URL}`);
  console.log(
    aiConfigured()
      ? `ai            ready (${process.env.GROQ_MODEL ?? 'default model'})`
      : 'ai            not configured — using the offline planner',
  );
});

// Chrome is a child process; without this it can outlive the server on Ctrl+C.
let shuttingDown = false;
const shutdown = async () => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log('\nshutting down…');
  server.close();
  await closeBrowser();
  closeDb();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
