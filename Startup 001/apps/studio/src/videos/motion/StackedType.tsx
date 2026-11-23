import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from '@motion/engine';
import type { Palette } from '@motion/planner';
import { onColorField, useStyle } from '../scenes/shared';

/**
 * A headline set as a graphic object.
 *
 * This is the move the engine never had, and the reason every frame we made looked like
 * a slide with a sentence on it. Our headlines were one size, centred, wrapping wherever
 * the box happened to run out — which is how a browser sets text, not how a designer
 * does.
 *
 * What designers actually do with a short, important line is break it into lines *by
 * meaning* and then set each line to fill the full measure. Lines of two, three and one
 * word all reaching the same right edge means the type sizes must differ wildly — and
 * that difference is the composition. It is the look of a Swiss poster, a magazine
 * cover, a title sequence, and essentially every piece of motion design that has ever
 * looked expensive.
 *
 * It costs one division per line. The type size is the measure divided by how wide the
 * line would be at size one — there is no layout pass, no measuring, and it stays a pure
 * function of its inputs.
 *
 * The result is type that fills the frame instead of floating in it, which is most of
 * what separates "designed" from "set".
 */

type Props = {
  text: string;
  palette: Palette;
  /** Width the lines should fill, in pixels. */
  measure: number;
  /** Total height available, so the block can be capped. */
  height: number;
  /** Frame this begins on. */
  delay?: number;
  /** Frames between one line and the next. */
  stagger?: number;
  /** The word to pick out. Defaults to the longest, which is usually the subject. */
  emphasis?: string;
  /** How the emphasised word is treated. */
  mark?: 'colour' | 'block' | 'outline';
};

export const StackedType = ({
  text,
  palette,
  measure,
  height,
  delay = 0,
  stagger = 4,
  emphasis,
  mark = 'colour',
}: Props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const style = useStyle();

  const lines = breakIntoLines(text);
  const field = onColorField(palette);

  /*
   * Each line is sized to fill the measure.
   *
   * A line's width at font-size 1 is roughly its character count times the face's
   * average character width, so the size that fills the measure is the measure divided
   * by that. Short lines come out enormous and long ones small, which is exactly the
   * effect — the variation is not decoration, it is what filling the width *requires*.
   */
  const sizes = lines.map((line) => {
    const width = Math.max(line.length, 1) * style.charRatio;
    return measure / width;
  });

  // The block must still fit vertically. One factor applied to every line keeps the
  // relationship between them, which is the part that matters.
  const totalHeight = sizes.reduce((sum, size) => sum + size * LEADING, 0);
  const fit = totalHeight > height ? height / totalHeight : 1;

  const target = (emphasis ?? longestWord(text)).toLowerCase();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {lines.map((line, i) => {
        const local = frame - delay - i * stagger;
        const rise = spring({ frame: local, fps, config: style.tone.spring });
        const size = sizes[i] * fit;

        return (
          <span
            key={i}
            style={{
              display: 'block',
              overflow: 'hidden',
              // The mask needs room for descenders, and the negative margin gives the
              // space back so the lines still sit tight against each other.
              paddingBottom: size * 0.16,
              marginBottom: -size * 0.16,
            }}
          >
            <span
              style={{
                display: 'block',
                transform: `translateY(${(1 - rise) * 105}%)`,
                fontFamily: style.family,
                fontSize: size,
                fontWeight: style.weight,
                // Tight. Lines that fill the width need to stack almost touching, or the
                // block reads as separate sentences rather than as one shape.
                lineHeight: LEADING,
                letterSpacing: size * (style.tracking - 0.01),
                textTransform: style.upper ? 'uppercase' : 'none',
                whiteSpace: 'nowrap',
                color: palette.text,
              }}
            >
              {line.split(' ').map((word, w) => {
                const isTarget = word.toLowerCase().replace(/[^\w']/g, '') === target;
                return (
                  <span key={w} style={wordStyle(isTarget, mark, palette, field, size, local)}>
                    {word}
                    {w < line.split(' ').length - 1 ? ' ' : ''}
                  </span>
                );
              })}
            </span>
          </span>
        );
      })}
    </div>
  );
};

const LEADING = 0.92;

/**
 * How the one emphasised word is treated.
 *
 * Exactly one word, and only ever one treatment. A headline where three words are picked
 * out has emphasised nothing — the eye needs somewhere to land, not a list of candidates.
 */
const wordStyle = (
  isTarget: boolean,
  mark: Props['mark'],
  palette: Palette,
  field: boolean,
  size: number,
  local: number,
): React.CSSProperties => {
  if (!isTarget) return {};

  // On a colour field the accent is the text colour, so colour cannot carry emphasis.
  // Outline can: knocking the word back to its own edges still reads as deliberate.
  const treatment = field && mark === 'colour' ? 'outline' : mark;

  switch (treatment) {
    case 'outline':
      return {
        color: 'transparent',
        WebkitTextStroke: `${Math.max(size * 0.018, 1.5)}px ${palette.text}`,
      };

    case 'block': {
      // The bar wipes in behind the word after it has landed, so the word is read first
      // and then marked — which is the order a person would do it in with a highlighter.
      const wipe = interpolate(local, [10, 24], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.easeOutExpo,
      });
      return {
        backgroundImage: `linear-gradient(${palette.accent}, ${palette.accent})`,
        backgroundSize: `${wipe * 100}% 100%`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'left center',
        boxDecorationBreak: 'clone',
        WebkitBoxDecorationBreak: 'clone',
        padding: `0 ${size * 0.04}px`,
        margin: `0 ${-size * 0.04}px`,
        color: wipe > 0.5 ? palette.bg : palette.text,
      };
    }

    case 'colour':
    default:
      return { color: palette.accent };
  }
};

