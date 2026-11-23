import { parsePrompt } from './parse.ts';
import { planScenes } from './plan.ts';
import { fillsLength, fitToLength } from './fit.ts';
import { chooseEnding } from './ending.ts';
import { chooseOpening } from './opening.ts';
import type { FormatName, Motif, ScenePlan, VideoSpec, VideoStyle } from './types.ts';

/**
 * Prompt in, VideoSpec out.
 *
 * Two steps, deliberately kept apart:
 *
 *   parsePrompt  — *understanding*: what did they actually ask for?   (a language job)
 *   planScenes   — *directing*:     how should that become a film?    (a design job)
 *
 * When a real model arrives it replaces the first step only. The second step is where
 * our taste lives, and it should never be handed to a model — a language model has read
 * about motion design; it has not developed an opinion about it.
 */

const DEFAULT_FPS = 30;

export type LengthPreference = 'short' | 'standard' | 'long';

export type GenerateOptions = {
  /** Overrides whatever the prompt implied. Set by the picker in the prompt bar. */
  format?: FormatName;
  /** Overall pace. Scales every scene rather than cutting content. */
  length?: LengthPreference;
};

/*
 * The pace multiplier is gone.
 *
 * It said "length changes pace, not content", and that reasoning was wrong in a way
 * that took measuring to see: scaling every scene by 0.72 or 1.4 never aimed at a
 * duration, so "short, eight seconds" came out at twelve-point-eight and "long,
 * twenty-five" at eleven. Fitting to a target DOES sometimes drop a scene — and that is
 * the right call, because a fifteen-second film with four readable scenes beats one with
 * seven nobody can read.
 */

/**
 * A brand card, when the film is too thin to hold the length that was asked for.
 *
 * Measured: a brief like "Smile Lane, a family dental clinic now open on Saturdays"
 * plans three scenes, and three scenes cannot fill twenty-five seconds without each one
 * holding for eight — so "long" was coming back at seventeen-point-five and the fit was
 * right to refuse to stretch it.
 *
 * The answer is another scene, and the only one that can be added without inventing copy
 * is the name itself. A brand card is a different job from a title, so it does not read
 * as repetition the way a second headline would, and it is what a human editor reaches
 * for when a short film needs one more beat.
 *
 * Only ever added when it is NEEDED. A film that already fills its length does not get a
 * scene it did not ask for.
 */
const withBrandCard = (scenes: ScenePlan[], name: string | undefined, fps: number): ScenePlan[] => {
  if (!name || scenes.length < 2) return scenes;
  if (scenes.some((scene) => scene.kind === 'logo')) return scenes;

  // In front of the close, never after it: the outro is the last thing on screen.
  const at = scenes.length - 1;
  return [
    ...scenes.slice(0, at),
    { kind: 'logo', name, duration: Math.round(2.4 * fps) },
    ...scenes.slice(at),
  ];
};

