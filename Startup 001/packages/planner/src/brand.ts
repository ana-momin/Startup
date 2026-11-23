import {
  contrast,
  ensureContrast,
  fromHsl,
  isDark,
  MIN_CONTRAST,
  mix,
  parseHex,
  toHex,
  toHsl,
} from './color.ts';
import type { Rgb } from './color.ts';
import type { Palette, Tone } from './types.ts';

/**
 * A brand.
 *
 * Everything we know about who this video is for. It is deliberately small: a logo, a
 * colour, a few sentences. Asking someone to fill in a twenty-field brand questionnaire
 * before they can make one video is how a tool gets abandoned on the first screen.
 *
 * Note what is *not* here: nothing about timing, motion or layout. A brand says what it
 * looks like and sounds like. How it *moves* is our craft, and a brand kit is not the
 * place to give that away.
 */
export type Brand = {
  id: string;
  name: string;
  /** What the company does, in their words. Feeds the copywriter. */
  description?: string;
  /** Who they are talking to. Changes register more than any other single field. */
  audience?: string;
  /** How they sound: "warm and plain", "sharp, technical, no fluff". */
  voice?: string;
  /** The brand colour, as given. Never used raw — see paletteFor. */
  color?: string;
  /** Light or dark backgrounds. */
  mode?: 'dark' | 'light';
  /** Preferred visual tone, when they have an opinion. */
  tone?: Tone;
  website?: string;
  /** Id of the stored logo image, if there is one. */
  logoId?: string;
  /** Things to never say. Real brands have these and they matter. */
  avoid?: string;
};

/** The subset the video pipeline actually reads. */
export type BrandContext = Pick<
  Brand,
  'name' | 'description' | 'audience' | 'voice' | 'color' | 'mode' | 'tone' | 'avoid' | 'logoId'
>;

/* ---------- palette ---------- */

const WHITE: Rgb = { r: 255, g: 255, b: 255 };
const BLACK: Rgb = { r: 10, g: 10, b: 12 };

/**
 * Build a complete, legible palette from one brand colour.
 *
 * This is the function the whole personalisation promise rests on. Given any colour a
 * customer hands us — including the genuinely difficult ones, pale yellow, near-black
 * navy, neon lime — it returns five colours that work together on screen and still
 * read as theirs.
 *
 * The background is built from the brand hue rather than left neutral, which is what
 * makes a video feel like it belongs to the brand instead of having the brand stamped
 * on top of it. Everything after that is checked against it and corrected.
 */
export const paletteFor = (brand: BrandContext | undefined, fallback: Palette): Palette => {
  const base = brand?.color ? parseHex(brand.color) : null;
  const dark = brand?.mode !== 'light';

  if (!base) {
    // Some brands genuinely have no colour — Linear and Vercel are black and white on
    // purpose. Handing them our default blue would be inventing an identity they
    // deliberately do not have. A monochrome brand gets a monochrome palette.
    return brand?.mode ? monochrome(dark) : fallback;
  }

  const hsl = toHsl(base);

  // A background tinted with the brand hue. Very low lightness and gently desaturated,
  // so it reads as atmosphere rather than as a coloured block.
  const bg = dark
    ? fromHsl({ h: hsl.h, s: Math.min(hsl.s * 0.55, 0.4), l: 0.055 })
    : fromHsl({ h: hsl.h, s: Math.min(hsl.s * 0.25, 0.18), l: 0.965 });

  // Text is whichever of black or white the background can actually carry.
  const text = isDark(bg) ? WHITE : BLACK;

  // The brand colour, moved only as far as it has to be to be seen.
  const accent = ensureContrast(base, bg, MIN_CONTRAST.accent, dark ? 'lighter' : 'darker');

  // A softer partner for secondary emphasis — pulled toward the text colour so the two
  // accents read as a family rather than as two unrelated colours.
  const accentSoft = ensureContrast(
    mix(accent, text, 0.45),
    bg,
    MIN_CONTRAST.accent,
    dark ? 'lighter' : 'darker',
  );

  // Supporting text: dimmer on purpose, but never below readable.
  const muted = ensureContrast(mix(text, bg, 0.52), bg, MIN_CONTRAST.muted);

  return {
    bg: toHex(bg),
    accent: toHex(accent),
    accentSoft: toHex(accentSoft),
    text: toHex(text),
    muted: toHex(muted),
  };
};

/** Black and white, done properly: still layered, still readable, just without hue. */
const monochrome = (dark: boolean): Palette =>
  dark
    ? {
        bg: '#0A0A0A',
        accent: '#FFFFFF',
        accentSoft: '#C9C9C9',
        text: '#FFFFFF',
        muted: '#8A8A8A',
      }
    : {
        bg: '#FAFAFA',
        accent: '#111111',
        accentSoft: '#4A4A4A',
        text: '#0A0A0A',
        muted: '#6E6E6E',
      };

/**
 * A report on what we had to change, and why.
 *
 * Shown in the brand editor. Silently correcting somebody's brand colour and saying
 * nothing is the kind of thing that destroys trust the moment they notice — telling
 * them plainly turns the same act into expertise.
 */
export type PaletteReport = {
  adjusted: boolean;
  original?: string;
  used?: string;
  /** Contrast of the original against the background we chose. */
  originalContrast?: number;
  reason?: string;
};

export const reportFor = (brand: BrandContext | undefined, palette: Palette): PaletteReport => {
  const base = brand?.color ? parseHex(brand.color) : null;
  const bg = parseHex(palette.bg);
  if (!base || !bg) return { adjusted: false };

  const original = toHex(base);
  if (original === palette.accent) return { adjusted: false };

  const ratio = contrast(base, bg);

  return {
    adjusted: true,
    original,
    used: palette.accent,
    originalContrast: Math.round(ratio * 10) / 10,
    reason:
      ratio < MIN_CONTRAST.accent
        ? `Your colour scores ${ratio.toFixed(1)}:1 against this background — too low to read on screen. We kept the hue and lifted it to ${MIN_CONTRAST.accent}:1.`
        : 'Adjusted slightly so it stays readable while the background moves.',
  };
};

/* ---------- the copywriter's brief ---------- */

/**
 * Turn a brand into instructions for the model writing the copy.
 *
 * The colour half of personalisation is arithmetic. This half is the one people
 * actually notice: a video that uses their words, talks to their customers, and avoids
 * the things they have told everyone never to say.
 */
export const brandBriefing = (brand: BrandContext | undefined): string => {
  if (!brand) return '';

  const lines: string[] = [];

  if (brand.name) lines.push(`Brand name: ${brand.name}`);
  if (brand.description) lines.push(`What they do: ${brand.description}`);
  if (brand.audience) lines.push(`Who they are talking to: ${brand.audience}`);
  if (brand.voice) lines.push(`How they sound: ${brand.voice}`);
  if (brand.avoid) lines.push(`Never say: ${brand.avoid}`);

  if (lines.length === 0) return '';

  return [
    'BRAND CONTEXT — write as this brand, not as a generic marketer.',
    ...lines,
    '',
    'VOICE IS A HARD CONSTRAINT, NOT A SUGGESTION.',
    'Read "How they sound" again and obey it literally. If it says no exclamation marks,',
    'use none. If it says plain, write no slogans and no wordplay. If it lists words to',
    'never say, those words and their close synonyms must not appear anywhere.',
    'A brand that asked for quiet copy and got hype will not use the video at all.',
    '',
    'Use the brand name where it belongs. Everything in the earlier rules still applies —',
    'most importantly, do not invent facts about them that are not written above.',
  ].join('\n');
};
