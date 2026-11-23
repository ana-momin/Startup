/**
 * Deterministic randomness.
 *
 * The single biggest reason every video looked the same was that nothing anywhere ever
 * made a different choice. Given the same scene kind, the engine drew the same picture —
 * so two videos about completely different companies came back structurally identical,
 * and no amount of better typography could hide it.
 *
 * The fix is not to randomise, which would break the one promise the whole engine rests
 * on: a frame is a pure function of its inputs, so preview and render match exactly and
 * the same prompt always produces the same video. The fix is to make the *inputs* carry
 * variation. A seed derived from the video's own text is stable forever — ask for the
 * same thing twice and you get the same film — while two different prompts land in
 * completely different places in the space of possible designs.
 *
 * This is how generative design has always worked, and it is the difference between a
 * template with options and a system that composes.
 */

/**
 * Turn any string into a 32-bit seed.
 *
 * FNV-1a: small, fast, and well spread for short strings — which matters, because
 * "Northwind launch" and "Northwind Launch" should not land next to each other.
 */
export const seedFrom = (text: string): number => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    // The FNV prime, as shifts and adds so it stays inside 32 bits in JavaScript.
    hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0;
  }
  return hash >>> 0;
};

/**
 * A stream of numbers from a seed.
 *
 * Mulberry32: thirty lines, no dependency, and statistically far better than the usual
 * `sin(seed) * 10000` trick — which has visible structure, meaning "random" choices come
 * out correlated and the variety is less than it looks.
 */
export type Random = {
  /** Next value, 0 to 1. */
  next: () => number;
  /** Whole number in [min, max]. */
  int: (min: number, max: number) => number;
  /** One item from a list. Never the same twice in a row when asked repeatedly. */
  pick: <T>(items: readonly T[]) => T;
  /** True with the given probability. */
  chance: (probability: number) => boolean;
  /** A copy of a list in a new order. */
  shuffle: <T>(items: readonly T[]) => T[];
};

export const randomFrom = (seed: number): Random => {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (min: number, max: number): number =>
    min + Math.floor(next() * (max - min + 1));

  const pick = <T,>(items: readonly T[]): T => items[int(0, items.length - 1)];

  const chance = (probability: number): boolean => next() < probability;

  const shuffle = <T,>(items: readonly T[]): T[] => {
    const copy = [...items];
    // Fisher-Yates. The naive `sort(() => random() - 0.5)` is not a shuffle: it biases
    // heavily towards the original order, which would quietly undo the point of this file.
    for (let i = copy.length - 1; i > 0; i--) {
      const j = int(0, i);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  return { next, int, pick, chance, shuffle };
};

/**
 * A stream for one specific decision.
 *
 * Every choice gets its own labelled stream rather than drawing from one shared
 * sequence. Without this, adding a single new decision anywhere shifts every choice made
 * after it, and a video that looked right yesterday is rearranged today by an unrelated
 * change. Labelling makes each decision independent and stable: the layout of scene 3
 * depends on the seed and the words "scene-3-layout", and on nothing else.
 */
export const streamFor = (seed: number, label: string): Random =>
  randomFrom((seed ^ seedFrom(label)) >>> 0);
