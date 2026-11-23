import {
  Enter,
  Slot,
  boxFor,
  chooseEntrance,
  fitText,
  streamFor,
  useVideoConfig,
} from '@motion/engine';
import type { EntranceName, Random } from '@motion/engine';
import type { Palette } from '@motion/planner';
import { MaskedText } from '../motion/MaskedText';
import { SceneShell } from '../motion/SceneShell';
import { chooseListLayout } from '../compose/listLayouts';
import type { ListLayout } from '../compose/listLayouts';
import { useBeats, useScale, useSeed, useStyle } from './shared';

type Props = {
  heading: string;
  items: string[];
  palette: Palette;
  duration: number;
  index?: number;
  position?: number;
  /** Steps are an ordered sequence, which changes what arrangements make sense. */
  ordered?: boolean;
};

/**
 * A list of points, arranged five different ways.
 *
 * The scene the founder singled out — *"same kind of bullets"* — and he was right: there
 * was exactly one arrangement, a heading above a centred column of dashed rows, in every
 * video ever made.
 *
 * A list of four short things is one of the most flexible shapes in graphic design. It
 * can be a stack, a two-by-two, columns, a numbered sequence, or bands across the frame.
 * A bulleted list is the least interesting of those — it is what you reach for when the
 * arrangement has not been decided.
 */
export const FeatureScene = ({
  heading,
  items,
  palette,
  duration,
  index = 0,
  position,
  ordered = false,
}: Props) => {
  const scale = useScale();
  const style = useStyle();
  const tone = style.tone;
  const on = useBeats();
  const seed = useSeed();
  const { width, height } = useVideoConfig();

  const random = streamFor(seed, `list-layout-${index}`);
  const layout = chooseListLayout(items, random, {
    vertical: height > width,
    isSteps: ordered,
  });

  // One entrance for the whole list. Choosing per row would mean four different gestures
  // in three seconds, which reads as indecision rather than variety.
  const itemEntrance = chooseEntrance('item', toneName(tone.spring), streamFor(seed, `list-move-${index}`));

  const box = boxFor(layout.items, { width, height, margin: style.margin });
  const headingBox = boxFor(layout.heading, { width, height, margin: style.margin });

  const headingSize = fitText({
    text: heading,
    width: headingBox.width,
    height: headingBox.height,
    max: 68 * scale * tone.headlineScale,
    min: 22 * scale,
    leading: style.advance,
    ratio: style.charRatio,
  });

  const start = on(1);
  const step = Math.max(on(0.5), 7);

  return (
    <SceneShell duration={duration} index={index} position={position} kind="features">
      <Slot region={layout.heading} anchor={layout.headingAnchor} margin={style.margin}>
        <MaskedText
          text={heading}
          size={headingSize}
          color={palette.text}
          align={layout.headingAnchor.includes('left') ? 'left' : 'center'}
          maxWidth="100%"
          stagger={2.4}
        />
      </Slot>

      <Slot region={layout.items} anchor={layout.itemsAnchor} margin={style.margin}>
        <Items
          layout={layout}
          items={items}
          palette={palette}
          scale={scale}
          box={box}
          start={start}
          step={step}
          entrance={itemEntrance}
          random={random}
          family={style.family}
          weight={style.weight}
          ratio={style.charRatio}
          /* The heading stays the biggest thing in the frame. */
          cap={headingSize * 0.82}
        />
      </Slot>
    </SceneShell>
  );
};

/* ---------------- the arrangements ---------------- */

type ItemsProps = {
  layout: ListLayout;
  items: string[];
  palette: Palette;
  scale: number;
  box: { width: number; height: number };
  start: number;
  step: number;
  entrance: EntranceName;
  random: Random;
  family: string;
  weight: number;
  ratio: number;
  /**
   * The largest an item is allowed to be.
   *
   * Items used to size themselves against their own region alone, so a short list could
   * come out larger than the heading above it. A list set bigger than the thing
   * introducing it inverts the hierarchy, and the eye reads the points before the point.
   */
  cap: number;
};

