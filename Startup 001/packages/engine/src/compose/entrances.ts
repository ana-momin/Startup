import { Easing } from '../animation/easing';
import { interpolate } from '../animation/interpolate';
import { spring } from '../animation/spring';
import type { SpringPresetName } from '../animation/spring';
import type { Random } from './seed';

/**
 * How things arrive.
 *
 * The engine had exactly one entrance — text rising from behind a mask — and used it for
 * everything: headlines, supporting lines, list rows, captions, every scene, every video.
 * It is a good move, which is why it took so long to notice that it was the *only* move.
 * A film where every element arrives identically reads as one effect applied to some
 * content, rather than as a piece of design, and that impression survives however varied
 * the layout underneath it is.
 *
 * So: a library, and a choice per element. Each entrance is a pure function of the frames
 * since it began, returning styles to spread onto an element — no state, no timers,
 * nothing that could make a render disagree with a preview.
 *
 * They are grouped by what they suit rather than by what they do, because the useful
 * question at the call site is never "which transform" but "what is this thing, and how
 * should it behave". A headline can afford a gesture; a row of body text in a list of six
 * cannot, because six gestures at once is noise.
 */

export type EntranceName =
  /** Rises from behind an edge. The house move: confident, and it never fails. */
  | 'rise'
  /** Falls in from above. Reads as something being placed rather than growing. */
  | 'drop'
  /** Uncovered left to right, like a hand passing over it. */
  | 'wipe'
  /** Uncovered from the centre outward. Symmetrical, and good for a single word. */
  | 'split'
  /** Grows from slightly small, with a little overshoot. Mechanical and precise. */
  | 'scale'
  /** Arrives from the left, overshooting and settling. */
  | 'slideIn'
  /** Comes into focus rather than into place. The quietest of them. */
  | 'focus'
  /** Unrolls from its own top edge, like paper. Suits blocks and cards. */
  | 'unfold'
  /** Simply appears, at full opacity, on the beat. The hardest cut there is. */
  | 'cut';

export type EntranceStyle = {
  opacity: number;
  transform: string;
  clipPath?: string;
  filter?: string;
};

export type EntranceOptions = {
  /** Frames since this element's entrance began. Negative means not yet. */
  frame: number;
  fps: number;
  /** Physics for the moves that use a spring. */
  config?: SpringPresetName;
  /**
   * How far it travels, in pixels. Usually the element's own size, so a headline moves
   * further than a caption and both look like the same gesture.
   */
  distance?: number;
  /** Frames the non-spring moves take. */
  duration?: number;
};

/**
 * The styles for an entrance at a given moment.
 *
 * Everything returns an opacity and a transform even when it does not use them, so a
 * caller can spread the result without checking which entrance it asked for.
 */
