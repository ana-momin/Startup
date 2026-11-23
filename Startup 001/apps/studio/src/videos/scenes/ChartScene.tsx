import {
  Center,
  Draw,
  Easing,
  arcPath,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from '@motion/engine';
import type { ChartKind, ChartPoint, Palette } from '@motion/planner';
import { MaskedLine, MaskedText } from '../motion/MaskedText';
import { SceneShell } from '../motion/SceneShell';
import { FONT, onDark, useBeats, useScale, useTone } from './shared';

/**
 * A number that draws itself.
 *
 * A statistic said out loud is a claim. A statistic drawn in front of you, growing from
 * nothing to its value while you watch, is evidence — the growth *is* the argument, and
 * the viewer arrives at the conclusion a moment before the label tells them.
 *
 * Every value here comes from the plan. Nothing in this file invents, rounds up or
 * rescales a number to make a shape look better, which matters more than it sounds: a
 * chart that flatters its data is the one thing a company can actually be sued over, and
 * a tool that quietly does it is worse than no tool.
 */

type Props = {
  heading?: string;
  chart: ChartKind;
  series: ChartPoint[];
  unit?: string;
  caption?: string;
  palette: Palette;
  duration: number;
  index?: number;
  /** Where this scene sits in the video, 0 to 1. Sets how far back the camera stands. */
  position?: number;
};

export const ChartScene = ({
  heading,
  chart,
  series,
  unit = '',
  caption,
  palette,
  duration,
  index,
  position,
}: Props) => {
  const scale = useScale();
  const tone = useTone();
  const on = useBeats();

  const points = series.slice(0, 7);

  return (
    <SceneShell palette={palette} duration={duration} index={index} position={position} kind="chart">
      <Center style={{ gap: 34 * scale, padding: `${40 * scale}px 0` }}>
        {heading ? (
          <MaskedText
            text={heading}
            delay={on(0)}
            size={52 * scale * tone.headlineScale}
            color={palette.text}
            align="center"
            maxWidth={1300 * scale}
            stagger={2.2}
          />
        ) : null}

        {chart === 'donut' ? (
          <Donut points={points} palette={palette} scale={scale} unit={unit} start={on(1)} />
        ) : chart === 'line' ? (
          <Line points={points} palette={palette} scale={scale} unit={unit} start={on(1)} />
        ) : (
          <Bars points={points} palette={palette} scale={scale} unit={unit} start={on(1)} beat={Math.max(on(0.25), 3)} />
        )}

        {caption ? (
          <MaskedLine delay={on(3)} duration={24} size={28 * scale}>
            <span
              style={{
                display: 'block',
                fontSize: 28 * scale,
                color: palette.muted,
                textAlign: 'center',
                maxWidth: 1000 * scale,
              }}
            >
              {caption}
            </span>
          </MaskedLine>
        ) : null}
      </Center>
    </SceneShell>
  );
};

/* ---------------- bars ---------------- */

/**
 * Bars growing from a baseline.
 *
 * Staggered, so the eye reads them in order instead of being handed a finished chart.
 * The tallest is in the accent colour and the rest are held back — a chart where every
 * bar is equally loud makes the viewer do the comparison themselves, which is work they
 * did not agree to.
 */
const Bars = ({
  points,
  palette,
  scale,
  unit,
  start,
  beat,
}: {
  points: ChartPoint[];
  palette: Palette;
  scale: number;
  unit: string;
  start: number;
  beat: number;
}) => {
  const frame = useCurrentFrame();
  const max = Math.max(...points.map((p) => p.value), 1);
  const tallest = points.reduce((best, p, i) => (p.value > points[best].value ? i : best), 0);

  const chartHeight = 520 * scale;

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 26 * scale, height: chartHeight }}>
      {points.map((point, i) => {
        const local = frame - start - i * beat;
        const grow = interpolate(local, [0, 26], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.easeOutExpo,
        });
        const lead = i === tallest;
        const height = (point.value / max) * (chartHeight - 130 * scale) * grow;

        return (
          <div
            key={i}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 * scale, height: '100%', justifyContent: 'flex-end' }}
          >
            {/* The value rides on top of its own bar, so the number and the length it
                stands for are never separated by a legend. */}
            <span
              style={{
                fontFamily: FONT,
                fontSize: (lead ? 34 : 26) * scale,
                fontWeight: 700,
                color: lead ? palette.accent : palette.text,
                fontVariantNumeric: 'tabular-nums',
                opacity: grow,
              }}
            >
              {format(point.value * grow)}
              <span style={{ fontSize: 18 * scale, opacity: 0.65 }}>{unit}</span>
            </span>

            <span
              style={{
                width: (lead ? 130 : 108) * scale,
                height,
                borderRadius: `${10 * scale}px ${10 * scale}px ${3 * scale}px ${3 * scale}px`,
                backgroundColor: lead ? palette.accent : `${palette.accent}44`,
                boxShadow: lead && onDark(palette.bg) ? `0 0 ${40 * scale}px ${palette.accent}55` : undefined,
              }}
            />

            <span
              style={{
                fontFamily: FONT,
                fontSize: 21 * scale,
                color: lead ? palette.text : palette.muted,
                opacity: grow,
                whiteSpace: 'nowrap',
              }}
            >
              {point.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

/* ---------------- line ---------------- */

/**
 * A line drawn by a moving pen, with a dot riding the tip.
 *
 * The dot is what makes it read as *happening* rather than as a finished line being
 * uncovered. The eye locks onto a moving point and follows it, which means the viewer
 * traces the shape of the data instead of glancing at the end of it.
 */
const Line = ({
  points,
  palette,
  scale,
  unit,
  start,
}: {
  points: ChartPoint[];
  palette: Palette;
  scale: number;
  unit: string;
  start: number;
}) => {
  const frame = useCurrentFrame();
  const w = 1150 * scale;
  const h = 470 * scale;
  const pad = 34 * scale;

  const max = Math.max(...points.map((p) => p.value), 1);
  const min = Math.min(...points.map((p) => p.value), 0);
  const range = Math.max(max - min, 1);

  const at = (i: number) => {
    const x = pad + (i / Math.max(points.length - 1, 1)) * (w - pad * 2);
    const y = h - pad - ((points[i].value - min) / range) * (h - pad * 2);
    return [x, y] as const;
  };

  const d = points.map((_, i) => `${i === 0 ? 'M' : 'L'} ${at(i)[0]} ${at(i)[1]}`).join(' ');

  const DRAW = 42;
  const progress = interpolate(frame - start, [0, DRAW], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.easeInOutCubic,
  });

  // Where the pen is now, so the dot can ride the tip.
  const along = progress * Math.max(points.length - 1, 1);
  const seg = Math.min(Math.floor(along), points.length - 2);
  const t = along - seg;
  const [x1, y1] = at(Math.max(seg, 0));
  const [x2, y2] = at(Math.min(seg + 1, points.length - 1));
  const tipX = x1 + (x2 - x1) * t;
  const tipY = y1 + (y2 - y1) * t;

  const last = points[points.length - 1];

  return (
    <div style={{ position: 'relative', width: w, height: h }}>
      {/* Baseline, so the line has something to be measured against. */}
      <div
        style={{
          position: 'absolute',
          left: pad,
          right: pad,
          bottom: pad,
          height: 1 * scale,
          backgroundColor: `${palette.muted}33`,
        }}
      />

      <Draw d={d} color={palette.accent} width={5 * scale} delay={start} duration={DRAW} easing={Easing.easeInOutCubic} />

      {progress > 0 ? (
        <span
          style={{
            position: 'absolute',
            left: tipX - 9 * scale,
            top: tipY - 9 * scale,
            width: 18 * scale,
            height: 18 * scale,
            borderRadius: 999,
            backgroundColor: palette.accent,
            boxShadow: onDark(palette.bg) ? `0 0 ${26 * scale}px ${palette.accent}` : undefined,
          }}
        />
      ) : null}

      {/* The final value, arriving only once the pen has reached it. */}
      {progress > 0.97 ? (
        <span
          style={{
            position: 'absolute',
            left: Math.min(tipX + 22 * scale, w - 150 * scale),
            top: tipY - 46 * scale,
            fontFamily: FONT,
            fontSize: 38 * scale,
            fontWeight: 700,
            color: palette.text,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {format(last.value)}
          <span style={{ fontSize: 22 * scale, color: palette.accent }}>{unit}</span>
        </span>
      ) : null}

      {/* Labels at both ends: enough to say what changed, without an axis nobody reads. */}
      <Ends points={points} palette={palette} scale={scale} pad={pad} show={progress} />
    </div>
  );
};

const Ends = ({
  points,
  palette,
  scale,
  pad,
  show,
}: {
  points: ChartPoint[];
  palette: Palette;
  scale: number;
  pad: number;
  show: number;
}) => (
  <>
    {[0, points.length - 1].map((i, n) => (
      <span
        key={i}
        style={{
          position: 'absolute',
          left: n === 0 ? pad : undefined,
          right: n === 0 ? undefined : pad,
          bottom: -6 * scale,
          fontFamily: FONT,
          fontSize: 21 * scale,
          color: palette.muted,
          opacity: n === 0 ? 1 : show,
          whiteSpace: 'nowrap',
        }}
      >
        {points[i]?.label ?? ''}
      </span>
    ))}
  </>
);

/* ---------------- donut ---------------- */

/**
 * One proportion, as an arc.
 *
 * A donut is a bad chart for comparing several things and the best one there is for
 * showing a single share, because the eye reads "most of the circle" without counting.
 * So only the first value is drawn, with the rest as the remainder — using it to
 * compare five slices would be using it for the one job it is worst at.
 */
const Donut = ({
  points,
  palette,
  scale,
  unit,
  start,
}: {
  points: ChartPoint[];
  palette: Palette;
  scale: number;
  unit: string;
  start: number;
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const head = points[0] ?? { label: '', value: 0 };
  const total = points.reduce((sum, p) => sum + p.value, 0) || 1;
  // A single value reads as a percentage of itself; several read as a share of the whole.
  const share = points.length > 1 ? head.value / total : Math.min(head.value / 100, 1);

  const size = 480 * scale;
  const r = size / 2 - 16 * scale;
  const cx = size / 2;
  const cy = size / 2;

  const progress = interpolate(frame - start, [0, 40], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.easeOutExpo,
  });
  const swept = share * progress * 360;

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ position: 'absolute', inset: 0 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={`${palette.muted}2E`} strokeWidth={28 * scale} />
        {swept > 0.5 ? (
          <path
            d={arcPath(cx, cy, r, 0, swept)}
            fill="none"
            stroke={palette.accent}
            strokeWidth={28 * scale}
            strokeLinecap="round"
          />
        ) : null}
      </svg>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4 * scale,
        }}
      >
        <span
          style={{
            fontFamily: FONT,
            fontSize: 92 * scale * (width < height ? 1.1 : 1),
            fontWeight: 800,
            color: palette.text,
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: -3 * scale,
          }}
        >
          {format(head.value * progress)}
          <span style={{ fontSize: 40 * scale, color: palette.accent }}>{unit || '%'}</span>
        </span>
        <span style={{ fontFamily: FONT, fontSize: 24 * scale, color: palette.muted, opacity: progress }}>
          {head.label}
        </span>
      </div>
    </div>
  );
};

/**
 * Numbers the way a person would write them.
 *
 * Whole numbers keep no decimal, and a value counting up to 4.5 shows one — because
 * "4.50" while it climbs and "4.5" when it lands reads as two different numbers.
 */
const format = (value: number): string => {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
};
