/**
 * The beat grid.
 *
 * Every animation in the engine so far started whenever its author typed a delay: 5
 * here, 28 there, 10 somewhere else. Each number was fine on its own, and together they
 * are why the videos feel loose. Professional motion graphics is *rhythmic* — things
 * land on a pulse, and the eye notices the pulse long before it could name it.
 *
 * Nothing here plays a sound. A beat grid works silently: it is the reason cuts feel
 * deliberate instead of arbitrary, and it is what lets a soundtrack be dropped on top
 * later and appear to have been composed for the video.
 *
 * Pure arithmetic, so it stays true to the engine's one rule — any frame computable on
 * its own, without knowing what happened before it.
 */

/** Frames in one beat. Fractional, so tempos that don't divide evenly stay honest. */
export const framesPerBeat = (bpm: number, fps: number): number => (60 / bpm) * fps;

/**
 * The frame that beat `n` falls on. Beat 0 is the start of the shot.
 *
 * Use it instead of typing a delay:
 *
 *   <Headline delay={beat(1, bpm, fps)} />     // lands on the downbeat
 *   <Sub      delay={beat(2.5, bpm, fps)} />   // lands on the offbeat after it
 *
 * Halves and quarters are deliberately allowed. Everything landing on whole beats is
 * as mechanical as nothing landing on them; the syncopation is where the feel lives.
 */
export const beat = (n: number, bpm: number, fps: number): number =>
  Math.round(n * framesPerBeat(bpm, fps));

/** Which beat a frame falls on, as a fraction. Frame 22 at 15 frames/beat is beat 1.47. */
export const beatAt = (frame: number, bpm: number, fps: number): number =>
  frame / framesPerBeat(bpm, fps);

/**
 * The nearest beat to a frame, in frames.
 *
 * For pulling a duration the planner chose onto the grid, so a scene ends on a beat
 * rather than a third of the way through one.
 */
export const snapToBeat = (frame: number, bpm: number, fps: number): number => {
  const per = framesPerBeat(bpm, fps);
  return Math.max(Math.round(frame / per) * per, per);
};

/**
 * A short accent that fires on every beat and decays, 1 down to 0.
 *
 * Multiply it into a scale or an opacity and the element breathes with the video's
 * pulse. Kept small at the call site: a 2% scale pop is felt, a 10% one is a distraction
 * that competes with the thing the viewer is meant to be reading.
 */
export const beatPulse = ({
  frame,
  bpm,
  fps,
  /** Beats between accents. 1 is every beat, 2 is every other. */
  every = 1,
  /** How many frames the accent takes to fade out. */
  decay = 9,
}: {
  frame: number;
  bpm: number;
  fps: number;
  every?: number;
  decay?: number;
}): number => {
  if (frame < 0) return 0;
  const per = framesPerBeat(bpm, fps) * every;
  const since = frame % per;
  if (since >= decay) return 0;
  // Squared falloff: a sharp attack and a soft tail, the way a struck thing actually
  // behaves. Linear decay reads as a blink.
  const t = 1 - since / decay;
  return t * t;
};

/**
 * Tempo for a tone, in beats per minute.
 *
 * These are the speeds the tones already implied — this just writes them down somewhere
 * every scene can agree on, instead of each scene guessing with its own delays.
 *
 * Chosen against real reference: 76 is a slow documentary cut, 92 a corporate explainer,
 * 120 a product launch, 140 the pace of social video where a viewer leaves in a second.
 */
export const TEMPO = {
  editorial: 76,
  clean: 92,
  bold: 120,
  kinetic: 140,
} as const;

export type TempoName = keyof typeof TEMPO;
