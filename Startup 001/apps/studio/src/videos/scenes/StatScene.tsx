import {
  Easing,
  Slot,
  boxFor,
  fitText,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from '@motion/engine';
import type { Palette } from '@motion/planner';
import { MaskedLine } from '../motion/MaskedText';
import { SceneShell } from '../motion/SceneShell';
import { Brackets, ProgressArc } from '../motion/Shapes';
import { onColorField, onDark, useScale, useStyle } from './shared';

type Props = {
  prefix?: string;
  value: number;
  suffix?: string;
  label: string;
  palette: Palette;
  duration: number;
  index?: number;
  /** Where this scene sits in the video, 0 to 1. Sets how far back the camera stands. */
  position?: number;
};

/**
 * One big number, counting up.
 *
 * A number that animates from zero is read as a *result*; a number that just appears is
 * read as decoration. Everything here exists to make it land:
 *
 *   - the count eases out, so it sprints early and settles late
 *   - an arc closes behind it, giving the number something to be measuring
 *   - brackets snap in around it at the moment it stops
 *   - the digits are tabular, so nothing shifts sideways as they change
 *
 * The last one matters more than it sounds. With proportional figures a counter jitters
 * horizontally the whole way up, and the eye reads jitter as broken.
 */
export const StatScene = ({
  prefix,
  value,
  suffix,
  label,
  palette,
  duration,
  index,
  position,
}: Props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = useScale();
  const style = useStyle();
  const tone = style.tone;
  const { width, height } = useVideoConfig();

  /*
   * The number stays centred, and that is a decision rather than a leftover.
   *
   * It was briefly slotted into the same arrangements as a closing line, on the grounds
   * that both are one important thing plus a label. That reasoning was wrong: a closing
   * line is text, and a statistic is a composite object — a ring that closes, brackets
   * that snap in, a disc behind it — so an arrangement that hangs it in a corner leaves
   * the ring colliding with its own label and the thread's disc sitting somewhere else
   * entirely.
   *
   * Not every scene benefits from positional variety. This one is the subject of its
   * shot, and the subject belongs where the eye already is. Its variation comes from
   * scale, entrance and rhythm instead.
   */
  const layout = {
    lead: { col: 2, row: 2, span: 8, rows: 4 } as const,
    leadAnchor: 'center' as const,
    tail: { col: 2, row: 6, span: 8, rows: 2 } as const,
    tailAnchor: 'top' as const,
  };


  const COUNT_START = 8;
  const COUNT_FRAMES = 54;
  const LANDED = COUNT_START + COUNT_FRAMES;

  const progress = interpolate(frame, [COUNT_START, LANDED], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.easeOutExpo,
  });

  const counted = progress * value;

  // A gentle scale-up that settles exactly as the number finishes counting.
  const pop = spring({ frame: frame - COUNT_START, fps, config: tone.spring });

  // One pulse of light at the moment it lands — the visual equivalent of a full stop.
  const landing = interpolate(
    frame,
    [LANDED - 8, LANDED + 4, LANDED + 26],
    [0, 1, 0.3],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  const box = boxFor(layout.lead, { width, height, margin: style.margin });
  const tailBox = boxFor(layout.tail, { width, height, margin: style.margin });
  /*
   * The number is a composite object, not a line of text.
   *
   * The arc and the brackets around it are far larger than the digits, so fitting the
   * digits to the region left the ring overflowing it — and the ring then collided with
   * the label in the region below. What has to fit the region is the *whole object*, and
   * the digits follow from that.
   */
  // Allowed to grow past its region's height, because these arrangements put generous
  // space above and below the lead and a circle confined to a text-shaped box is tiny.
  // Leaves the bottom of its region clear, so the label below has somewhere to be.
  const ring = Math.min(box.width * 0.6, box.height * 0.82);

  const digits = Math.min(
    260 * scale * tone.headlineScale * lengthFactor(value, prefix, suffix),
    // A number is one long word, so what constrains it is almost always the width of its
    // region rather than the height — and a figure that runs past the margin is the one
    // element in a video nobody forgives.
    (box.width * 0.82) / Math.max(String(value).length + (prefix ? 1 : 0) + (suffix ? 1.2 : 0), 1) * 1.55,
    // Inside the ring, with room for the brackets that snap around it.
    (ring * 0.62) / Math.max(String(value).length * 0.55 + (suffix ? 0.5 : 0), 1),
  );

  return (
    <SceneShell palette={palette} duration={duration} index={index} position={position} kind="stat">
      <Slot region={layout.lead} anchor={layout.leadAnchor} margin={style.margin}>
          <div
            style={{
              position: 'relative',
              display: 'grid',
              placeItems: 'center',
              width: ring,
              height: ring,
            }}
          >
            {/* The arc sits behind the digits and closes as they climb. */}
            <ProgressArc
              palette={palette}
              scale={scale}
              progress={progress}
              size={ring / scale}
            />

            <Brackets palette={palette} scale={scale} delay={LANDED - 16} size={54} />

            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'baseline',
                transform: `scale(${0.84 + pop * 0.16})`,
                fontSize: digits,
                fontWeight: 800,
                lineHeight: 1,
                letterSpacing: digits * -0.045,
                color: palette.text,
                // Only on a dark frame. On paper this was a grey smear behind the
                // figure rather than a pulse of light through it.
                textShadow: onDark(palette.bg) && !onColorField(palette)
                  ? `0 0 ${90 * scale}px ${palette.accent}${alpha(landing * 0.8)}`
                  : undefined,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {prefix ? <span style={{ fontSize: digits * 0.58 }}>{prefix}</span> : null}
              <span>{format(counted, value)}</span>
              {suffix ? (
                <span style={{ fontSize: digits * 0.58, color: palette.accent }}>
                  {suffix}
                </span>
              ) : null}
            </div>
          </div>
      </Slot>

      <Slot
        region={layout.tail}
        anchor={layout.tailAnchor}
        margin={style.margin}
        style={layout.tailAnchor.startsWith('top') ? { paddingTop: digits * 0.07 } : undefined}
      >
          <MaskedLine delay={LANDED - 12} duration={24} size={Math.max(digits * style.supportRatio, 20 * scale)}>
            <span
              style={{
                display: 'block',
                /*
                 * The label is fitted to its own region, not derived from the number.
                 *
                 * Sizing it as a fraction of the digits meant a big number produced a
                 * label too wide for the space it had been given, and it ran off the
                 * left margin. The contrast ratio is still what it *wants* to be; the
                 * region is what it is allowed to be, and the region wins.
                 */
                fontSize: fitText({
                  text: label,
                  width: tailBox.width,
                  height: tailBox.height * 0.9,
                  max: Math.max(digits * style.supportRatio, 20 * scale),
                  min: 16 * scale,
                  leading: 1.2,
                  ratio: style.charRatio,
                }),
                fontWeight: 500,
                color: palette.muted,
                letterSpacing: 1.4 * scale,
                textTransform: tone.upper ? 'uppercase' : 'none',
              }}
            >
              {label}
            </span>
          </MaskedLine>
      </Slot>
    </SceneShell>
  );
};

/**
 * Keep the digit count steady while counting.
 *
 * Without this the number gains digits as it climbs (7 → 42 → 380) and the whole block
 * jumps in width. Whole targets count as whole numbers; a decimal target keeps as many
 * places as it was actually given.
 *
 * That last part is not a formatting nicety. One decimal place turned 99.99% uptime into
 * "100.0%" on screen — four nines is the whole claim an infrastructure company is making,
 * and we rounded it into a promise nobody can keep. The engine is not allowed to improve
 * a number it was handed, in either direction, so the precision comes from the value.
 */
const format = (current: number, target: number): string => {
  const decimals = decimalsOf(target);
  return current.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/** How many decimal places a value was written with, up to a sane ceiling. */
const decimalsOf = (value: number): number => {
  if (Number.isInteger(value)) return 0;
  const places = String(value).split('.')[1]?.length ?? 1;
  // Four is as far as a number on screen can usefully go; beyond that it is data, not a
  // headline, and the digits stop being readable at speed anyway.
  return Math.min(places, 4);
};

/** A seven-digit number cannot be as large as a two-digit one and still fit. */
const lengthFactor = (value: number, prefix?: string, suffix?: string): number => {
  const width = format(value, value).length + (prefix ? 1 : 0) + (suffix ? 1 : 0);
  if (width <= 3) return 1;
  if (width <= 5) return 0.82;
  if (width <= 7) return 0.66;
  return 0.54;
};

const alpha = (value: number): string =>
  Math.round(Math.min(Math.max(value, 0), 1) * 255)
    .toString(16)
    .padStart(2, '0');
