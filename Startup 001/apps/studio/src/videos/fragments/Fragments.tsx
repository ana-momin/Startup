import {
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from '@motion/engine';
import type { Palette } from '@motion/planner';
import { FONT, onDark, useStyle } from '../scenes/shared';

/**
 * The fragment library.
 *
 * The honest reason our videos looked thin: the engine had four things it could draw —
 * a line of text, a rule, a circle, and one whole device frame. You cannot compose a
 * rich frame out of four primitives however well you arrange them, and every layout pass
 * I did was rearranging the same four.
 *
 * The reference films are not winning on polish. They are winning on *having more kinds
 * of thing to put on screen*: chips, pills, bubbles, cards at mixed scales, grids with
 * nodes, logo rows, arrows between labelled states. Each one is simple. Having twenty of
 * them is what makes a frame look designed rather than filled.
 *
 * Everything here is a pure function of the frame, takes its colours from the scene, and
 * knows how to arrive on its own — so a composition can place one anywhere and it will
 * behave.
 */

/* ============================ chips and pills ============================ */

export type ChipTone = 'filled' | 'outline' | 'tint' | 'plain';

/**
 * A labelled pill.
 *
 * The most reusable object in the whole library. It is a tag, a state, a feature name, a
 * step in a flow, a button — the same shape doing a dozen jobs, which is exactly why
 * interfaces use it so heavily and why it reads instantly as "software".
 */
export const Chip = ({
  label,
  palette,
  scale,
  delay = 0,
  tone = 'tint',
  size = 26,
  dot,
  icon,
}: {
  label: string;
  palette: Palette;
  scale: number;
  delay?: number;
  tone?: ChipTone;
  /** Font size before scaling. */
  size?: number;
  /** A small coloured dot before the label — a status, a service, a person. */
  dot?: string;
  /** A square mark before the label, standing in for an app icon. */
  icon?: boolean;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const style = useStyle();
  const local = frame - delay;

  const rise = spring({ frame: local, fps, config: 'snappy' });
  const show = interpolate(local, [0, 9], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  if (show <= 0) return null;

  const font = size * scale;
  const surface = {
    filled: { bg: palette.accent, fg: onDark(palette.accent) ? '#fff' : '#111', border: 'transparent' },
    outline: { bg: 'transparent', fg: palette.text, border: palette.accent },
    tint: { bg: `${palette.accent}1F`, fg: palette.accent, border: 'transparent' },
    plain: { bg: `${palette.muted}1A`, fg: palette.text, border: 'transparent' },
  }[tone];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: font * 0.42,
        padding: `${font * 0.42}px ${font * 0.72}px`,
        borderRadius: 999,
        backgroundColor: surface.bg,
        border: `${Math.max(1.5 * scale, 1)}px solid ${surface.border}`,
        color: surface.fg,
        fontFamily: style.labelFamily,
        fontSize: font,
        fontWeight: 560,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        opacity: show,
        transform: `translateY(${(1 - rise) * font * 0.5}px) scale(${0.92 + rise * 0.08})`,
      }}
    >
      {icon ? (
        <span
          style={{
            width: font * 0.82,
            height: font * 0.82,
            borderRadius: font * 0.24,
            backgroundColor: tone === 'filled' ? surface.fg : palette.accent,
            opacity: tone === 'filled' ? 0.85 : 1,
            flexShrink: 0,
          }}
        />
      ) : null}
      {dot ? (
        <span
          style={{
            width: font * 0.38,
            height: font * 0.38,
            borderRadius: 999,
            backgroundColor: dot,
            flexShrink: 0,
          }}
        />
      ) : null}
      {label}
    </span>
  );
};

/**
 * A cursor with somebody's name on it.
 *
 * Straight from the reference films, and it does something no other element can: it says
 * other people are here. A frame with two named cursors on it reads as collaborative
 * software before a single word has been read.
 */
