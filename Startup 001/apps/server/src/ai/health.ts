/**
 * The part of the AI layer that looks after itself.
 *
 * Everything this file does was, until now, a constant somebody had to maintain by hand:
 * which models exist, which of them actually work, how many tokens to reserve, and when
 * a model is too busy to ask. Every one of those hand-maintained numbers has already
 * broken the product at least once, silently, with "the videos got worse" as the only
 * symptom.
 *
 *   - A model name was hard-coded, the provider retired it, and the whole thing fell to
 *     the rules planner.
 *   - A model was added as a fallback without being tested; it could not do JSON at all,
 *     so it made the fallback MORE frequent.
 *   - A token reservation was hand-tuned for one prompt, the prompt grew, and a single
 *     plan started costing most of the minute's allowance.
 *
 * The common shape of all three: a human had to notice, diagnose and edit. That is the
 * thing being removed. This module discovers what is available, finds out by trying
 * which models can actually do the work, remembers what it learns, watches the budget it
 * has left, and sizes its own requests from what previous requests really used.
 *
 * It is deliberately conservative about what it learns. A model is only written off
 * after repeated failures of a kind that cannot be transient, and everything is
 * re-checked periodically, because "this was broken an hour ago" is not a reason to
 * ignore it forever.
 */

const MODELS_ENDPOINT = 'https://api.groq.com/openai/v1/models';

/** How long a discovered model list stays good before it is fetched again. */
const DISCOVERY_TTL = 30 * 60 * 1000;

/** How long a model written off for a hard failure stays benched. */
const BENCH_MS = 20 * 60 * 1000;

/**
 * What we have learned about one model, by using it.
 *
 * None of this is configured. It is all observed.
 */
type Health = {
  id: string;
  /** Context window the provider advertises. Only a tie-breaker. */
  context: number;

  /** Calls that returned a usable answer. */
  ok: number;
  /** Calls that failed in a way that says "this model cannot do this job". */
  hardFails: number;
  /** When a hard failure benched it, if it is benched. */
  benchedUntil?: number;
  /** The last hard failure, for the log and for a human reading it later. */
  lastError?: string;

  /** The largest request this model has actually accepted, in prompt tokens. */
  acceptedUpTo: number;
  /** The smallest request it has refused as too large. */
  refusedFrom?: number;

  /** Tokens left in the current minute, as the service last told us. */
  tokensLeft?: number;
  /** When that figure stops being meaningful. */
  tokensResetAt?: number;
};

const health = new Map<string, Health>();
let discoveredAt = 0;
let discovering: Promise<void> | null = null;

/* ---------- discovery ---------- */

/**
 * Ask the provider what it has, rather than being told at build time.
 *
 * A hard-coded list is a product that breaks on somebody else's release schedule. The
 * filter is deliberately loose — anything with a real context window is a candidate, and
 * whether it can do OUR job is decided by trying it, not by its name.
 *
 * Audio, transcription and guard models are excluded by context size: they advertise a
 * few hundred tokens, which is not enough for any prompt here and is a far more reliable
 * signal than pattern-matching on names that change.
 */
const discover = async (key: string): Promise<void> => {
  const res = await fetch(MODELS_ENDPOINT, { headers: { Authorization: `Bearer ${key}` } });
  if (!res.ok) return;

  const body = (await res.json()) as {
    data?: { id?: string; context_window?: number; active?: boolean }[];
  };

  let found = 0;
  for (const model of body.data ?? []) {
    if (!model.id || model.active === false) continue;
    // A usable model needs room for a real system prompt plus a real answer.
    if ((model.context_window ?? 0) < 16_000) continue;

    found++;
    const existing = health.get(model.id);
    if (existing) {
      existing.context = model.context_window ?? existing.context;
    } else {
      health.set(model.id, {
        id: model.id,
        context: model.context_window ?? 0,
        ok: 0,
        hardFails: 0,
        acceptedUpTo: 0,
      });
    }
  }

  // A model that disappears from the list is gone. Dropping it stops us spending a round
  // trip on something the provider has retired.
  const live = new Set((body.data ?? []).map((m) => m.id));
  for (const id of [...health.keys()]) {
    if (!live.has(id)) health.delete(id);
  }

  discoveredAt = Date.now();
  console.log(`ai: discovered ${found} usable models`);
};

