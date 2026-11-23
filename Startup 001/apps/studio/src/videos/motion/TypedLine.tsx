import { interpolate, useCurrentFrame, useVideoConfig } from '@motion/engine';
import type { Palette } from '@motion/planner';
import { useStyle } from '../scenes/shared';

/**
 * A line that writes itself, with the caret left behind.
 *
 * Two of the three reference films open this way and keep coming back to it: Notion types
 * its own wordmark in beside the logo, then types "Every agent knows how.|" and leaves a
 * blue caret blinking at the end; Base44 types into a composer with an orange caret and
 * never removes it.
 *
 * It is worth having for a reason beyond looking current. Every other entrance in this
 * engine is a thing ARRIVING — it rises, it fades, it scales in. Those all say "a
 * component mounted". Typing says somebody is writing this, now, and has not finished.
 * The caret is the whole trick: a line that types itself and then tidily removes its
 * cursor is an animation, while one that leaves the cursor blinking is a moment caught
 * in the middle.
 *
 * The second half can be set in a different colour, which is the other device both films
 * use — "Write it once." in white over "Every agent knows how." in grey, or on Fireworks
 * a tint of the background itself rather than a neutral.
 */

type Props = {
  text: string;
  size: number;
  palette: Palette;
  /** Frames to wait before the first character. */
  delay?: number;
  /** Characters per second. Around 22 reads as fast typing without being a blur. */
  speed?: number;
  align?: 'left' | 'center';
  /**
   * Where the second colour starts, as a character index.
   *
   * Used for the two-tone line. Everything from here on is drawn in `tone` instead of
   * the text colour, which is how a sentence can put its emphasis on the half that
   * matters without resorting to bold.
   */
  splitAt?: number;
  /** The colour the second half takes. Defaults to the muted text colour. */
  tone?: string;
  /** Leave the caret blinking at the end rather than removing it. */
  keepCaret?: boolean;
  maxWidth?: string;
};

export const TypedLine = ({
  text,
  size,
  palette,
  delay = 0,
  speed = 22,
  align = 'center',
  splitAt,
  tone,
  keepCaret = true,
  maxWidth = '100%',
}: Props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const style = useStyle();

  const local = frame - delay;
  const typed = Math.max(
    0,
    Math.min(text.length, Math.floor((local / fps) * speed)),
  );
  const done = typed >= text.length;

  /*
   * The caret blinks, but only once the line is finished.
   *
   * A cursor flashing on and off while characters are still appearing looks like a
   * rendering fault — real editors hold the caret solid while you are typing and only
   * blink it when you stop. Half a second on, half a second off, which is roughly what
   * a real one does.
   */
  const sinceDone = local - (text.length / speed) * fps;
  const blinkOn = !done || Math.floor(sinceDone / (fps * 0.5)) % 2 === 0;

  // Before the first character there is nothing to show but the cursor waiting.
  const shown = text.slice(0, typed);
  const head = splitAt === undefined ? shown : shown.slice(0, splitAt);
  const tail = splitAt === undefined ? '' : shown.slice(splitAt);

  // The whole line fades up over the first few frames so it does not pop into being at
  // full strength with one character in it.
  const opacity = interpolate(local, [0, 5], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  if (local < 0) return null;

  return (
    <div
      style={{
        opacity,
        maxWidth,
        fontFamily: style.family,
        fontSize: size,
        fontWeight: style.weight,
        letterSpacing: `${style.tracking}em`,
        lineHeight: style.leading,
        color: palette.text,
        textAlign: align,
        textTransform: style.upper ? 'uppercase' : 'none',
        // The caret must not wrap onto its own line when the text nearly fills the width.
        display: 'inline',
      }}
    >
      {head}
      {tail ? <span style={{ color: tone ?? palette.muted }}>{tail}</span> : null}
      {(keepCaret || !done) && (
        <span
          aria-hidden="true"
          style={{
            display: 'inline-block',
            width: Math.max(size * 0.055, 2),
            height: size * 0.92,
            marginLeft: size * 0.07,
            // Sits on the baseline with the type rather than hanging below it.
            verticalAlign: '-0.1em',
            backgroundColor: palette.accent,
            opacity: blinkOn ? 1 : 0,
          }}
        />
      )}
    </div>
  );
};
