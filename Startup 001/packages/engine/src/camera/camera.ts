import { Easing } from '../animation/easing';
import type { EasingFn } from '../animation/easing';

/**
 * The camera.
 *
 * Up to now a scene was a flat picture and a cut was a crossfade. That is a slideshow,
 * however good the typography on each slide is. What separates motion graphics from a
 * slideshow is that the content sits in a *space* and something moves through it — so a
 * cut becomes travel, and depth becomes real because near things move more than far
 * things.
 *
 * The camera never touches the content. It publishes where it is looking from, and each
 * layer decides how much of that to obey based on how far away it is. That is the whole
 * trick, and it is why adding depth to a scene costs one prop rather than a rewrite.
 */

export type CameraState = {
  /**
   * Horizontal position, as a fraction of the frame's width.
   *
   * Written in fractions rather than pixels so the same move works in 1920×1080 and
   * 1080×1920 without a second set of numbers. 0.1 means the camera has moved right by
   * a tenth of a frame, so the world slides a tenth of a frame left.
   */
  x: number;
  /** Vertical position, as a fraction of the frame's height. */
  y: number;
  /** 1 is neutral. 1.2 is pushed 20% closer. Below 1 pulls back. */
  zoom: number;
  /** Roll, in degrees. Fractions of a degree only — more reads as a mistake. */
  rotate: number;
};

export const NEUTRAL: CameraState = { x: 0, y: 0, zoom: 1, rotate: 0 };

/**
 * One moment in a camera move.
 *
 * Channels are optional: leave `zoom` out of a pan and it holds whatever the previous
 * keyframe set it to. Writing a move should mean saying what changes, not restating
 * everything that doesn't.
 */
export type CameraKeyframe = Partial<CameraState> & {
  /** Frame within the scene. */
  at: number;
  /** Curve used to reach this keyframe from the one before it. */
  easing?: EasingFn;
};

/**
 * Where the camera is at a given frame.
 *
 * Each channel is interpolated separately with the *incoming* keyframe's easing, which
 * is how a camera can glide horizontally while snapping its zoom. One easing shared
 * across the whole move is what makes synthetic camera work feel like a CSS transition.
 */
export const resolveCamera = (frame: number, keyframes: CameraKeyframe[]): CameraState => {
  if (keyframes.length === 0) return NEUTRAL;

  const track = fillForward(keyframes);

  if (frame <= track[0].at) return stateOf(track[0]);
  const last = track[track.length - 1];
  if (frame >= last.at) return stateOf(last);

  // Which pair of keyframes are we between?
  let i = 0;
  while (i < track.length - 2 && frame > track[i + 1].at) i += 1;

  const from = track[i];
  const to = track[i + 1];
  const span = to.at - from.at;
  const progress = span <= 0 ? 1 : (frame - from.at) / span;
  const eased = (to.easing ?? Easing.standard)(clamp01(progress));

  return {
    x: mix(from.x, to.x, eased),
    y: mix(from.y, to.y, eased),
    zoom: mix(from.zoom, to.zoom, eased),
    rotate: mix(from.rotate, to.rotate, eased),
  };
};

type FullKeyframe = CameraState & { at: number; easing?: EasingFn };

/**
 * Give every keyframe a value for every channel.
 *
 * A channel that was never mentioned holds the last value somebody did mention, falling
 * back to neutral at the start. Without this, an omitted `zoom` would read as zero and
 * collapse the scene to a point — the kind of bug that looks like the renderer broke.
 */
const fillForward = (keyframes: CameraKeyframe[]): FullKeyframe[] => {
  const sorted = [...keyframes].sort((a, b) => a.at - b.at);
  let carried: CameraState = NEUTRAL;

  return sorted.map((kf) => {
    const merged: CameraState = {
      x: kf.x ?? carried.x,
      y: kf.y ?? carried.y,
      zoom: kf.zoom ?? carried.zoom,
      rotate: kf.rotate ?? carried.rotate,
    };
    carried = merged;
    return { ...merged, at: kf.at, easing: kf.easing };
  });
};

const stateOf = (kf: FullKeyframe): CameraState => ({
  x: kf.x,
  y: kf.y,
  zoom: kf.zoom,
  rotate: kf.rotate,
});

const mix = (a: number, b: number, t: number): number => a + (b - a) * t;
const clamp01 = (t: number): number => Math.min(Math.max(t, 0), 1);

/* ============================ moves ============================ */

/**
 * The direction a shot travels.
 *
 * Direction is what makes consecutive scenes read as one continuous space: if a scene
 * leaves travelling right and the next one arrives still travelling right, the viewer
 * reads a single camera passing through two places rather than two unrelated slides.
 */
export type Direction = 'left' | 'right' | 'up' | 'down' | 'in' | 'out';

const AXIS: Record<Direction, { x: number; y: number; zoom: number }> = {
  left: { x: -1, y: 0, zoom: 0 },
  right: { x: 1, y: 0, zoom: 0 },
  up: { x: 0, y: -1, zoom: 0 },
  down: { x: 0, y: 1, zoom: 0 },
  in: { x: 0, y: 0, zoom: 1 },
  out: { x: 0, y: 0, zoom: -1 },
};

type MoveOptions = {
  /** Length of the shot, in frames. */
  duration: number;
  /** How far it travels. 1 is a normal move; 0.4 is barely perceptible. */
  strength?: number;
};

