import { TEMPO } from '@motion/engine';
import type { SpringPresetName } from '@motion/engine';
import type { Tone, VideoStyle } from '@motion/planner';

/**
 * What a tone actually changes.
 *
 * This is the file that stops every video looking the same. Tone is not a colour swap —
 * it changes type scale, weight, tracking, alignment, how hard the motion snaps and how
 * much air sits around everything. Two videos with the same words and different tones
 * should read as different films.
 *
 * Every number here is a design decision, which is why they live together in one table
 * instead of being scattered through the scene components.
 */

export type ToneStyle = {
  /** Multiplier on every headline size. */
  headlineScale: number;
  /** Font weight for headlines. */
  headlineWeight: number;
  /** Letter spacing as a fraction of font size. Negative tightens. */
  tracking: number;
  /** Line height for multi-line headlines. */
  leading: number;
  /** Where content sits by default. */
  align: 'center' | 'left';
  /** How the entrance springs behave. */
  spring: SpringPresetName;
  /** Frames between staggered words. Lower is faster and more urgent. */
  stagger: number;
  /** How far things travel on entry, as a fraction of their size. */
  travel: number;
  /** Blur on entry, in pixels. Zero means hard, immediate arrival. */
  blur: number;
  /** Uppercase headlines? */
  upper: boolean;
  /** Strength of the background glow, 0-1. */
  backdrop: number;
  /**
   * Tempo, in beats per minute.
   *
   * Every entrance in the video is placed on this grid instead of on a hand-typed
   * delay. Hand-typed delays are individually reasonable and collectively arrhythmic,
   * which is most of why the old videos felt loose rather than directed.
   */
  bpm: number;
  /**
   * How much camera movement this tone wants, 0 to 1.
   *
   * Editorial work holds its frame and lets you read; social video never stops moving.
   * Same shot list, different amount of travel.
   */
  motion: number;
};

export const TONES: Record<Tone, ToneStyle> = {
  /** Calm, centred, generous space. The safe professional default. */
  clean: {
    headlineScale: 1,
    headlineWeight: 700,
    tracking: -0.026,
    leading: 1.08,
    align: 'center',
    spring: 'heavy',
    stagger: 3.5,
    travel: 0.55,
    blur: 10,
    upper: false,
    backdrop: 1,
    bpm: TEMPO.clean,
    motion: 0.8,
  },

  /** Heavy type, tight tracking, hard snaps. Sales and urgency. */
  bold: {
    headlineScale: 1.18,
    headlineWeight: 800,
    tracking: -0.042,
    leading: 0.96,
    align: 'center',
    spring: 'snappy',
    stagger: 2,
    travel: 0.35,
    // No blur: bold motion should feel like it was cut, not like it faded up.
    blur: 0,
    upper: true,
    backdrop: 1.4,
    bpm: TEMPO.bold,
    motion: 1,
  },

  /** Left-aligned, slower, more text. Considered and magazine-like. */
  editorial: {
    headlineScale: 0.84,
    headlineWeight: 600,
    tracking: -0.012,
    leading: 1.22,
    align: 'left',
    spring: 'gentle',
    stagger: 4.5,
    travel: 0.3,
    blur: 6,
    upper: false,
    backdrop: 0.55,
    bpm: TEMPO.editorial,
    motion: 0.6,
  },

  /** Big words, quick cuts, scale-driven. Built for vertical social video. */
  kinetic: {
    headlineScale: 1.3,
    headlineWeight: 800,
    tracking: -0.05,
    leading: 0.92,
    align: 'center',
    spring: 'bouncy',
    stagger: 1.5,
    travel: 0.2,
    blur: 0,
    upper: true,
    backdrop: 1.2,
    bpm: TEMPO.kinetic,
    motion: 1,
  },
};

export const toneStyle = (tone: Tone | undefined): ToneStyle => TONES[tone ?? 'clean'];

/**
 * How much camera the chosen direction wants.
 *
 * The references disagree about the camera more than about anything else, and that
 * disagreement is the most useful thing in them:
 *
 * - The typographic film barely moves the camera at all. The frame holds and the content
 *   changes; the colour carries the cut. Adding camera travel to it would be fighting the
 *   thing that makes it work.
 * - The camera-led film has no cuts worth speaking of — the camera IS the edit, pushing
 *   deep into a detail and pulling back to re-establish.
 * - The product-led film pushes into details but does not sail the whole frame around,
 *   because something is already happening inside the frame.
 *
 * It multiplies the tone's own figure rather than replacing it, so an editorial
 * typographic piece is still calmer than a kinetic one. Direction modifies, tone decides.
 */
const STYLE_MOTION: Record<VideoStyle, number> = {
  typographic: 0.45,
  'camera-led': 1.35,
  'product-led': 0.85,
};

/**
 * The tone, adjusted for the direction the film is being made in.
 *
 * One function rather than a second context: the camera already reads `tone.motion`, and
 * every scene already reads the tone, so folding the direction in here means the decision
 * reaches everything that cares without a single new prop. A second channel saying
 * "except, for camera purposes…" is how engines rot.
 */
export const toneFor = (tone: Tone | undefined, style: VideoStyle | undefined): ToneStyle => {
  const base = toneStyle(tone);
  if (!style) return base;
  return { ...base, motion: base.motion * STYLE_MOTION[style] };
};