/** Make sure we know what exists, fetching at most once even under concurrent calls. */
export const ensureDiscovered = async (key: string, preferred?: string): Promise<void> => {
  if (Date.now() - discoveredAt < DISCOVERY_TTL && health.size > 0) return;
  // One discovery at a time. Without this, five simultaneous requests on a cold start
  // all fetch the list, which is wasteful and races on the map.
  discovering ??= discover(key)
    .catch((e) => console.warn('ai: model discovery failed:', String(e)))
    .finally(() => {
      discovering = null;
    });
  await discovering;

  // An explicitly configured model is always a candidate, even if discovery missed it.
  if (preferred && !health.get(preferred)) {
    health.set(preferred, { id: preferred, context: 131_072, ok: 0, hardFails: 0, acceptedUpTo: 0 });
  }
};

/* ---------- choosing ---------- */

/**
 * The models worth trying for this request, best first.
 *
 * "Best" is learned rather than declared. A model that has done this job before outranks
 * one that never has; a model with budget left outranks one we know is spent; a model
 * that has refused a request this size is skipped entirely.
 *
 * The `preferred` id is only a nudge — if it is benched or out of budget it still loses,
 * because a configured favourite that cannot answer is worth nothing.
 */
export const candidates = (promptTokens: number, preferred?: string): string[] => {
  const now = Date.now();

  return [...health.values()]
    .filter((m) => {
      if (m.benchedUntil && m.benchedUntil > now) return false;
      // Known to refuse requests this size. Trying again just costs a round trip.
      if (m.refusedFrom !== undefined && promptTokens >= m.refusedFrom) return false;
      return true;
    })
    .sort((a, b) => {
      /*
       * Proven first. This used to be third, and that was the whole problem.
       *
       * Budget was compared before anything else, and a model nobody has called has no
       * budget reading — which was treated as INFINITE. So the one model that reliably
       * answers was sorted last, precisely because we knew how much of its allowance was
       * left, while three models that fail this job every time were ranked above it for
       * knowing nothing about them.
       *
       * Measured cost: a plan that takes five seconds took twenty, because the loop
       * worked through qwen (cut off, retried, failed), safeguard (refuses a prompt this
       * size), gpt-oss-20b (cut off, retried, failed) and only then reached the model
       * that was always going to answer.
       */
      const proven = (m: Health) => (m.ok > 0 ? 1 : 0);
      if (proven(b) !== proven(a)) return proven(b) - proven(a);

      if (preferred) {
        if (a.id === preferred) return -1;
        if (b.id === preferred) return 1;
      }

      /*
       * Then budget, but only between two models we actually have a reading for.
       *
       * Comparing a known number against an unknown one is what caused the above. An
       * unknown budget is not infinite; it is unknown, and the honest thing to do with
       * it is let the next comparison decide.
       */
      const known = (m: Health) => Boolean(m.tokensResetAt && m.tokensResetAt > now);
      if (known(a) && known(b)) {
        const byBudget = (b.tokensLeft ?? 0) - (a.tokensLeft ?? 0);
        if (Math.abs(byBudget) > 500) return byBudget;
      }

      // Finally the larger model, which is the better writer.
      return b.context - a.context;
    })
    .map((m) => m.id);
};

/* ---------- learning ---------- */

export const recordSuccess = (
  id: string,
  promptTokens: number,
  headers: Headers,
): void => {
  const m = health.get(id);
  if (!m) return;

  m.ok++;
  m.hardFails = 0;
  m.benchedUntil = undefined;
  m.acceptedUpTo = Math.max(m.acceptedUpTo, promptTokens);

  const left = Number(headers.get('x-ratelimit-remaining-tokens'));
  if (Number.isFinite(left)) {
    m.tokensLeft = left;
    // The allowance refills over a minute; treat the figure as good for that long.
    m.tokensResetAt = Date.now() + 60_000;
  }
};

/**
 * A failure, classified by whether it says anything about the model itself.
 *
 * This distinction is the whole point. A rate limit says nothing about a model's
 * ability — it will be fine in ten seconds. A 413, or a refusal to produce JSON, says
 * this model cannot do this job, and no amount of retrying changes that. Treating the
 * two the same is how a safety classifier ended up in the fallback chain making things
 * worse.
 */
export type FailureKind =
  | 'busy'
  /**
   * The DAILY allowance is gone, not the minute's.
   *
   * These look identical — both are a 429 with "rate limit reached" — and treating them
   * the same was badly wrong in both directions. The code waited eight seconds and gave
   * up, and the interface told people to "give it twenty seconds", when the real wait was
   * seven minutes or, once the day's 200,000 tokens were spent, until the allowance
   * rolled over. Twenty seconds later it failed again, which teaches somebody the tool is
   * simply broken.
   *
   * The only way to tell them apart is the body text: per-day limits say "tokens per day
   * (TPD)".
   */
  | 'spent-for-today'
  | 'too-large'
  | 'truncated'
  | 'cannot-json'
  | 'other';