/**
 * Break a headline into lines by meaning.
 *
 * Not by width, which is what a browser does and why wrapped headlines look accidental.
 * The aim is lines of roughly similar character counts so the sizes that fill the
 * measure stay within a usable range of each other — and a break that does not orphan a
 * single short word onto its own line unless that word is worth a whole line.
 */
const breakIntoLines = (text: string): string[] => {
  // A spec with a missing line should cost that line, not the whole page. Callers type
  // this as a string, but specs cross a network and a model wrote them.
  const words = String(text ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length <= 2) return words.length ? words : [];

  /*
   * How many lines to aim for.
   *
   * Three once there is enough to fill them, two below that. Past three the type gets
   * small enough that filling the measure stops being the point.
   */
  const target = words.length >= 5 ? 3 : 2;
  const cost = (word: string) => word.length + 1;
  const totalChars = words.reduce((sum, word) => sum + cost(word), 0);
  const per = totalChars / target;

  const lines: string[] = [];
  let current: string[] = [];
  let used = 0;

  words.forEach((word, i) => {
    current.push(word);
    used += cost(word);

    const wordsLeft = words.length - i - 1;
    const linesLeft = target - lines.length - 1;

    /*
     * Break when this line has had its share — and only while enough words remain to
     * fill the lines that are left.
     *
     * The guard here used to require more than one word remaining, which silently
     * disabled the whole effect for three-word headlines: the last word could never
     * start a line, so "Ship without meetings" stayed on one line and the stacking never
     * happened. One word is a perfectly good last line — it is the biggest one, and
     * often the point of the headline.
     */
    const hadItsShare = used >= per * 0.72;
    const roomToFinish = wordsLeft >= linesLeft && wordsLeft > 0;

    if (hadItsShare && linesLeft > 0 && roomToFinish) {
      lines.push(current.join(' '));
      current = [];
      used = 0;
    }
  });

  if (current.length > 0) lines.push(current.join(' '));
  return lines;
};

const longestWord = (text: string): string =>
  text
    .trim()
    .split(/\s+/)
    .reduce((best, word) => (word.length > best.length ? word : best), '')
    .toLowerCase()
    .replace(/[^\w']/g, '');