export const NamedCursor = ({
  name,
  color,
  scale,
  delay = 0,
}: {
  name: string;
  color: string;
  scale: number;
  delay?: number;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const style = useStyle();
  const local = frame - delay;

  const rise = spring({ frame: local, fps, config: 'snappy' });
  if (local < 0) return null;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'flex-start',
        gap: 2 * scale,
        opacity: Math.min(rise * 1.6, 1),
        transform: `translate(${(1 - rise) * -8 * scale}px, ${(1 - rise) * -8 * scale}px)`,
      }}
    >
      <svg width={17 * scale} height={20 * scale} viewBox="0 0 17 20" style={{ display: 'block' }}>
        <path d="M1 1 L1 15 L5 11.5 L7.4 17.5 L10.2 16.4 L7.8 10.6 L13 10.4 Z" fill={color} />
      </svg>
      <span
        style={{
          padding: `${4 * scale}px ${8 * scale}px`,
          borderRadius: 6 * scale,
          backgroundColor: color,
          color: onDark(color) ? '#fff' : '#111',
          fontFamily: style.labelFamily,
          fontSize: 15 * scale,
          fontWeight: 600,
          whiteSpace: 'nowrap',
          marginTop: 10 * scale,
        }}
      >
        {name}
      </span>
    </span>
  );
};

/* ============================ cards and bubbles ============================ */

/**
 * A fragment of an interface, floating free.
 *
 * The single biggest thing the library was missing. We could draw a whole device frame,
 * which is one idea used one way; the reference films scatter *pieces* of interface at
 * different scales and angles, and that reads as a product with depth rather than a
 * screenshot on a slide.
 */
