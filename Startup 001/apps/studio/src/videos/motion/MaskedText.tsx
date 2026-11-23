import {
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from '@motion/engine';
import { useStyle, useTone } from '../scenes/shared';

/**
 * Text that rises from behind an invisible edge.
 *
 * This is the single move that separates professional motion graphics from text that
 * fades in. Every title sequence you have ever admired does it: the word is *already
 * there*, hidden below a boundary, and the boundary moves rather than the opacity.
 *
 * Each word gets its own container with `overflow: hidden`, and the word inside
 * translates up from below it. Masking per word rather than per line is deliberate —
 * lines cannot be known without measuring rendered text, which is fragile and needs a
 * layout pass, while word masks look nearly identical and always work.
 *
 * A small rotation on the way up gives it weight: a flat translate reads as a slide,
 * the tilt reads as something physically pivoting into place.
 */

type Props = {
  text: string;
  size: number;
  color: string;
  /** Colour for the final word, for emphasis. */
  highlight?: string;
  /** A bar that wipes in behind these words. Matched case-insensitively. */
  mark?: string;
  markColor?: string;
  delay?: number;
  align?: 'center' | 'left';
  maxWidth?: number | string;
  weight?: number;
  /** Frames between words. Defaults to the tone's stagger. */
  stagger?: number;
  /** Turn off the pivot for tones that should feel mechanical rather than physical. */
  flat?: boolean;
  /**
   * Animate each letter instead of each word.
   *
   * Only for short, large text. On a headline a viewer has to *read*, per-letter
   * staggering fights them: the eye wants whole words and is handed a queue of glyphs,
   * so comprehension arrives after the animation instead of during it. On one big word
   * — where there is nothing to read, only something to watch — it is the best move
   * there is, because each letter landing separately gives the word a physical size the
   * eye can feel.
   */
  perLetter?: boolean;
};

export const MaskedText = ({
  text,
  size,
  color,
  highlight,
  mark,
  markColor,
  delay = 0,
  align,
  maxWidth = '90%',
  weight,
  stagger,
  flat,
  perLetter,
}: Props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tone = useTone();
  const style = useStyle();

  const words = text.split(' ');
  const step = stagger ?? tone.stagger;
  const alignment = align ?? tone.align;
  const marked = new Set(
    (mark ?? '').toLowerCase().split(/\s+/).filter(Boolean),
  );

  // The mask has to be taller than the glyphs or descenders get clipped, and wider or
  // italic overhang does. Padding the box and pulling it back with a negative margin
  // keeps the visual spacing correct while giving the mask room.
  const padY = size * 0.18;
  const padX = size * 0.06;

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: alignment === 'center' ? 'center' : 'flex-start',
        alignItems: 'baseline',
        gap: `${size * (tone.leading - 0.92)}px ${size * 0.24}px`,
        maxWidth,
        textAlign: alignment,
      }}
    >
      {words.map((word, i) => {
        const local = frame - delay - i * step;
        const isMarkedWord = marked.has(word.toLowerCase().replace(/[^\w']/g, ''));

        if (perLetter) {
          return (
            <Letters
              key={i}
              word={word}
              // Letters run about twice as fast as words would, or a six-letter word
              // takes longer to arrive than a six-word sentence.
              start={frame - delay - i * step * 2}
              step={Math.max(step * 0.55, 1.2)}
              size={size}
              weight={weight ?? tone.headlineWeight}
              color={isMarkedWord ? contrastOn(markColor ?? color) : color}
              flat={flat}
              padY={padY}
              padX={padX}
            />
          );
        }

        // A spring rather than an eased curve: the tiny overshoot at the top is what
        // makes it land rather than stop.
        const rise = spring({ frame: local, fps, config: tone.spring });
        const offset = (1 - rise) * 100;
        const tilt = flat ? 0 : (1 - rise) * 18;

        const isMarked = isMarkedWord;

        return (
          <span
            key={i}
            style={{
              position: 'relative',
              display: 'inline-block',
              overflow: 'hidden',
              padding: `${padY}px ${padX}px`,
              margin: `${-padY}px ${-padX}px`,
              // The browser needs a reason to keep this on its own layer; without it
              // the mask edge shimmers as the text moves through it.
              willChange: 'transform',
            }}
          >
            {/* The highlight bar sits behind the word and wipes in from the left. */}
            {isMarked && (
              <HighlightBar
                local={local}
                color={markColor ?? color}
                inset={padY * 0.55}
              />
            )}

            <span
              style={{
                position: 'relative',
                display: 'inline-block',
                transform: `translateY(${offset}%) rotate(${tilt * 0.12}deg)`,
                transformOrigin: 'left bottom',
                fontFamily: style.family,
                fontSize: size,
                fontWeight: weight ?? style.weight,
                lineHeight: tone.leading,
                letterSpacing: size * style.tracking,
                textTransform: style.upper ? 'uppercase' : 'none',
                color: isMarked
                  ? contrastOn(markColor ?? color)
                  : highlight && i === words.length - 1
                    ? highlight
                    : color,
                whiteSpace: 'pre',
              }}
            >
              {word}
            </span>
          </span>
        );
      })}
    </div>
  );
};

/**
 * One word, arriving a letter at a time.
 *
 * Each letter gets its own mask and its own spring, so they land in sequence rather than
 * together. Two details do most of the work.
 *
 * The letters alternate which way they pivot. All of them tilting the same way reads as
 * one block being tipped; alternating reads as individual pieces falling into a row, and
 * costs a minus sign.
 *
 * And the stagger runs slightly *ahead* of linear at the start and eases out at the end,
 * so the word assembles briskly and the last letter takes its time. A perfectly even
 * stagger sounds like a metronome, which is the one rhythm nothing in nature has.
 */
const Letters = ({
  word,
  start,
  step,
  size,
  weight,
  color,
  flat,
  padY,
  padX,
}: {
  word: string;
  start: number;
  step: number;
  size: number;
  weight: number;
  color: string;
  flat?: boolean;
  padY: number;
  padX: number;
}) => {
  const { fps } = useVideoConfig();
  const tone = useTone();
  const style = useStyle();
  const chars = [...word];

  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline' }}>
      {chars.map((char, i) => {
        // Front-loaded: the gaps shrink as the word fills in.
        const offsetFrames = step * i * (1 - (i / Math.max(chars.length, 1)) * 0.3);
        const local = start - offsetFrames;
        const rise = spring({ frame: local, fps, config: tone.spring });
        const tilt = flat ? 0 : (1 - rise) * 16 * (i % 2 === 0 ? 1 : -1);

        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              overflow: 'hidden',
              padding: `${padY}px ${padX}px`,
              margin: `${-padY}px ${-padX}px`,
              willChange: 'transform',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                transform: `translateY(${(1 - rise) * 100}%) rotate(${tilt * 0.14}deg)`,
                transformOrigin: 'left bottom',
                fontFamily: style.family,
                fontSize: size,
                fontWeight: weight,
                lineHeight: tone.leading,
                letterSpacing: size * style.tracking,
                textTransform: style.upper ? 'uppercase' : 'none',
                color,
                whiteSpace: 'pre',
              }}
            >
              {char}
            </span>
          </span>
        );
      })}
    </span>
  );
};