export const classify = (status: number, detail: string): FailureKind => {
  if (/too large/i.test(detail)) return 'too-large';
  if (status === 413) return 'too-large';
  /*
   * "Failed to generate JSON" is OUR fault, not the model's.
   *
   * It means the reply ran out of room mid-object, which is a budget we set. Classing it
   * as an inability benched three working models inside one conversation and sent the
   * product straight back to the rules planner — a self-managing layer confidently
   * managing itself into a corner. It is a budget signal and nothing else.
   */
  if (/failed to (generate|validate) json/i.test(detail)) return 'truncated';
  if (status === 429) {
    // "tokens per day (TPD)" is the only thing that distinguishes a day-long outage from
    // a four-second one.
    return /TPD|per day/i.test(detail) ? 'spent-for-today' : 'busy';
  }
  return 'other';
};

export const recordFailure = (
  id: string,
  kind: FailureKind,
  promptTokens: number,
  detail: string,
  headers?: Headers,
): void => {
  const m = health.get(id);
  if (!m) return;

  m.lastError = detail.slice(0, 160);

  if (kind === 'spent-for-today') {
    /*
     * Bench it properly rather than retrying every request for the rest of the day.
     *
     * Without this every single message pays two doomed round trips before the offline
     * planner answers, which makes an already bad situation slower. The service says how
     * long; an hour is the cap because the daily window rolls rather than resetting at
     * midnight, so it is worth re-checking periodically.
     */
    const wait = headers ? waitFromHeaders(headers) : undefined;
    m.benchedUntil = Date.now() + Math.min(wait ?? 15 * 60_000, 60 * 60_000);
    m.tokensLeft = 0;
    console.warn(
      `ai: ${id} has spent its daily token allowance — benched for ` +
        `${Math.round((m.benchedUntil - Date.now()) / 60_000)} minutes.`,
    );
    return;
  }

  if (kind === 'busy') {
    // Not the model's fault. Remember it has nothing left so it is skipped until it does.
    m.tokensLeft = 0;
    const reset = headers ? waitFromHeaders(headers) : undefined;
    m.tokensResetAt = Date.now() + (reset ?? 20_000);
    return;
  }

  if (kind === 'too-large') {
    /*
     * Learn the ceiling instead of writing the model off.
     *
     * A model that cannot take a five-thousand-token director prompt may still be a fine
     * fallback for a short chat turn. Recording the size it refused keeps it available
     * for the smaller jobs rather than losing it entirely — which is more useful than
     * the hand-maintained "do not use" comment this replaces.
     */
    m.refusedFrom = Math.min(m.refusedFrom ?? Number.POSITIVE_INFINITY, promptTokens);
    console.warn(
      `ai: ${id} refuses requests from ~${m.refusedFrom} prompt tokens — ` +
        `keeping it for smaller jobs.`,
    );
    return;
  }

  if (kind === 'truncated') {
    // Our budget, not its ability. Nothing is held against the model.
    return;
  }

  // A real inability. Three strikes: benching a working model is far more expensive
  // than one wasted call, because the fallback is a visibly worse video.
  m.hardFails++;
  if (m.hardFails >= 3) {
    m.benchedUntil = Date.now() + BENCH_MS;
    console.warn(
      `ai: benching ${id} for ${BENCH_MS / 60_000} minutes after repeated ` +
        `${kind} failures — ${m.lastError}`,
    );
  }
};

/* ---------- sizing ---------- */

/**
 * What to reserve for a reply, learned from what replies actually cost.
 *
 * `max_tokens` is reserved against a per-minute allowance whether it is used or not, so
 * guessing high is not free — it is the difference between a real agent answering and the
 * offline planner taking over. Guessing low truncates the reply.
 *
 * Rather than a hand-tuned constant per call site (which goes stale the moment a prompt
 * changes), each job records what its replies really use and reserves the worst case seen
 * plus a margin. It starts from the caller's estimate and converges within a few calls.
 */
const usage = new Map<string, { worst: number; samples: number }>();

export const reserveFor = (job: string, fallback: number): number => {
  const seen = usage.get(job);
  if (!seen || seen.samples < 3) return fallback;
  // Half as much again as the worst reply we have seen, inside sane bounds.
  return Math.max(400, Math.min(Math.round(seen.worst * 1.5), 6000));
};