const Items = (props: ItemsProps) => {
  switch (props.layout.style) {
    case 'grid':
      return <GridItems {...props} />;
    case 'columns':
      return <ColumnItems {...props} />;
    case 'bands':
      return <BandItems {...props} />;
    case 'numbered':
      return <NumberedItems {...props} />;
    case 'rows':
    default:
      return <RowItems {...props} />;
  }
};

/** A marker and a line, stacked. Rows share one left axis, never centred individually. */
const RowItems = ({ items, palette, scale, box, start, step, entrance, family, ratio, cap }: ItemsProps) => {
  const size = rowSize(items, box, scale, ratio, cap);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: box.height * (items.length <= 3 ? 0.1 : 0.055), width: '100%' }}>
      {items.map((item, i) => (
        <Enter key={i} name={entrance} delay={start + i * step} distance={size * 0.8}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: size * 0.62 }}>
            <span
              style={{
                width: size * 0.9,
                height: Math.max(size * 0.1, 3 * scale),
                flexShrink: 0,
                borderRadius: 999,
                backgroundColor: palette.accent,
                transform: `translateY(${-size * 0.28}px)`,
              }}
            />
            <span style={{ fontFamily: family, fontSize: size, fontWeight: 500, color: palette.text, lineHeight: 1.25 }}>
              {item}
            </span>
          </div>
        </Enter>
      ))}
    </div>
  );
};

/**
 * Full-width bands.
 *
 * Each one is a statement across the frame rather than an option in a list, and the
 * alternating tint gives the eye an edge to follow down the stack without needing a rule.
 */
const BandItems = ({ items, palette, scale, box, start, step, family, ratio, cap }: ItemsProps) => {
  const size = rowSize(items, box, scale, ratio, cap) * 0.92;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', alignSelf: 'stretch', gap: 2 * scale }}>
      {items.map((item, i) => (
        // Bands always wipe: it is the move the shape is asking for, and overriding it
        // with the scene's chosen entrance would waste the one arrangement that has a
        // gesture built into it.
        <Enter
          key={i}
          name="wipe"
          delay={start + i * step}
          distance={box.width * 0.06}
          /*
           * A band is the width of the frame, so it has to be told so.
           *
           * Its slot centres its children, and a centred block sizes itself to its
           * content — so a band with long text grew past the region it was given and ran
           * off both edges of the picture. Stretching it makes the width come from the
           * composition rather than from whatever happens to be written in it.
           */
          style={{ width: '100%' }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: size * 0.7,
              width: '100%',
              /*
               * Padding inside the width, not added to it.
               *
               * Without this the band is its region's width *plus* its own padding, so a
               * full-width band is always wider than the frame it sits in — and since its
               * slot centres it, the overflow lands on both edges and eats the first
               * letters of every line.
               */
              boxSizing: 'border-box',
              padding: `${size * 0.42}px ${size * 0.8}px`,
              backgroundColor: i % 2 === 0 ? `${palette.accent}14` : 'transparent',
              borderLeft: `${Math.max(3 * scale, 2)}px solid ${i % 2 === 0 ? palette.accent : `${palette.accent}44`}`,
            }}
          >
            <span style={{ fontFamily: family, fontSize: size, fontWeight: 500, color: palette.text, lineHeight: 1.2 }}>
              {item}
            </span>
          </div>
        </Enter>
      ))}
    </div>
  );
};

/** Side by side. Turns a list into a comparison. */
const ColumnItems = ({ items, palette, scale, box, start, step, entrance, family, ratio }: ItemsProps) => {
  const columnWidth = box.width / items.length;
  const size = fitText({
    text: longest(items),
    width: columnWidth * 0.82,
    height: box.height * 0.55,
    max: 40 * scale,
    min: 15 * scale,
    leading: 1.3,
    ratio,
  });

  return (
    <div style={{ display: 'flex', width: '100%', gap: box.width * 0.03 }}>
      {items.map((item, i) => (
        <Enter key={i} name={entrance} delay={start + i * step} distance={size} style={{ flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: size * 0.6 }}>
            <span
              style={{
                width: size * 1.4,
                height: Math.max(size * 0.09, 3 * scale),
                borderRadius: 999,
                backgroundColor: palette.accent,
              }}
            />
            <span
              style={{
                fontFamily: family,
                fontSize: size,
                fontWeight: 500,
                color: palette.text,
                textAlign: 'center',
                lineHeight: 1.3,
              }}
            >
              {item}
            </span>
          </div>
        </Enter>
      ))}
    </div>
  );
};

