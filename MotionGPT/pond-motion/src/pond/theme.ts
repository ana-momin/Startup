/**
 * Design tokens reverse-engineered from the reference cut.
 * Colours were sampled off the source frames, not guessed.
 */

export const FPS = 60;
export const DURATION = 5 * FPS; // 300 frames

export const C = {
  white: "#ffffff",
  pale: "#f2f7fd", // the pale blue-white field the light scenes sit on
  blue: "#2166f6", // accent / hero blue, sampled off the giant type
  blueDeep: "#2f6be8", // full-bleed field, top-left
  blueMid: "#3b7deb",
  blueLite: "#5aa4f7", // full-bleed field, bottom-right
  wash: "#8fb9fb", // soft aurora blobs on light scenes
  washSoft: "#c3dafc",
  ink: "#0b1526", // dark text on light
  inkSoft: "#5c6b82",
} as const;

/** A word that has not resolved yet sits pale and blurred. */
export const PENDING_ON_LIGHT = "rgba(33,102,246,0.20)";
export const PENDING_ON_BLUE = "rgba(255,255,255,0.32)";

/**
 * Four beats, hard-cut between them exactly like the reference. Frame ranges
 * are absolute so every scene can read the global clock.
 */
export const SCENES = {
  task: { from: 0, dur: 72 },
  agents: { from: 72, dur: 78 },
  network: { from: 150, dur: 92 },
  end: { from: 242, dur: 58 },
} as const;

/** Cheap deterministic hash-random. */
export const rnd = (i: number): number => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
