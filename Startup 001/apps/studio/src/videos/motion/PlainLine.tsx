import { interpolate, spring, useCurrentFrame, useVideoConfig } from '@motion/engine';
import type { Palette } from '@motion/planner';
import { useStyle } from '../scenes/shared';

/**
 * One line. Normal size. Centred. Nothing clever.
 *
 * This exists because of a note from Anas that was more useful than any amount of
 * studying: *the text that looks professional is simple and minimal — you don't need to
 * overcomplicate text.* He is right, and the engine had been doing the opposite.
 *
 * `StackedType` breaks a headline into lines by meaning and then sets each line at
 * whatever size fills the measure, so a two-word line and a four-word line come out at
 * wildly different scales. It is a real technique and it looks designed — for about two
 * videos. After that it reads as a mannerism, because every headline in every film is
 * doing the same trick, and a trick repeated is a template.
 *
 * Look at what the reference frames actually do: "Your next idea". "Starts here".
 * "Find inspiration". One line, one size, regular weight, dead centre, enormous white
 * space around it. The confidence is in the restraint. Nothing is fighting.
 *
 * The one flourish is the one those frames do use: the line ramps in colour from the text
 * colour to the brand colour across its own length, so the last word lands in the brand's
 * blue. It costs a gradient and it is the only decoration the line gets.
 */

type Props = {
  text: string;
  size: number;
  palette: Palette;
  delay?: number;
  align?: 'left' | 'center';
  /**
   * Ramp the colour across the line, ending on the brand colour.
   *
   * Per-word rather than per-letter: letters mid-word in different colours reads as a
   * rendering fault, where a word landing in the accent reads as emphasis.
   */
  ramp?: boolean;
  maxWidth?: string;
};

export const PlainLine = ({
  text,
  size,
  palette,
  delay = 0,
  align = 'center',
  ramp = false,
  maxWidth = '100%',
}: Props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - delay;

  // A spec with a missing line should cost that line, not the whole page. Callers type
  // this as a string, but specs cross a network and a model wrote them.
  const words = String(text ?? '').trim().split(/\s+/).filter(Boolean);

  return (
    <div
      style={{
        maxWidth,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: align === 'left' ? 'flex-start' : 'center',
        // A single column-gap rather than spaces, so the words can be separate elements
        // without the browser deciding how much air sits between them.
        columnGap: size * 0.26,
        rowGap: size * 0.12,
      }}
    >
      {words.map((word, i) => {
        /*
         * Words arrive one after another, close together.
         *
         * Three frames apart, which at thirty is a tenth of a second — fast enough that
         * the line reads as one gesture rather than as words being dealt out, slow
         * enough that the eye follows it left to right.
         */
        const wordLocal = local - i * 3;
        const rise = spring({ frame: wordLocal, fps, config: 'heavy' });
        const show = interpolate(wordLocal, [0, 8], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });

        // Position along the line, 0 at the first word and 1 at the last.
        const t = words.length <= 1 ? 1 : i / (words.length - 1);

        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              fontFamily: 'inherit',
              fontSize: size,
              fontWeight: 'inherit',
              letterSpacing: 'inherit',
              lineHeight: 1.15,
              // The ramp runs across the whole line, so each word takes its own place on
              // it rather than fading individually.
              color: ramp ? mix(palette.text, palette.accent, t * t) : palette.text,
              opacity: show,
              // Up by a fifth of its own size. Small — the words should settle, not fly.
              transform: `translateY(${(1 - rise) * size * 0.2}px)`,
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};

/**
 * Blend two hex colours.
 *
 * Local rather than imported from the planner's colour module because this is the
 * drawing side, and a scene reaching into the planner for arithmetic is the kind of
 * dependency that quietly turns two packages into one.
 */
const mix = (a: string, b: string, amount: number): string => {
  const parse = (hex: string): [number, number, number] => {
    let v = hex.replace('#', '');
    if (v.length === 3) v = v.split('').map((c) => c + c).join('');
    return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16)) as [number, number, number];
  };
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  const t = Math.max(0, Math.min(1, amount));
  const out = [r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t];
  return `#${out.map((n) => Math.round(n).toString(16).padStart(2, '0')).join('')}`;
};

/** Props the wrapper needs, so a scene can set the family and weight once. */
export const PlainLineBox = ({
  children,
  align = 'center',
}: {
  children: React.ReactNode;
  align?: 'left' | 'center';
}) => {
  const style = useStyle();
  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        justifyContent: align === 'left' ? 'flex-start' : 'center',
        fontFamily: style.family,
        /*
         * Regular-ish, not heavy.
         *
         * The looks push headline weight up to 800 in places, which is right for a poster
         * and wrong for this. Every one of the reference frames sets its line at something
         * close to a medium — the restraint IS the design, and an 800-weight "simple line"
         * is not simple, it is shouting quietly.
         */
        fontWeight: Math.min(style.weight, 560),
        letterSpacing: `${style.tracking * 0.6}em`,
        textTransform: 'none',
      }}
    >
      {children}
    </div>
  );
};