export const generateSpec = (
  rawPrompt: string,
  options: GenerateOptions = {},
): VideoSpec => {
  const brief = parsePrompt(rawPrompt);
  const fps = DEFAULT_FPS;

  const format = options.format ?? brief.format;
  const length = options.length ?? 'standard';

  /*
   * The offline planner is held to the same duration as the real one.
   *
   * It was not, and that showed: when the model was unreachable a video asked to be
   * eight seconds came back at four-point-six. The person who gets the fallback is
   * already getting the weaker plan — they should at least get the length they chose.
   *
   * Two steps, because a film can be short for two different reasons. Scenes that are
   * simply too brief are a fitting problem. A film with too FEW scenes is a planning
   * problem, and stretching three cards across twenty-five seconds does not solve it, so
   * it gets one more beat first and is fitted after.
   */
  const planned = planScenes({ ...brief, format }, fps, 1);
  const fitted = fitToLength(
    fillsLength(planned, length, fps) ? planned : withBrandCard(planned, brief.product, fps),
    length,
    fps,
  );

  /*
   * The offline film gets the same opening and ending choices as the directed one.
   *
   * It did not, and the measurement said so loudly: on a run where only half the videos
   * reached the model, endings came back seven "outro" to one — not because the choosers
   * had stopped working, but because they were never asked. The rule-based planner has
   * one shape per intent and it always closes the same way, which is exactly the
   * complaint that started this work.
   *
   * These two need no judgement and no model — they reorder and re-close a film from its
   * own content and its own seed — so there is no reason the weaker path should go
   * without them. The fallback runs when the product is busiest, which is when sameness
   * is most visible.
   */
  const style: VideoStyle = fitted.some((scene) => scene.kind === 'product')
    ? 'product-led'
    : 'typographic';

  const scenes = chooseOpening(
    chooseEnding(fitted, { seed: brief.prompt, name: brief.product, style, tone: 'clean' }),
    { seed: brief.prompt, style, tone: 'clean' },
  );

  return {
    /*
     * The direction, read off the plan rather than guessed at.
     *
     * The fallback has no judgement to apply here, so it states the truth about what it
     * built instead of inventing an intent: a plan with an interface in it is a
     * product-led film, and one without is carried by type. Leaving it unset would mean
     * every video made while the director is rate-limited loses the colour and camera
     * discipline the directed ones have — and the fallback runs exactly when the product
     * is busiest, so that is when it would show.
     */
    style,

    /*
     * The fallback says why too, and says that it is the fallback.
     *
     * It would be easy to leave this empty — the rules have no judgement to report. But
     * the direction is shown to the person as a decision that was made about their film,
     * and an empty reason next to a stated style reads as the machine declining to
     * explain itself. Better to be plain: this is what was built and this is the honest
     * reason, which happens to be "the model was unreachable".
     */
    styleWhy: style === 'product-led'
      ? 'Built offline: the plan shows the product, so the interface carries it.'
      : 'Built offline: there is no interface to show, so type and colour carry it.',

    title: buildTitle(brief.product, brief.headline),
    prompt: brief.prompt,
    format,
    // The rule-based path always produces the calm default. Choosing a tone well takes
    // judgement about the subject, which is exactly what the AI director is for.
    tone: 'clean',
    /*
     * The fallback gets a background pattern too.
     *
     * It used to leave this unset, so every video made while the model was rate-limited
     * came out flatter than the ones made a minute earlier — and the fallback runs at
     * exactly the times the product is busiest. Picked from the prompt rather than at
     * random, so asking twice gives the same video, which is the whole promise of a
     * spec being a pure function of its input.
     */
    motif: motifFor(brief.prompt),
    fps,
    palette: brief.palette,
    scenes,
  };
};

/**
 * The short name shown in the sidebar and used for the downloaded file.
 *
 * The product name is the best possible title when we have one — it is what the person
 * will look for later. Failing that, the first few words of the headline, which is
 * already cleaned copy rather than raw prompt text.
 */
const buildTitle = (product: string | undefined, headline: string): string => {
  if (product) return product;

  const words = headline
    .replace(/[^\w\s-]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5);

  // Never end a title on a word that was pointing at the next one. "New feature update
  // for our" reads like the sentence was cut off, because it was.
  while (words.length > 1 && DANGLING.has(words[words.length - 1].toLowerCase())) {
    words.pop();
  }

  return words.length > 0 ? words.join(' ') : 'Untitled video';
};

/** Words that must never be the last word of a title. */
const DANGLING = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'for', 'of', 'to', 'in', 'on', 'at', 'by',
  'with', 'from', 'our', 'your', 'my', 'their', 'its', 'that', 'this', 'is', 'are',
  'was', 'while', 'when', 'as', 'into', 'about',
  // Pronouns dangle too: "Money that grows while you" is a sentence cut in half.
  'you', 'we', 'they', 'he', 'she', 'it', 'i', 'who', 'which', 'what', 'how',
  'than', 'then', 'so', 'if', 'because', 'after', 'before', 'over', 'under', 'through',
]);


/**
 * A background pattern chosen from what the prompt is about.
 *
 * A keyword match, and deliberately nothing cleverer: the AI director makes this
 * judgement properly, and the job here is only to be reasonable and repeatable when the
 * director is unavailable.
 */
const motifFor = (prompt: string): Motif => {
  const text = prompt.toLowerCase();
  if (/\b(data|api|engineer|developer|infra|technical|platform|security|code)\b/.test(text)) return 'grid';
  if (/\b(launch|announce|fast|speed|energy|sale|growth|scale)\b/.test(text)) return 'beams';
  if (/\b(calm|wellness|health|care|team|people|community|simple)\b/.test(text)) return 'dots';
  if (/\b(monitor|live|realtime|track|status|signal|network)\b/.test(text)) return 'scan';
  return 'rings';
};
