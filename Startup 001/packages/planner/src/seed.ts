/**
 * A number in [0, 1) drawn from a string.
 *
 * The engine already has this — FNV-1a into mulberry32 — but importing it here would
 * drag React and the whole renderer into a package that is deliberately free of browser
 * APIs, and the server's typecheck would compile JSX it has no business compiling. So
 * the twenty lines are repeated across the package boundary rather than shared. The
 * duplication is the cheap part; the dependency would not have been.
 *
 * Seeded rather than random, everywhere it is used. A video that made a different choice
 * each time you opened it would be worse than one that never made a choice at all.
 */
export const roll = (seed: string): number => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  let state = (hash + 0x6d2b79f5) >>> 0;
  state = Math.imul(state ^ (state >>> 15), state | 1) >>> 0;
  state ^= state + Math.imul(state ^ (state >>> 7), state | 61);
  return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
};

/**
 * Pick one of several weighted options, from a seed.
 *
 * Weights rather than a flat draw, because the options are rarely equally right — a
 * product film with a real button should usually keep it; a typographic film should
 * usually land on the word. The seed then chooses within those leanings, so two
 * different briefs diverge while the same brief never does.
 */
export const pickWeighted = <T>(seed: string, options: Array<{ weight: number; value: T }>): T | undefined => {
  if (options.length === 0) return undefined;

  let ticket = roll(seed) * options.reduce((n, o) => n + o.weight, 0);
  for (const option of options) {
    ticket -= option.weight;
    if (ticket < 0) return option.value;
  }
  return options[options.length - 1].value;
};