export const Card = ({
  title,
  body,
  palette,
  scale,
  width,
  delay = 0,
  tilt = 0,
  accentBar,
  chip,
}: {
  title?: string;
  /** Lines of body text. Pass real words where they exist, counts where they do not. */
  body?: string[] | number;
  palette: Palette;
  scale: number;
  width: number;
  delay?: number;
  /** Degrees. A few is plenty — a card rotated far reads as a mistake. */
  tilt?: number;
  accentBar?: boolean;
  chip?: string;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const style = useStyle();
  const local = frame - delay;

  const rise = spring({ frame: local, fps, config: 'snappy' });
  const show = interpolate(local, [0, 11], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  if (show <= 0) return null;

  const dark = onDark(palette.bg);
  const pad = width * 0.075;
  const lines = typeof body === 'number' ? Array.from({ length: body }, () => '') : (body ?? []);

  return (
    <div
      style={{
        width,
        padding: pad,
        borderRadius: width * 0.062,
        backgroundColor: dark ? mix(palette.bg, palette.text, 0.08) : '#FFFFFF',
        border: `${Math.max(1 * scale, 1)}px solid ${dark ? mix(palette.bg, palette.text, 0.16) : mix('#FFFFFF', palette.text, 0.1)}`,
        boxShadow: dark
          ? `0 ${12 * scale}px ${30 * scale}px rgba(0,0,0,0.38)`
          : `0 ${6 * scale}px ${14 * scale}px rgba(16,20,40,0.06), 0 ${20 * scale}px ${40 * scale}px rgba(16,20,40,0.08)`,
        opacity: show,
        transform: `translateY(${(1 - rise) * 26 * scale}px) rotate(${tilt}deg) scale(${0.95 + rise * 0.05})`,
        display: 'flex',
        flexDirection: 'column',
        gap: pad * 0.52,
      }}
    >
      {accentBar ? (
        <span
          style={{
            width: width * 0.22,
            height: Math.max(width * 0.018, 3 * scale),
            borderRadius: 999,
            backgroundColor: palette.accent,
          }}
        />
      ) : null}

      {chip ? <Chip label={chip} palette={palette} scale={scale} size={width * 0.052 / scale} delay={delay + 4} /> : null}

      {title ? (
        <span
          style={{
            fontFamily: style.family,
            fontSize: width * 0.082,
            fontWeight: 620,
            lineHeight: 1.25,
            color: palette.text,
          }}
        >
          {title}
        </span>
      ) : null}

      {lines.map((line, i) => (
        <span key={i} style={{ display: 'block' }}>
          {line ? (
            <span
              style={{
                fontFamily: style.family,
                fontSize: width * 0.058,
                lineHeight: 1.45,
                color: palette.muted,
              }}
            >
              {line}
            </span>
          ) : (
            /* A bar where a line of text would be. Real copy is better when we have it,
               and inventing sentences to fill a card is how a video makes claims nobody
               approved. */
            <span
              style={{
                display: 'block',
                width: `${[92, 74, 84, 62][i % 4]}%`,
                height: width * 0.028,
                borderRadius: 999,
                backgroundColor: `${palette.muted}3D`,
              }}
            />
          )}
        </span>
      ))}
    </div>
  );
};

/** A message in a conversation. The corner nearest the speaker is squared off. */
export const Bubble = ({
  text,
  palette,
  scale,
  width,
  delay = 0,
  mine = false,
  author,
}: {
  text: string;
  palette: Palette;
  scale: number;
  width: number;
  delay?: number;
  mine?: boolean;
  author?: string;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const style = useStyle();
  const local = frame - delay;

  const rise = spring({ frame: local, fps, config: 'snappy' });
  const show = interpolate(local, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  if (show <= 0) return null;

  const dark = onDark(palette.bg);
  const font = width * 0.062;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: mine ? 'flex-end' : 'flex-start',
        gap: font * 0.4,
        opacity: show,
        transform: `translateY(${(1 - rise) * 18 * scale}px)`,
      }}
    >
      {author ? (
        <span
          style={{
            fontFamily: style.labelFamily,
            fontSize: font * 0.72,
            color: palette.muted,
            paddingLeft: font * 0.2,
          }}
        >
          {author}
        </span>
      ) : null}

      <div
        style={{
          maxWidth: width,
          padding: `${font * 0.72}px ${font * 0.92}px`,
          borderRadius: font * 0.9,
          borderBottomRightRadius: mine ? font * 0.25 : font * 0.9,
          borderBottomLeftRadius: mine ? font * 0.9 : font * 0.25,
          backgroundColor: mine
            ? palette.accent
            : dark
              ? mix(palette.bg, palette.text, 0.1)
              : '#FFFFFF',
          border: mine ? 'none' : `${Math.max(1 * scale, 1)}px solid ${mix(palette.bg, palette.text, dark ? 0.16 : 0.09)}`,
          boxShadow: mine || dark ? undefined : `0 ${4 * scale}px ${12 * scale}px rgba(16,20,40,0.05)`,
          color: mine ? (onDark(palette.accent) ? '#fff' : '#111') : palette.text,
          fontFamily: style.family,
          fontSize: font,
          lineHeight: 1.4,
        }}
      >
        {text}
      </div>
    </div>
  );
};

/* ============================ diagrams ============================ */

/**
 * States with arrows between them.
 *
 * Straight from the reference: "Checkpoint → Production". It turns a list into a
 * *process*, which is a different claim from the same words in a column — and it is the
 * clearest way to show that a product does something in a sequence.
 */
export const Flow = ({
  steps,
  palette,
  scale,
  delay = 0,
  step = 8,
  size = 30,
}: {
  steps: string[];
  palette: Palette;
  scale: number;
  delay?: number;
  /** Frames between one state and the next. */
  step?: number;
  size?: number;
}) => {
  const frame = useCurrentFrame();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size * scale * 0.5, flexWrap: 'nowrap' }}>
      {steps.map((label, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: size * scale * 0.5 }}>
          <Chip
            label={label}
            palette={palette}
            scale={scale}
            size={size}
            delay={delay + i * step * 2}
            tone={i === steps.length - 1 ? 'filled' : 'outline'}
          />
          {i < steps.length - 1 ? (
            <Arrow
              palette={palette}
              scale={scale}
              size={size}
              // The arrow draws between the two states it joins, so the eye is carried
              // from one to the next rather than being shown both and left to connect them.
              progress={interpolate(frame - delay - (i * 2 + 1) * step, [0, 12], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: Easing.easeOutExpo,
              })}
            />
          ) : null}
        </span>
      ))}
    </div>
  );
};

