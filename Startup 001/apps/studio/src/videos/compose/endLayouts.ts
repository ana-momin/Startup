import type { Anchor, Random, Region } from '@motion/engine';

/**
 * Arrangements for an ending, and for a single big number.
 *
 * Both are the same compositional problem: one short, important thing plus a small piece
 * of supporting text, with the whole frame available. That is why they share a table —
 * splitting them would mean writing the same seven arrangements twice and watching them
 * drift apart, which is exactly what happened with steps and features.
 *
 * The ending matters more than its length suggests. It is the last thing anyone sees, it
 * is where the call to action lives, and it was previously identical in every video we
 * had ever made — a centred line with a pill under it. A viewer who watched two of our
 * videos saw the same ending twice, which is the moment a tool stops looking like a
 * studio.
 */

export type EndLayout = {
  name: string;
  /** The headline, or the number. */
  lead: Region;
  leadAnchor: Anchor;
  /** Multiplier on the lead's size. */
  scale: number;
  /** The button, or the number's label. */
  tail: Region;
  tailAnchor: Anchor;
  /** A rule or mark, where the composition wants one. */
  mark?: Region;
};

const LAYOUTS: EndLayout[] = [
  {
    // Centred and closed. The ending most endings want.
    name: 'centred-close',
    lead: { col: 1, row: 2, span: 10, rows: 3 },
    leadAnchor: 'bottom',
    scale: 1,
    tail: { col: 3, row: 5, span: 6, rows: 1 },
    tailAnchor: 'top',
    mark: { col: 5, row: 6, span: 2, rows: 1 },
  },
  {
    // Hung left, with the action directly beneath it. Reads as a statement followed by
    // an instruction, which is what a call to action actually is.
    name: 'left-close',
    lead: { col: 1, row: 2, span: 8, rows: 3 },
    leadAnchor: 'bottom-left',
    scale: 1.08,
    tail: { col: 1, row: 5, span: 5, rows: 1 },
    tailAnchor: 'top-left',
    mark: { col: 1, row: 6, span: 3, rows: 1 },
  },
  {
    // The whole frame for the line, the action tucked into the bottom corner. Confident:
    // it assumes you already want to act and only need to know where.
    name: 'wide-statement',
    lead: { col: 0, row: 2, span: 12, rows: 3 },
    leadAnchor: 'center',
    scale: 1.3,
    tail: { col: 1, row: 6, span: 5, rows: 1 },
    tailAnchor: 'bottom-left',
  },
  {
    // Split: the line on the left, the action on the right, on the same baseline. Only
    // works when both are short, which is enforced below.
    name: 'split-baseline',
    lead: { col: 1, row: 3, span: 6, rows: 2 },
    leadAnchor: 'left',
    scale: 0.95,
    tail: { col: 8, row: 3, span: 3, rows: 2 },
    tailAnchor: 'right',
  },
  {
    // High and quiet. The frame below is left empty on purpose — an ending with room to
    // breathe reads as the end of something considered rather than as a sign-off.
    name: 'high-quiet',
    lead: { col: 1, row: 1, span: 9, rows: 2 },
    leadAnchor: 'top-left',
    scale: 0.95,
    tail: { col: 1, row: 4, span: 5, rows: 1 },
    tailAnchor: 'top-left',
    mark: { col: 1, row: 3, span: 2, rows: 1 },
  },
  {
    // Low: the line sits in the bottom third with everything above it empty. The most
    // cinematic of them, and the one that suits a busy background.
    name: 'low-close',
    lead: { col: 1, row: 4, span: 9, rows: 2 },
    leadAnchor: 'bottom-left',
    scale: 1.05,
    tail: { col: 1, row: 6, span: 5, rows: 1 },
    tailAnchor: 'top-left',
  },
];

export const chooseEndLayout = (
  lead: string,
  random: Random,
  options: { hasTail: boolean; vertical: boolean; minLeadRows?: number },
): EndLayout => {
  const words = lead.trim().split(/\s+/).length;

  /*
   * A caller can demand a tall region for its lead.
   *
   * These arrangements were written for text, which is wide and short. A big number is
   * not text — it is a circular object with a ring and brackets around it, and a region
   * two rows deep makes it tiny however much width it is given. Rather than a second
   * table of near-identical layouts, the caller says what shape it needs.
   */
  const minRows = options.minLeadRows ?? 0;

  let usable = LAYOUTS.filter((layout) => {
    if (layout.lead.rows < minRows) return false;
    // The widest treatment exists to say something short enormously.
    if (layout.scale > 1.2 && words > 4) return false;
    // A split baseline needs both halves to be short, or the two columns collide.
    if (layout.name === 'split-baseline' && (words > 4 || !options.hasTail)) return false;
    return true;
  });

  // Splitting the frame sideways needs width a tall frame does not have.
  if (options.vertical) {
    usable = usable.filter((layout) => layout.name !== 'split-baseline');
  }

  return random.pick(usable.length > 0 ? usable : [LAYOUTS[0]]);
};
