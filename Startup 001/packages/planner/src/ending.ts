import { pickWeighted } from './seed.ts';
import type { ScenePlan, Tone, VideoStyle } from './types.ts';

/**
 * How a film finishes.
 *
 * This has now been wrong twice, in opposite directions, and both times the cause was
 * the same: the prompt. First every one of eleven shape templates ended on an "outro",
 * so eight out of eight videos did. That was rewritten — and the new text called the
 * logo card "the most confident ending there is", so the model picked it six times out
 * of six. A model handed a superlative will choose the thing wearing it, every time.
 *
 * The lesson is not "write a better prompt". It is that *which of several equally good
 * options* is a bad thing to ask a model for, because it has no way to spread its
 * answers across requests it cannot see. Each call is alone. So the director decides
 * what the film ARGUES — a judgement only it can make — and this decides how that
 * argument lands, from the film's own direction and its own seed.
 *
 * Seeded, not random: a video that ended differently each time you opened it would be
 * worse than one that never changed at all.
 */

/**
 * Is this "outro" really a call to action?
 *
 * An outro with no button is a closing card wearing a button's clothes, and it is
 * common — the model reaches for the shape it knows and then has nothing to put in it.
 * Measured: of the outros that came back, not one carried a cta.
 */
const hasRealCta = (scene: ScenePlan): boolean =>
  scene.kind === 'outro' && Boolean(scene.cta && scene.cta.trim().length > 1);


/**
 * The same words, allowing for case and punctuation.
 *
 * "Audit Log Launch" and "audit log launch." are the same line on screen, and a reader
 * comparing them would not hesitate.
 */
const same = (a: string | undefined, b: string | undefined): boolean => {
  const tidy = (text?: string) => text?.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const left = tidy(a);
  return Boolean(left && left.length > 0 && left === tidy(b));
};

/** The closing line, wherever this particular ending happens to keep it. */
const closingLine = (scene: ScenePlan): string | undefined => {
  if (scene.kind === 'outro') return scene.headline?.trim() || undefined;
  if (scene.kind === 'logo') return scene.tagline?.trim() || undefined;
  if (scene.kind === 'bigword') return scene.words.join(' ').trim() || undefined;
  return undefined;
};

/**
 * A closing line broken into cards for kinetic type.
 *
 * Returns nothing for a long line rather than chopping it into five cards nobody can
 * read — "bigword" is one idea at a time, and a sentence fed through it word by word is
 * not kinetic typography, it is a teleprompter.
 */
const asCards = (line: string): string[] => {
  const words = line
    .replace(/[.!?]+$/, '')
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0 || words.length > 6) return [];
  if (words.length <= 3) return words;

  const size = Math.ceil(words.length / 3);
  const cards: string[] = [];
  for (let i = 0; i < words.length; i += size) cards.push(words.slice(i, i + size).join(' '));
  return cards;
};

/**
 * Give the film the ending it has earned.
 *
 * Only ever touches a close that is *about the ending itself* — an outro, a logo, a big
 * word. A film that finishes on a stat, a product shot or a flow finishes on content,
 * and that is evidence the director was thinking about this particular brief; rewriting
 * it would be throwing away the only kind of judgement we cannot reproduce here.
 *
 * Every candidate is built from copy that already exists in the film. Nothing invents a
 * tagline or a button label: an ending we wrote ourselves would be worse than a repeated
 * one, because at least a repeated one says something true.
 */
export const chooseEnding = (
  scenes: ScenePlan[],
  options: {
    seed: string;
    /** The brand or product name, for the brand card. */
    name?: string;
    style?: VideoStyle;
    tone?: Tone;
  },
): ScenePlan[] => {
  if (scenes.length < 2) return scenes;

  const last = scenes[scenes.length - 1];
  if (last.kind !== 'outro' && last.kind !== 'logo' && last.kind !== 'bigword') return scenes;

  const line = closingLine(last);
  const name = (options.name ?? (last.kind === 'logo' ? last.name : undefined))?.trim();

  /*
   * The candidates, and why each one is weighted the way it is.
   *
   * Weights rather than a flat pick, because these are not equally right. A product film
   * with a real button should usually keep it; a typographic film should usually land on
   * the word. The seed chooses within those leanings, so two different briefs diverge
   * while the same brief never does.
   */
  const candidates: Array<{ weight: number; scene: ScenePlan }> = [];

  // Keeping a real call to action. Only ever offered when the director wrote one — we
  // will not invent a button, because a button that goes nowhere is worse than no ending.
  if (hasRealCta(last)) {
    candidates.push({ weight: options.style === 'product-led' ? 5 : 3, scene: last });
  }

  /*
   * A brand card, but only when there is really a brand to put on it.
   *
   * Without a saved brand the only name available is the video's own title, and a film
   * whose title card reads "Audit Log Launch" was closing on a brand card reading "Audit
   * Log Launch" — the same three words, twice, eleven seconds apart. Shot and looked at,
   * it reads as the title card played again, which is precisely the sameness this module
   * exists to remove.
   *
   * The test is not repetition, though. "Smile Lane" after a film about Smile Lane is a
   * signature; a brand card is a different treatment from a title card and ending on the
   * name is what brand films do. What fails is a SENTENCE on a brand card. So the name
   * may repeat the title when it is short enough to be a name, and may not when it is
   * long enough to be a headline.
   */
  const alreadySaid = scenes
    .slice(0, -1)
    .some((scene) => scene.kind === 'title' && same(scene.headline, name));
  const looksLikeAName = (name?.split(/\s+/).filter(Boolean).length ?? 0) <= 2;

  if (name && (looksLikeAName || !alreadySaid)) {
    candidates.push({
      weight: options.style === 'product-led' ? 4 : 3,
      scene: {
        kind: 'logo',
        name,
        // The line somebody already wrote for the end of this film, which beats anything
        // invented here. Dropped when it is too long to sit under a mark.
        tagline: line && line.length <= 44 ? line : undefined,
        duration: last.duration,
      },
    });
  }

  const cards = line ? asCards(line) : [];
  if (cards.length > 0) {
    candidates.push({
      weight:
        3 +
        (options.style === 'typographic' ? 2 : 0) +
        (options.tone === 'kinetic' ? 2 : 0) +
        (options.tone === 'bold' ? 1 : 0),
      scene: { kind: 'bigword', words: cards, duration: last.duration },
    });
  }

  /*
   * Never land on the kind the film is already on.
   *
   * Measured: a film that went title > stat > product > bigword came back ending
   * bigword > bigword, because the chooser liked kinetic type and never looked at what
   * came before it. Two of the same card back to back reads as a stutter, not a close,
   * and the scene before the last one is the only context needed to avoid it.
   */
  const previous = scenes[scenes.length - 2].kind;
  const usable = candidates.filter((option) => option.scene.kind !== previous);
  const pool = usable.length > 0 ? usable : candidates;

  if (pool.length === 0) return scenes;

  /*
   * A weighted draw from the video's own seed.
   *
   * Labelled so this stream cannot drift if anything else ever draws from the same seed —
   * the point of a seed is that the same brief gives the same film forever.
   */
  const chosen = pickWeighted(
    `${options.seed}|ending`,
    pool.map((option) => ({ weight: option.weight, value: option.scene })),
  );

  if (!chosen || chosen === last) return scenes;
  return [...scenes.slice(0, -1), chosen];
};
