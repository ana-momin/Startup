import type { CSSProperties } from 'react';
import { Easing } from '../animation/easing';
import type { EasingFn } from '../animation/easing';
import { interpolate } from '../animation/interpolate';
import { useCurrentFrame, useVideoConfig } from '../core/context';
import { morphPath, shapePath } from './geometry';
import type { Placement, Point, ShapeName } from './geometry';

/**
 * Shapes that draw themselves, and shapes that become other shapes.
 *
 * A line that fades in is a line that was always there. A line that *draws* is a line
 * being made, and the viewer's eye follows the tip — which means the shape does the same
 * job a gesture does: it says where to look, in what order. That is the difference
 * between graphics in a video and motion graphics.
 */

type DrawProps = {
  /** The path to draw, in frame pixels. */
  d?: string;
  /**
   * Several strokes on one canvas, each with its own start.
   *
   * Four separate <Draw>s meant four full-frame SVG layers for four corner marks, which
   * the renderer pays for on every frame. One canvas with four staggered strokes looks
   * identical and costs a quarter as much.
   */
  paths?: { d: string; delay?: number }[];
  color: string;
  /** Line weight, in pixels. */
  width?: number;
  /** Frame this starts on. */
  delay?: number;
  /** How long the drawing takes. */
  duration?: number;
  easing?: EasingFn;
  /** Rounded ends read as drawn; square ends read as constructed. */
  cap?: 'round' | 'butt' | 'square';
  /** Fill once drawn, for shapes that should become solid. */
  fill?: string;
  /** Frames over which the fill arrives, after the outline is complete. */
  fillDelay?: number;
  opacity?: number;
  style?: CSSProperties;
};

/**
 * A path drawn by a moving pen.
 *
 * Done with `stroke-dasharray`: make one dash exactly as long as the whole path, then
 * slide the gap along. The browser is doing the arithmetic on the path's real length, so
 * it works on any shape without anybody measuring anything.
 */
export const Draw = ({
  d,
  paths,
  color,
  width = 3,
  delay = 0,
  duration = 24,
  easing = Easing.easeOutQuart,
  cap = 'round',
  fill,
  fillDelay = 6,
  opacity = 1,
  style,
}: DrawProps) => {
  const frame = useCurrentFrame();
  const { width: w, height: h } = useVideoConfig();

  const strokes = paths ?? (d ? [{ d }] : []);

  const progressAt = (extra: number) =>
    interpolate(frame - delay - extra, [0, duration], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing,
    });

  // Nothing on screen yet. Returning null rather than an empty canvas matters: an empty
  // dash array draws the whole path at once, which is the opposite of the point.
  if (strokes.every((s) => progressAt(s.delay ?? 0) <= 0)) return null;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ position: 'absolute', inset: 0, overflow: 'visible', opacity, ...style }}
    >
      {strokes.map((stroke, i) => {
        const drawn = progressAt(stroke.delay ?? 0);
        if (drawn <= 0) return null;

        const filled = fill
          ? interpolate(
              frame - delay - (stroke.delay ?? 0),
              [duration + fillDelay, duration + fillDelay + 14],
              [0, 1],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.easeOutQuad },
            )
          : 0;

        return (
          <path
            key={i}
            d={stroke.d}
            fill={fill ?? 'none'}
            fillOpacity={filled}
            stroke={color}
            strokeWidth={width}
            strokeLinecap={cap}
            strokeLinejoin="round"
            // 1 is the whole path, whatever its real length — so one number works for a
            // straight line and a star alike.
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - drawn}
          />
        );
      })}
    </svg>
  );
};

type MorphProps = {
  /** Shapes to pass through, in order. Two is a morph; more is a sequence. */
  through: (ShapeName | Point[])[];
  /** Where it sits and how big it is. */
  at: Placement;
  /** Progress along the whole sequence, 0 to 1. */
  progress: number;
  color?: string;
  stroke?: string;
  strokeWidth?: number;
  /** Turns of spin across the sequence. A quarter turn sells a morph; a full one shows off. */
  spin?: number;
  opacity?: number;
  detail?: number;
};

/**
 * One shape becoming another.
 *
 * Progress runs across the whole list, so `through={['circle', 'square', 'star']}` puts
 * the square at the halfway point without anyone working out where that is.
 *
 * The optional spin exists because a pure morph can read as ambiguous — a square easing
 * into a circle without moving looks a little like a blur. A quarter turn underneath it
 * makes the change unmistakably an object doing something.
 */
