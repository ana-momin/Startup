import { generateSpec, paletteFor } from '@motion/planner';
import type { BrandContext, FormatName, VideoSpec } from '@motion/planner';
import { chat, describedSomething, flatten } from '../ai/chat.ts';
import type { LengthName } from '@motion/planner';
import type { ChatTurn } from '../ai/chat.ts';
import { directVideo } from '../ai/director.ts';
import { editVideo } from '../ai/editor.ts';
import { aiConfigured, AiUnavailable } from '../ai/groq.ts';
import { db } from '../db.ts';
import type { BrandRow } from '../db.ts';
import { badRequest, readJson, sendJson } from '../http.ts';
import type { Req, Res } from '../http.ts';
import { currentUser } from '../session.ts';

/**
 * One endpoint for the whole conversation.
 *
 * The page sends everything said so far; the server replies with what to say next and,
 * when there is enough to work with, the finished video in the same response. Keeping
 * the transcript on the page rather than in a server session means no state to expire,
 * no cleanup, and a reload never loses the thread.
 *
 * If the AI is unreachable, the rule-based planner still produces a video. A tool that
 * goes completely dead when an upstream service has a bad minute is not a tool.
 */

/** Where the browser reaches us. Written into specs so the renderer can load logos. */
const PUBLIC_URL = process.env.PUBLIC_URL ?? `http://localhost:${process.env.PORT ?? 4000}`;

type Body = {
  messages?: unknown;
  format?: unknown;
  length?: unknown;
  brandId?: unknown;
  /** Set once the person has seen the summary and said go. */
  confirmed?: unknown;
  /** The brief they approved, so we do not have to work it out twice. */
  brief?: unknown;
};

// The pace multiplier is gone: the director now fits the film to a target duration
// instead of scaling whatever the scenes happened to add up to.

