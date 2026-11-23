/**
 * Type that fits the box it was given.
 *
 * Once layout became data, this became the thing holding the whole idea up. A
 * composition hands a headline a region — seven columns by three rows — and the headline
 * has to be as large as that region allows and not one pixel larger. Guessing a size and
 * shrinking it by word count is what the engine did before, and it worked until a
 * headline had long words, or a layout gave it a narrow region, and then the type
 * overflowed into whatever was underneath it.
 *
 * The honest way to size text is to measure it, and in a browser that means laying it
 * out. We cannot do that: a frame has to be a pure function of its inputs, and measuring
 * would make the answer depend on fonts having loaded. So this estimates instead, using
 * the one property of a typeface that is stable enough to rely on — its average
 * character width relative to its size — and then deliberately errs small.
 *
 * Erring small is the whole discipline here. Text one step smaller than optimal looks
 * considered; text one step larger than its box looks broken, and there is no amount of
 * cleverness that makes an overflow acceptable.
 */

export type FitOptions = {
  text: string;
  /** Width available, in pixels. */
  width: number;
  /** Height available, in pixels. */
  height: number;
  /** Never go above this, however much room there is. */
  max: number;
  /** Never go below this, even if it means overflowing — unreadable is worse. */
  min?: number;
  /** Line height as a multiple of the font size. */
  leading?: number;
  /**
   * Average character width as a fraction of font size.
   *
   * ~0.5 for a bold grotesque at display sizes, ~0.55 for a regular weight. It is a
   * generalisation, which is exactly why the result is then backed off a little.
   */
  ratio?: number;
};

export const fitText = ({
  text,
  width,
  height,
  max,
  min = 12,
  leading = 1.05,
  ratio = 0.52,
}: FitOptions): number => {
  // Specs cross a network and a model wrote them: a missing line costs that line, not
  // the page it is on.
  const trimmed = String(text ?? '').trim();
  if (!trimmed || width <= 0 || height <= 0) return min;

  const words = trimmed.split(/\s+/);
  const longestWord = words.reduce((n, word) => Math.max(n, word.length), 0);

  /*
   * Walk down from the largest size until it fits.
   *
   * A closed-form solution exists for a fixed number of lines, but the line count itself
   * depends on the size, so it is circular. Stepping is a handful of iterations of
   * arithmetic and is obviously correct, which is worth more here than being clever.
   */
  for (let size = max; size > min; size -= Math.max(max * 0.02, 1)) {
    const charWidth = size * ratio;

    // A single word that cannot fit on one line will hyphenate or overflow. Either is
    // worse than smaller type, so this is checked before anything else.
    if (longestWord * charWidth > width) continue;

    const charsPerLine = Math.max(Math.floor(width / charWidth), 1);
    const lines = estimateLines(words, charsPerLine);

    if (lines * size * leading <= height) return size;
  }

  return min;
};

/**
 * How many lines the words will take, wrapping on whole words.
 *
 * Counting characters and dividing would under-count badly: real wrapping leaves a
 * ragged edge, and a line that can hold 18 characters will usually hold fewer once whole
 * words are kept together. Walking the words is the same arithmetic a layout engine does
 * and costs nothing at this scale.
 */
const estimateLines = (words: string[], charsPerLine: number): number => {
  let lines = 1;
  let used = 0;

  for (const word of words) {
    const needed = used === 0 ? word.length : word.length + 1;
    if (used + needed > charsPerLine) {
      lines += 1;
      used = word.length;
    } else {
      used += needed;
    }
  }

  return lines;
};
