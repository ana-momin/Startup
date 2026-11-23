import type { Palette } from './types.ts';

/**
 * Choosing colours.
 *
 * An explicit hex code always wins — a brand colour is not a suggestion, and getting it
 * wrong is the single fastest way to make a video unusable to the person who asked for
 * it. Everything else is a considered default.
 */

export const PALETTES = {
  midnight: {
    bg: '#06070F',
    accent: '#6C9BFF',
    accentSoft: '#A7C2FF',
    text: '#FFFFFF',
    muted: '#8B90A6',
  },
  ember: {
    bg: '#0D0604',
    accent: '#FF7A45',
    accentSoft: '#FFB08A',
    text: '#FFFFFF',
    muted: '#A08A80',
  },
  forest: {
    bg: '#030B08',
    accent: '#3ED598',
    accentSoft: '#8FE9C4',
    text: '#FFFFFF',
    muted: '#7E9A8E',
  },
  violet: {
    bg: '#0A0616',
    accent: '#A87AFF',
    accentSoft: '#C9AEFF',
    text: '#FFFFFF',
    muted: '#948AAE',
  },
  mono: {
    bg: '#0A0A0A',
    accent: '#FFFFFF',
    accentSoft: '#D6D6D6',
    text: '#FFFFFF',
    muted: '#7A7A7A',
  },
  gold: {
    bg: '#0C0A04',
    accent: '#E8B44A',
    accentSoft: '#F5D896',
    text: '#FFFFFF',
    muted: '#9C9078',
  },
} as const satisfies Record<string, Palette>;

export type PaletteName = keyof typeof PALETTES;

/**
 * Words people actually use, mapped to a palette.
 *
 * Both literal colours and moods, because people describe what they want either way:
 * "make it blue" and "make it energetic" are the same kind of instruction.
 */
const WORD_TO_PALETTE: Record<string, PaletteName> = {
  blue: 'midnight',
  navy: 'midnight',
  indigo: 'midnight',
  cool: 'midnight',
  calm: 'midnight',
  corporate: 'midnight',
  professional: 'midnight',
  tech: 'midnight',

  orange: 'ember',
  red: 'ember',
  coral: 'ember',
  warm: 'ember',
  energetic: 'ember',
  urgent: 'ember',
  fiery: 'ember',

  green: 'forest',
  mint: 'forest',
  emerald: 'forest',
  eco: 'forest',
  sustainable: 'forest',
  finance: 'forest',
  growth: 'forest',

  purple: 'violet',
  violet: 'violet',
  lilac: 'violet',
  creative: 'violet',
  playful: 'violet',
  magical: 'violet',

  black: 'mono',
  white: 'mono',
  minimal: 'mono',
  minimalist: 'mono',
  mono: 'mono',
  monochrome: 'mono',
  elegant: 'mono',
  clean: 'mono',

  gold: 'gold',
  amber: 'gold',
  luxury: 'gold',
  premium: 'gold',
};

export const pickPalette = (lower: string): Palette => {
  const hex = lower.match(/#([0-9a-f]{6}|[0-9a-f]{3})\b/);
  if (hex) return fromBrandColour(normaliseHex(hex[0]));

  for (const [word, name] of Object.entries(WORD_TO_PALETTE)) {
    if (new RegExp(`\\b${word}\\b`).test(lower)) return PALETTES[name];
  }
  return PALETTES.midnight;
};

/**
 * Build a full palette around one brand colour.
 *
 * The background is darkened *toward* the brand colour rather than left neutral black,
 * so the accent looks like it belongs in the frame instead of sitting on top of it.
 */
const fromBrandColour = (accent: string): Palette => ({
  bg: mix(accent, '#000000', 0.94),
  accent,
  accentSoft: mix(accent, '#FFFFFF', 0.42),
  text: '#FFFFFF',
  muted: mix(accent, '#8B90A6', 0.75),
});

/* ---------- colour maths ---------- */

const normaliseHex = (hex: string): string => {
  const value = hex.replace('#', '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value;
  return `#${full.toUpperCase()}`;
};

/** Blend two hex colours. `amount` is how far to move from the first toward the second. */
const mix = (from: string, to: string, amount: number): string => {
  const a = parse(from);
  const b = parse(to);
  const channel = (x: number, y: number) =>
    Math.round(x + (y - x) * amount)
      .toString(16)
      .padStart(2, '0');
  return `#${channel(a.r, b.r)}${channel(a.g, b.g)}${channel(a.b, b.b)}`.toUpperCase();
};

const parse = (hex: string) => {
  const v = hex.replace('#', '');
  return {
    r: parseInt(v.slice(0, 2), 16),
    g: parseInt(v.slice(2, 4), 16),
    b: parseInt(v.slice(4, 6), 16),
  };
};