/**
 * A shot that never stops moving.
 *
 * It starts short of its mark, passes through neutral in the middle, and carries on
 * past — so the frame is drifting at every moment including the cut. A camera that
 * arrives and then sits perfectly still is the thing that makes motion graphics look
 * like a PowerPoint transition: the movement is *decoration* on a static picture rather
 * than the picture being alive.
 */
export const travel = (
  direction: Direction,
  { duration, strength = 1 }: MoveOptions,
): CameraKeyframe[] => {
  const axis = AXIS[direction];
  /*
   * How far a shot travels.
   *
   * These started at roughly half these numbers, which is the right amount for a brand
   * film watched on a cinema screen and almost nothing on a laptop in a browser tab. A
   * move that is technically present and perceptually absent is worse than no move at
   * all, because it costs render time and buys nothing. Pans still read as larger than
   * zooms at the same number, so they get less of it.
   */
  const reach = 0.2 * strength;
  const depth = 0.24 * strength;

  const offset = (sign: number) => ({
    x: axis.x * reach * sign,
    y: axis.y * reach * sign,
    zoom: 1 + axis.zoom * depth * sign,
  });

  return [
    { at: 0, ...offset(-1), easing: Easing.linear },
    // Reaching its mark before the midpoint, then continuing, keeps the interesting
    // part of the move under the words rather than after them.
    { at: Math.round(duration * 0.45), ...offset(0), easing: Easing.easeOutQuart },
    { at: duration, ...offset(0.55), easing: Easing.easeInOutQuad },
  ];
};

/**
 * A slow push toward the subject across the whole shot.
 *
 * The most useful shot in the language: it adds pressure without asking the viewer to
 * look anywhere new, so it works under a headline that has to be read.
 */
/*
 * Moves in. A tenth, not a third.
 *
 * These were 0.91 → 1.20 and 1.26 → 0.96: a twenty-nine and a thirty per cent change of
 * scale inside a single scene. Watching the preview, that does not read as a camera
 * move — it reads as the picture being pulled towards you, continuously, for the whole
 * film, and it was the first thing anybody noticed about the player.
 *
 * The reference films were measured at roughly 0.3% of the frame per fifth of a second,
 * which over a four-second shot is about six per cent in total. Ours was five times
 * that. A camera move you notice as a move has already failed; the point of a push is
 * that the subject feels closer at the end than it did at the start, and ten per cent
 * does that without the viewer ever being able to say when it happened.
 */
export const push = ({ duration, strength = 1 }: MoveOptions): CameraKeyframe[] => [
  { at: 0, zoom: 1 - 0.03 * strength, easing: Easing.linear },
  { at: duration, zoom: 1 + 0.07 * strength, easing: Easing.easeInOutQuad },
];

/** The reverse: opens out, letting the subject settle into its space. */
export const pull = ({ duration, strength = 1 }: MoveOptions): CameraKeyframe[] => [
  { at: 0, zoom: 1 + 0.09 * strength, easing: Easing.linear },
  { at: duration, zoom: 1 - 0.015 * strength, easing: Easing.easeOutQuart },
];

/**
 * Lands hard, then keeps breathing.
 *
 * Anticipation, impact, follow-through — the three beats every animator is taught. The
 * overshoot past the target and the drift back is what gives the landing weight. Use it
 * where a single word or number has to hit.
 */
export const impact = ({ duration, strength = 1 }: MoveOptions): CameraKeyframe[] => [
  { at: 0, zoom: 1 + 0.34 * strength, rotate: -1.1 * strength, easing: Easing.linear },
  { at: Math.round(duration * 0.14), zoom: 1 - 0.06 * strength, rotate: 0.3 * strength, easing: Easing.easeOutExpo },
  { at: Math.round(duration * 0.3), zoom: 1 + 0.02 * strength, rotate: 0, easing: Easing.easeOutBack },
  { at: duration, zoom: 1 + 0.11 * strength, easing: Easing.easeInOutQuad },
];

/**
 * A long diagonal drift with a whisper of roll.
 *
 * For shots that hold text for a while. The roll is a fraction of a degree: enough that
 * the frame is never quite square, not enough that anyone could point at it.
 */
export const drift = ({ duration, strength = 1 }: MoveOptions): CameraKeyframe[] => [
  /*
   * Deliberately the smallest move in the library.
   *
   * It had a 15% zoom, which is a lot on a shot whose entire job is being read: the
   * frame grows past its own edges, and anything laid out to the safe margin — a
   * full-width band, a list that uses the page — is pushed off the side by the time the
   * viewer reaches the last line. A scene that says "hold still and read this" cannot
   * also be a scene that moves 15%.
   *
   * What is left is enough to keep the frame alive and not enough to take content out
   * of it.
   */
  { at: 0, x: -0.03 * strength, y: 0.02 * strength, zoom: 1, rotate: 0.3 * strength, easing: Easing.linear },
  { at: duration, x: 0.025 * strength, y: -0.025 * strength, zoom: 1.045, rotate: -0.25 * strength, easing: Easing.easeInOutQuad },
];

/** Perfectly still. Rare on purpose — a locked frame should be a choice. */
export const locked = (): CameraKeyframe[] => [{ at: 0 }];
