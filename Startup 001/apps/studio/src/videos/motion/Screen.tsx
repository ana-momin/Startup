import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from '@motion/engine';
import type { Random } from '@motion/engine';
import type { Palette } from '@motion/planner';
import { onDark } from '../scenes/shared';

/**
 * How a screen is presented.
 *
 * The mockup we had was a rectangle facing the camera, dead centre, at one angle,
 * forever. It was *correct* and it looked like a screenshot pasted onto a slide — which
 * is the thing every competitor's video is not. Launch videos are roughly seventy per
 * cent product footage, so this one scene carries more of the perceived quality than
 * anything else in the engine.
 *
 * What makes product footage look expensive is never the interface itself. It is the
 * staging: a screen turned slightly so it has a near edge and a far edge, a second panel
 * behind it, a shadow that falls somewhere believable, and a crop that lets the frame
 * cut the window rather than politely containing it. None of that is about the pixels
 * inside the screen, which is why this is separated from the surface that draws them.
 */

export type Presentation =
  /** Square to the camera. The clearest, and the right choice when the UI matters most. */
  | 'flat'
  /** Turned a few degrees, with perspective. Reads as an object rather than an image. */
  | 'angled'
  /** A second panel behind, offset and dimmed. Says "there is more here than one screen". */
  | 'stacked'
  /** Oversized and cut by the frame. A detail, not a tour. */
  | 'cropped';

/**
 * Pick a presentation.
 *
 * Content vetoes first. A tour of the whole interface wants to be square and whole; a
 * close look at one thing can afford to be cut. The seed chooses between what is left, so
 * two videos for different companies are not staged identically.
 */
export const choosePresentation = (
  random: Random,
  options: { vertical: boolean; hasCaption: boolean },
): Presentation => {
  // A tall frame has no width to spare, so anything that turns or offsets the screen
  // loses more than it gains.
  if (options.vertical) return random.chance(0.4) ? 'stacked' : 'flat';

  return random.pick<Presentation>(['flat', 'angled', 'stacked', 'cropped', 'angled']);
};

type StageProps = {
  presentation: Presentation;
  palette: Palette;
  /** The scene's own background, which decides how heavy the shadow can be. */
  sceneBg?: string;
  width: number;
  height: number;
  scale: number;
  /** Frame the screen arrives on. */
  delay: number;
  duration: number;
  children: React.ReactNode;
};

