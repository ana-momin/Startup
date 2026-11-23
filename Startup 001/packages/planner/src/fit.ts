import { CROSSFADE } from './timing.ts';
import type { ScenePlan } from './types.ts';

/**
 * Making the film the length it was asked to be.
 *
 * The picker in the prompt bar says "Short ~8s", "Standard ~15s", "Long ~25s", and until
 * now those numbers were decoration. Nothing in the pipeline aimed at a duration: the
 * director gave every scene a hardcoded length, a pace multiplier of 0.75, 1 or 1.35
 * scaled them all, and the film was however long that happened to add up to.
 *
 * Measured across eight real briefs, the error ran from minus fifty-five per cent to plus
 * sixty. "Short, eight seconds" produced a twelve-point-eight second film. "Long,
 * twenty-five seconds" produced eleven. The only ones that landed near their target did
 * so by coincidence, because a four-scene plan at default lengths happens to total about
 * fifteen seconds.
 *
 * Asking the model to add up to a number is the wrong fix — language models are poor at
 * arithmetic and there is no reason to spend a retry on something a function can
 * guarantee. The prompt asks for roughly the right SHAPE (how many scenes suit eight
 * seconds versus twenty-five) and this makes the arithmetic true.
 *
 * Two things stop it being a naive scale:
 *
 *   A floor per scene, from its content. Four bullet points cannot be read in a second
 *   however much the arithmetic would like them to be, and squeezing them produces a
 *   film that is technically the right length and literally unreadable.
 *
 *   Dropping rather than squeezing. When a plan cannot fit its target without breaching
 *   those floors, the answer is fewer scenes, not faster ones. A fifteen-second film
 *   with four things in it beats a fifteen-second film with seven things nobody can
 *   read.
 */

/** What each length preference actually promises, in seconds. */
export const TARGET_SECONDS = { short: 8, standard: 15, long: 25 } as const;

export type LengthName = keyof typeof TARGET_SECONDS;

/**
 * The least time a scene needs to be read.
 *
 * Derived from what is on it rather than fixed per kind, because the same kind carries
 * very different amounts: a two-word big word and a five-word one are not the same shot,
 * and a list of two is not a list of four.
 *
 * The numbers come from reading speed rather than taste. A viewer needs roughly a third
 * of a second per word to take in a short line, plus about three quarters of a second for
 * the thing to arrive and settle before they start.
 */
const minSeconds = (scene: ScenePlan): number => {
  const read = (text: string | undefined, per = 0.33) =>
    String(text ?? '').trim().split(/\s+/).filter(Boolean).length * per;

  switch (scene.kind) {
    case 'title':
      return 1.5 + read(scene.headline) + read(scene.sub, 0.22);
    case 'bigword':
      // Each word is its own moment here, so they do not overlap the way a line does.
      return 0.8 + scene.words.length * 0.45;
    case 'features':
    case 'steps':
      // Items arrive one at a time and the last one still needs reading.
      return 1.2 + scene.items.length * 0.75;
    case 'stat':
      // A number that counts up needs the count to be worth watching.
      return 2.2;
    case 'quote':
      return 1.5 + read(scene.quote, 0.28);
    case 'product':
      // Something happens inside the frame — rows arriving, a cursor moving. Rushing it
      // means showing a still picture of an interface, which is the thing it exists not
      // to be.
      return 3.2;
    case 'chart':
      return 2.6 + scene.series.length * 0.2;
    case 'flow':
      return 1.4 + scene.steps.length * 0.7;
    case 'constellation':
      return 1.6 + scene.items.length * 0.42;
    case 'overlay':
      // The column has to visibly pass behind the words or the whole effect is lost.
      return 3.4;
    case 'logo':
      return 1.8;
    case 'outro':
      return 1.6 + read(scene.headline);
  }
};

/**
 * How droppable a scene is, lowest first.
 *
 * The opening and the closing are kept whatever happens: a film with no beginning and no
 * end is not a shorter film, it is a fragment. Everything else is ranked by how much it
 * contributes that nothing else could — a product shot or a real number is the evidence,
 * while a third list of features is the first thing a human editor would cut.
 */
const EXPENDABLE: Record<ScenePlan['kind'], number> = {
  features: 1,
  steps: 2,
  constellation: 3,
  quote: 4,
  bigword: 5,
  chart: 6,
  flow: 7,
  overlay: 8,
  stat: 9,
  product: 10,
  title: 11,
  logo: 12,
  outro: 13,
};

/** Total runtime of a scene list in seconds, allowing for the overlap between cuts. */
export const runtime = (scenes: ScenePlan[], fps = 30): number => {
  const frames = scenes.reduce((n, s) => n + s.duration, 0);
  return (frames - Math.max(scenes.length - 1, 0) * CROSSFADE) / fps;
};

/**
 * The longest a shot of this kind can earn, in seconds.
 *
 * Six, with an exception for the two kinds that have movement of their own: a product
 * scene has rows arriving and a cursor moving, and an overlay has a whole column
 * travelling behind the type. Those can hold nine.
 */
const ceilingSeconds = (scene: ScenePlan): number =>
  scene.kind === 'product' || scene.kind === 'overlay' ? 9 : 6;

/**
 * Can these scenes hold the requested length without any shot overstaying?
 *
 * The planner asks before it starts fitting, because the answer changes what it should
 * build rather than how long it should hold. Three scenes cannot fill twenty-five
 * seconds at a watchable pace, and the fix for that is a fourth scene, not a longer
 * third one.
 */
export const fillsLength = (scenes: ScenePlan[], length: LengthName, fps = 30): boolean => {
  const ceiling = scenes.reduce((n, s) => n + Math.round(ceilingSeconds(s) * fps), 0);
  return (ceiling - Math.max(scenes.length - 1, 0) * CROSSFADE) / fps >= TARGET_SECONDS[length];
};

