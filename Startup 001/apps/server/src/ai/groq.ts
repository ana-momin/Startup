import {
  candidates,
  classify,
  ensureDiscovered,
  estimateTokens,
  recordFailure,
  recordSuccess,
  noteTruncation,
  recordUsage,
  reserveFor,
  soonestFreeIn,
  waitFromHeaders,
} from './health.ts';
import type { FailureKind } from './health.ts';

/**
 * Talking to Groq.
 *
 * A hand-written client rather than an SDK: it is one HTTP call with a JSON body, and
 * a dependency for that would be a licence to check and a package to keep updating for
 * no benefit.
 *
 * The key is read from the environment and never leaves this process. It is the reason
 * planning happens on the server at all — a key shipped to the browser is a key given
 * away, and anyone could then spend it.
 */

const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Model order, best first.
 *
 * Free tiers rate-limit and occasionally retire models, so a single hard-coded name is
 * a product that breaks without warning. Each is tried in turn.
 *
 * `qwen/qwen3.8-27b` was in this list and has been taken out. It is still served, so it
 * looked like a working fallback — but it answered every director request with a 429
 * "request too large", because our system prompt is longer than its context window. A
 * fallback that cannot succeed is worse than no fallback: it adds a round trip to every
 * failure before the rules planner takes over, so the user waits longer for the same
 * result. Worth re-checking against the live model list rather than guessing, which is
 * how this was found.
 */
/*
 * Two models, and the list has been tested rather than guessed at — twice now.
 *
 * `qwen/qwen3.8-27b` and `openai/gpt-oss-safeguard-20b` both look like free extra
 * capacity: they are served, they advertise a 131k context, and each has its own
 * per-minute allowance. Both were tried with a real director request and both refused it
 * outright — qwen with a 429 and safeguard with a 413, each saying "request too large".
 * The limit that bites is not the context window but the per-minute TOKEN allowance,
 * which is far smaller on those two than on the gpt-oss pair. Safeguard additionally
 * fails JSON mode, which makes sense once you notice it is a safety classifier rather
 * than a general model.
 *
 * A fallback that cannot succeed is worse than no fallback: it adds a round trip to
 * every failure before the rules planner takes over, so the user waits longer for the
 * same bad result. Adding safeguard here made the agent fall back MORE often, not less.
 * Check against a real request before adding a third.
 */

export type Message = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

/*
 * Budgets are generous because reasoning tokens count against them.
 *
 * The gpt-oss models think before they answer, and that thinking is billed to
 * `max_tokens` without ever appearing in the reply. A plan that only needs ~1200 tokens
 * of JSON was being cut off at a 1600 budget, and the truncated object came back as a
 * flat 400 "Failed to validate JSON" with an empty `failed_generation` — which reads
 * like a prompt problem and is actually a budget problem.
 *
 * It surfaced after the scene list grew: more kinds to weigh up meant more reasoning,
 * so the director silently fell back to the rules planner on almost every request and
 * the product quietly got much worse. Nothing errored, nothing looked broken, the
 * videos were just bad.
 *
 * Diagnosed by calling the API directly at two budgets: 1600 failed, 4000 succeeded
 * using 1204 completion tokens.
 */
export type CompleteOptions = {
  messages: Message[];
  /** Force the reply to be a JSON object. Used for anything we have to parse. */
  json?: boolean;
  /** 0 is repeatable, 1 is loose. Copywriting wants some room; parsing does not. */
  temperature?: number;
  maxTokens?: number;
  /**
   * How hard the model thinks before answering.
   *
   * This is the single biggest lever on cost, and cost here is not money — it is the
   * per-minute token allowance, which is what decides whether the real agent answers or
   * the offline rules do. Measured on one small request: low 55 completion tokens,
   * default 119, medium 161, high 372. The reasoning is billed in full and never
   * appears in the reply.
   *
   * 'low' for anything conversational, 'medium' where a real judgement is being made.
   */
  reasoningEffort?: 'low' | 'medium' | 'high';
  /**
   * Which job this is, so the layer can learn what this job costs.
   *
   * Reservations are per job rather than global because they differ by an order of
   * magnitude — a chat turn is a few hundred tokens and a plan is a couple of thousand.
   * One shared figure would be wrong for both.
   */
  job?: string;
};

export class AiUnavailable extends Error {
  constructor(message = 'The AI service is not available right now.') {
    super(message);
    this.name = 'AiUnavailable';
  }
}

export const aiConfigured = (): boolean => Boolean(process.env.GROQ_API_KEY);

/* ---------- one attempt ---------- */

type Attempt =
  | { ok: true; content: string }
  | {
      ok: false;
      error: string;
      retryable: boolean;
      fatal?: boolean;
      /** How long the service said to wait, in ms, when it told us. */
      waitMs?: number;
      /** What sort of failure this was, so the caller can react differently. */
      kind?: FailureKind;
    };