export const converse = async (req: Req, res: Res): Promise<void> => {
  const body = await readJson<Body>(req);
  const turns = asTurns(body.messages);
  /*
   * The approved brief, which is the ONLY description this request carries.
   *
   * Confirming sends the agreed brief and an empty message list, because the
   * conversation that produced it already happened. The fallback was reading the
   * messages, so a video confirmed at the moment the allowance ran out was planned from
   * an empty string: "title, outro", eleven seconds, nothing in it from the brief. It
   * looked like a duration bug and it was a dropped input.
   */
  const approved = typeof body.brief === 'string' ? body.brief.trim() : '';

  // An approved brief is its own input — the conversation that produced it already
  // happened, so there is nothing to send back with it.
  if (turns.length === 0 && !approved) throw badRequest('Say something first.');

  const format = asFormat(body.format);
  const length = asLength(body.length);
  const { brand, logoUrl } = loadBrand(req, body.brandId);

  // No key configured: fall straight through to the rules so the product still works.
  if (!aiConfigured()) {
    sendJson(res, 200, {
      reply: 'Building that now.',
      ready: true,
      /*
       * The fallback remembers which brand this was for.
       *
       * Only the AI path was stamping the brand onto the spec, so a video made while
       * the allowance was spent came back unattached: it kept the brand's colours in
       * the moment and then lost them on reopen, vanished from that brand's filter, and
       * counted for nothing on the brand card. The person chose a brand; which planner
       * happened to run is not their concern.
       */
      spec: {
        ...fallbackSpec(approved || flatten(turns), format, length, brand, logoUrl),
        brandId: brand ? asId(body.brandId) : undefined,
      },
      usedAi: false,
    });
    return;
  }

  try {
    // A brief handed back from a confirmation skips straight to building: the
    // conversation already happened, and running it again would cost a second round
    // trip to say the same thing.
    const result = approved
? { ready: true, reply: 'Building it now.', brief: approved, summary: undefined, plan: undefined }
      : await chat(turns, brand?.name);

    if (!result.ready) {
      sendJson(res, 200, { reply: result.reply, ready: false, usedAi: true });
      return;
    }

    // Ready, but nobody has said go yet. Show what we are about to make and wait —
    // catching a misunderstanding before a render is far cheaper than after one.
    if (!approved && body.confirmed !== true) {
      sendJson(res, 200, {
        reply: result.reply,
        ready: true,
        awaitingConfirm: true,
        summary: result.summary,
        // The shot list, so the last cheap moment to catch a mistake is taken.
        plan: result.plan,
        brief: result.brief,
        // The logo and the site's light/dark mode travel with the name, so the
        // confirmation can show the real brand rather than a coloured dot.
        brand: brand
          ? { name: brand.name, color: brand.color, logoId: brand.logoId, mode: brand.mode }
          : undefined,
        usedAi: true,
      });
      return;
    }

    const spec = await directVideo(result.brief ?? flatten(turns), {
      format,
      length,
      brand,
      logoUrl,
    });

    sendJson(res, 200, {
      reply: result.reply,
      ready: true,
      spec: { ...spec, brandId: brand ? asId(body.brandId) : undefined },
      usedAi: true,
    });
  } catch (error) {
    if (!(error instanceof AiUnavailable)) throw error;

    console.warn('ai unavailable, using rules:', error.message);

    /*
     * Say which of the two things went wrong, because they need different reactions.
     *
     * "The AI service was unreachable" was wrong almost every time it appeared. The
     * service was reachable; we had simply spent the minute's token allowance, and the
     * right response to that is to wait twenty seconds and ask again — not to assume the
     * product is broken. Telling someone a transient budget limit is an outage teaches
     * them the tool is unreliable, which is a far more expensive mistake than the wait.
     */
    /*
     * Three different situations, three different things to say.
     *
     * They were collapsed into one "give it twenty seconds", which is right for a
     * per-minute limit and actively misleading for a daily one — twenty seconds later it
     * fails again, and the obvious conclusion is that the product is broken rather than
     * that a free quota ran out. Telling somebody the truth about a limit is not an
     * admission of failure; pretending a day-long outage is a blip is.
     */
    const spentForDay = /per day|\bTPD\b/i.test(error.message);
    const rateLimited = !spentForDay && /429|rate limit|too large/i.test(error.message);

    /*
     * The fallback must not build something nobody described.
     *
     * This path bypassed every check in the conversation layer, so when the allowance ran
     * out on somebody's very first "hi" the reply was "I built that with the offline
     * planner" — a finished video, for a greeting. The same guard the AI path has has to
     * exist here, because this branch runs exactly when things are already going wrong
     * and it is the worst possible moment to also look ridiculous.
     */
    /*
     * An approved brief is itself the description.
     *
     * The confirm step sends the agreed brief and no messages at all, because the
     * conversation that produced it already happened. Checking the empty message list
     * made the guard refuse to build something the person had explicitly just said yes
     * to — the guard firing on exactly the case it was never meant to catch.
     */
    if (!approved && !describedSomething(turns)) {
      sendJson(res, 200, {
        reply: spentForDay
          ? "I have used up today's free AI allowance, so I am running on the simple offline planner until it refreshes. Tell me what the video is for and I will still make you something."
          : rateLimited
            ? "I am at my usage limit for the minute — give it twenty seconds. In the meantime: tell me what the video is for and I will take it from there."
            : "I cannot reach my planner just now. Tell me what the video is for and I will try again.",
        ready: false,
        usedAi: false,
      });
      return;
    }

    sendJson(res, 200, {
      reply: spentForDay
        ? "Today's free AI allowance is used up, so I built that with the simple offline planner. It will be noticeably plainer than usual — worth remaking once the allowance refreshes."
        : rateLimited
          ? 'I hit my usage limit for the minute, so I built that with the offline planner. Give it twenty seconds and ask me again for a better one.'
          : 'Built that with the offline planner — the AI service did not answer.',
      ready: true,
      /*
       * The fallback remembers which brand this was for.
       *
       * Only the AI path was stamping the brand onto the spec, so a video made while
       * the allowance was spent came back unattached: it kept the brand's colours in
       * the moment and then lost them on reopen, vanished from that brand's filter, and
       * counted for nothing on the brand card. The person chose a brand; which planner
       * happened to run is not their concern.
       */
      spec: {
        ...fallbackSpec(approved || flatten(turns), format, length, brand, logoUrl),
        brandId: brand ? asId(body.brandId) : undefined,
      },
      usedAi: false,
    });
  }
};

/**
 * Change a video that already exists.
 *
 * The current plan goes to the model, not the original brief. That is the whole point:
 * somebody who has tweaked a headline and then asks for "a bit slower" must not lose
 * their tweak. Re-planning from the brief silently throws away every edit since.
 */
