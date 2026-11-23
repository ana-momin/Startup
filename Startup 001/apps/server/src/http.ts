import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Small HTTP helpers.
 *
 * Everything a web framework would give us, minus the framework. The whole API is a
 * handful of routes, so the parts we actually need fit in one readable file — and
 * there is no third-party code in the request path.
 */

export type Req = IncomingMessage;
export type Res = ServerResponse;

/**
 * Thrown anywhere in a route; the server turns it into a clean JSON response.
 *
 * Written the long way rather than with a constructor parameter property, because Node
 * runs this TypeScript by stripping the types out rather than compiling it, and that
 * shorthand is the one piece of syntax that actually generates code.
 */
export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

export const badRequest = (message: string) => new HttpError(400, message);
export const unauthorized = (message = 'Sign in to do that.') => new HttpError(401, message);
export const notFound = (message = 'Not found.') => new HttpError(404, message);
export const conflict = (message: string) => new HttpError(409, message);

/* ---------- responses ---------- */

export const sendJson = (res: Res, status: number, payload: unknown): void => {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
};

export const sendEmpty = (res: Res, status = 204): void => {
  res.writeHead(status).end();
};

/* ---------- requests ---------- */

const MAX_BODY = 4 * 1024 * 1024;

/**
 * Read and parse a JSON body.
 *
 * The size cap matters: without it, anyone can hold a connection open and stream
 * gigabytes into memory. That is a one-line denial of service on an unprotected server.
 */
export const readJson = <T = unknown>(req: Req): Promise<T> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;

    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(badRequest('Request body too large.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (chunks.length === 0) {
        resolve({} as T);
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')) as T);
      } catch {
        reject(badRequest('Body was not valid JSON.'));
      }
    });

    req.on('error', reject);
  });

/* ---------- cookies ---------- */

export const readCookie = (req: Req, name: string): string | null => {
  const header = req.headers.cookie;
  if (!header) return null;

  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    if (part.slice(0, index).trim() === name) {
      return decodeURIComponent(part.slice(index + 1).trim());
    }
  }
  return null;
};

export type CookieOptions = {
  maxAge?: number;
  httpOnly?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
  secure?: boolean;
};

export const setCookie = (
  res: Res,
  name: string,
  value: string,
  options: CookieOptions = {},
): void => {
  const {
    maxAge,
    // httpOnly means JavaScript on the page cannot read it. That is the single most
    // important defence for a session cookie: a script injected into the page still
    // cannot steal the session.
    httpOnly = true,
    sameSite = 'Lax',
    secure = false,
  } = options;

  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/'];
  if (maxAge !== undefined) parts.push(`Max-Age=${maxAge}`);
  if (httpOnly) parts.push('HttpOnly');
  parts.push(`SameSite=${sameSite}`);
  if (secure) parts.push('Secure');

  appendHeader(res, 'Set-Cookie', parts.join('; '));
};

export const clearCookie = (res: Res, name: string): void => {
  appendHeader(res, 'Set-Cookie', `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`);
};

const appendHeader = (res: Res, name: string, value: string): void => {
  const existing = res.getHeader(name);
  if (existing === undefined) {
    res.setHeader(name, value);
  } else {
    res.setHeader(name, [...(Array.isArray(existing) ? existing : [String(existing)]), value]);
  }
};

/* ---------- CORS ---------- */

/**
 * The studio runs on a different port, so the browser treats it as another origin.
 *
 * A wildcard origin cannot be used here: cookies only travel cross-origin when the
 * response names the exact origin *and* allows credentials. Echoing back a known-good
 * origin is the correct way to do that — echoing back *any* origin would hand the
 * session to whoever asks.
 */
/**
 * Is this origin a machine on the same private network?
 *
 * Testing on a phone is the single most useful thing you can do with a video tool, and
 * it was impossible: the studio was only reachable at `localhost`, which on a phone means
 * the phone. Allowing private addresses lets the laptop serve the real app to every
 * device in the house with no tunnel, no account and no deployment.
 *
 * Deliberately only the ranges that cannot be routed from the internet — 10.x, 192.168.x,
 * 172.16–31.x and the link-local 169.254.x. A public address never matches, so this
 * cannot become an accidental open door once the thing is hosted somewhere real.
 */
const isPrivateOrigin = (origin: string): boolean => {
  try {
    const { hostname } = new URL(origin);
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true;
    const parts = hostname.split('.').map(Number);
    if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
      return false;
    }
    const [a, b] = parts;
    return (
      a === 10 ||
      (a === 192 && b === 168) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 169 && b === 254)
    );
  } catch {
    return false;
  }
};

export const applyCors = (req: Req, res: Res, allowed: string[]): void => {
  const origin = req.headers.origin;
  if (origin && (allowed.includes(origin) || isPrivateOrigin(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
};