export const ScreenStage = ({
  presentation,
  palette,
  sceneBg,
  width,
  height,
  scale,
  delay,
  duration,
  children,
}: StageProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const arrive = spring({ frame: frame - delay, fps, config: 'heavy' });

  /*
   * The settle: a long, slow move that continues after the screen has landed.
   *
   * Product footage that stops moving reads as a screenshot the moment it stops. This is
   * deliberately slower than anything else in the scene — a few degrees over several
   * seconds — so it is felt rather than watched, and so it never competes with the
   * interface animating inside it.
   */
  const settle = interpolate(frame, [delay, delay + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.easeInOutQuad,
  });

  // Judged against the scene, not the interface: a white app window on a dark frame
  // needs a different shadow from the same window on paper.
  const dark = onDark(sceneBg ?? palette.bg);
  const geometry = GEOMETRY[presentation];

  // Turning towards square as the shot plays: the screen presents itself, then opens up
  // to be read. A fixed angle makes the object static even while the camera moves.
  const turn = geometry.turn * (1 - settle * 0.55);
  const tilt = geometry.tilt * (1 - settle * 0.55);
  const lift = (1 - arrive) * 70 * scale;

  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        opacity: Math.min(arrive * 1.6, 1),
        // The perspective lives on the wrapper, not the element, so the depth is the
        // scene's and every layer inside shares one vanishing point.
        perspective: `${2600 * scale}px`,
        perspectiveOrigin: '50% 40%',
      }}
    >
      {/*
        The panel behind.

        One dimmed, offset copy is enough to say "this is one of several screens" without
        drawing a second interface nobody will read. It sits further back in the same
        perspective, so it foreshortens correctly rather than looking like a flat
        duplicate.
      */}
      {presentation === 'stacked' ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 16 * scale,
            backgroundColor: mixHex(palette.bg, palette.text, dark ? 0.1 : 0.06),
            border: `${1.5 * scale}px solid ${mixHex(palette.bg, palette.text, 0.16)}`,
            transform: `translate3d(${-54 * scale}px, ${-38 * scale}px, ${-220 * scale}px) rotateY(${turn}deg)`,
            transformOrigin: 'center center',
            opacity: arrive * 0.75,
          }}
        />
      ) : null}

      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          transform:
            `translate3d(${geometry.shiftX * scale}px, ${lift}px, 0) ` +
            `rotateY(${turn}deg) rotateX(${tilt}deg) scale(${geometry.scale * (0.96 + arrive * 0.04)})`,
          transformOrigin: 'center center',
          /*
           * Two shadows, not one.
           *
           * A tight dark one directly under the window grounds it, and a wide soft one
           * gives it a room to be in. A single shadow always reads as either a sticker
           * or a blur — the pair is what the eye accepts as an object sitting in front
           * of something.
           */
          filter: dark
            ? `drop-shadow(0 ${18 * scale}px ${26 * scale}px rgba(0,0,0,0.45)) drop-shadow(0 ${60 * scale}px ${90 * scale}px rgba(0,0,0,0.35))`
            : // Tighter and lighter on paper. The soft wide shadow that grounds a window
              // on a dark frame becomes a grey smudge on a light one.
              `drop-shadow(0 ${6 * scale}px ${10 * scale}px rgba(12,16,40,0.07)) drop-shadow(0 ${26 * scale}px ${42 * scale}px rgba(12,16,40,0.10))`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

/**
 * The geometry of each presentation.
 *
 * Angles are small on purpose. Past about twelve degrees a screen stops reading as
 * "turned slightly towards you" and starts reading as a 3D render, which is a different
 * and much harder look to get right — and one that makes the interface inside genuinely
 * hard to read.
 */
const GEOMETRY: Record<Presentation, { turn: number; tilt: number; scale: number; shiftX: number }> = {
  flat: { turn: 0, tilt: 0, scale: 1, shiftX: 0 },
  angled: { turn: -9, tilt: 3.5, scale: 1.02, shiftX: 18 },
  stacked: { turn: -5, tilt: 2, scale: 0.97, shiftX: 26 },
  // Deliberately larger than its box: the frame cuts it, which is what makes it a detail
  // shot rather than a tour.
  cropped: { turn: -4, tilt: 1.5, scale: 1.26, shiftX: -40 },
};

/**
 * Content moving inside the window.
 *
 * The single cheapest thing that makes a mockup look alive. A static interface is a
 * screenshot however well it is staged; the same interface scrolling a little is a
 * recording of software being used. It is slow and it eases, because a linear scroll is
 * a marquee and nobody's hand moves at a constant speed.
 */
export const useScroll = ({
  delay,
  duration,
  distance,
}: {
  delay: number;
  duration: number;
  /** How far the content travels, in pixels. Negative moves content up. */
  distance: number;
}): number => {
  const frame = useCurrentFrame();

  return interpolate(
    frame,
    // Holds still at first so the viewer can take the screen in, moves through the
    // middle, and settles before the scene cuts.
    [delay, delay + duration * 0.3, delay + duration * 0.8],
    [0, 0, distance],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.easeInOutCubic,
    },
  );
};

/** Mix two hex colours. Interface greys are built from the brand's own bg and text. */
const mixHex = (a: string, b: string, amount: number): string => {
  const parse = (hex: string): [number, number, number] => {
    let value = hex.replace('#', '');
    if (value.length === 3) value = value.split('').map((c) => c + c).join('');
    return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16)) as [number, number, number];
  };
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const t = Math.min(Math.max(amount, 0), 1);
  const to = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `rgb(${to(ar, br)}, ${to(ag, bg)}, ${to(ab, bb)})`;
};