const attempt = async (
  model: string,
  key: string,
  options: Omit<CompleteOptions, 'json' | 'maxTokens' | 'job'> & {
    json: boolean;
    maxTokens: number;
    job: string;
    promptTokens: number;
  },
): Promise<Attempt> => {
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: options.messages,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        ...(options.reasoningEffort ? { reasoning_effort: options.reasoningEffort } : {}),
        ...(options.json ? { response_format: { type: 'json_object' } } : {}),
      }),
      /*
       * A hung request must not hold a page hostage.
       *
       * Twenty-five seconds was chosen as 'well inside a person's patience' and that was
       * wrong in a way measurement showed: a healthy plan comes back in four to five
       * seconds, so a model still silent at fourteen is not slow, it is gone — and the
       * loop below has two more models to try. Waiting the full twenty-five before
       * moving on is how a five second job became a minute of staring at a word.
       */
      signal: AbortSignal.timeout(14_000),
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 140);

      // A bad key fails identically on every model. Stop and say so plainly rather
      // than making four doomed requests.
      if (response.status === 401 || response.status === 403) {
        return {
          ok: false,
          error: 'The AI key was rejected. Check GROQ_API_KEY.',
          retryable: false,
          fatal: true,
        };
      }

      const kind = classify(response.status, detail);
      recordFailure(model, kind, options.promptTokens, detail, response.headers);

      return {
        ok: false,
        error: `${model}: ${response.status} ${detail}`,
        // Rate limits are per minute, so the same request usually succeeds shortly
        // after. Everything else will fail the same way however long we wait.
        retryable: response.status === 429 || response.status >= 500,
        kind,
        waitMs: response.status === 429 ? waitFromHeaders(response.headers) : undefined,
      };
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string }; finish_reason?: string }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    const choice = data.choices?.[0];
    const content = choice?.message?.content;

    /*
     * A truncated reply is not a short reply.
     *
     * `finish_reason` was never read, so hitting the token ceiling produced a plan with
     * two scenes instead of four and nothing anywhere said why — it just looked like the
     * model had been terse. On a reasoning model the ceiling covers the thinking as well
     * as the answer, so a longer prompt can push a previously fine request over it
     * without a single line of our code changing. Saying so out loud is the difference
     * between a five-minute fix and another round of guessing at the output.
     */
    if (choice?.finish_reason === 'length') {
      console.warn(
        `ai: ${model} hit the ${options.maxTokens} token ceiling ` +
          `(prompt ${data.usage?.prompt_tokens ?? '?'}, ` +
          `completion ${data.usage?.completion_tokens ?? '?'}). The reply is cut off.`,
      );
      // Being cut off is about the budget, not the model. Recorded as such so the
      // reservation grows next time instead of the model being blamed and benched.
      noteTruncation(options.job, options.maxTokens);
      return {
        ok: false,
        error: `: reply truncated at the token limit`,
        retryable: false,
        kind: 'truncated',
      };
    }

    if (typeof content === 'string' && content.trim().length > 0) {
      /*
       * Say how much of the minute's allowance is left.
       *
       * The allowance is the thing that quietly decides whether this product has a real
       * agent in it or a rules engine, and for weeks nothing printed it. One line per
       * call means the next time quality mysteriously drops, the cause is already in the
       * log instead of needing to be re-discovered.
       */
      const left = response.headers.get('x-ratelimit-remaining-tokens');
      const limit = response.headers.get('x-ratelimit-limit-tokens');
      if (left && limit) {
        const share = Number(left) / Number(limit);
        const note = `ai: ${model} ok — ${left}/${limit} tokens left this minute`;
        if (share < 0.25) console.warn(`${note} (running low)`);
        else console.log(note);
      }

      // Everything the layer learns from a good call: this model works, it accepted a
      // prompt this big, it has this much budget left, and this job costs this much.
      recordSuccess(model, data.usage?.prompt_tokens ?? options.promptTokens, response.headers);
      if (data.usage?.completion_tokens) {
        recordUsage(options.job, data.usage.completion_tokens);
      }
      return { ok: true, content };
    }

    return { ok: false, error: `${model}: empty reply`, retryable: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // A timeout or a dropped connection is worth one more go.
    return { ok: false, error: `${model}: ${message}`, retryable: true };
  }
};

/* ---------- the public call ---------- */