export const Morph = ({
  through,
  at,
  progress,
  color = 'currentColor',
  stroke,
  strokeWidth = 0,
  spin = 0,
  opacity = 1,
  detail = 64,
}: MorphProps) => {
  const clamped = Math.min(Math.max(progress, 0), 1);
  const steps = Math.max(through.length - 1, 1);
  // Which leg of the journey, and how far along it.
  const scaled = clamped * steps;
  const leg = Math.min(Math.floor(scaled), steps - 1);
  const t = scaled - leg;

  /*
   * The canvas is the size of the shape, not the size of the frame.
   *
   * A full-frame SVG for a shape a tenth that size means the browser reserves and
   * composites a 1920×1080 surface every frame for something that covers a corner of it.
   * Measured on a 319-frame render, moving to a tight box was worth about a third of the
   * total time — the shape is drawn in its own coordinates and the box is positioned,
   * which costs one subtraction.
   */
  const pad = strokeWidth + 2;
  const box = at.size + pad;
  const local = { x: box, y: box, size: at.size };

  const d =
    through.length === 1
      ? shapePath(through[0] as ShapeName, local, detail)
      : morphPath(through[leg], through[leg + 1], t, { ...local, detail });

  return (
    <svg
      width={box * 2}
      height={box * 2}
      viewBox={`0 0 ${box * 2} ${box * 2}`}
      style={{
        position: 'absolute',
        left: at.x - box,
        top: at.y - box,
        overflow: 'visible',
        opacity,
      }}
    >
      <path
        d={d}
        fill={color}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        style={
          spin
            ? {
                transform: `rotate(${clamped * spin * 360}deg)`,
                transformOrigin: `${box}px ${box}px`,
              }
            : undefined
        }
      />
    </svg>
  );
};

/* ---------- path builders, in frame pixels ---------- */

/** A straight line. */
export const linePath = (x1: number, y1: number, x2: number, y2: number): string =>
  `M ${x1} ${y1} L ${x2} ${y2}`;

/**
 * An arc of a circle, in degrees, clockwise from the top.
 *
 * For rings drawn around a number, and progress dials that mean something.
 */
export const arcPath = (
  cx: number,
  cy: number,
  r: number,
  startDeg = 0,
  endDeg = 360,
): string => {
  const sweep = Math.abs(endDeg - startDeg);
  // A full circle cannot be one arc: with identical start and end points the browser
  // has no way to know which way round to go, and draws nothing at all.
  if (sweep >= 359.999) {
    return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r}`;
  }
  const point = (deg: number) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  };
  const [sx, sy] = point(startDeg);
  const [ex, ey] = point(endDeg);
  return `M ${sx} ${sy} A ${r} ${r} 0 ${sweep > 180 ? 1 : 0} ${endDeg > startDeg ? 1 : 0} ${ex} ${ey}`;
};

/** A rectangle, drawn as a path so it can be drawn on rather than appear. */
export const rectPath = (x: number, y: number, w: number, h: number): string =>
  `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;

/** Corner brackets — two short lines at each of two corners. Frames a number. */
export const bracketPath = (
  x: number,
  y: number,
  w: number,
  h: number,
  arm: number,
): string =>
  `M ${x + arm} ${y} L ${x} ${y} L ${x} ${y + arm} ` +
  `M ${x + w - arm} ${y + h} L ${x + w} ${y + h} L ${x + w} ${y + h - arm}`;

/** A chevron, pointing right by default. Direction, in one mark. */
export const chevronPath = (x: number, y: number, size: number, flip = false): string => {
  const d = flip ? -1 : 1;
  return `M ${x - (size * d) / 2} ${y - size} L ${x + (size * d) / 2} ${y} L ${x - (size * d) / 2} ${y + size}`;
};

/**
 * An underline with a slight rise, the way a hand draws one.
 *
 * A perfectly straight underline under a headline reads as a border. A line with a few
 * pixels of lift reads as emphasis, which is what an underline is for.
 */
export const underlinePath = (x: number, y: number, w: number, lift = 6): string =>
  `M ${x} ${y} Q ${x + w / 2} ${y - lift} ${x + w} ${y - lift * 0.35}`;
