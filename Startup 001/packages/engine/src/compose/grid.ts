/**
 * The grid, and placement on it.
 *
 * Every scene used to hardcode its own arrangement: a title was a centred column of
 * badge, headline and subtitle, and nothing could make it anything else. Tone changed
 * the size, the weight and the speed — never the *position*. So the entire space of
 * videos the engine could produce was ten scene kinds times three layout enums, and it
 * felt like a template because architecturally it was one.
 *
 * Here layout becomes data. A composition says which region of the grid each piece of
 * content occupies and how it is aligned inside it, and the renderer places whatever it
 * is handed. Adding a new arrangement is adding a row to a table rather than writing a
 * component, which is the difference between a system that has options and a system that
 * composes.
 *
 * The grid is the same one designers have used since Swiss typography: columns for
 * horizontal rhythm, rows for vertical, and a margin that nothing crosses. Twelve
 * columns because twelve divides by 2, 3, 4 and 6 — halves, thirds, quarters and sixths
 * all land on real column edges, which is why the number survived from print.
 */

export const COLUMNS = 12;
export const ROWS = 8;

/**
 * A rectangle on the grid, in column and row lines (not indices).
 *
 * Lines rather than cells because that is how a designer describes a region — "from the
 * second column line to the eighth" — and because spans then subtract cleanly without
 * the off-by-one that cell indices always attract.
 */
export type Region = {
  /** Left edge, 0 to COLUMNS. */
  col: number;
  /** Top edge, 0 to ROWS. */
  row: number;
  /** Width in columns. */
  span: number;
  /** Height in rows. */
  rows: number;
};

export type Anchor =
  | 'top-left' | 'top' | 'top-right'
  | 'left' | 'center' | 'right'
  | 'bottom-left' | 'bottom' | 'bottom-right';

/** The pixel rectangle a region maps to, given a frame and its margin. */
export type Box = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type GridConfig = {
  width: number;
  height: number;
  /**
   * Safe margin as a fraction of the shorter side.
   *
   * A fraction of the *shorter* side rather than of each axis, so a vertical video does
   * not end up with enormous side margins and a landscape one with none. It keeps the
   * frame's breathing room looking like the same decision in every format.
   */
  margin: number;
};

export const boxFor = (region: Region, config: GridConfig): Box => {
  const short = Math.min(config.width, config.height);
  const inset = short * config.margin;

  const usableWidth = config.width - inset * 2;
  const usableHeight = config.height - inset * 2;

  const colWidth = usableWidth / COLUMNS;
  const rowHeight = usableHeight / ROWS;

  return {
    left: inset + region.col * colWidth,
    top: inset + region.row * rowHeight,
    width: region.span * colWidth,
    height: region.rows * rowHeight,
  };
};

/** Flex alignment for an anchor, so a region can hold its content anywhere inside itself. */
export const alignmentFor = (
  anchor: Anchor,
): { justify: string; align: string; text: 'left' | 'center' | 'right' } => {
  const vertical = anchor.startsWith('top')
    ? 'flex-start'
    : anchor.startsWith('bottom')
      ? 'flex-end'
      : 'center';

  const horizontal = anchor.endsWith('left')
    ? 'flex-start'
    : anchor.endsWith('right')
      ? 'flex-end'
      : 'center';

  // 'top' and 'bottom' on their own mean centred horizontally; 'left' and 'right' mean
  // centred vertically. Reading the string twice is enough to get both, and it keeps the
  // nine anchors expressible as nine plain words rather than as a pair of enums.
  const text = anchor === 'left' || anchor.endsWith('-left')
    ? 'left'
    : anchor === 'right' || anchor.endsWith('-right')
      ? 'right'
      : 'center';

  return { justify: vertical, align: horizontal, text };
};

/**
 * Mirror a region across the vertical centre line.
 *
 * Doubles the composition library for free, and does it honestly: a layout anchored to
 * the left margin and the same layout anchored to the right are genuinely different
 * compositions, not a cheap variation. Worth using sparingly for text, since a
 * right-aligned paragraph is harder to read than a left-aligned one in every language
 * that reads left to right.
 */
export const mirror = (region: Region): Region => ({
  ...region,
  col: COLUMNS - region.col - region.span,
});

/** Move a region without leaving the grid. Used to nudge a composition with the seed. */
export const shift = (region: Region, byCols: number, byRows: number): Region => ({
  ...region,
  col: clamp(region.col + byCols, 0, COLUMNS - region.span),
  row: clamp(region.row + byRows, 0, ROWS - region.rows),
});

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);
