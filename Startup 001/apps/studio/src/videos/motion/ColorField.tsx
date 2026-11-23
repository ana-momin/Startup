import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from '@motion/engine';
import { CROSSFADE, sceneStarts } from '@motion/planner';
import type { Frame, VideoSpec } from '@motion/planner';

/**
 * The background, as a designed element rather than a surface.
 *
 * What was here before: one near-black gradient with a glow drifting across it, the same
 * for the whole video, in every video. It was doing the job of a wall. Meanwhile colour
 * — the most powerful tool in graphic design — was reduced to a thin accent line.
 *
 * Here the frame's colour is part of the composition and it *changes*, and the change is
 * the transition. A cut from white to a full field of the brand colour is felt before it
 * is read, which is more than any amount of typography can do in the same quarter of a
 * second. It is also the single cheapest thing to render in the whole engine: one
 * rectangle.
 *
 * The wipe direction alternates. Every change sweeping the same way reads as a slideshow
 * advancing; alternating reads as a composition being rebuilt each time.
 */

type Props = {
  spec: VideoSpec;
  frames: Frame[];
};

export const ColorField = ({ spec, frames }: Props) => {
  const frame = useCurrentFrame();
  const starts = sceneStarts(spec, CROSSFADE);

  // Which scene's colour we are on, and which is arriving.
  let index = 0;
  for (let i = 0; i < starts.length; i++) if (frame >= starts[i] - WIPE) index = i;

  const current = frames[Math.min(index, frames.length - 1)];
  const previous = frames[Math.max(index - 1, 0)];

  const boundary = starts[index] ?? 0;
  const progress = interpolate(frame, [boundary - WIPE, boundary + WIPE * 0.3], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    // Fast out of the gate and a long settle: a wipe that decelerates reads as a
    // deliberate move, where a linear one reads as a transition effect.
    easing: Easing.easeInOutQuart,
  });

  // Nothing to reveal on the first scene, and nothing to reveal once it has landed.
  const changing = index > 0 && progress < 1 && current.bg !== previous.bg;

  return (
    <AbsoluteFill style={{ backgroundColor: previous.bg }}>
      {changing ? (
        <AbsoluteFill
          style={{
            backgroundColor: current.bg,
            clipPath: wipe(index, progress),
          }}
        />
      ) : (
        <AbsoluteFill style={{ backgroundColor: current.bg }} />
      )}
    </AbsoluteFill>
  );
};

/** Frames the wipe takes, either side of the cut. */
const WIPE = 14;

/**
 * The shape the new colour arrives in.
 *
 * Four moves, rotating by position, because a wipe that always comes from the same edge
 * is a slide transition and a wipe that changes is choreography. Each is a `clip-path` on
 * a solid rectangle, which costs nothing to draw at any size.
 */
const wipe = (index: number, t: number): string => {
  const p = (1 - t) * 100;

  switch (index % 4) {
    // Up from the bottom: the new colour pushes the old one off the top of the frame.
    case 0:
      return `inset(${p}% 0 0 0)`;
    // In from the left.
    case 1:
      return `inset(0 ${p}% 0 0)`;
    // Opening from the centre outward, which suits a colour field arriving on a beat.
    case 2:
      return `inset(${p / 2}% 0 ${p / 2}% 0)`;
    // In from the right.
    default:
      return `inset(0 0 0 ${p}%)`;
  }
};