/**
 * What a real reply cost. Only ever called with tokens a model actually produced.
 *
 * It was briefly also called with the BUDGET on a truncation, which is a different
 * number entirely — the chat job learned its replies cost 2,400 tokens when they cost a
 * few hundred, reserved 3,600 for every message, and made the rate limiting it was
 * supposed to relieve dramatically worse. A measurement is only useful if it measures
 * the thing it claims to.
 */
export const recordUsage = (job: string, completionTokens: number): void => {
  const seen = usage.get(job) ?? { worst: 0, samples: 0 };
  seen.samples++;
  /*
   * The worst case decays.
   *
   * Without this, one unusually long reply pins the reservation high forever and the
   * budget never recovers. Easing it down means a prompt that gets shorter is noticed
   * within a few calls, while a genuine spike still raises it immediately.
   */
  seen.worst = Math.max(completionTokens, seen.worst * 0.92);
  usage.set(job, seen);
};

/* ---------- waiting ---------- */

/**
 * How long the service said to wait, from what it actually told us.
 *
 * The allowance refills continuously, so a 429 is almost never "come back tomorrow" — it
 * is "come back in four seconds", and the headers say how many.
 */
export const waitFromHeaders = (h: Headers): number | undefined => {
  const retryAfter = h.get('retry-after');
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.round(seconds * 1000);
  }

  // Groq writes these as "615ms", "7.5s", "1m2.5s".
  for (const key of ['x-ratelimit-reset-tokens', 'x-ratelimit-reset-requests']) {
    const value = h.get(key);
    if (!value) continue;
    const ms = /^([\d.]+)ms$/.exec(value);
    if (ms) return Math.round(Number(ms[1]));
    const parts = /^(?:([\d.]+)m)?(?:([\d.]+)s)?$/.exec(value);
    if (parts && (parts[1] || parts[2])) {
      return Math.round((Number(parts[1] ?? 0) * 60 + Number(parts[2] ?? 0)) * 1000);
    }
  }
  return undefined;
};

/** The shortest wait until any benched-for-budget model is worth trying again. */
export const soonestFreeIn = (): number => {
  const now = Date.now();
  const waits = [...health.values()]
    .filter((m) => !m.benchedUntil || m.benchedUntil <= now)
    .map((m) => (m.tokensResetAt ?? now) - now)
    .filter((ms) => ms > 0);
  return waits.length > 0 ? Math.min(...waits) : 0;
};

/* ---------- visibility ---------- */

/**
 * What the layer currently believes, for the health endpoint.
 *
 * Exposed because a system that manages itself still has to be inspectable. "It will
 * sort itself out" is only trustworthy if you can look at what it has worked out.
 */
export const snapshot = () => {
  const now = Date.now();
  return {
    discoveredAgo: discoveredAt ? Math.round((now - discoveredAt) / 1000) : null,
    models: [...health.values()].map((m) => ({
      id: m.id,
      context: m.context,
      ok: m.ok,
      hardFails: m.hardFails,
      benched: Boolean(m.benchedUntil && m.benchedUntil > now),
      refusesFrom: m.refusedFrom ?? null,
      acceptedUpTo: m.acceptedUpTo,
      tokensLeft: m.tokensResetAt && m.tokensResetAt > now ? (m.tokensLeft ?? null) : null,
      lastError: m.lastError ?? null,
    })),
    reservations: [...usage.entries()].map(([job, u]) => ({
      job,
      worstSeen: Math.round(u.worst),
      samples: u.samples,
      reserving: reserveFor(job, 0) || null,
    })),
  };
};

/** Rough token count. Four characters per token is close enough for budgeting. */
export const estimateTokens = (messages: { content: string }[]): number =>
  Math.ceil(messages.reduce((n, m) => n + m.content.length, 0) / 4) + 16;

/**
 * A reply needed more room than it was given.
 *
 * Kept separate from `recordUsage` because it is a floor, not a measurement: we know the
 * reply needed MORE than this budget, but not how much more. It nudges the reservation
 * up by a tenth rather than adopting the budget as the observed cost — which is the bug
 * that made the chat job reserve five times what it needed.
 */
export const noteTruncation = (job: string, budget: number): void => {
  const seen = usage.get(job) ?? { worst: 0, samples: 0 };
  seen.worst = Math.max(seen.worst, budget * 1.1);
  // Not counted as a sample: it is evidence about the ceiling, not about typical cost.
  usage.set(job, seen);
};
