import { mirror } from '@motion/engine';
import type { Anchor, Random, Region } from '@motion/engine';

/**
 * Arrangements for a list of points.
 *
 * This is the scene the founder singled out — *"same kind of bullets"* — and he was
 * right, because there was literally one arrangement: a heading with a centred column of
 * dashed rows under it, every time, in every video.
 *
 * A list of four short things is one of the most flexible shapes in graphic design.
 * It can be a stack, a two-by-two, a row of columns, a numbered sequence, a set of bands
 * across the frame, or a heading beside its contents. None of those is a bulleted list,
 * and a bulleted list is the least interesting of them — it is what you reach for when
 * the arrangement has not been decided.
 */

export type ListStyle =
  /** Rows down the page, each with a marker. The old behaviour, kept because it works. */
  | 'rows'
  /** A grid of cards. Good for exactly four, poor for three. */
  | 'grid'
  /** Side-by-side columns, each a short heading. Reads as a comparison. */
  | 'columns'
  /** Full-width bands stacked, each wiping in. Confident and very legible. */
  | 'bands'
  /** Numbered, with the index large and the text small beside it. Reads as a sequence. */
  | 'numbered';

export type ListLayout = {
  name: string;
  style: ListStyle;
  /** Where the heading sits. */
  heading: Region;
  headingAnchor: Anchor;
  /** The area the items fill. */
  items: Region;
  itemsAnchor: Anchor;
  /** Items laid out left-to-right rather than top-to-bottom. */
  horizontal: boolean;
  /** Text alignment inside each item. */
  align: 'left' | 'center';
};

const LAYOUTS: ListLayout[] = [
  {
    // Heading above, rows beneath, everything on one axis. The reliable one.
    name: 'stacked-rows',
    style: 'rows',
    heading: { col: 1, row: 1, span: 10, rows: 1 },
    headingAnchor: 'bottom-left',
    items: { col: 1, row: 2, span: 9, rows: 5 },
    itemsAnchor: 'top-left',
    horizontal: false,
    align: 'left',
  },
  {
    // Heading holds the left third; the points sit beside it. The frame is divided once,
    // cleanly, which is the oldest trick in editorial layout.
    name: 'heading-beside',
    style: 'rows',
    heading: { col: 1, row: 2, span: 4, rows: 3 },
    headingAnchor: 'left',
    items: { col: 6, row: 2, span: 5, rows: 4 },
    itemsAnchor: 'left',
    horizontal: false,
    align: 'left',
  },
  {
    // Full-width bands. Each one wipes across the frame, so the list reads as a sequence
    // of statements rather than as a set of options.
    name: 'bands',
    style: 'bands',
    heading: { col: 1, row: 1, span: 10, rows: 1 },
    headingAnchor: 'bottom-left',
    items: { col: 0, row: 2, span: 12, rows: 5 },
    itemsAnchor: 'center',
    horizontal: false,
    align: 'left',
  },
  {
    // Columns across. Turns a list into a comparison, which is a different argument from
    // the same words.
    name: 'columns',
    style: 'columns',
    heading: { col: 1, row: 1, span: 10, rows: 1 },
    headingAnchor: 'bottom',
    items: { col: 1, row: 3, span: 10, rows: 3 },
    itemsAnchor: 'top',
    horizontal: true,
    align: 'center',
  },
  {
    // Numbered, with the figure large. The number does the work the bullet used to, and
    // says something the bullet could not: that there is an order.
    name: 'numbered',
    style: 'numbered',
    heading: { col: 1, row: 1, span: 8, rows: 1 },
    headingAnchor: 'bottom-left',
    items: { col: 1, row: 2, span: 10, rows: 5 },
    itemsAnchor: 'top-left',
    horizontal: false,
    align: 'left',
  },
  {
    // Two by two. Only ever for four, which is enforced below.
    name: 'quadrant',
    style: 'grid',
    heading: { col: 1, row: 1, span: 10, rows: 1 },
    headingAnchor: 'bottom',
    items: { col: 1, row: 2, span: 10, rows: 5 },
    itemsAnchor: 'center',
    horizontal: false,
    align: 'left',
  },
];

/**
 * Choose an arrangement for this list.
 *
 * Item count is a hard constraint rather than a preference: a two-by-two grid holding
 * three things has a hole in it, and columns holding five are too narrow to read. Getting
 * this wrong does not look like variety, it looks like a bug.
 */
export const chooseListLayout = (
  items: string[],
  random: Random,
  options: { vertical: boolean; isSteps: boolean },
): ListLayout => {
  const count = items.length;
  const longest = items.reduce((n, item) => Math.max(n, item.length), 0);

  let usable = LAYOUTS.filter((layout) => {
    if (layout.style === 'grid' && count !== 4) return false;
    // Columns need room each, and long text in a narrow column becomes a paragraph.
    if (layout.style === 'columns' && (count > 4 || longest > 34)) return false;
    // Bands are full-width statements; more than four of them fills the frame.
    if (layout.style === 'bands' && count > 4) return false;
    // A heading beside its list needs the list to be short enough to sit next to it.
    if (layout.name === 'heading-beside' && count > 4) return false;
    return true;
  });

  /*
   * Vertical video has no width to divide.
   *
   * Columns and side-by-side headings both rely on splitting the frame horizontally,
   * which in a 9:16 frame leaves each part too narrow to hold words. Tall frames get the
   * arrangements that stack.
   */
  if (options.vertical) {
    usable = usable.filter((layout) => !layout.horizontal && layout.name !== 'heading-beside');
  }

  /*
   * Steps are a sequence, so they get numbered.
   *
   * This is content deciding, not style: "how it works" is an ordered thing and an
   * unordered arrangement would misrepresent it. A list of benefits has no order and
   * numbering it would invent one.
   */
  if (options.isSteps) {
    const numbered = usable.filter((layout) => layout.style === 'numbered');
    if (numbered.length > 0) return numbered[0];
  } else {
    usable = usable.filter((layout) => layout.style !== 'numbered');
  }

  const chosen = random.pick(usable.length > 0 ? usable : [LAYOUTS[0]]);

  // Mirroring a divided frame is a genuinely different composition — the eye reads a
  // heading on the right differently from one on the left. Only for the split layouts,
  // and only sometimes.
  if (chosen.name === 'heading-beside' && random.chance(0.35)) {
    return {
      ...chosen,
      name: 'heading-beside-mirrored',
      heading: mirror(chosen.heading),
      headingAnchor: 'right',
      items: mirror(chosen.items),
      itemsAnchor: 'left',
    };
  }

  return chosen;
};
