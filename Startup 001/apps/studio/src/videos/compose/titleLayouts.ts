import { COLUMNS, ROWS, mirror } from '@motion/engine';
import type { Anchor, Random, Region } from '@motion/engine';

/**
 * Arrangements for a title scene.
 *
 * Every one of these was impossible before, because the arrangement was written into the
 * component: a title was a centred column and could be nothing else. Here it is a table,
 * and the engine picks a row.
 *
 * They are real compositions rather than variations on one idea. A hero hung off the
 * left margin, a line set across the bottom third, a headline sitting in the upper
 * quarter with the supporting line far below it — those are different *designs*, and a
 * viewer who sees two of our videos should not be able to tell they came from the same
 * tool.
 *
 * The headline regions are wide on purpose. Type is now set to *fill* its measure rather
 * than to sit inside it, so the region's width is the type's size — a headline given six
 * columns is not a smaller version of the same design, it is a different one. Giving them
 * nine or ten columns is what makes the words fill the frame instead of floating in it.
 *
 * Each entry also declares how big its headline wants to be, because scale is part of a
 * composition rather than a separate setting. A headline given four columns and one
 * given eleven are not the same headline at different sizes; they are different ideas
 * about what the frame is for.
 */

export type TitleLayout = {
  name: string;
  headline: Region;
  headlineAnchor: Anchor;
  /** Multiplier on the base headline size. */
  scale: number;
  eyebrow: Region;
  eyebrowAnchor: Anchor;
  sub: Region;
  subAnchor: Anchor;
  /** Where the accent rule sits, if this composition uses one. */
  rule?: Region;
  /** How much of the frame the headline is meant to fill, for the line-length maths. */
  measure: number;
};

const LAYOUTS: TitleLayout[] = [
  {
    // The classic. Centred, generous, nothing fighting for attention.
    name: 'centre-stage',
    eyebrow: { col: 2, row: 1, span: 8, rows: 1 },
    eyebrowAnchor: 'bottom',
    headline: { col: 1, row: 2, span: 10, rows: 3 },
    headlineAnchor: 'center',
    scale: 1,
    sub: { col: 3, row: 5, span: 6, rows: 1 },
    subAnchor: 'top',
    rule: { col: 5, row: 6, span: 2, rows: 1 },
    measure: 10,
  },
  {
    // Hung off the left margin, filling the height. The editorial cover.
    name: 'left-hero',
    eyebrow: { col: 1, row: 1, span: 5, rows: 1 },
    eyebrowAnchor: 'bottom-left',
    headline: { col: 1, row: 2, span: 9, rows: 4 },
    headlineAnchor: 'left',
    scale: 1.18,
    sub: { col: 1, row: 6, span: 5, rows: 1 },
    subAnchor: 'top-left',
    rule: { col: 1, row: 5, span: 2, rows: 1 },
    measure: 7,
  },
  {
    // High headline, supporting line pushed to the bottom. The space between them is
    // the composition — it reads as confidence, because only something worth looking at
    // can afford to leave the middle of the frame empty.
    name: 'high-and-low',
    eyebrow: { col: 1, row: 1, span: 4, rows: 1 },
    eyebrowAnchor: 'top-left',
    headline: { col: 1, row: 2, span: 10, rows: 3 },
    headlineAnchor: 'top-left',
    scale: 1.05,
    sub: { col: 1, row: 6, span: 6, rows: 1 },
    subAnchor: 'bottom-left',
    rule: { col: 8, row: 6, span: 3, rows: 1 },
    measure: 9,
  },
  {
    // Lower third, the way broadcast titles a speaker. Leaves the top two thirds for
    // whatever the background is doing, which is why it suits a busy motif.
    name: 'lower-third',
    eyebrow: { col: 1, row: 3, span: 5, rows: 1 },
    eyebrowAnchor: 'bottom-left',
    headline: { col: 1, row: 4, span: 10, rows: 3 },
    headlineAnchor: 'left',
    scale: 0.92,
    sub: { col: 1, row: 7, span: 6, rows: 1 },
    subAnchor: 'top-left',
    measure: 8,
  },
  {
    // Enormous type across the whole frame, everything else tucked into a corner. For
    // short headlines only — the measure is what enforces that.
    name: 'full-bleed',
    eyebrow: { col: 0, row: 0, span: 4, rows: 1 },
    eyebrowAnchor: 'top-left',
    headline: { col: 0, row: 2, span: 12, rows: 4 },
    headlineAnchor: 'center',
    scale: 1.45,
    sub: { col: 0, row: 7, span: 12, rows: 1 },
    subAnchor: 'bottom',
    measure: 12,
  },
  {
    // Two thirds of the frame for the words, a column of air beside them. The asymmetry
    // is the point: a frame divided unevenly is more interesting than one divided in half.
    name: 'two-thirds',
    eyebrow: { col: 1, row: 2, span: 4, rows: 1 },
    eyebrowAnchor: 'bottom-left',
    headline: { col: 1, row: 3, span: 10, rows: 3 },
    headlineAnchor: 'left',
    scale: 1.1,
    sub: { col: 1, row: 6, span: 7, rows: 1 },
    subAnchor: 'top-left',
    rule: { col: 10, row: 3, span: 1, rows: 3 },
    measure: 8,
  },
  {
    // Centred but sitting low, with the eyebrow far above it. Quiet and filmic.
    name: 'deep-centre',
    eyebrow: { col: 3, row: 1, span: 6, rows: 1 },
    eyebrowAnchor: 'top',
    headline: { col: 2, row: 3, span: 8, rows: 3 },
    headlineAnchor: 'center',
    scale: 0.98,
    sub: { col: 3, row: 6, span: 6, rows: 1 },
    subAnchor: 'top',
    measure: 8,
  },
];

