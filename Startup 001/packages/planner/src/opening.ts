import { pickWeighted, roll } from './seed.ts';
import type { ScenePlan, Tone, VideoStyle } from './types.ts';

/**
 * What the film leads with.
 *
 * Eight out of eight videos opened on a title card, and the prompt could not fix it. The
 * shape menu offers fourteen openings and only six are titles; the text was rewritten to
 * name five alternatives with criteria for each, and the measurement went from six out
 * of eight to eight out of eight. Worse, from more instruction.
 *
 * That is the second time the same lesson has arrived, so take it as settled: a model
 * cannot spread a choice across requests it cannot see. Each call is alone, and alone it
 * reaches for the shape it knows. Asking it to be varied asks for something structurally
 * impossible.
 *
 * So this does not ask. It REORDERS — and only ever reorders, because every opening in
 * the shape menu is a film that leads with a scene it was always going to contain:
 *
 *   Cold open     product -> title -> ...   the interface before the name
 *   Milestone     stat -> ...               the number before the explanation
 *   Testimonial   quote -> ...              somebody else's words first
 *   Loud social   bigword -> ...            the claim first
 *
 * Nothing is written, nothing is dropped, and the running time is identical — the same
 * scenes with the same durations and the same number of crossfades. The only thing that
 * changes is which one is first, which is exactly the decision the model would not make.
 */

/**
 * How well each kind of scene can carry a cold open.
 *
 * A number and a quote lead best: both are concrete, both are somebody else's claim
 * rather than ours, and both make the viewer want the sentence that follows. An
 * interface leads well when the film is about the interface. A big word leads when the
 * film is loud. A flow leads when the film is about a system.
 *
 * Anything not listed never leads: "features" and "steps" are answers to a question
 * nobody has asked yet, and "logo" and "outro" are endings.
 */
const LEADS: Partial<Record<ScenePlan['kind'], number>> = {
  stat: 5,
  quote: 5,
  overlay: 4,
  product: 3,
  bigword: 3,
  flow: 3,
  constellation: 2,
  chart: 2,
};

/**
 * Give the film its opening.
 *
 * Leaves the order alone when the director already chose something other than a title,
 * because that is evidence it was reading the brief rather than reaching — the same test
 * the ending uses.
 */
export const chooseOpening = (
  scenes: ScenePlan[],
  options: { seed: string; style?: VideoStyle; tone?: Tone },
): ScenePlan[] => {
  // Under three scenes there is no middle to promote from, and the last scene is the
  // ending — which has already been decided and must not be moved to the front.
  if (scenes.length < 3) return scenes;
  if (scenes[0].kind !== 'title') return scenes;

  const candidates = scenes
    .map((scene, at) => ({ scene, at }))
    .slice(1, -1)
    .flatMap(({ scene, at }) => {
      const base = LEADS[scene.kind];
      if (base === undefined) return [];

      /*
       * The direction leans the choice, as it does for the ending.
       *
       * A product-led film earns its cold open from the interface; a typographic one has
       * no interface to open on and leads with type or a number instead. Kinetic means
       * short and loud, which is what a big word is for.
       */
      const lean =
        (scene.kind === 'overlay' || scene.kind === 'product' ? (options.style === 'product-led' ? 3 : -2) : 0) +
        (scene.kind === 'bigword' ? (options.tone === 'kinetic' || options.tone === 'bold' ? 3 : -1) : 0) +
        (scene.kind === 'flow' || scene.kind === 'constellation' ? (options.style === 'typographic' ? 2 : 0) : 0);

      const weight = base + lean;
      return weight > 0 ? [{ weight, value: at }] : [];
    });

  if (candidates.length === 0) return scenes;

  /*
   * Not every film leads with something else.
   *
   * A title card is the right opening often enough — roughly two films in five, which is
   * close to the share of the shape menu that opens on one. Promoting every time would
   * only replace one kind of sameness with another.
   */
  if (roll(`${options.seed}|lead`) < 0.42) return scenes;

  const at = pickWeighted(`${options.seed}|opening`, candidates);
  if (at === undefined) return scenes;

  // A pure permutation: the leader moves to the front and everything else keeps its
  // order behind it, so the title becomes the second beat rather than disappearing.
  return [scenes[at], ...scenes.filter((_, i) => i !== at)];
};
