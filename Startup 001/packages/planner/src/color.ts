/**
 * Colour science.
 *
 * This is the file that delivers the promise the product was founded on: *your* brand
 * colours, and a video that still looks professional.
 *
 * Those two things fight each other. A real brand colour is chosen for a logo on white
 * paper, not for 120px type moving across a dark frame. Used literally, half of them
 * are illegible: a pale yellow disappears, a navy vanishes into the background, a
 * mid-grey does both depending on the scene.
 *
 * The move is to keep the **hue** — which is what people actually recognise as "their"
 * colour — and adjust only lightness and saturation until it is readable. Nobody can
 * tell you lightened their orange by 12%. Everybody can tell you made their video
 * unreadable.
 */

export type Rgb = { r: number; g: number; b: number };
export type Hsl = { h: number; s: number; l: number };

/* ---------- parsing and formatting ---------- */

export const parseHex = (hex: string): Rgb | null => {
  const value = hex.trim().replace(/^#/, '');

  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value.slice(0, 6);

  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;

  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
};

export const toHex = ({ r, g, b }: Rgb): string =>
  `#${[r, g, b]
    .map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;

/** Accepts "rgb(12, 34, 56)" and "rgba(...)" as well as hex — browsers report both. */
export const parseColor = (value: string): Rgb | null => {
  const text = value.trim();
  if (text.startsWith('#')) return parseHex(text);

  const match = text.match(/rgba?\(([^)]+)\)/i);
  if (!match) return null;

  const parts = match[1].split(/[,/\s]+/).filter(Boolean).map(Number);
  if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return null;

  // A fully transparent colour is not a colour anyone chose; it is the absence of one.
  if (parts.length >= 4 && parts[3] < 0.5) return null;

  return { r: parts[0], g: parts[1], b: parts[2] };
};

/* ---------- HSL ---------- */

export const toHsl = ({ r, g, b }: Rgb): Hsl => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
  }
  h = (h * 60 + 360) % 360;

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return { h, s, l };
};

export const fromHsl = ({ h, s, l }: Hsl): Rgb => {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  const [r, g, b] =
    h < 60 ? [c, x, 0]
    : h < 120 ? [x, c, 0]
    : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c]
    : h < 300 ? [x, 0, c]
    : [c, 0, x];

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
};

/* ---------- contrast ---------- */

/**
 * Relative luminance, as the accessibility standard defines it.
 *
 * Not the average of the channels: human eyes are far more sensitive to green than to
 * blue, which is why the weights are so lopsided. A naive average rates pure blue and
 * pure green as equally bright, and produces text nobody can read.
 */
export const luminance = ({ r, g, b }: Rgb): number => {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

/** Contrast ratio between two colours: 1 is identical, 21 is black on white. */
export const contrast = (a: Rgb, b: Rgb): number => {
  const la = luminance(a);
  const lb = luminance(b);
  const [light, dark] = la > lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
};

/**
 * Minimum contrast we hold ourselves to.
 *
 * The accessibility standard asks 4.5 for body text and 3 for large text. Almost
 * everything in a motion graphic is large text, but an accent that only just clears 3
 * looks weak on a moving background, so headline colour aims higher.
 */
export const MIN_CONTRAST = {
  /** Headline against background. */
  text: 7,
  /** Accent against background — it has to read as a highlight, not a stain. */
  accent: 4.5,
  /** Supporting text: dimmer on purpose, but still readable. */
  muted: 3.5,
} as const;

/**
 * Push a colour toward readable, keeping its hue.
 *
 * Lightness moves in small steps until the contrast target is met. Saturation is nudged
 * up slightly as it lightens, because a colour lightened in HSL alone drifts toward
 * pastel and stops looking like the brand.
 */
export const ensureContrast = (
  color: Rgb,
  against: Rgb,
  target: number,
  direction?: 'lighter' | 'darker',
): Rgb => {
  if (contrast(color, against) >= target) return color;

  const hsl = toHsl(color);
  // Move away from the background: lighten on dark, darken on light.
  const goLighter = direction === 'lighter'
    ? true
    : direction === 'darker'
      ? false
      : luminance(against) < 0.25;

  let best = color;
  let bestRatio = contrast(color, against);

  for (let step = 1; step <= 40; step++) {
    const shift = step * 0.02;
    const l = clamp(goLighter ? hsl.l + shift : hsl.l - shift, 0.03, 0.97);
    // Keep some bite as it moves, or the brand colour turns into a pastel smear.
    const s = clamp(hsl.s + shift * 0.25, 0, 1);

    const candidate = fromHsl({ h: hsl.h, s, l });
    const ratio = contrast(candidate, against);

    if (ratio > bestRatio) {
      best = candidate;
      bestRatio = ratio;
    }
    if (ratio >= target) return candidate;
  }

  // Even at the extremes it could not reach the target — return the closest we found
  // rather than the original, which was worse.
  return best;
};

/* ---------- mixing ---------- */

export const mix = (from: Rgb, to: Rgb, amount: number): Rgb => {
  const t = clamp(amount, 0, 1);
  return {
    r: from.r + (to.r - from.r) * t,
    g: from.g + (to.g - from.g) * t,
    b: from.b + (to.b - from.b) * t,
  };
};

/** Is this colour dark enough that white text sits comfortably on it? */
export const isDark = (color: Rgb): boolean => luminance(color) < 0.3;

/* ---------- picking from a crowd ---------- */

/**
 * Choose the most brand-like colour from a list scraped off a website.
 *
 * A page yields dozens of colours, most of them greys, near-blacks and near-whites
 * belonging to text and borders. The brand colour is the one with actual chroma —
 * saturated, mid-lightness, and used deliberately. Ranking by that beats "most
 * frequent", which almost always returns the body-text grey.
 */
export const pickBrandColor = (colors: string[]): string | null =>
  rankBrandColors(colors)[0] ?? null;

/**
 * Every colour on a page that could plausibly be the brand's, best first.
 *
 * Returning a ranked list rather than one answer is the honest shape for this problem.
 * A site has several real brand colours and no heuristic reliably picks the one
 * somebody means — but showing six and letting them tap one takes a single click and
 * is right every time.
 */
export const rankBrandColors = (colors: string[], limit = 6): string[] => {
  const counts = new Map<string, number>();

  for (const raw of colors) {
    const rgb = parseColor(raw);
    if (!rgb) continue;
    const key = toHex(rgb);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const scored = [...counts.entries()]
    .map(([hex, count]) => {
      const rgb = parseHex(hex)!;
      const { h, s, l } = toHsl(rgb);

      if (!hasCharacter(rgb)) return { hex, score: -1 };

      // Favour saturated colours in the middle of the lightness range, where a brand
      // colour almost always lives.
      const lightnessFit = 1 - Math.abs(l - 0.5) * 1.6;

      // Repetition is a weak signal on its own — the body-text grey repeats most — but
      // among colours that already have character, the one used often is the brand one.
      const repetition = Math.min(count, 8) / 8;

      // Hues around pure red are common in error states, so a warning banner should not
      // beat a real brand blue.
      const penalty = h > 350 || h < 8 ? 0.3 : 0;

      return { hex, score: s * 1.6 + lightnessFit + repetition * 0.5 - penalty };
    })
    .filter((entry) => entry.score > 0.9)
    .sort((a, b) => b.score - a.score);

  // Drop colours that are nearly the same as one already chosen, so the list is six
  // genuinely different options rather than six shades of the same blue.
  const picked: string[] = [];
  for (const { hex } of scored) {
    const rgb = parseHex(hex)!;
    if (picked.every((existing) => distance(parseHex(existing)!, rgb) > 60)) {
      picked.push(hex);
    }
    if (picked.length >= limit) break;
  }

  return picked;
};

/** Straight-line distance in RGB space. Crude, but good enough to spot near-duplicates. */
const distance = (a: Rgb, b: Rgb): number =>
  Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);

/**
 * Does this colour say anything about a brand?
 *
 * Greys, near-blacks and near-whites are structure — page backgrounds, body text,
 * borders. Genuinely monochrome brands do exist, and for them the honest answer is
 * "no brand colour found" rather than the least-grey grey on the page.
 */
export const hasCharacter = (color: Rgb): boolean => {
  const { s, l } = toHsl(color);
  return s >= 0.25 && l >= 0.1 && l <= 0.9;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);
