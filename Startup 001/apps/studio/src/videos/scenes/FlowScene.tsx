import { Slot, boxFor, fitText, useVideoConfig } from '@motion/engine';
import type { Palette } from '@motion/planner';
import { SceneShell } from '../motion/SceneShell';
import { MaskedText } from '../motion/MaskedText';
import { Flow, NodeGrid } from '../fragments/Fragments';
import { useBeats, useScale, useStyle } from './shared';

type Props = {
  heading?: string;
  /** The states, in order. Two to four. */
  steps: string[];
  caption?: string;
  palette: Palette;
  duration: number;
  index?: number;
  position?: number;
};

/**
 * A process, shown as states with arrows between them.
 *
 * Taken from the reference films, where "Checkpoint → Production" does in one line what
 * a bulleted list of four features cannot: it says the product *does something in an
 * order*. A list says "here are some things that exist". A flow says "this becomes that",
 * which is almost always the actual claim a product is making.
 *
 * It is also the first scene in the engine built from fragments rather than from its own
 * hand-written markup — the chips and the arrow are library parts, and this scene only
 * decides where they go and when.
 */
export const FlowScene = ({
  heading,
  steps,
  caption,
  palette,
  duration,
  index = 0,
  position,
}: Props) => {
  const scale = useScale();
  const style = useStyle();
  const on = useBeats();
  const { width, height } = useVideoConfig();

  const items = steps.slice(0, 4);

  const headingRegion = { col: 1, row: 1, span: 10, rows: 2 };
  const flowRegion = { col: 0, row: 3, span: 12, rows: 2 };
  const captionRegion = { col: 2, row: 6, span: 8, rows: 1 };

  const headBox = boxFor(headingRegion, { width, height, margin: style.margin });
  const flowBox = boxFor(flowRegion, { width, height, margin: style.margin });

  /*
   * The chips are sized so the whole chain fits the frame.
   *
   * A flow has to be read left to right in one glance, so it cannot wrap — which means
   * the type size is decided by the longest state and how many of them there are, not by
   * a number picked in advance. Four long words at a comfortable size is wider than any
   * frame we render.
   */
  const longest = items.reduce((n, s) => Math.max(n, s.length), 1);
  const perChip = flowBox.width / Math.max(items.length, 1);
  const chipSize = Math.min(
    // The flow IS the scene, so it is sized like a subject rather than like a caption.
    // Capped at 34 it read as a diagram tucked under a headline in an otherwise empty
    // frame, which is the opposite of what a process scene is for.
    62 * scale,
    // Each chip is its label plus padding, and each gap holds an arrow about two
    // characters wide.
    (perChip * 0.62) / Math.max(longest * 0.58, 3),
  );

  return (
    <SceneShell duration={duration} index={index} position={position} kind="flow">
      {/* The engineered backdrop the references use behind technical claims. It sits at a
          few per cent, so it reads as structure rather than as decoration. */}
      <NodeGrid palette={palette} scale={scale} cell={120} delay={on(0)} strength={0.75} />

      {heading ? (
        <Slot region={headingRegion} anchor="bottom" margin={style.margin}>
          <MaskedText
            text={heading}
            delay={on(0)}
            size={fitText({
              text: heading,
              width: headBox.width,
              height: headBox.height * 0.9,
              max: 80 * scale * style.tone.headlineScale,
              min: 24 * scale,
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

      <Slot region={flowRegion} anchor="center" margin={style.margin}>
        <Flow
          steps={items}
          palette={palette}
          scale={scale}
          delay={on(1)}
          step={Math.max(on(0.4), 6)}
          size={chipSize / scale}
        />
      </Slot>

      {caption ? (
        <Slot
          region={captionRegion}
          anchor="top"
          margin={style.margin}
          style={{ paddingTop: 10 * scale }}
        >
          <span
            style={{
              fontFamily: style.family,
              fontSize: 30 * scale,
              color: palette.muted,
              textAlign: 'center',
              lineHeight: 1.45,
            }}
          >
            {caption}
          </span>
        </Slot>
      ) : null}
    </SceneShell>
  );
};
