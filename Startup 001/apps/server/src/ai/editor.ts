import { brandBriefing } from '@motion/planner';
import type { BrandContext, ScenePlan, VideoSpec } from '@motion/planner';
import { complete, parseJson } from './groq.ts';
import { normaliseSpec } from './shape.ts';

/**
 * Changing a video that already exists.
 *
 * This is a different job from making one, and doing it with the same code was the
 * mistake. Re-planning from the original brief throws away every edit since — the
 * person tweaks a headline, asks for "a bit slower", and their tweak silently vanishes.
 *
 * So the model is handed the **actual current plan** and asked to return it modified.
 * Everything it does not touch comes back untouched, which is what "do exactly what I
 * said" actually requires.
 */

const SYSTEM = `You are editing an existing motion-graphics video for someone.

You receive the video's current plan as JSON and a change they asked for.
Return ONLY JSON:

{
  "reply": "what you changed, plainly. One or two changes: a sentence. Three or more: a short line then one markdown bullet each.",
  "spec": { ...the complete updated plan... }
}

EDITING RULES
- Return the WHOLE plan, not a patch. Copy across everything you did not change.
- Change only what they asked for. If they say "make the headline shorter", every other
  scene must come back byte-for-byte identical.
- Interpret intent generously but act precisely. "Punchier" means shorter copy and a
  bolder tone, not a different video.
- You MAY add, remove and reorder scenes when they ask for that.
- Keep the palette exactly as given unless they asked about colour.
- Never invent facts: no statistics, prices, dates, URLs or testimonials they did not give.

THE PLAN FORMAT
tone: "clean" | "bold" | "editorial" | "kinetic"
motif: "none" | "grid" | "dots" | "rings" | "beams" | "scan"
format: "landscape" | "vertical" | "square"
Scene types and their fields:
  {"kind":"title","badge":"1-2 words, optional","headline":"MAX 7 words","sub":"MAX 12 words, optional","layout":"center|left|stack"}
  {"kind":"bigword","words":["3-5 SHORT WORDS"]}
  {"kind":"features","heading":"MAX 4 words","items":["MAX 5 words each"],"layout":"center|left|grid"}
  {"kind":"steps","heading":"MAX 4 words","items":["MAX 5 words each"]}
  {"kind":"stat","prefix":"optional","value":1000,"suffix":"optional","label":"MAX 4 words"}
  {"kind":"quote","quote":"one sentence","author":"optional"}
  {"kind":"product","heading":"MAX 5 words","caption":"optional","device":"browser|phone","surface":"dashboard|list|chat|editor","labels":["3-5 nav names, 1-2 words each"]}
  {"kind":"chart","heading":"MAX 5 words","chart":"bars|line|donut","series":[{"label":"MAX 2 words","value":42}],"unit":"optional","caption":"optional"}
  {"kind":"flow","heading":"MAX 5 words","steps":["2-4 states, in order"],"caption":"optional"}
  {"kind":"constellation","heading":"MAX 5 words","items":["4-6 names"],"caption":"optional first name"}
  {"kind":"logo","name":"brand name","tagline":"optional"}
  {"kind":"outro","headline":"MAX 5 words","cta":"MAX 4 words"}

Every scene also has "duration" in frames at 30fps. Leave durations alone unless they
mention timing, length or pace.

HOW TO WRITE "reply"
Plain and short. "Made the headline shorter and switched to the bold look."
One or two changes: one sentence, no list — a bullet for a single edit is ceremony.
Three or more: one short line, then one "- " bullet each. Five edits in a paragraph is
unreadable, and they cannot tell which one they actually asked for.
Never restate the whole video back at them.`;

export type EditResult = {
  reply: string;
  spec: VideoSpec;
};

/** What has already been asked for on this video, oldest first. */
export type EditTurn = { role: 'user' | 'assistant'; content: string };

