import { paletteFor } from '@motion/planner';
import type {
  BrandContext,
  FormatName,
  ListLayout,
  Motif,
  Palette,
  ScenePlan,
  TitleLayout,
  Tone,
  VideoSpec,
} from '@motion/planner';

/**
 * Making a model's answer safe to render.
 *
 * Everything here treats the model as untrusted input, because it is. A model will
 * occasionally return a forty-word headline, a scene type that does not exist, a string
 * where a number belongs, or a palette with no background. None of that should reach a
 * renderer — a video that silently comes out broken is worse than one that comes out
 * plain.
 *
 * Shared by the director (making a video) and the editor (changing one), so the rules
 * about what a valid video is live in exactly one place.
 */

/* ---------- whole spec ---------- */

export const normaliseSpec = (
  value: unknown,
  base: VideoSpec,
  brand?: BrandContext,
): VideoSpec => {
  const raw = (value ?? {}) as Record<string, unknown>;

  const tone = asTone(raw.tone) ?? base.tone;
  const format = asFormat(raw.format) ?? base.format;
  const scenes = asScenes(raw.scenes, base.fps);

  // The brand's colours are not the model's to change. Anything it returns is ignored
  // in favour of the checked palette — a model asked to "make it warmer" will happily
  // hand back an unreadable pair.
  const palette = brand?.color
    ? paletteFor(brand, base.palette)
    : (asPalette(raw.palette) ?? base.palette);

  return {
    ...base,
    title: asTitle(raw.title) ?? base.title,
    tone,
    motif: asMotif(raw.motif) ?? base.motif,
    format,
    palette,
    scenes: scenes.length > 0 ? scenes : base.scenes,
  };
};

/* ---------- scenes ---------- */

export const asScenes = (value: unknown, fps: number): ScenePlan[] => {
  const list = Array.isArray(value) ? value : [];
  const scenes: ScenePlan[] = [];

  for (const entry of list.slice(0, 10)) {
    const scene = asScene(entry, fps);
    if (scene) scenes.push(scene);
  }

  return scenes;
};

const asScene = (value: unknown, fps: number): ScenePlan | null => {
  if (!value || typeof value !== 'object') return null;
  const s = value as Record<string, unknown>;

  // Two seconds is the floor for anything with words on it: below that the viewer sees
  // it rather than reads it.
  const duration = clampFrames(s.duration, fps);

  switch (s.kind) {
    case 'title': {
      const headline = words(s.headline, 9);
      if (!headline) return null;
      return {
        kind: 'title',
        badge: words(s.badge, 3) || undefined,
        headline,
        sub: words(s.sub, 16) || undefined,
        layout: asTitleLayout(s.layout),
        duration,
      };
    }

    case 'bigword': {
      const list = items(s.words, 4, 5);
      if (list.length < 2) return null;
      return { kind: 'bigword', words: list, duration };
    }

    case 'features':
    case 'steps': {
      const list = items(s.items, 6, 4);
      if (list.length === 0) return null;
      const heading =
        words(s.heading, 5) || (s.kind === 'steps' ? 'How it works' : "What's inside");

      return s.kind === 'steps'
        ? { kind: 'steps', heading, items: list, duration }
        : { kind: 'features', heading, items: list, layout: asListLayout(s.layout), duration };
    }

    case 'stat': {
      const value = Number(s.value);
      if (!Number.isFinite(value) || value === 0) return null;
      return {
        kind: 'stat',
        prefix: typeof s.prefix === 'string' ? s.prefix.slice(0, 2) : undefined,
        value,
        suffix:
          typeof s.suffix === 'string' ? s.suffix.slice(0, 2).toLowerCase() : undefined,
        label: words(s.label, 5) || 'And counting',
        duration,
      };
    }

    case 'quote': {
      const quote = words(s.quote, 30);
      if (!quote) return null;
      return {
        kind: 'quote',
        quote,
        author: words(s.author, 6) || undefined,
        duration,
      };
    }

    case 'logo': {
      const name = words(s.name, 4);
      if (!name) return null;
      return { kind: 'logo', name, tagline: words(s.tagline, 7) || undefined, duration };
    }

    case 'outro':
      return {
        kind: 'outro',
        headline: words(s.headline, 6) || 'Get started today',
        cta: words(s.cta, 5) || undefined,
        duration,
      };

    default:
      return null;
  }
};

/* ---------- fields ---------- */

export const asTone = (value: unknown): Tone | undefined =>
  value === 'clean' || value === 'bold' || value === 'editorial' || value === 'kinetic'
    ? value
    : undefined;

export const asMotif = (value: unknown): Motif | undefined =>
  value === 'none' ||
  value === 'grid' ||
  value === 'dots' ||
  value === 'rings' ||
  value === 'beams' ||
  value === 'scan'
    ? value
    : undefined;

export const asFormat = (value: unknown): FormatName | undefined =>
  value === 'landscape' || value === 'vertical' || value === 'square' ? value : undefined;

const asTitleLayout = (value: unknown): TitleLayout | undefined =>
  value === 'center' || value === 'left' || value === 'stack' ? value : undefined;

const asListLayout = (value: unknown): ListLayout | undefined =>
  value === 'center' || value === 'left' || value === 'grid' ? value : undefined;

export const asTitle = (value: unknown): string | undefined => {
  const text = typeof value === 'string' ? value.trim() : '';
  if (text.length === 0) return undefined;
  return text.split(/\s+/).slice(0, 5).join(' ').slice(0, 60);
};

/** A palette is only accepted whole — a half-filled one produces invisible text. */
const asPalette = (value: unknown): Palette | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const p = value as Record<string, unknown>;

  const keys = ['bg', 'accent', 'accentSoft', 'text', 'muted'] as const;
  const result: Record<string, string> = {};

  for (const key of keys) {
    const hex = typeof p[key] === 'string' ? (p[key] as string).trim() : '';
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return undefined;
    result[key] = hex.toUpperCase();
  }

  return result as unknown as Palette;
};

const clampFrames = (value: unknown, fps: number): number => {
  const frames = Number(value);
  if (!Number.isFinite(frames)) return Math.round(fps * 3);
  return Math.round(Math.min(Math.max(frames, fps * 1.4), fps * 20));
};

/* ---------- text cleaning ---------- */

export const words = (value: unknown, max: number): string => {
  if (typeof value !== 'string') return '';

  const cleaned = value
    .replace(/\s+/g, ' ')
    // Models reach for typographic characters that render as tofu in some fonts:
    // soft hyphens, non-breaking hyphens, curly quotes, ellipsis.
    .replace(/[­​]/g, '')
    .replace(/[‐‑]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .trim();

  if (cleaned.length === 0) return '';
  return cleaned.split(' ').slice(0, max).join(' ').slice(0, 180);
};

export const items = (value: unknown, maxWords: number, maxItems: number): string[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();

  return value
    .map((v) => words(v, maxWords))
    .filter((v) => {
      if (v.length < 2) return false;
      const key = v.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, maxItems);
};
