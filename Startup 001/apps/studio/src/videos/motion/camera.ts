import { drift, impact, pull, push, travel } from '@motion/engine';
import type { CameraKeyframe, Direction } from '@motion/engine';
import type { SceneKind } from '@motion/planner';
import type { ToneStyle } from '../tone';

/**
 * Which shot each scene gets.
 *
 * This is the file that decides whether a video reads as directed or assembled. The
 * choice is made here in code rather than asked of the model, for the same reason the
 * transitions are: it is a craft decision with better and worse answers, and a model
 * choosing freshly every four seconds produces a video with no point of view.
 *
 * Two rules do most of the work.
 *
 * FLOW. Neighbouring shots that travel the same way read as one camera passing through
 * two places. Left, left, then in — that is a move, not a cut. Alternating direction on
 * every scene reads as a camera being yanked around, which is the single most common
 * tell of automated video.
 *
 * THE SUBJECT DECIDES. A scene that exists to land one word or one number wants impact:
 * anticipation, a hard arrival, a settle. A scene with four bullet points to read wants
 * the frame to hold nearly still, because a viewer cannot read moving text. Using the
 * same move for both is how tools end up with beautiful motion nobody can follow.
 */

/**
 * The rotation, by position in the video.
 *
 * Paired directions are deliberate: two rights in a row, two lefts in a row. The pairs
 * are where the continuity comes from, and the `in` between them is the punctuation that
 * stops the video feeling like it is sliding off the screen forever.
 */
const FLOW: Direction[] = ['right', 'right', 'in', 'left', 'left', 'in', 'down', 'right'];

/**
 * How far away the camera stands, by where we are in the video.
 *
 * This is the part that makes a video feel *directed* rather than assembled, and it is
 * borrowed wholesale from film, where it is a century old. A sequence of shots at the
 * same distance reads as a list, however good each shot is. Real coverage has a shape:
 * stand back to establish where we are, move in as the argument gets specific, sit
 * closest at the thing that matters most, then pull back to let it land.
 *
 * It returns a multiplier on the whole shot's scale, so it composes with whatever move
 * the scene was already given. A push from further out is still a push — it just starts
 * and ends somewhere that means something relative to the shot before it.
 *
 * `position` runs 0 to 1 across the video.
 */
const shotDistance = (position: number): number => {
  // Wide at the open, closest around two thirds through, wider again to close. The peak
  // is deliberately not in the middle: the strongest moment of an argument belongs late,
  // and a video that peaks at its midpoint has nowhere to go for its second half.
  if (position < 0.66) {
    // 0.955 (standing back) up to 1.045 (close). Halved along with the moves
    // themselves: the shot distance multiplies every keyframe, so a wide range here and
    // a wide move there compound into a film that never stops zooming.
    return 0.955 + (position / 0.66) * 0.09;
  }
  // Back out to 0.97 by the end: not as wide as the open, because the ending should feel
  // resolved rather than restarted.
  return 1.045 - ((position - 0.66) / 0.34) * 0.06;
};

export const chooseCamera = (
  kind: SceneKind,
  index: number,
  duration: number,
  tone: ToneStyle,
  /** Where this scene sits in the video, 0 to 1. Used for shot distance. */
  position = 0.5,
): CameraKeyframe[] => {
  // How much travel this tone wants at all. An editorial piece moves about a third as
  // much as a social one, from exactly the same shot list.
  const strength = tone.motion;

  // Where the camera stands for this shot, applied to every keyframe below.
  const distance = shotDistance(position);
  const at = (keyframes: CameraKeyframe[]): CameraKeyframe[] =>
    keyframes.map((kf) => ({ ...kf, zoom: (kf.zoom ?? 1) * distance }));

  // The opening shot pulls out. Starting close and opening up says "here is where we
  // are" — the establishing shot, borrowed straight from film, and the reason the first
  // four seconds decide whether anyone watches the rest.
  if (index === 0) return at(pull({ duration, strength }));

  switch (kind) {
    // One word, one number: the whole scene is a hit. It gets the hit.
    case 'bigword':
    case 'stat':
      return at(impact({ duration, strength }));

    // Text to be read. The frame keeps breathing so the shot is not dead, but it stays
    // almost still, because the viewer's job here is reading and ours is not to
    // interrupt it.
    case 'features':
    case 'steps':
    case 'quote':
      return at(drift({ duration, strength: strength * 0.55 }));

    /*
     * The product, and a chart being drawn.
     *
     * A slow push, and much gentler than anywhere else. Both of these scenes have
     * something happening *inside* the frame — rows arriving, a cursor moving, a line
     * being drawn — and a camera competing with that gives the viewer two things to
     * follow and no way to choose. The camera's only job here is to stop the shot
     * feeling frozen while the interface does the work.
     */
    case 'product':
    case 'chart':
      return at(push({ duration, strength: strength * 0.35 }));

    /*
     * Words over moving interface.
     *
     * The background is already travelling a frame and a half across this shot. Moving
     * the camera as well gives the viewer two motions to resolve and a headline that
     * will not sit still long enough to be read. The camera holds, and the one thing
     * moving is the thing that is supposed to be moving.
     */
    case 'overlay':
      return at(drift({ duration, strength: strength * 0.12 }));

    // The ending closes in. A push at the end is pressure, which is what a call to
    // action is asking for.
    case 'logo':
    case 'outro':
      return at(push({ duration, strength }));

    default:
      return at(travel(FLOW[(index - 1) % FLOW.length], { duration, strength }));
  }
};