export const entranceStyle = (
  name: EntranceName,
  { frame, fps, config = 'snappy', distance = 40, duration = 22 }: EntranceOptions,
): EntranceStyle => {
  // Before it starts, everything is simply absent. Returning a transform here as well
  // keeps the element's compositing layer stable, which avoids a one-frame flicker as it
  // begins.
  if (frame < 0) return { opacity: 0, transform: 'translate3d(0,0,0)' };

  const settle = spring({ frame, fps, config });
  const eased = interpolate(frame, [0, duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.easeOutExpo,
  });
  const fade = interpolate(frame, [0, Math.min(duration, 12)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  switch (name) {
    case 'drop':
      return {
        opacity: fade,
        transform: `translate3d(0, ${(settle - 1) * distance}px, 0)`,
      };

    case 'wipe':
      /*
       * Uncovered rather than faded.
       *
       * The element is fully opaque the whole way through; only the window onto it moves.
       * That is what makes a wipe feel like a hand passing over something, where a fade
       * feels like the thing was not there and then was.
       */
      return {
        opacity: 1,
        transform: `translate3d(${(1 - eased) * distance * 0.25}px, 0, 0)`,
        clipPath: `inset(-20% ${(1 - eased) * 100}% -20% -5%)`,
      };

    case 'split':
      return {
        opacity: 1,
        transform: 'translate3d(0,0,0)',
        clipPath: `inset(${(1 - eased) * 55}% -5% ${(1 - eased) * 55}% -5%)`,
      };

    case 'scale':
      return {
        opacity: fade,
        transform: `translate3d(0,0,0) scale(${0.86 + settle * 0.14})`,
      };

    case 'slideIn':
      return {
        opacity: fade,
        transform: `translate3d(${(1 - settle) * -distance}px, 0, 0)`,
      };

    case 'focus':
      /*
       * Arrives by coming into focus.
       *
       * Used sparingly and never on small text: a blur on body copy at video bitrates
       * turns into mush the codec then has to spend bits on. On a headline it is lovely.
       */
      return {
        opacity: fade,
        transform: `translate3d(0, ${(1 - settle) * distance * 0.25}px, 0)`,
        filter: eased < 0.98 ? `blur(${(1 - eased) * 14}px)` : undefined,
      };

    case 'unfold':
      return {
        opacity: fade,
        transform: `perspective(1200px) rotateX(${(1 - settle) * -28}deg)`,
        clipPath: `inset(0 0 ${(1 - eased) * 100}% 0)`,
      };

    case 'cut':
      /*
       * No movement at all.
       *
       * Worth having in the library precisely because it is the hardest one to use well.
       * When everything around it is moving, the thing that simply *is there* on the beat
       * takes the eye — and a film where nothing ever cuts has no punctuation.
       */
      return { opacity: frame >= 0 ? 1 : 0, transform: 'translate3d(0,0,0)' };

    case 'rise':
    default:
      return {
        opacity: fade,
        transform: `translate3d(0, ${(1 - settle) * distance}px, 0)`,
      };
  }
};

/**
 * What an element is, for the purpose of choosing how it arrives.
 *
 * The distinction that matters is not what the element *contains* but how many of it
 * there are and how long the viewer will look at it.
 */
export type Role =
  /** One large thing the whole shot is about. Can afford a gesture. */
  | 'hero'
  /** Supports the hero: a subtitle, a caption, an attribution. */
  | 'support'
  /** One of several, arriving in sequence. Must stay calm — six gestures is noise. */
  | 'item'
  /** A rule, a mark, a bracket. Geometry rather than language. */
  | 'object';

/**
 * Entrances that suit each role.
 *
 * `item` is deliberately the shortest list. When four rows arrive one after another, the
 * move has to survive being seen four times in three seconds — anything with personality
 * becomes a tic. The hero gets the interesting ones because it happens once.
 */
const BY_ROLE: Record<Role, EntranceName[]> = {
  hero: ['rise', 'wipe', 'split', 'focus', 'scale', 'drop'],
  support: ['rise', 'wipe', 'focus', 'slideIn'],
  item: ['rise', 'slideIn', 'wipe'],
  object: ['scale', 'wipe', 'split', 'unfold', 'cut'],
};

/**
 * Entrances a tone will not allow.
 *
 * Tone is meant to be a point of view, and a point of view is as much about what you
 * refuse as what you choose. A bold film that occasionally drifts softly into focus is
 * not bold; it is inconsistent, which reads as accidental.
 */
const FORBIDDEN: Record<string, EntranceName[]> = {
  // Hard, cut, immediate. Nothing soft.
  bold: ['focus', 'unfold'],
  kinetic: ['focus', 'unfold', 'drop'],
  // Considered and quiet. Nothing that snaps or shows off.
  editorial: ['scale', 'split', 'cut'],
  clean: ['unfold'],
};

export const chooseEntrance = (
  role: Role,
  tone: string,
  random: Random,
): EntranceName => {
  const banned = FORBIDDEN[tone] ?? [];
  const allowed = BY_ROLE[role].filter((name) => !banned.includes(name));
  return random.pick(allowed.length > 0 ? allowed : BY_ROLE[role]);
};