export const edit = async (req: Req, res: Res): Promise<void> => {
  const body = await readJson<{
    spec?: unknown;
    instruction?: unknown;
    brandId?: unknown;
    /** What has already been asked for on this video. */
    history?: unknown;
  }>(req);

  const instruction =
    typeof body.instruction === 'string' ? body.instruction.trim() : '';
  if (!instruction) throw badRequest('Describe the change you want.');

  if (!body.spec || typeof body.spec !== 'object') {
    throw badRequest('Send the video you want changed.');
  }

  const current = body.spec as VideoSpec;
  const { brand } = loadBrand(req, body.brandId ?? current.brandId);

  if (!aiConfigured()) {
    throw badRequest('Editing by conversation needs the AI service, which is not set up.');
  }

  try {
    const result = await editVideo(current, instruction, brand, asTurns(body.history));
    sendJson(res, 200, { reply: result.reply, spec: result.spec, usedAi: true });
  } catch (error) {
    if (!(error instanceof AiUnavailable)) throw error;
    sendJson(res, 200, {
      reply:
        'I could not reach the AI service just now — nothing was changed. Try again in a moment.',
      spec: current,
      usedAi: false,
    });
  }
};

/* ---------- brand ---------- */

/**
 * Load the brand this video belongs to, if any.
 *
 * Looked up against the signed-in user, so passing somebody else's brand id gets you
 * nothing rather than their colours and their description.
 */
const loadBrand = (
  req: Req,
  rawId: unknown,
): { brand?: BrandContext; logoUrl?: string } => {
  const id = asId(rawId);
  if (!id) return {};

  const user = currentUser(req);
  if (!user) return {};

  const row = db
    .prepare('SELECT * FROM brands WHERE id = ? AND user_id = ?')
    .get(id, user.id) as BrandRow | undefined;

  if (!row) return {};

  return {
    brand: {
      name: row.name,
      description: row.description ?? undefined,
      audience: row.audience ?? undefined,
      voice: row.voice ?? undefined,
      avoid: row.avoid ?? undefined,
      color: row.color ?? undefined,
      mode: row.mode === 'light' ? 'light' : 'dark',
      tone: (row.tone as BrandContext['tone']) ?? undefined,
      logoId: row.logo_id ?? undefined,
    },
    // Absolute, because the renderer loads this inside a headless browser pointed at
    // the studio's origin, not ours.
    logoUrl: row.logo_id ? `${PUBLIC_URL}/api/assets/${row.logo_id}` : undefined,
  };
};

/* ---------- fallback ---------- */

/**
 * The rule-based planner, used when the AI cannot be reached.
 *
 * Worse copy, but a real video — and it still honours the brand's colours, because
 * those are arithmetic rather than judgement.
 */
const fallbackSpec = (
  text: string,
  format: FormatName | undefined,
  length: LengthName,
  brand?: BrandContext,
  logoUrl?: string,
): VideoSpec => {
  const spec = generateSpec(text, {
    format,
    length,
  });

  if (!brand) return spec;

  return {
    ...spec,
    title: brand.name ?? spec.title,
    tone: brand.tone ?? spec.tone,
    palette: paletteFor(brand, spec.palette),
    brandName: brand.name,
    logoUrl,
    watermark: Boolean(logoUrl) && spec.scenes.length >= 3,
  };
};

/* ---------- validation ---------- */

const asTurns = (value: unknown): ChatTurn[] => {
  if (!Array.isArray(value)) return [];

  return value
    .slice(-20) // a runaway client should not be able to send us a novel
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const { role, content } = entry as Record<string, unknown>;
      if (role !== 'user' && role !== 'assistant') return null;
      if (typeof content !== 'string') return null;
      const text = content.trim().slice(0, 2000);
      return text.length > 0 ? ({ role, content: text } as ChatTurn) : null;
    })
    .filter((t): t is ChatTurn => t !== null);
};

const asFormat = (value: unknown): FormatName | undefined =>
  value === 'landscape' || value === 'vertical' || value === 'square' ? value : undefined;

const asLength = (value: unknown): LengthName =>
  value === 'short' || value === 'long' ? value : 'standard';

const asId = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 && value.length < 80 ? value : undefined;