/** Two by two. Only ever four, enforced by the layout chooser. */
const GridItems = ({ items, palette, scale, box, start, step, entrance, family, ratio }: ItemsProps) => {
  const cellWidth = box.width / 2;
  const size = fitText({
    text: longest(items),
    width: cellWidth * 0.72,
    height: box.height * 0.34,
    max: 40 * scale,
    min: 15 * scale,
    leading: 1.3,
    ratio,
  });

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: box.height * 0.06,
        width: '100%',
      }}
    >
      {items.map((item, i) => (
        <Enter key={i} name={entrance} delay={start + i * step} distance={size}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: size * 0.5,
              padding: size * 0.7,
              borderRadius: size * 0.42,
              border: `${Math.max(1, scale)}px solid ${palette.muted}2E`,
              backgroundColor: `${palette.accent}0D`,
              height: '100%',
            }}
          >
            <span
              style={{
                fontFamily: family,
                fontSize: size * 0.62,
                fontWeight: 700,
                color: palette.accent,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <span style={{ fontFamily: family, fontSize: size, fontWeight: 500, color: palette.text, lineHeight: 1.3 }}>
              {item}
            </span>
          </div>
        </Enter>
      ))}
    </div>
  );
};

/**
 * Numbered, with the figure doing the work the bullet used to.
 *
 * A number says something a bullet cannot: that there is an order, and that this is step
 * two of four rather than one of four unrelated things.
 */
const NumberedItems = ({ items, palette, scale, box, start, step, entrance, family, ratio, cap }: ItemsProps) => {
  const size = rowSize(items, box, scale, ratio, cap) * 0.95;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: box.height * (items.length <= 3 ? 0.095 : 0.05), width: '100%' }}>
      {items.map((item, i) => (
        <Enter key={i} name={entrance} delay={start + i * step} distance={size * 0.8}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: size * 0.75 }}>
            <span
              style={{
                fontFamily: family,
                fontSize: size * 1.5,
                fontWeight: 800,
                lineHeight: 1,
                color: palette.accent,
                fontVariantNumeric: 'tabular-nums',
                minWidth: size * 1.9,
                letterSpacing: -size * 0.04,
              }}
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <span style={{ fontFamily: family, fontSize: size, fontWeight: 500, color: palette.text, lineHeight: 1.28 }}>
              {item}
            </span>
          </div>
        </Enter>
      ))}
    </div>
  );
};

/* ---------------- helpers ---------------- */

/**
 * One size for every row.
 *
 * Sized against the longest item so nothing overflows, and shared so the list reads as a
 * set. Rows at individually optimal sizes look like a ransom note.
 */
const rowSize = (
  items: string[],
  box: { width: number; height: number },
  scale: number,
  ratio = 0.5,
  cap = Infinity,
): number =>
  fitText({
    text: longest(items),
    width: box.width * 0.86,
    height: (box.height / Math.max(items.length, 1)) * 0.68,
    /*
     * A short list gets bigger type.
     *
     * The cap was one number for every list, so three points in a region cut for six came
     * out at the same size as six and sat in the top corner of an otherwise empty frame.
     * That is not restraint, it is a list that did not fill the space it was given. Fewer
     * things on screen means each of them matters more, and should be larger.
     */
    max: Math.min((52 + Math.max(0, 5 - items.length) * 8) * scale, cap),
    min: 16 * scale,
    leading: 1.25,
    ratio,
  });

const longest = (items: string[]): string =>
  items.reduce((best, item) => (item.length > best.length ? item : best), items[0] ?? '');

/** The tone's spring preset stands in for its name, which is all the chooser needs. */
const toneName = (spring: string): string =>
  spring === 'snappy' ? 'bold' : spring === 'bouncy' ? 'kinetic' : spring === 'gentle' ? 'editorial' : 'clean';
