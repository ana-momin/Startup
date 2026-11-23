import { Draw, Easing, interpolate, useCurrentFrame } from '@motion/engine';
import type { Palette } from '@motion/planner';
import { onDark, useScale } from '../scenes/shared';

/**
 * The geometry.
 *
 * Motion graphics is not typography on a gradient — it is typography *with* shapes that
 * move. A rule that draws itself, a block that wipes in, a bracket that snaps around a
 * number: these are what make a frame feel composed rather than centred.
 *
 * Everything here animates in on its own schedule so a scene can be choreographed —
 * shape, then headline, then supporting line — instead of everything arriving at once.
 */

/* ---------- a rule that draws itself ---------- */

export const Rule = ({
  palette,
  scale,
  delay = 0,
  width = 64,
  thickness = 4,
  vertical,
}: {
  palette: Palette;
  scale: number;
  delay?: number;
  width?: number;
  thickness?: number;
  vertical?: boolean;
}) => {
  const frame = useCurrentFrame();

  const grow = interpolate(frame - delay, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.easeOutExpo,
  });

  return (
    <div
      style={{
        width: (vertical ? thickness : width * grow) * scale,
        height: (vertical ? width * grow : thickness) * scale,
        borderRadius: 999,
        backgroundColor: palette.accent,
        boxShadow: onDark(palette.bg) ? `0 0 ${18 * scale}px ${palette.accent}88` : undefined,
        flexShrink: 0,
      }}
    />
  );
};

/* ---------- a block that wipes in behind something ---------- */

export const Block = ({
  palette,
  delay = 0,
  from = 'left',
  color,
  radius = 0,
}: {
  palette: Palette;
  delay?: number;
  from?: 'left' | 'right' | 'top' | 'bottom';
  color?: string;
  radius?: number;
}) => {
  const frame = useCurrentFrame();

  const wipe = interpolate(frame - delay, [0, 22], [100, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.easeOutExpo,
  });

  const clip =
    from === 'left' ? `inset(0 ${wipe}% 0 0)`
    : from === 'right' ? `inset(0 0 0 ${wipe}%)`
    : from === 'top' ? `inset(0 0 ${wipe}% 0)`
    : `inset(${wipe}% 0 0 0)`;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: color ?? palette.accent,
        clipPath: clip,
        borderRadius: radius,
      }}
    />
  );
};

/* ---------- corner brackets ---------- */

/**
 * Four corners that snap inward around whatever they contain.
 *
 * A framing device from broadcast graphics: it says "look here" without a box, which
 * would close the composition off.
 */
/**
 * Corner brackets that draw themselves around something.
 *
 * They used to be four boxes with two borders each, sliding into place. That works, and
 * it always looked like four boxes sliding into place — the marks arrived complete, so
 * nothing was ever being *made*. Drawn as strokes, each corner is a pen moving, and the
 * eye follows the tip into the corner instead of watching a shape land there.
 *
 * Each corner is its own pen, and they run slightly apart so the frame closes in a
 * sequence rather than all at once.
 */
export const Brackets = ({
  palette,
  scale,
  delay = 0,
  size = 46,
  thickness = 3,
  /** Box to frame, in pixels. Defaults to the parent's own size. */
  box,
}: {
  palette: Palette;
  scale: number;
  delay?: number;
  size?: number;
  thickness?: number;
  box?: { width: number; height: number };
}) => {
  const arm = size * scale;
  const w = box?.width ?? 560 * scale;
  const h = box?.height ?? 320 * scale;

  // Drawn around a box centred on the parent, so a caller only has to position the
  // parent and the brackets follow.
  const x = -w / 2;
  const y = -h / 2;

  return (
    <span style={{ position: 'absolute', left: '50%', top: '50%', width: 0, height: 0 }}>
      {/* All four corners on one canvas, each with its own start, so the frame closes in
          a sequence without paying for four surfaces. */}
      <Draw
        paths={CORNERS.map(([cx, cy, ax, ay], i) => ({
          d:
            `M ${x + cx * w + ax * arm} ${y + cy * h} ` +
            `L ${x + cx * w} ${y + cy * h} ` +
            `L ${x + cx * w} ${y + cy * h + ay * arm}`,
          delay: i * 2.5,
        }))}
        color={palette.accent}
        width={thickness * scale}
        delay={delay}
        duration={16}
        cap="square"
      />
    </span>
  );
};

/** Each corner as [x fraction, y fraction, arm x direction, arm y direction]. */
const CORNERS = [
  [0, 0, 1, 1],
  [1, 0, -1, 1],
  [0, 1, 1, -1],
  [1, 1, -1, -1],
] as const;


/* ---------- a progress arc for numbers ---------- */

/**
 * A ring that fills as a number counts.
 *
 * Gives a statistic something to *do*. A number alone changes value; a number with an
 * arc closing behind it reads as a measurement being taken.
 *
 * Drawn with SVG stroke-dashoffset, which is the only way to animate a partial circle
 * without redrawing a path every frame.
 */
export const ProgressArc = ({
  palette,
  scale,
  progress,
  size = 420,
  thickness = 6,
}: {
  palette: Palette;
  scale: number;
  progress: number;
  size?: number;
  thickness?: number;
}) => {
  const box = size * scale;
  const stroke = thickness * scale;
  const radius = (box - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <svg
      width={box}
      height={box}
      style={{ position: 'absolute', pointerEvents: 'none' }}
      // Start the arc at twelve o'clock rather than three, which is where the eye
      // expects a gauge to begin.
      viewBox={`0 0 ${box} ${box}`}
    >
      <circle
        cx={box / 2}
        cy={box / 2}
        r={radius}
        fill="none"
        stroke={`${palette.muted}33`}
        strokeWidth={stroke}
      />
      <circle
        cx={box / 2}
        cy={box / 2}
        r={radius}
        fill="none"
        stroke={palette.accent}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - progress)}
        transform={`rotate(-90 ${box / 2} ${box / 2})`}
      />
    </svg>
  );
};

/* ---------- a bar that fills ---------- */

export const ProgressBar = ({
  palette,
  scale,
  progress,
  width = 520,
  height = 8,
}: {
  palette: Palette;
  scale: number;
  progress: number;
  width?: number;
  height?: number;
}) => (
  <div
    style={{
      width: width * scale,
      height: height * scale,
      borderRadius: 999,
      background: `${palette.muted}2E`,
      overflow: 'hidden',
    }}
  >
    <div
      style={{
        width: `${Math.min(Math.max(progress, 0), 1) * 100}%`,
        height: '100%',
        borderRadius: 999,
        background: palette.accent,
        boxShadow: onDark(palette.bg) ? `0 0 ${16 * scale}px ${palette.accent}AA` : undefined,
      }}
    />
  </div>
);

/* ---------- a floating index chip ---------- */

/** The small "01 / 04" marker broadcast graphics use to place you in a sequence. */
export const IndexChip = ({
  palette,
  scale,
  index,
  total,
  delay = 0,
}: {
  palette: Palette;
  scale: number;
  index: number;
  total: number;
  delay?: number;
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame - delay, [0, 14], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        opacity,
        display: 'flex',
        alignItems: 'baseline',
        gap: 6 * scale,
        fontSize: 22 * scale,
        fontWeight: 600,
        letterSpacing: 2 * scale,
        color: palette.accent,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      <span>{String(index).padStart(2, '0')}</span>
      <span style={{ color: palette.muted, fontSize: 16 * scale }}>
        / {String(total).padStart(2, '0')}
      </span>
    </div>
  );
};

/** Convenience for scenes that want the current scale without importing separately. */
export const useShapeScale = useScale;