export const complete = async ({
  messages,
  json = false,
  temperature = 0.7,
  maxTokens = 2000,
  reasoningEffort,
  job = 'default',
}: CompleteOptions): Promise<string> => {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new AiUnavailable('No AI key is configured on the server.');

  /*
   * Find out what exists before deciding what to use.
   *
   * The model list used to be three strings in this file. Every time the provider
   * retired one or added a better one, somebody had to notice and edit — and twice
   * nobody did, so the product quietly fell back to the rules planner for weeks. Asking
   * is cheap, cached for half an hour, and means a new model is picked up on its own.
   */
  await ensureDiscovered(key, process.env.GROQ_MODEL);

  const promptTokens = estimateTokens(messages);

  /*
   * Reserve what this job actually costs, not what somebody guessed.
   *
   * The reservation is charged against the per-minute allowance whether it is used or
   * not, so a generous constant is the difference between the real agent answering and
   * the offline planner taking over. After three calls each job sizes itself from its
   * own worst observed reply, so it stays right through prompt changes nobody remembers
   * to re-tune for.
   */
  const reserve = reserveFor(job, maxTokens);
  const options = {
    messages,
    json,
    temperature,
    maxTokens: reserve,
    reasoningEffort,
    job,
    promptTokens,
  };

  let lastError = 'No model was able to answer.';

  /*
   * A ceiling on the whole attempt, not just on each try.
   *
   * Each request is capped at fourteen seconds, but the loop has three models and a
   * retry apiece, so the arithmetic allowed well over a minute of waiting — and that is
   * exactly what the person reported: "the loading page takes a lot of time". Capping a
   * single request does nothing about a queue of them.
   *
   * Thirty seconds, measured against a job that normally takes four. Past that the
   * offline planner gives them a real video now, which beats a better one later that
   * they have already given up on.
   */
  const deadline = Date.now() + 30_000;
  const outOfTime = () => Date.now() > deadline;

  const order = candidates(promptTokens, process.env.GROQ_MODEL);
  if (order.length === 0) throw new AiUnavailable('No usable model is available.');

  for (const model of order) {
    if (outOfTime()) break;
    let result = await attempt(model, key, options);
    if (result.ok) return result.content;
    if (result.fatal) throw new AiUnavailable(result.error);
    lastError = result.error;

    /*
     * A cut-off reply earns a bigger budget, once, on the same model.
     *
     * "Failed to generate JSON" is not a prompt problem — it is the model running out of
     * room mid-object. The smaller models reason more verbosely at the same effort, so a
     * reservation that suits the big one can strand them. The retry also teaches the
     * sizing layer, so the next call starts from the larger figure rather than failing
     * the same way again.
     */
    if (result.kind === 'truncated') {
      const roomier = Math.min(Math.round(reserve * 1.6), 6000);
      if (roomier > reserve) {
        console.warn(`ai: ${model} was cut off on ${reserve} tokens — retrying at ${roomier}.`);
        noteTruncation(job, reserve);
        result = await attempt(model, key, { ...options, maxTokens: roomier });
        if (result.ok) return result.content;
        lastError = result.error;
      }
    }

    // Busy or out of budget: the next model has its own allowance, so go straight there
    // rather than waiting while a perfectly good one sits idle.
    // Busy, out of size, or out of allowance for the day: the next model has its own
    // budget, so go straight there rather than waiting on this one.
    if (
      result.kind === 'busy' ||
      result.kind === 'too-large' ||
      result.kind === 'spent-for-today'
    ) {
      continue;
    }

    // A server-side blip is worth one quick retry on the same model.
    if (result.retryable) {
      await sleep(900);
      result = await attempt(model, key, options);
      if (result.ok) return result.content;
      if (result.fatal) throw new AiUnavailable(result.error);
      lastError = result.error;
    }
  }

  /*
   * Everything was busy. Now waiting is worth it.
   *
   * The allowance refills continuously, so this is seconds rather than minutes, and the
   * service told us how many. Waiting four seconds for the real agent beats handing back
   * a video the rules planner made — that trade is the whole reason this product felt
   * rule-based for so long.
   */
  const wait = Math.min(Math.max(soonestFreeIn(), 1500), 8000);
  const second = candidates(promptTokens, process.env.GROQ_MODEL);
  // Only worth waiting if the wait itself finishes inside the budget.
  if (second.length > 0 && !outOfTime() && Date.now() + wait < deadline) {
    console.warn(`ai: everything was busy — waiting ${wait}ms for one more go.`);
    await sleep(wait);
    for (const model of second) {
      if (outOfTime()) break;
      const result = await attempt(model, key, options);
      if (result.ok) return result.content;
      if (result.fatal) throw new AiUnavailable(result.error);
      lastError = result.error;
    }
  }

  throw new AiUnavailable(lastError);
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Parse a JSON reply.
 *
 * Even in JSON mode a model will occasionally wrap its answer in a code fence or add a
 * sentence before it. Pulling out the outermost braces is cheap insurance against an
 * otherwise perfectly good answer being thrown away.
 */
export const parseJson = <T>(raw: string): T => {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as T;
    }
    throw new AiUnavailable('The AI returned something that was not JSON.');
  }
};