export const editVideo = async (
  spec: VideoSpec,
  instruction: string,
  brand?: BrandContext,
  history: EditTurn[] = [],
): Promise<EditResult> => {
  const briefing = brandBriefing(brand);
  const system = briefing ? `${SYSTEM}\n\n${briefing}` : SYSTEM;

  // Only the parts the model may change are sent. Ids, logo urls and the original
  // prompt are ours to manage, and including them invites the model to rewrite them.
  const editable = {
    title: spec.title,
    tone: spec.tone,
    motif: spec.motif ?? 'none',
    format: spec.format,
    palette: spec.palette,
    scenes: spec.scenes,
  };

  /**
   * What has already been asked for, so follow-ups make sense.
   *
   * Without it, "now even bolder" has no "bolder" to build on and the model treats it
   * as a first request. Only the exchanges are replayed, never the plans they produced
   * — the current plan is already in the message below, and sending five old copies of
   * it would cost a fortune in tokens to say nothing new.
   */
  const recent = history.slice(-6).map((turn) => ({
    role: turn.role,
    content:
      turn.role === 'user' ? `Earlier request: ${turn.content}` : turn.content,
  }));

  const raw = await complete({
    messages: [
      { role: 'system', content: system },
      ...recent,
      {
        role: 'user',
        content: [
          'Current plan:',
          JSON.stringify(editable),
          '',
          `Change requested: ${instruction}`,
        ].join('\n'),
      },
    ],
    json: true,
    // Lower than the director: this is a precise operation, and invention here shows up
    // as scenes the person never asked to have changed.
    temperature: 0.45,
    // Rewriting a plan is mechanical, not creative: copy the parts that did not change
    // and alter the ones that did. Measured well under this once effort came down.
    maxTokens: 2600,
    reasoningEffort: 'low',
    job: 'editor',
  });

  const parsed = parseJson<{ reply?: unknown; spec?: unknown }>(raw);

  const reply =
    typeof parsed.reply === 'string' && parsed.reply.trim().length > 0
      ? parsed.reply.trim()
      : 'Done.';

  const updated = keepWhatWasNotAskedAbout(
    normaliseSpec(parsed.spec, spec, brand),
    spec,
    instruction,
  );

  return { reply, spec: updated };
};

/**
 * Words that give the model permission to make a video shorter.
 *
 * Anything outside this list is a change of style, not of structure.
 */
const SHORTENING = /\b(remove|delete|drop|cut|shorter|shorten|fewer|less|trim|tighten|condense|concise|only|just)\b/i;

/**
 * Put back scenes the model quietly deleted.
 *
 * Asking for "make it bolder" came back with three scenes where there had been four.
 * The prompt already says to return the whole plan and copy across anything unchanged,
 * and the model mostly does — but "mostly" is not good enough when the failure is
 * somebody's work disappearing without being mentioned. They asked about the *look*; the
 * reply silently answered about the *content*, and the assistant's message said only
 * "Changed tone to bold", so there is nothing to tell them what happened.
 *
 * Losing a scene is far worse than keeping one too many: a scene they did not want is
 * one click to delete and they can see it, while a scene that vanished is invisible
 * until they notice it missing, by which point they may have already exported.
 */
const keepWhatWasNotAskedAbout = (
  updated: VideoSpec,
  original: VideoSpec,
  instruction: string,
): VideoSpec => {
  if (SHORTENING.test(instruction)) return updated;
  if (updated.scenes.length >= original.scenes.length) return updated;

  // Restore the tail the model dropped, keeping everything it did rewrite.
  const restored = [
    ...updated.scenes,
    ...original.scenes.slice(updated.scenes.length),
  ];
  console.warn(
    `edit: the model returned ${updated.scenes.length} scenes where there were ` +
      `${original.scenes.length}, and "${instruction}" did not ask for anything to be ` +
      `removed. Restored the missing ${restored.length - updated.scenes.length}.`,
  );

  return { ...updated, scenes: restored };
};

/** Scene kinds the editor is allowed to produce. Anything else is dropped. */
export const isSceneKind = (value: unknown): value is ScenePlan['kind'] =>
  value === 'title' ||
  value === 'bigword' ||
  value === 'features' ||
  value === 'steps' ||
  value === 'stat' ||
  value === 'quote' ||
  value === 'product' ||
  value === 'chart' ||
  value === 'flow' ||
  value === 'constellation' ||
  value === 'overlay' ||
  value === 'logo' ||
  value === 'outro';
