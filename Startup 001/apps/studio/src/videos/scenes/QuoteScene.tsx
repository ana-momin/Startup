import { Center, Column, interpolate, useCurrentFrame } from '@motion/engine';
import type { Palette } from '@motion/planner';
import { MaskedLine, MaskedText } from '../motion/MaskedText';
import { SceneShell } from '../motion/SceneShell';
import { Rule } from '../motion/Shapes';
import { useBeats, useScale, useTone } from './shared';

type Props = {
  quote: string;
  author?: string;
  palette: Palette;
  duration: number;
  index?: number;
  /** Where this scene sits in the video, 0 to 1. Sets how far back the camera stands. */
  position?: number;
};

/**
 * A testimonial or pull quote.
 *
 * Slower stagger than a headline on purpose: a quote is meant to be read as a thought,
 * not scanned as a slogan. Pace is how a video controls what the viewer feels, and it
 * costs nothing to get right.
 *
 * The quote mark is oversized and sits behind the text at low opacity — the standard
 * editorial treatment, because a small one beside the text competes with the words
 * while a large one behind them just frames the space.
 */
export const QuoteScene = ({ quote, author, palette, duration, index, position }: Props) => {
  const frame = useCurrentFrame();
  const scale = useScale();
  const tone = useTone();
  const on = useBeats();

  const markOpacity = interpolate(frame, [0, 24], [0, 0.13], {
    extrapolateRight: 'clamp',
  });

  // The mark drifts slightly as the quote reads, so the frame is never fully still.
  const markDrift = interpolate(frame, [0, duration], [0, 20 * scale]);

  return (
    <SceneShell palette={palette} duration={duration} index={index} position={position} kind="quote">
      <Center>
        <span
          style={{
            position: 'absolute',
            top: `calc(10% + ${markDrift}px)`,
            fontSize: 440 * scale,
            fontWeight: 800,
            lineHeight: 1,
            color: palette.accent,
            opacity: markOpacity,
            userSelect: 'none',
          }}
        >
          &ldquo;
        </span>

        <Column gap={40 * scale}>
          <MaskedText
            text={quote}
            stagger={2.1}
            delay={on(0.25)}
            size={56 * scale * tone.headlineScale}
            weight={500}
            color={palette.text}
            maxWidth={1400 * scale}
            align="center"
            flat
          />

          {author ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 * scale }}>
              <Rule palette={palette} scale={scale} delay={on(2)} width={46} thickness={3} />
              <MaskedLine delay={on(2.25)} duration={22} size={32 * scale}>
                <span
                  style={{
                    display: 'block',
                    fontSize: 32 * scale,
                    fontWeight: 500,
                    color: palette.muted,
                    letterSpacing: 1.2 * scale,
                  }}
                >
                  {author}
                </span>
              </MaskedLine>
            </div>
          ) : null}
        </Column>
      </Center>
    </SceneShell>
  );
};
