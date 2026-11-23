import { Easing } from './easing';
import { interpolate } from './interpolate';
import { spring } from './spring';
import type { SpringConfig, SpringPresetName } from './spring';

/**
 * Entrances with anticipation and follow-through.
 *
 * A spring already gives weight and overshoot, which covers the landing. What it cannot
 * give is the part that happens *before* the move: real things wind up. A hand pulls
 * back before it throws, a body dips before it jumps, and an animator who leaves that
 * out gets motion that is technically smooth and somehow lifeless.
 *
 * Anticipation is also a practical trick, not only a stylistic one. A tiny counter-move
 * tells the eye that something is about to happen at this spot, so the eye is already
 * there when the thing arrives. Without it the viewer spends the first frames of every
 * entrance finding the subject instead of reading it.
 *
 * Returns a 0-to-1 progress that dips below 0 first and overshoots past 1 after, so it
 * drops into any transform a plain spring was already driving.
 */

export type EntranceOptions = {
  /** Frames since the entrance began. Negative means it has not started. */
  frame: number;
  fps: number;
  /** The landing. */
  config?: SpringConfig | SpringPresetName;
  /**
   * How far it winds up, as a fraction of the move. 0.08 is felt but not seen; past
   * about 0.2 it stops reading as a wind-up and starts reading as a bounce.
   */
  anticipation?: number;
  /** Frames spent winding up. Short — a long wind-up reads as a delay, not a preparation. */
  windUp?: number;
  /** Frames to wait before any of it starts. */
  delay?: number;
};

export const entrance = ({
  frame,
  fps,
  config = 'snappy',
  anticipation = 0.09,
  windUp = 5,
  delay = 0,
}: EntranceOptions): number => {
  const local = frame - delay;
  if (local <= 0) return 0;

  // The wind-up: away from the target, easing out so it decelerates into the turn. A
  // linear wind-up reads as a mistake, because nothing in the world changes direction
  // at full speed.
  if (local < windUp) {
    return interpolate(local, [0, windUp], [0, -anticipation], {
      easing: Easing.easeOutQuad,
    });
  }

  // Then the real move, starting from the wound-up position.
  return spring({
    frame: local - windUp,
    fps,
    config,
    from: -anticipation,
    to: 1,
  });
};

/**
 * A value that keeps breathing after it arrives.
 *
 * Almost everything in a good piece of motion design is still moving a little, because a
 * frozen element reads as a still image dropped into a video. Amplitude is deliberately
 * tiny: this is meant to be felt rather than watched.
 */
export const idle = ({
  frame,
  fps,
  /** How far it drifts, in whatever unit the caller is using. */
  amount = 1,
  /** Seconds for one full cycle. Slow — a fast idle is a distraction. */
  period = 4,
  /** Offset so two elements never breathe in lockstep. */
  phase = 0,
}: {
  frame: number;
  fps: number;
  amount?: number;
  period?: number;
  phase?: number;
}): number => Math.sin((frame / fps / period + phase) * Math.PI * 2) * amount;