const Arrow = ({
  palette,
  scale,
  size,
  progress,
}: {
  palette: Palette;
  scale: number;
  size: number;
  progress: number;
}) => {
  const w = size * scale * 2;
  const h = size * scale * 1.5;
  if (progress <= 0) return null;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', overflow: 'visible' }}>
      <path
        d={`M ${w * 0.1} ${h / 2} L ${w * 0.78} ${h / 2} M ${w * 0.58} ${h / 2 - h * 0.15} L ${w * 0.78} ${h / 2} L ${w * 0.58} ${h / 2 + h * 0.15}`}
        fill="none"
        stroke={palette.accent}
        strokeWidth={Math.max(2.4 * scale, 2)}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - progress}
      />
    </svg>
  );
};

/* ============================ backgrounds ============================ */

/**
 * A technical grid with a node at every intersection.
 *
 * Used constantly in one of the references and almost free to draw: two repeating
 * gradients for the lines and one for the dots. It is the cheapest way to make a frame
 * feel engineered rather than empty, and because it sits at a few per cent opacity it
 * never competes with anything placed on top of it.
 */
export const NodeGrid = ({
  palette,
  scale,
  cell = 110,
  delay = 0,
  strength = 1,
}: {
  palette: Palette;
  scale: number;
  cell?: number;
  delay?: number;
  strength?: number;
}) => {
  const frame = useCurrentFrame();
  const show = interpolate(frame - delay, [0, 26], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  if (show <= 0) return null;

  const size = cell * scale;
  const line = `${palette.text}0F`;
  const node = `${palette.accent}4D`;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        opacity: show * 0.9 * strength,
        backgroundImage: `
          radial-gradient(${node} ${1.7 * scale}px, transparent ${1.8 * scale}px),
          linear-gradient(to right, ${line} 1px, transparent 1px),
          linear-gradient(to bottom, ${line} 1px, transparent 1px)`,
        backgroundSize: `${size}px ${size}px, ${size}px ${size}px, ${size}px ${size}px`,
        // Offset by half a cell so the dots land on the line crossings rather than inside
        // the squares — which is the whole difference between a grid and graph paper.
        backgroundPosition: `${-1.7 * scale}px ${-1.7 * scale}px, 0 0, 0 0`,
        maskImage: 'radial-gradient(ellipse at center, black 25%, transparent 82%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center, black 25%, transparent 82%)',
      }}
    />
  );
};

/**
 * A soft mesh of colour.
 *
 * Three or four wide radial gradients overlapping. It is what the reference films use
 * behind their opening and closing cards, and it does something a flat field cannot: it
 * gives a frame a light source without giving it an object. Deliberately built from
 * gradients rather than a blur filter, which costs a full-frame rasterisation per frame.
 */
export const Mesh = ({
  palette,
  delay = 0,
  strength = 1,
}: {
  palette: Palette;
  delay?: number;
  strength?: number;
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const show = interpolate(frame - delay, [0, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // A slow drift, so the light moves without anything moving.
  const t = interpolate(frame, [0, Math.max(durationInFrames, 1)], [0, 1]);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        opacity: show * strength,
        backgroundImage: `
          radial-gradient(60% 55% at ${18 + t * 10}% ${22 + t * 8}%, ${palette.accent}2E 0%, transparent 70%),
          radial-gradient(55% 50% at ${82 - t * 8}% ${30 + t * 6}%, ${palette.accentSoft}26 0%, transparent 72%),
          radial-gradient(70% 60% at ${50 + t * 6}% ${88 - t * 6}%, ${palette.accent}1F 0%, transparent 75%)`,
      }}
    />
  );
};

/* ============================ helpers ============================ */

const mix = (a: string, b: string, amount: number): string => {
  const parse = (hex: string): [number, number, number] => {
    let value = hex.replace('#', '');
    if (value.length === 3) value = value.split('').map((c) => c + c).join('');
    return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16)) as [number, number, number];
  };
  if (!a.startsWith('#') || !b.startsWith('#')) return a;
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const t = Math.min(Math.max(amount, 0), 1);
  const to = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `rgb(${to(ar, br)}, ${to(ag, bg)}, ${to(ab, bb)})`;
};

export { FONT };
