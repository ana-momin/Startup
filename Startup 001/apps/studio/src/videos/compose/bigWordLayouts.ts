import type { Anchor, Random, Region } from '@motion/engine';

/**
 * Arrangements for a big-word scene.
 *
 * Before this, every big word in every video the product had ever made was dead centre,
 * uppercase, at one size, with a row of beat dots underneath. One picture — so a viewer
 * who saw two of our films saw the same frame twice with different letters in it.
 *
 * These are eight different designs, not eight sizes of one. Each answers the three
 * questions differently: where the word sits, how big it is, and what the rest of the
 * frame is doing. A word hung off the left margin with two-thirds of the frame left
 * empty is not a centred word moved sideways; it is a different idea about what the
 * frame is for.
 *
 * The word is set to FILL its measure rather than to sit inside it, so a region's width
 * is the word's size. That is why `span` and `scale` are not redundant: the span decides
 * how much room the word has, the scale decides how hard it pushes against it.
 */

export type BigWordLayout = {
  name: string;
  /** Where the word sits. */
  word: Region;
  wordAnchor: Anchor;
  /** Multiplier on the size the measure implies. */
  scale: number;
  /** Letters set uppercase, or left as written. */
  upper: boolean;
  /** Tracking, as a fraction of the size. Negative pulls the letters together. */
  tracking: number;
  /** The beat dots. Omitted means this composition does without them. */
  dots?: Region;
  dotsAnchor?: Anchor;
  /** A rule running with the word, for compositions that want a horizon. */
  rule?: Region;
  /** A flat field of colour behind part of the frame. */
  block?: Region;
  /** "02 / 04", for compositions with room for a detail. */
  counter?: Region;
  counterAnchor?: Anchor;
};

const LAYOUTS: BigWordLayout[] = [
  {
    // The classic, and the only centred one. Generous, nothing fighting it.
    name: 'centre-stage',
    word: { col: 1, row: 2, span: 10, rows: 4 },
    wordAnchor: 'center',
    scale: 1,
    upper: true,
    tracking: -0.045,
    dots: { col: 4, row: 6.6, span: 4, rows: 1 },
    dotsAnchor: 'center',
  },
  {
    // Edge to edge. The word is the frame; there is nothing else in it on purpose.
    name: 'full-bleed',
    word: { col: 0, row: 1.5, span: 12, rows: 5 },
    wordAnchor: 'center',
    scale: 1,
    upper: true,
    tracking: -0.06,
  },
  {
    // Hung off the left margin, the right third deliberately empty.
    name: 'left-rail',
    word: { col: 0.3, row: 1.6, span: 7.5, rows: 4.8 },
    wordAnchor: 'left',
    scale: 1,
    upper: true,
    tracking: -0.05,
    rule: { col: 0.3, row: 6.8, span: 3, rows: 0.6 },
    counter: { col: 8.6, row: 1.6, span: 3, rows: 1 },
    counterAnchor: 'top-right',
  },
  {
    // The same decision mirrored, which is a different composition rather than a cheap
    // variation — the eye enters a frame from the left, so a subject on the right is
    // read after the empty space rather than before it.
    name: 'right-rail',
    word: { col: 4.2, row: 1.6, span: 7.5, rows: 4.8 },
    wordAnchor: 'right',
    scale: 1,
    upper: true,
    tracking: -0.05,
    rule: { col: 8.7, row: 6.8, span: 3, rows: 0.6 },
  },
  {
    // Set low, with the top half empty. Where almost all editorial design sits.
    name: 'lower-third',
    word: { col: 0.8, row: 3.4, span: 10.4, rows: 3.4 },
    wordAnchor: 'bottom-left',
    scale: 1,
    upper: true,
    tracking: -0.04,
    rule: { col: 0.8, row: 2.7, span: 10.4, rows: 0.5 },
    counter: { col: 8.4, row: 2.7, span: 2.8, rows: 0.5 },
    counterAnchor: 'bottom-right',
  },
  {
    // Set high, hanging into the empty bottom half.
    name: 'upper-quarter',
    word: { col: 0.8, row: 1, span: 10.4, rows: 3.4 },
    wordAnchor: 'top-left',
    scale: 1,
    upper: true,
    tracking: -0.04,
    dots: { col: 0.8, row: 4.9, span: 4, rows: 0.8 },
    dotsAnchor: 'left',
  },
  {
    // A colour field taking the right half, the word held in the left.
    name: 'split-field',
    word: { col: 0.4, row: 2, span: 6, rows: 4 },
    wordAnchor: 'center',
    scale: 1,
    upper: true,
    tracking: -0.04,
    block: { col: 6.8, row: -1, span: 6, rows: 10 },
  },
  {
    // Small, low, against a large empty field. The emptiness is the composition, and the
    // word reads as a caption on it rather than as the subject of it.
    name: 'cornered',
    word: { col: 0.8, row: 5.2, span: 6, rows: 1.8 },
    wordAnchor: 'bottom-left',
    scale: 0.82,
    upper: false,
    tracking: -0.02,
    rule: { col: 0.8, row: 1.2, span: 10.4, rows: 0.5 },
    counter: { col: 8.6, row: 5.2, span: 2.6, rows: 1.8 },
    counterAnchor: 'bottom-right',
  },
];

/**
 * Pick an arrangement for this scene.
 *
 * Filters before it draws. A composition that gives the word four columns and pushes it
 * to 1.3 is a wall of letters when the word is "collaboration", so the longest word in
 * the scene rules out the arrangements that cannot hold it — which is a design decision
 * made in advance rather than a size reduction made afterwards.
 */
export const chooseBigWordLayout = (
  words: string[],
  random: Random,
  options: { vertical: boolean } = { vertical: false },
): BigWordLayout => {
  const longest = words.reduce((n, word) => Math.max(n, word.trim().length), 1);

  let usable = LAYOUTS.filter((layout) => {
    // How much room a letter actually gets: the columns the word is given, divided by
    // the letters that have to fit in them, against how hard the layout pushes.
    const room = layout.word.span / (longest * layout.scale);
    return room >= 0.42;
  });

  /*
   * A tall frame is a different problem, not the same one rotated.
   *
   * Everything hung off a margin has almost no width in 9:16 — a seven-column word in a
   * vertical frame is narrower than a single letter wants to be, so the composition
   * stops meaning anything and the type collapses. Tall frames get the arrangements that
   * use their full width.
   */
  if (options.vertical) {
    usable = usable.filter((layout) => layout.word.span >= 10);
  }

  if (usable.length === 0) usable = [LAYOUTS[0]];
  return usable[Math.floor(random.next() * usable.length) % usable.length];
};
