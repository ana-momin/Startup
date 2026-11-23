import type { Palette, Tone, VideoSpec } from '@motion/planner';

/**
 * Everything the browser knows about the server.
 *
 * One file, one place. No component builds a URL or calls fetch directly, so changing
 * how we talk to the server is a single edit rather than a hunt through the app.
 */

/**
 * Where the API lives, worked out rather than hard-coded.
 *
 * It was `http://localhost:4000`, which is correct on the machine running the server and
 * wrong everywhere else — opened on a phone, `localhost` is the phone, so the app loaded
 * and then failed at the first request. Deriving it from the page's own hostname means
 * the same build works on this laptop, on a phone across the room, and on a real host,
 * with nothing to configure. An explicit VITE_API_URL still wins where the API genuinely
 * lives somewhere else.
 */
const apiBase = (): string => {
  const configured = import.meta.env.VITE_API_URL;
  if (configured) return configured;
  if (typeof window === 'undefined') return 'http://localhost:4000';
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:4000`;
};

const BASE = apiBase();

export type User = {
  id: string;
  email: string;
  name: string;
  plan: string;
};

export type Video = {
  id: string;
  title: string;
  prompt: string;
  spec: VideoSpec;
  brandId?: string | null;
  createdAt: number;
  updatedAt: number;
  /** True while this video only exists in this browser, before signing in. */
  local?: boolean;
};

export type PaletteReport = {
  adjusted: boolean;
  original?: string;
  used?: string;
  originalContrast?: number;
  reason?: string;
};

export type Brand = {
  id: string;
  name: string;
  description?: string;
  audience?: string;
  voice?: string;
  avoid?: string;
  color?: string;
  mode?: 'dark' | 'light';
  tone?: Tone;
  website?: string;
  logoId?: string;
  palette: Palette;
  paletteReport: PaletteReport;
  createdAt: number;
  updatedAt: number;
};

/** What a website import gives back, before anyone has agreed to save it. */
export type BrandDraft = {
  draft: {
    name?: string;
    description?: string;
    color?: string;
    mode?: 'dark' | 'light';
    website: string;
    logoId?: string;
    /** Their homepage headline — the clearest sentence they own. */
    tagline?: string;
    /** What their main button says, which is the action they actually want. */
    action?: string;
  };
  /** Every colour we found, each with the palette it would produce. */
  colorOptions: { color: string; palette: Palette }[];
  palette: Palette;
  paletteReport: PaletteReport;
};

/** Where a stored image lives. Absolute, so the renderer can load it too. */
export const assetUrl = (assetId: string): string => `${BASE}/api/assets/${assetId}`;

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** The server could not be reached at all — different from a rejected request. */
export class ApiOffline extends Error {
  constructor() {
    super('Cannot reach the server.');
    this.name = 'ApiOffline';
  }
}

const request = async <T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> => {
  let response: Response;

  try {
    response = await fetch(BASE + path, {
      method: options.method ?? 'GET',
      headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
      // The session lives in an httpOnly cookie, which the browser only sends
      // cross-origin when asked explicitly. Without this every request is anonymous.
      credentials: 'include',
    });
  } catch {
    throw new ApiOffline();
  }

  if (response.status === 204) return undefined as T;

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.error ?? `Request failed (${response.status}).`,
    );
  }

  return payload as T;
};

export type RenderProgress = {
  status: 'rendering' | 'done' | 'error';
  done: number;
  total: number;
  filename: string;
  error?: string;
  elapsedMs: number;
};

export const api = {
  /* --- accounts --- */

  me: () => request<{ user: User | null }>('/api/auth/me').then((r) => r.user),

  signup: (email: string, password: string, name?: string) =>
    request<{ user: User }>('/api/auth/signup', {
      method: 'POST',
      body: { email, password, name },
    }).then((r) => r.user),

  login: (email: string, password: string) =>
    request<{ user: User }>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    }).then((r) => r.user),

  logout: () => request<{ ok: true }>('/api/auth/logout', { method: 'POST' }),

  updateProfile: (name: string) =>
    request<{ user: User }>('/api/auth/me', {
      method: 'PATCH',
      body: { name },
    }).then((r) => r.user),

  deleteAccount: () => request<{ ok: true }>('/api/auth/me', { method: 'DELETE' }),

  /* --- the conversation, no account needed --- */

  /**
   * Send the whole transcript and get back what to say next — plus the finished video,
   * when there is enough to build one.
   *
   * The transcript lives on the page rather than in a server session: nothing to
   * expire, nothing to clean up, and a reload never loses the thread.
   */
  chat: (
    messages: { role: 'user' | 'assistant'; content: string }[],
    options: {
      format?: string;
      length?: string;
      brandId?: string;
      /** Set once the person has seen the summary and said go. */
      confirmed?: boolean;
      /** The brief they approved, so the conversation is not run twice. */
      brief?: string;
    } = {},
  ) =>
    request<{
      reply: string;
      ready: boolean;
      awaitingConfirm?: boolean;
      summary?: string;
      /** The shape of the film, shown before it is built. */
      plan?: string[];
      brief?: string;
      brand?: { name: string; color?: string; logoId?: string; mode?: 'dark' | 'light' };
      spec?: VideoSpec;
      usedAi: boolean;
    }>('/api/chat', { method: 'POST', body: { messages, ...options } }),

  /**
   * Change a video that already exists.
   *
   * The current plan goes up, not the original prompt — so edits made along the way
   * survive the next instruction instead of being quietly discarded.
   */
  edit: (
    spec: VideoSpec,
    instruction: string,
    brandId?: string,
    /** What has already been asked for, so follow-ups like "now even bolder" work. */
    history: { role: 'user' | 'assistant'; content: string }[] = [],
  ) =>
    request<{ reply: string; spec: VideoSpec; usedAi: boolean }>('/api/edit', {
      method: 'POST',
      body: { spec, instruction, brandId, history },
    }),

  /* --- brand kits --- */

  listBrands: () => request<{ brands: Brand[] }>('/api/brands').then((r) => r.brands),

  createBrand: (brand: Partial<Brand>) =>
    request<{ brand: Brand }>('/api/brands', { method: 'POST', body: brand }).then(
      (r) => r.brand,
    ),

  updateBrand: (id: string, patch: Partial<Brand>) =>
    request<{ brand: Brand }>(`/api/brands/${id}`, {
      method: 'PATCH',
      body: patch,
    }).then((r) => r.brand),

  deleteBrand: (id: string) =>
    request<{ ok: true }>(`/api/brands/${id}`, { method: 'DELETE' }),

  /** Read a brand off its own website. Returns a draft to confirm, saves nothing. */
  importWebsite: (website: string) =>
    request<BrandDraft>('/api/brands/import', { method: 'POST', body: { website } }),

  /** Upload a logo as a data URL. Small files, so JSON beats multipart here. */
  uploadLogo: (dataUrl: string, width?: number, height?: number) =>
    request<{ assetId: string; url: string }>('/api/assets', {
      method: 'POST',
      body: { dataUrl, width, height },
    }),

  /* --- saved videos --- */

  listVideos: () => request<{ videos: Video[] }>('/api/videos').then((r) => r.videos),

  /** Save a spec that already exists — used when signed-out work moves into an account. */
  saveVideo: (spec: VideoSpec, prompt: string) =>
    request<{ video: Video }>('/api/videos', {
      method: 'POST',
      body: { spec, prompt },
    }).then((r) => r.video),

  /** Save an edit made in the editor, exactly as it is. */
  saveSpec: (id: string, spec: VideoSpec) =>
    request<{ video: Video }>(`/api/videos/${id}`, {
      method: 'PATCH',
      body: { spec },
    }).then((r) => r.video),

  refineVideo: (id: string, instruction: string) =>
    request<{ video: Video }>(`/api/videos/${id}`, {
      method: 'PATCH',
      body: { instruction },
    }).then((r) => r.video),

  deleteVideo: (id: string) =>
    request<{ ok: true }>(`/api/videos/${id}`, { method: 'DELETE' }),

  /* --- rendering --- */

  startRender: (spec: VideoSpec) =>
    request<{ jobId: string; totalFrames: number; filename: string }>('/api/render', {
      method: 'POST',
      body: { spec },
    }),

  renderStatus: (jobId: string) =>
    request<RenderProgress>(`/api/render/${jobId}/status`),

  renderFile: async (jobId: string): Promise<Blob> => {
    let response: Response;
    try {
      response = await fetch(`${BASE}/api/render/${jobId}/file`, {
        credentials: 'include',
      });
    } catch {
      throw new ApiOffline();
    }
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new ApiError(response.status, payload?.error ?? 'Could not collect the file.');
    }
    return response.blob();
  },

  /** Is the server up? Used to show honest state rather than a silent failure. */
  health: async (): Promise<boolean> => {
    try {
      const response = await fetch(`${BASE}/health`, {
        signal: AbortSignal.timeout(1500),
      });
      return response.ok;
    } catch {
      return false;
    }
  },
};

/* ---------- small UI helpers ---------- */

/** Initials for the avatar circle. */
export const initials = (user: User): string =>
  user.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

/** Hand a finished file to the browser's downloads. */
export const download = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  // Without revoking, the whole video stays in memory until the tab is closed.
  URL.revokeObjectURL(url);
};