/**
 * The bar behind a marked word.
 *
 * Wipes in from the left using clip-path rather than width, so the bar's own edges stay
 * sharp and nothing reflows as it grows.
 */
const HighlightBar = ({
  local,
  color,
  inset,
}: {
  local: number;
  color: string;
  inset: number;
}) => {
  const wipe = interpolate(local, [4, 20], [100, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.easeOutExpo,
  });

  return (
    <span
      style={{
        position: 'absolute',
        inset: `${inset}px 0`,
        background: color,
        clipPath: `inset(0 ${wipe}% 0 0)`,
        borderRadius: inset * 0.4,
      }}
    />
  );
};

/** Black or white, whichever can be read on the given background. */
const contrastOn = (hex: string): string => {
  const v = hex.replace('#', '');
  if (v.length !== 6) return '#000000';

  const channel = (i: number) => {
    const s = parseInt(v.slice(i, i + 2), 16) / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };

  const luminance = 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
  return luminance > 0.45 ? '#0A0A0A' : '#FFFFFF';
};

/**
 * A single line of text revealed by a sliding mask.
 *
 * For text that must stay on one line — a label, a stat caption, an author credit —
 * where word-by-word staggering would look fussy.
 */
export const MaskedLine = ({
  children,
  delay = 0,
  duration = 22,
  size,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  /**
   * The size of the text inside, in pixels.
   *
   * The mask needs room for descenders, and that room was written as `0.14em`. An `em`
   * resolves against THIS element's font size, and this element has none — it inherits
   * the page default while the text inside it is set to whatever the composition worked
   * out. So the clip box got fourteen percent of sixteen pixels while the type needed
   * fourteen percent of thirty, and every subtitle with a g, y or p in it was sliced
   * along the bottom. It read as a font-rendering fault, which is why it survived this
   * long: nothing about it looked like a layout bug.
   *
   * Given in pixels because that is the only unit that cannot be resolved against the
   * wrong thing.
   */
  size?: number;
  style?: React.CSSProperties;
}) => {
  const frame = useCurrentFrame();
  const local = frame - delay;

  const offset = interpolate(local, [0, duration], [100, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.easeOutExpo,
  });

  return (
    <span
      style={{
        display: 'inline-block',
        overflow: 'hidden',
        // Pixels when the caller knows the size, and the old em as a fallback for the
        // call sites where the text really does inherit its size from here.
        padding: size ? `${size * 0.2}px 0` : '0.2em 0',
        margin: size ? `${-size * 0.2}px 0` : '-0.2em 0',
      }}
    >
      <span
        style={{ display: 'inline-block', transform: `translateY(${offset}%)`, ...style }}
      >
        {children}
      </span>
    </span>
  );
};
