import type { EasingFn } from './easing';
import { linear } from './easing';

export type ExtrapolateMode = 'clamp' | 'extend' | 'identity';

export type InterpolateOptions = {
  /** What to do before the first input value. Default: 'extend'. */
  extrapolateLeft?: ExtrapolateMode;
  /** What to do after the last input value. Default: 'extend'. */
  extrapolateRight?: ExtrapolateMode;
  /** Curve applied inside each segment. Default: linear. */
  easing?: EasingFn;
};

/**
 * Map a number from one range onto another.
 *
 * This is the single most-used function in the whole engine. Almost every animation is
 * "as the frame goes from A to B, move this value from X to Y".
 *
 *   const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
 *
 * Supports multi-point ranges for keyframe-style motion:
 *
 *   interpolate(frame, [0, 30, 60], [0, 100, 0])   // up, then back down
 */
export const interpolate = (
  input: number,
  inputRange: readonly number[],
  outputRange: readonly number[],
  options: InterpolateOptions = {},
): number => {
  if (inputRange.length !== outputRange.length) {
    throw new Error(
      `interpolate(): inputRange (${inputRange.length}) and outputRange (${outputRange.length}) must be the same length.`,
    );
  }
  if (inputRange.length < 2) {
    throw new Error('interpolate(): ranges need at least two values.');
  }

  const {
    extrapolateLeft = 'extend',
    extrapolateRight = 'extend',
    easing = linear,
  } = options;

  // Find which segment of the range we are sitting in.
  let i = 0;
  const last = inputRange.length - 1;
  for (; i < last - 1; i++) {
    if (input <= inputRange[i + 1]) break;
  }

  const inMin = inputRange[i];
  const inMax = inputRange[i + 1];
  const outMin = outputRange[i];
  const outMax = outputRange[i + 1];

  // A zero-width segment would divide by zero; just hold the value.
  if (inMin === inMax) return outMin;

  // Progress through this segment, 0 to 1.
  let progress = (input - inMin) / (inMax - inMin);

  // Handle values that fall outside the whole range.
  if (input < inputRange[0]) {
    if (extrapolateLeft === 'clamp') return outputRange[0];
    if (extrapolateLeft === 'identity') return input;
  }
  if (input > inputRange[last]) {
    if (extrapolateRight === 'clamp') return outputRange[last];
    if (extrapolateRight === 'identity') return input;
  }

  progress = easing(progress);
  return outMin + progress * (outMax - outMin);
};

/** Keep a number inside a range. */
export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/**
 * Interpolate between two colors. Accepts #rgb, #rrggbb, #rrggbbaa and rgb()/rgba().
 * Returns an rgba() string.
 *
 * Needed because brand colors are the whole point — a video that gets the client's
 * blue wrong is a video the client will not use.
 */
export const interpolateColors = (
  input: number,
  inputRange: readonly number[],
  colors: readonly string[],
  options: InterpolateOptions = {},
): string => {
  const parsed = colors.map(parseColor);

  const r = interpolate(input, inputRange, parsed.map((c) => c.r), options);
  const g = interpolate(input, inputRange, parsed.map((c) => c.g), options);
  const b = interpolate(input, inputRange, parsed.map((c) => c.b), options);
  const a = interpolate(input, inputRange, parsed.map((c) => c.a), options);

  const round = (n: number) => Math.round(clamp(n, 0, 255));
  return `rgba(${round(r)}, ${round(g)}, ${round(b)}, ${clamp(a, 0, 1).toFixed(3)})`;
};

type RGBA = { r: number; g: number; b: number; a: number };

const parseColor = (color: string): RGBA => {
  const value = color.trim();

  if (value.startsWith('#')) {
    let hex = value.slice(1);
    // Expand shorthand: #abc -> #aabbcc
    if (hex.length === 3 || hex.length === 4) {
      hex = hex.split('').map((ch) => ch + ch).join('');
    }
    if (hex.length !== 6 && hex.length !== 8) {
      throw new Error(`interpolateColors(): cannot read color "${color}".`);
    }
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1,
    };
  }

  const match = value.match(/rgba?\(([^)]+)\)/i);
  if (match) {
    const parts = match[1].split(/[,/\s]+/).filter(Boolean).map(Number);
    return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
  }

  throw new Error(`interpolateColors(): cannot read color "${color}".`);
};
