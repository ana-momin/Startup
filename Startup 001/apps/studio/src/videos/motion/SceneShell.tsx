import {
  AbsoluteFill,
  Easing,
  Layer,
  Stage,
  interpolate,
  useCurrentFrame,
} from '@motion/engine';
import type { Palette, SceneKind } from '@motion/planner';
import { FONT, useTone } from '../scenes/shared';
import { chooseCamera } from './camera';

/**
 * The frame every scene lives inside.
 *
 * Three jobs now: build the space, draw the background, and handle how the scene arrives
 * and leaves.
 *
 * The space is the new part and the important one. A scene used to be a flat picture
 * with animated text on it, which is a slide however good the text looked. Here it is a
 * stack of layers at different distances with a camera moving through them — so the
 * background drifts slower than the words, a push actually goes *past* things instead of
 * scaling the whole picture, and a cut is a camera arriving somewhere rather than one
 * image dissolving into another.
 *
 * The transition treatment is still chosen from position and tone rather than asked of
 * the model, because it is a craft decision with a right answer, and because a model
 * picking randomly would produce a video that changes personality every four seconds.
 */

export type Transition = 'rise' | 'wipe' | 'push' | 'iris' | 'fade' | 'split';

type Props = {
  /**
   * Kept on the signature although the shell no longer draws with it: every scene
   * already passes it, and the colours belong to the world now rather than to any one
   * shot. Removing it would mean editing eight scenes to say nothing new.
   */
  palette?: Palette;
  duration: number;
  index?: number;
  /** What this scene is for. Decides the shot: a number gets a hit, a list gets stillness. */
  kind?: SceneKind;
  /**
   * Where this scene sits in the video, 0 to 1.
   *
   * Decides how far back the camera stands. Without it every shot is framed the same
   * distance away, which is what makes a sequence read as a list of pictures rather than
   * as coverage of one story.
   */
  position?: number;
  children: React.ReactNode;
  /** Override the automatic choice. */
  transition?: Transition;
};

export const SceneShell = ({
  duration,
  index = 0,
  kind = 'title',
  position = 0.5,
  children,
  transition,
}: Props) => {
  const frame = useCurrentFrame();
  const tone = useTone();

  const treatment = transition ?? chooseTransition(tone.spring, index);
  const camera = chooseCamera(kind, index, duration, tone, position);

  // How far through the entrance and the exit we are, 0 to 1.
  const IN = 18;
  const OUT = 14;

  const entering = interpolate(frame, [0, IN], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.easeOutExpo,
  });

  const leaving = interpolate(frame, [duration - OUT, duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.easeInOutQuad,
  });

  return (
    <AbsoluteFill
      style={{ fontFamily: FONT, ...transitionStyle(treatment, entering, leaving) }}
    >
      <Stage camera={camera}>
        {/*
          Only the focal plane lives here now. The background, the out-of-focus
          foreground and the vignette were all moved up to the video, because none of
          them belong to a shot — and while they did, a transition could clip them away
          and open a hole at the edge of the frame.
        */}
        <Layer depth={1}>{children}</Layer>
      </Stage>
    </AbsoluteFill>
  );
};

/* ---------- the treatments ---------- */

/**
 * How opaque an outgoing scene still is.
 *
 * Every exit fades as well as moves. It did not need to before, because each scene
 * carried an opaque background of its own that hid whatever was underneath it. Now that
 * the background belongs to the video, two overlapping scenes are both visible through
 * the crossfade — and two headlines printed over each other is worse than either
 * transition was trying to be.
 *
 * It holds near full for the first part of the exit so the geometry of the wipe or the
 * push is what the viewer reads, and only then lets go. A linear fade across the whole
 * exit would turn every transition back into a dissolve.
 */
const fadeOut = (exit: number): number => Math.min(1, Math.max(0, 1 - Math.pow(exit, 2.2) * 1.15));

/**
 * Each returns a style for the whole scene layer.
 *
 * `clipPath` does the heavy lifting rather than opacity: a shape that uncovers content
 * reads as deliberate, where a fade reads as absence. Opacity is used only where the
 * motion itself already carries the change.
 */
const transitionStyle = (
  kind: Transition,
  enter: number,
  exit: number,
): React.CSSProperties => {
  switch (kind) {
    case 'wipe':
      // Uncovers from the left, then leaves by being covered from the left as well, so
      // the two scenes appear to travel in the same direction.
      return {
        clipPath: `inset(0 ${(1 - enter) * 100}% 0 ${exit * 100}%)`,
        opacity: fadeOut(exit),
      };

    case 'push':
      // The scene arrives from below and leaves upward: the most common cut in modern
      // motion graphics, and the one that makes a sequence feel like it is advancing.
      return {
        transform: `translateY(${(1 - enter) * 100 - exit * 100}%)`,
        opacity: fadeOut(exit),
      };

    case 'iris':
      // A circle opening from the centre. Draws the eye inward before anything is read.
      return {
        clipPath: `circle(${enter * 75}% at 50% 50%)`,
        opacity: 1 - exit,
      };

    case 'split':
      // Two halves parting. Energetic, and worth using sparingly.
      return {
        clipPath: `inset(${(1 - enter) * 50}% 0 ${(1 - enter) * 50}% 0)`,
        opacity: 1 - exit * 0.9,
      };

    case 'rise':
      // A short lift with a fade — the quietest of the real transitions, for scenes
      // that should feel considered rather than cut to.
      return {
        transform: `translateY(${(1 - enter) * 4 - exit * 4}%) scale(${0.985 + enter * 0.015})`,
        opacity: Math.min(enter * 1.4, 1) * (1 - exit),
      };

    case 'fade':
    default:
      return { opacity: Math.min(enter * 1.6, 1) * (1 - exit) };
  }
};

/**
 * Pick a transition for this position in the video.
 *
 * The first scene always fades up from black, because anything else looks like the
 * viewer missed the start. After that the choice rotates, so no two neighbouring scenes
 * arrive the same way — which is the actual source of the "it all looks the same"
 * feeling, more than the layouts were.
 */
const chooseTransition = (spring: string, index: number): Transition => {
  if (index === 0) return 'fade';

  // Energetic tones get the harder cuts; calm ones stay with movement over geometry.
  const energetic = spring === 'snappy' || spring === 'bouncy';

  const cycle: Transition[] = energetic
    ? ['push', 'wipe', 'split', 'iris', 'push', 'wipe']
    : ['rise', 'wipe', 'push', 'rise', 'iris', 'wipe'];

  return cycle[(index - 1) % cycle.length];
};