/**
 * Choose an arrangement for this headline.
 *
 * Content decides what is *possible* and the seed decides between what is left, which is
 * the right order: a nine-word headline in the full-bleed layout would overflow the
 * frame however pleasing the arrangement, and no amount of variety is worth a video that
 * does not fit on screen.
 */
export const chooseTitleLayout = (
  headline: string,
  random: Random,
  options: { hasSub: boolean; vertical: boolean } = { hasSub: true, vertical: false },
): TitleLayout => {
  const words = headline.trim().split(/\s+/).length;

  let usable = LAYOUTS.filter((layout) => {
    // Enormous type needs a short headline. The measure is how many columns the words
    // get, so a low measure with many words means a wall of small text in a big box.
    if (layout.scale > 1.3 && words > 3) return false;
    if (layout.scale > 1.15 && words > 6) return false;
    return true;
  });

  /*
   * Vertical video is a different problem, not the same one rotated.
   *
   * A layout that hangs content off the left margin has almost no width to work with in
   * a 9:16 frame, so the words wrap to one or two per line and the composition stops
   * meaning anything. Tall frames get the arrangements that use their full width.
   */
  if (options.vertical) {
    usable = usable.filter((layout) => layout.headline.span >= 8);
  }

  if (!options.hasSub) {
    // Without a supporting line, compositions built around the gap between headline and
    // sub lose the thing that made them work.
    usable = usable.filter((layout) => layout.name !== 'high-and-low');
  }

  const chosen = random.pick(usable.length > 0 ? usable : LAYOUTS);

  // A one-in-four mirror, and only for arrangements that are not already centred —
  // flipping a centred layout does nothing, and flipping every left-aligned one would
  // just make right-alignment the new default.
  const centred = chosen.headline.span >= COLUMNS - 2 || chosen.headlineAnchor === 'center';
  if (!centred && random.chance(0.25)) {
    return {
      ...chosen,
      name: `${chosen.name}-mirrored`,
      headline: mirror(chosen.headline),
      headlineAnchor: flip(chosen.headlineAnchor),
      eyebrow: mirror(chosen.eyebrow),
      eyebrowAnchor: flip(chosen.eyebrowAnchor),
      sub: mirror(chosen.sub),
      subAnchor: flip(chosen.subAnchor),
      rule: chosen.rule ? mirror(chosen.rule) : undefined,
    };
  }

  return chosen;
};

const flip = (anchor: Anchor): Anchor =>
  anchor.includes('left')
    ? (anchor.replace('left', 'right') as Anchor)
    : anchor.includes('right')
      ? (anchor.replace('right', 'left') as Anchor)
      : anchor;

export const TITLE_LAYOUT_COUNT = LAYOUTS.length;
export { ROWS };