/**
 * Fit a plan to its target length.
 *
 * Returns a new list; the input is untouched. The result is within a few tenths of the
 * target unless the floors make that impossible, in which case it is as close as it can
 * be while staying readable — and it says so in the log rather than silently lying about
 * the length.
 */
export const fitToLength = (
  scenes: ScenePlan[],
  length: LengthName,
  fps = 30,
): ScenePlan[] => {
  if (scenes.length === 0) return scenes;

  const target = TARGET_SECONDS[length];
  let working = [...scenes];

  /*
   * Drop scenes until the floors can fit.
   *
   * The overlap matters here: every extra scene both adds its own minimum AND gives back
   * a crossfade, so the sum is not simply the floors added up.
   */
  const floorFor = (list: ScenePlan[]) =>
    list.reduce((n, s) => n + minSeconds(s), 0) -
    (Math.max(list.length - 1, 0) * CROSSFADE) / fps;

  while (working.length > 2 && floorFor(working) > target) {
    // Never the first or the last. Of the rest, the most expendable goes.
    const middle = working.slice(1, -1);
    let worstAt = 1;
    let worst = Number.POSITIVE_INFINITY;
    middle.forEach((scene, i) => {
      const rank = EXPENDABLE[scene.kind];
      if (rank < worst) {
        worst = rank;
        worstAt = i + 1;
      }
    });
    working = [...working.slice(0, worstAt), ...working.slice(worstAt + 1)];
  }

  /*
   * Now scale what is left to land on the target.
   *
   * Each scene keeps its share of the film — a product shot stays proportionally longer
   * than a title — but no scene goes below what it needs to be read. Anything that hits
   * its floor stops shrinking, and the slack is taken from the scenes that still have
   * room, which is how a human would do it.
   */
  const targetFrames = Math.round(target * fps) + Math.max(working.length - 1, 0) * CROSSFADE;
  const floors = working.map((s) => Math.round(minSeconds(s) * fps));

  /*
   * No shot holds for longer than it can earn.
   *
   * Without this, a thin plan plus a long target is a slideshow: asked for twenty-five
   * seconds the director kept returning three scenes, and stretching them produced
   * eight-and-a-third seconds a shot. The reference films hold a median of two to five
   * seconds, and only run longer when the camera is doing something inside the shot.
   *
   * Hitting the ceiling means the film comes out shorter than asked. That is the right
   * trade: a nineteen-second film at a watchable pace beats a twenty-five-second one
   * that drags, and the alternative is quietly shipping the drag.
   */
  const maxFrames = (scene: ScenePlan) => Math.round(ceilingSeconds(scene) * fps);

  /*
   * Clamp to the ceiling BEFORE the loop, not after.
   *
   * This was the last of the duration bugs, and the most deceptive. A scene that arrived
   * already over the ceiling was skipped by the loop — it had no room to grow — so the
   * loop balanced the film around its inflated length, landed exactly on the target, and
   * only then was the scene trimmed back. The time it gave up went nowhere, and a
   * fifteen-second film shipped at fourteen while every warning stayed quiet, because by
   * its own reckoning the fit had succeeded.
   */
  let frames = working.map((s) => Math.min(s.duration, maxFrames(s)));
  let total = frames.reduce((a, b) => a + b, 0);

  /*
   * Enough passes to actually converge.
   *
   * Six was not. Each pass hands the shortfall out in proportion, and every scene that
   * hits its floor or its ceiling sends its share back to be redistributed — so a film
   * where several scenes clamp needs several more rounds. Measured at six passes, a
   * five-scene film asked for twenty-five seconds stalled at twenty-two-point-six with
   * room still left in the shots; the loop was not wrong, it was interrupted.
   */
  for (let pass = 0; pass < 24; pass++) {
    const slack = targetFrames - total;
    if (Math.abs(slack) <= 2) break;

    /*
     * Which scenes can still move in the direction we need?
     *
     * Growing used to be treated as unlimited, with the ceiling applied once the loop had
     * finished — and that quietly lost time. Three scenes asked to fill fifteen seconds
     * were scaled right onto the target, then two of them were cut back to the cap and
     * nobody took up the slack, so the film came out at twelve-point-six and the warning
     * blamed the content. A ceiling the loop cannot see is a ceiling it cannot work
     * around.
     */
    const movable = frames
      .map((f, i) => ({ i, room: slack < 0 ? f - floors[i] : maxFrames(working[i]) - f }))
      .filter((m) => m.room > 0);
    if (movable.length === 0) break;

    const pool = movable.reduce((n, m) => n + frames[m.i], 0);
    for (const m of movable) {
      const share = frames[m.i] / pool;
      const next = Math.round(frames[m.i] + slack * share);
      frames[m.i] = Math.min(Math.max(next, floors[m.i]), maxFrames(working[m.i]));
    }
    total = frames.reduce((a, b) => a + b, 0);
  }


  const fitted = working.map((scene, i) => ({ ...scene, duration: frames[i] }));
  const landed = runtime(fitted, fps);

  if (landed < target - 1.2) {
    console.warn(
      `fit: ${working.length} scenes cannot fill ${target}s without each holding too ` +
        `long — delivering ${landed.toFixed(1)}s at a watchable pace instead.`,
    );
  }

  if (Math.abs(landed - target) > 1.2) {
    console.warn(
      `fit: wanted ${target}s, landed at ${landed.toFixed(1)}s with ${fitted.length} ` +
        `scenes — the content will not compress further without becoming unreadable.`,
    );
  }

  return fitted;
};
