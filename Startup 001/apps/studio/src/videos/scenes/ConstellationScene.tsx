import { Slot, boxFor, fitText, streamFor, useVideoConfig } from '@motion/engine';
import type { Palette } from '@motion/planner';
import { SceneShell } from '../motion/SceneShell';
import { MaskedText } from '../motion/MaskedText';
import { Card, Mesh, NamedCursor } from '../fragments/Fragments';
import { useBeats, useScale, useSeed, useStyle } from './shared';

type Props = {
  heading?: string;
  /** What each card says. Their own words wherever we have them. */
  items: string[];
  caption?: string;
  palette: Palette;
  duration: number;
  index?: number;
  position?: number;
};

/**
 * Pieces of an interface, scattered in space.
 *
 * The move that made the reference films look like products rather than slideshows, and
 * the one thing the engine most obviously could not do. We had a whole device frame —
 * one idea, used one way, always square to the camera. The references scatter *fragments*
 * at different sizes and angles, overlapping, some running off the edge of the frame.
 *
 * Why it works: a single window says "here is a screenshot". Six fragments at six scales
 * say "there is a lot of this, and you are seeing part of it" — which is a far stronger
 * claim and, usefully, an honest one, because showing a corner of something implies the
 * rest without inventing it.
 *
 * Positions come from a seeded scatter rather than a fixed arrangement, so the same scene
 * in two videos is genuinely composed differently instead of being the same picture with
 * different words.
 */
export const ConstellationScene = ({
  heading,
  items,
  caption,
  palette,
  duration,
  index = 0,
  position,
}: Props) => {
  const scale = useScale();
  const style = useStyle();
  const on = useBeats();
  const seed = useSeed();
  const { width, height } = useVideoConfig();

  const cards = items.slice(0, 6);
  const random = streamFor(seed, `constellation-${index}`);

  const headingRegion = { col: 1, row: 0, span: 10, rows: 2 };
  const headBox = boxFor(headingRegion, { width, height, margin: style.margin });

  /*
   * A scatter that is deliberately uneven.
   *
   * Cards are placed on a loose ring with a jittered radius, because an even ring reads
   * as a diagram and an even grid reads as a table — and this is neither. The sizes vary
   * by nearly half, which is what creates the depth: the eye reads a bigger card as
   * nearer, so a flat plane of divs becomes a space.
   */
  const slots = cards.map((_, i) => {
    const turn = (i / Math.max(cards.length, 1)) * Math.PI * 2 + random.next() * 0.6;
    const radius = 0.3 + random.next() * 0.12;
    return {
      x: 50 + Math.cos(turn) * radius * 86,
      y: 54 + Math.sin(turn) * radius * 58,
      size: 0.78 + random.next() * 0.44,
      tilt: (random.next() - 0.5) * 7,
      delay: on(1 + i * 0.4),
    };
  });

  const base = Math.min(width * 0.23, height * 0.34);

  return (
    <SceneShell duration={duration} index={index} position={position} kind="constellation">
      <Mesh palette={palette} delay={on(0)} strength={0.55} />

      {heading ? (
        <Slot region={headingRegion} anchor="center" margin={style.margin}>
          <MaskedText
            text={heading}
            delay={on(0)}
            size={fitText({
              text: heading,
              width: headBox.width,
              height: headBox.height * 0.9,
              max: 74 * scale * style.tone.headlineScale,
              min: 22 * scale,
              leading: style.advance,
              ratio: style.charRatio,
            })}
            color={palette.text}
            align="center"
            maxWidth="100%"
            stagger={2.2}
          />
        </Slot>
      ) : null}

      {cards.map((text, i) => {
        const slot = slots[i];
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${slot.x}%`,
              top: `${slot.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <Card
              title={text}
              body={2}
              palette={palette}
              scale={scale}
              width={base * slot.size}
              delay={slot.delay}
              tilt={slot.tilt}
              accentBar={i % 3 === 0}
            />
          </div>
        );
      })}

      {/*
        One cursor, not several.

        It says other people are in here — the strongest single signal that software is
        collaborative — and one is enough. Two or three turns a composition into a party
        and the eye stops reading the cards.
      */}
      <div style={{ position: 'absolute', left: '72%', top: '30%' }}>
        <NamedCursor
          name={caption ? caption.split(' ')[0] : 'Sam'}
          color={palette.accent}
          scale={scale}
          delay={on(3)}
        />
      </div>
    </SceneShell>
  );
};
