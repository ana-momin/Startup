import {

  fitText,
  interpolate,
  streamFor,
  useCurrentFrame,
  useVideoConfig,
} from '@motion/engine';
import type { Palette } from '@motion/planner';
import { Card } from '../fragments/Fragments';
import { SceneShell } from '../motion/SceneShell';
import { MaskedText } from '../motion/MaskedText';
import { useBeats, useScale, useSeed, useStyle } from './shared';

/**
 * Type over moving interface.
 *
 * This is the scene the engine could not draw, and the reason every video looked like a
 * template however many layouts were added to the table.
 *
 * Every other scene here works the same way: the frame is divided into regions, and each
 * piece of content is given one. A headline gets rows two to four, a picture gets rows
 * five to seven, and the two never touch. That is how a slide works. It is not how any
 * of the reference films work.
 *
 * In the Notion film the words sit in the MIDDLE OF THE FRAME and the product scrolls
 * BEHIND them — "your docs", "all connected." — with cards passing underneath the type,
 * overlapping each other, tilted a few degrees, running off both edges. The words and the
 * product are not taking turns for the viewer's attention; they are one picture, and the
 * claim is made by the fact that they occupy the same space.
 *
 * Three things make it work rather than look like a mistake:
 *
 *   The column MOVES CONTINUOUSLY. It does not animate in and stop. It is already in
 *   motion when the scene opens and still moving when it cuts, which is what makes it
 *   read as a world the camera is passing rather than an element that arrived.
 *
 *   The cards BLEED. They are laid out against a span wider than the frame and are
 *   deliberately clipped at both edges, so the frame reads as a viewport onto something
 *   larger instead of a page with everything tidily inside the margin.
 *
 *   The type is HELD UP off the background by a soft scrim rather than a box. A hard
 *   plate behind the words would put them back in their own region, which is the thing
 *   this scene exists to stop.
 */

type Props = {
  /** The line that sits over the top. Short — it has to read in one glance. */
  heading: string;
  /** Names for the cards passing behind. Their real feature names where we have them. */
  items: string[];
  palette: Palette;
  duration: number;
  index?: number;
  position?: number;
};

export const OverlayScene = ({
  heading,
  items,
  palette,
  duration,
  index = 0,
  position = 0.5,
}: Props) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const scale = useScale();
  const style = useStyle();
  const on = useBeats();
  const seed = useSeed();

  const random = streamFor(seed, `overlay-${index}`);

  /*
   * Which way the column travels, and how far.
   *
   * Up is the default because that is what a page does when you read down it, but a
   * seeded minority drift down instead — two videos that both use this scene should not
   * be the same shot twice. The distance is a little over a frame's height across the
   * whole scene, which at this card size is a slow, legible pass rather than a scroll.
   */
  const downward = random.next() < 0.3;
  const travel = height * (downward ? -1 : 1) * 1.15;

  // Already moving when the scene opens, still moving when it leaves. Linear, because an
  // eased drift has a dead middle and reads as something settling rather than passing.
  const drift = interpolate(frame, [0, duration], [travel * 0.5, -travel * 0.5], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  /*
   * The cards, in two columns that exceed the frame on both sides.
   *
   * Two rather than one so something is always crossing the type, and wider than the
   * frame so neither column is ever fully visible. The seeded jitter on each card's
   * offset, width and tilt is what stops the two columns reading as a table.
   */
  const columnWidth = width * 0.245;
  const cards = items.length > 0 ? items : ['Projects', 'Docs', 'Tasks', 'Notes'];
  const stack = Array.from({ length: Math.max(cards.length * 2, 8) }, (_, i) => ({
    label: cards[i % cards.length],
    // Columns sit at 18% and 78% — both straddling an edge rather than tucked inside it.
    x: (i % 2 === 0 ? 0.18 : 0.78) * width + (random.next() - 0.5) * width * 0.08,
    y: (i / 2) * height * 0.34 - height * 0.3,
    w: columnWidth * (0.7 + random.next() * 0.7),
    tilt: (random.next() - 0.5) * 7,
    lines: 2 + Math.floor(random.next() * 2),
  }));

  const headingSize = fitText({
    text: heading,
    width: width * 0.74,
    height: height * 0.22,
    // Deliberately modest. Across all three references the headline runs about a tenth
    // of the frame height — none of them fills the frame with type.
    max: 132 * scale * style.tone.headlineScale,
    min: 30 * scale,
    leading: style.advance,
    ratio: style.charRatio,
  });

  return (
    <SceneShell duration={duration} index={index} position={position} kind="overlay">
      {/* ---------- behind: the product, passing ---------- */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          // The frame is the viewport. Everything outside it is really there and really
          // clipped, which is what makes the shot feel like part of something bigger.
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, transform: `translateY(${drift}px)` }}>
          {stack.map((card, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: card.x - card.w / 2,
                top: card.y,
                width: card.w,
              }}
            >
              <Card
                title={card.label}
                body={card.lines}
                palette={palette}
                scale={scale}
                width={card.w}
                tilt={card.tilt}
                // They are already there. A card that animates in would announce itself,
                // and nothing in this layer should compete with the words.
                delay={-40}
                accentBar={i % 3 === 0}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ---------- the scrim ---------- */}
      {/*
        A soft radial wash in the frame's own background colour, centred on the type.

        Without it the headline fights whatever card happens to be behind it at that
        frame, and legibility becomes a matter of luck. With a hard plate the words would
        sit in a box, which is the slide this scene exists to escape. A gradient with no
        edge does the work and leaves no visible shape.
      */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            `radial-gradient(ellipse 60% 38% at 50% 50%, ${palette.bg} 0%, ` +
            `${palette.bg} 46%, transparent 84%)`,
        }}
      />

      {/* ---------- in front: the words ---------- */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: `0 ${width * 0.1}px`,
        }}
      >
        <MaskedText
          text={heading}
          size={headingSize}
          color={palette.text}
          align="center"
          maxWidth="100%"
          delay={on(0.5)}
          stagger={2.2}
        />
      </div>
    </SceneShell>
  );
};
