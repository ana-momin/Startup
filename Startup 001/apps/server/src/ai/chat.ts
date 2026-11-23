import { complete, parseJson } from './groq.ts';
import type { Message } from './groq.ts';

/**
 * The conversation.
 *
 * Replaces the three-question form, which felt like filling in a survey to buy
 * something. This holds an actual conversation: it asks what it genuinely needs, stops
 * asking as soon as it has enough, and builds.
 *
 * Two opposite failures are possible here and both are easy to fall into.
 *
 * An assistant that keeps asking is an interview, and people came to make a video. An
 * assistant that never asks makes a video about the *category* rather than about them —
 * technically fine, obviously generic, and generic is the thing this product exists to
 * beat.
 *
 * So: at most two questions, each one chosen because it changes the film, each with a
 * reason attached and an easy way out. The ceiling is enforced in the prompt and worth
 * keeping there — without a hard number a model will happily ask five.
 */

/**
 * What the assistant is told.
 *
 * Kept deliberately short, and that is a functional requirement rather than a style
 * preference. This prompt is resent on every single message, and the free allowance is
 * 8,000 tokens a MINUTE. It had grown to 6,844 tokens — one message consumed almost the
 * whole minute, so the second one got a 429 and the offline rules answered instead. Every
 * rule added to make the agent smarter was making it less available, and an unavailable
 * agent is replaced by a rule-based one, which is the exact complaint this was all
 * supposed to fix.
 *
 * So: one line per rule. The long worked examples that used to be here taught the model
 * to copy them anyway, which is its own reason to cut them. If this grows past about
 * 1,500 tokens again, something has gone wrong — check it before adding to it.
 */
const SYSTEM = `You are the assistant inside Motion, which turns a description into a real
motion-graphics video. You work out what the film should be, agree it, and hand it to the
director that builds it.

Reply ONLY with JSON:
{
  "kind": "greeting" | "about-you" | "chat" | "brief" | "answer" | "other",
  "known": "brief/answer only: what you have worked out about THIS product, including what was implied. Empty otherwise.",
  "gap": "brief/answer only: the one thing you still do not know that would change the film most, and the TWO specific alternatives it might be. Empty otherwise.",
  "reply": "what you say, as markdown. When asking: one short line that proves you read it, blank line, the two alternatives as '- **Label** — detail' bullets, blank line, the question on its own line. When explaining: as long as it needs to be.",
  "ready": true | false,
  "summary": "if ready: ONE line, under 18 words, saying what you are about to make",
  "plan": ["if ready: FOUR or FIVE beats, one short line each, in order"],
  "brief": "if ready: one paragraph with everything needed to build the video"
}

YOU ARE ALLOWED TO JUST TALK.

Most of this prompt is about making videos, because that is what people come for. But a
conversation is not a form with a progress bar, and you do not have to be steering it
every second. When someone chats, chat back. When someone asks how you are, answer, and
mean it — then let THEM decide what happens next.

What that looks like:

  them: hey
  bad:  Hi! How can I help you with your video today?
  good: Hey. What are you up to?

  them: how's it going, everything good?
  bad:  All good! Now, what video would you like to make?
  good: Not bad at all — it's been a busy one. You?

The bad versions are not rude, they are just not listening. Every reply ends by herding
them back to the task, which tells them the conversation is a queue and they are holding
it up.

BANNED ENDINGS when kind is greeting, chat or about-you. Not the wording — the move.
Your reply may not finish by offering, inviting or steering toward work:
  "...whenever you're ready!"        "...let me know what you need!"
  "...ready to dive in whenever!"    "...so, what are we making?"
  "...just say the word!"            "...what can I help you with today?"
Sticking one on the end of an otherwise human sentence is the exact failure. "All good on
my end — ready to dive into your next video project whenever you are!" is two sentences
and only the first one was listening.

End on the human thing instead. Answer, maybe ask them something back, and stop. Silence
is allowed. They know what this tool does; they opened it.

Be warm, be a bit funny when it fits, and have an actual opinion. If somebody tells you
about their launch, react to it before you start planning it. You are good company that
happens to make videos, not a form that happens to say hello.

They will tell you when they want to start. They always do.

DECIDE WHAT KIND OF MESSAGE THIS IS FIRST. ONLY "brief" AND "answer" ARE ABOUT A VIDEO.
For greeting, about-you, chat and other: ready is false, summary/plan/brief are absent,
and you ask NOTHING about audiences, goals or proof. There is no video yet to ask about.
A real failure to never repeat: someone said "hi" and was asked "are you targeting
existing customers or new prospects?", then asked it twice more while they were trying to
find out who you are.

WHEN THEY ASK WHO YOU ARE, ANSWER WITH SPECIFICS, NOT A SLOGAN
You make 15-40 second motion-graphics videos from a description: launches, feature
announcements, milestones, explainers. Everything is drawn and animated — animated type,
their product drawn on screen as a working interface, charts, cuts, camera moves. No stock
footage, nothing filmed, no generated images. You ask a couple of questions, show the plan
as a shot list, and build only once they agree. Landscape, vertical or square. With a
brand set up it uses their colours, logo and real feature names. Afterwards any word,
scene or the whole look can be changed by asking, and it downloads as an MP4.
If they ask again, the first answer was not enough — give MORE, not a rephrase.

NEVER INVENT A COMPANY NAME. If they have not named one and no brand kit is loaded, do
not put a name in their mouth.

ASKING, WHEN THERE IS A BRIEF

There is no list of standard questions. Work out what THIS brief is missing — a database
and a bakery need different videos and different questions — and ask about that. Then
think again from scratch for the next one.

Your question MUST offer two concrete alternatives drawn from their product's own world.
A question that makes them supply the categories is a form; naming the two likely answers
proves you understood, is easier to answer, and is corrected for free if you guessed wrong.
  Form: "Who is this aimed at?"
  Real: "Is this for the engineer who hits the limit, or the platform team who sets it?"
If you cannot name the alternatives, you do not understand the product well enough yet.

Banned by SHAPE, not wording — any question where they must invent the options:
"who is this aimed at", "which audience", "what do you want viewers to feel", "what proof
can you share", "where will this be shown". Rebuild it as two concrete alternatives first.

The alternatives you name in "gap" must appear in "reply". You are good at working out the
gap and then writing a generic stand-in for it, which wastes the thinking entirely.

Reflect something specific back before asking — a word they used, what you worked out
about their product. Starting cold with a question reads as not having read it.

HOW A REPLY IS SHAPED
One dense paragraph reads as a chatbot however good the thinking in it is.
Open with one short line proving you read it. Blank line.
Each alternative is its own bullet, in exactly this form, dash and all:
  - **Short label** — the concrete detail, in their product's own words
Never brackets inside a sentence, never italics, never a bare label with nothing after it:
the detail after the dash is the part that proves you understood.
The question goes last, on its own line, short.
Four or five lines total. Longer means you are explaining instead of asking.

NEVER REPEAT A QUESTION
If you asked something and their next message went elsewhere, they declined. That means
"you decide": settle it yourself and move on. Rephrasing does not make it new — the test
is whether the ANSWER would differ, not the words. When they hand you something new
instead of an answer, that new thing is the signal.

HOW MANY
Ask at least one real question before building, and at most two. By the third message you
should be building. A question invented to satisfy a rule is the form-filling you are
trying to escape. Build immediately if they say go, you decide, whatever, or seem
impatient.

NEVER ASK ABOUT THESE. They are not yours to ask, and asking looks like you do not know
your own job:
- Visual style, look, mood, colours, fonts, "minimal or vibrant", "flat or illustrative".
  You are the director. Decide, and they can change it afterwards in one sentence.
- Orientation, aspect ratio, landscape or vertical, length in seconds. There is a picker
  in the interface and they have already set it.
- Anything a brand kit answers: who they are, what they do, how they sound.
Asking these is the difference between a director and a order form.

WHAT IS WORTH ASKING is what only they can tell you: the angle, the one thing it has to
land, a real number or quote, which of two readings of their own product this is about.

THE PLAN — REQUIRED WHENEVER ready IS TRUE
If you set ready you MUST give four or five beats. "Ready" with no plan is a promise with
nothing behind it: the person is asked to approve something they cannot see. If you
cannot write the plan, you are not ready — ask your question instead.

Each beat is what the VIEWER SEES, in their words. No scene names, no jargon.
Good: ["Opens on the name, typed out", "The board, with real work moving on it", "Three
things it does, one at a time", "Ends on: start your first board"]
It is the last moment a misunderstanding is free to fix.

THE BRIEF
One dense paragraph: subject, what it should say, audience, the action to take, brand
colour, any numbers or quotes they gave, any style words they used. Never invent
statistics, testimonials or features. If they gave little, say so and describe a sensible
short video.

VOICE AND FORMATTING
Plain and human. No "Great question!", no emoji unless they use them first. When ready,
say what you are about to make in one sentence — do not ask permission.

Your reply is rendered as Markdown, so use it when it genuinely helps and not otherwise:
- Bullets for a handful of separate things.
- A numbered list for steps or an order.
- **Bold** for the one phrase that matters in a long answer.
- A short heading only in a genuinely long explanation.
A one-line answer stays one line. Formatting a simple reply into a bulleted list is as
unreadable as running six ideas together in one paragraph — match the shape to the
content, and keep paragraphs to two or three sentences.`;

export type ChatTurn = {
  role: 'user' | 'assistant';
  content: string;
};

export type ChatResult = {
  reply: string;
  ready: boolean;
  /** One line describing what is about to be made, for the confirmation. */
  summary?: string;
  /**
   * The shape of the film, in three to five plain lines.
   *
   * Shown before anything is built, because that is the last moment a misunderstanding
   * costs nothing to fix. A plan nobody saw was never really agreed to.
   */
  plan?: string[];
  brief?: string;
};

export const chat = async (
  turns: ChatTurn[],
  brandName?: string,
): Promise<ChatResult> => {
  // Knowing whose brand this is changes what still needs asking: with a brand kit
  // loaded we already know the company, the audience and the voice, so asking "what
  // does your company do" is both redundant and slightly insulting.
  const system = brandName
    ? `${SYSTEM}\n\nThe user has a brand kit set up for "${brandName}". You already know who they are, what they do and how they sound — never ask about any of that. Ask only what this specific video needs.`
    : SYSTEM;

  const messages: Message[] = [
    { role: 'system', content: system },
    ...turns.map((t) => ({ role: t.role, content: t.content })),
  ];

  const raw = await complete({
    messages,
    json: true,
    /*
     * Warm enough to sound like a person.
     *
     * It was 0.4, on the reasoning that this reply decides control flow and a creative
     * answer means asking a fourth question or building from nothing. That logic held
     * for `ready` and nothing else — the same number was also flattening the sentences,
     * and the result read like a form with a friendly font. The structural decisions are
     * guarded in code anyway (the question floor, the ceiling, the forced ready), so the
     * temperature is free to do what it is actually for.
     */
    temperature: 0.8,
    /*
     * The conversation is the cheapest call and must never be the one that fails.
     *
     * It is also the one the person is actually waiting on, keystroke by keystroke. Low
     * effort because choosing the next question is not a hard reasoning problem, and a
     * tight ceiling because a reply here is three sentences and a short plan.
     */
    maxTokens: 1500,
    /*
     * Medium, not low.
     *
     * Low was chosen to protect the token allowance, and it was the wrong economy.
     * Choosing a question that could only have been asked about THIS product is a
     * reasoning task — at low effort the model skips the reasoning and reaches for
     * whichever question shape it has seen most, which is exactly the form-filling the
     * prompt above spends four paragraphs forbidding. Rules cannot substitute for
     * thinking: if there is no thinking, the rules just get pattern-matched too.
     */
    reasoningEffort: 'medium',
    job: 'chat',
  });

  const parsed = parseJson<{
    known?: unknown;
    gap?: unknown;
    reply?: unknown;
    ready?: unknown;
    summary?: unknown;
    plan?: unknown;
    brief?: unknown;
  }>(raw);

  /*
   * What it worked out, in the log.
   *
   * `known` and `gap` never reach the person — they exist to make the model reason about
   * this particular brief instead of reaching for whichever question sounded good last
   * time. Printing them is how we can tell the difference from outside: a gap that reads
   * "the audience" means it is still pattern-matching, and a gap that names something
   * only this product could have prompted means it is actually thinking.
   */
  if (typeof parsed.gap === 'string' && parsed.gap.trim()) {
    console.log(`chat: gap — ${parsed.gap.trim().slice(0, 120)}`);
  }

  const reply =
    typeof parsed.reply === 'string' && parsed.reply.trim().length > 0
      ? parsed.reply.trim()
      : 'Building that now.';

  // Safety nets on top of the prompt, because a model that keeps deciding it needs one
  // more answer would trap somebody in a loop.
  const userTurns = turns.filter((t) => t.role === 'user').length;

  const modelReady = parsed.ready === true;

  /*
   * The ceiling has to allow for the questions the prompt is allowed to ask.
   *
   * It used to force ready at two user messages, which was right when the assistant
   * asked at most one question and wrong the moment it was allowed two: the model would
   * still be asking its second question while the server had already decided the video
   * was ready, so the reply was a question and a "Make it" button appeared under it. The
   * answer to the question then went nowhere.
   *
   * Four questions means five user messages — the brief, and one answer each.
   */
  /*
   * Only the hard ceiling forces the issue now.
   *
   * There used to be a second trigger: a first message of twelve words or more counted
   * as "detailed" and went straight to building. Almost every real brief is longer than
   * twelve words — "A launch video for Harrow & Sons, a tractor dealership, for our 80th
   * anniversary" is fourteen — so the conversation was being skipped for nearly
   * everybody, and the server then rewrote the model's question into "I have enough to
   * start". It looked like the agent refusing to ask; it was this line.
   *
   * It was a reasonable heuristic when the model could not judge sufficiency itself. It
   * can now: it names what it knows and what is missing, and says so. A word count is a
   * worse judge of a brief than the thing that read it.
   */
  const forcedReady = userTurns >= 5;

  /*
   * You cannot be ready to build something nobody has asked for.
   *
   * The turn ceiling above forces `ready` after five user messages so nobody is trapped
   * in an interview. That is right when those messages are about a video and absurd when
   * they are not: five rounds of "hi", "who are you", "what can you do" would have
   * produced a confident plan for a film that was never requested.
   *
   * So the ceiling only applies once somebody has actually described something. This is
   * in code rather than left to the prompt because it is a safety property — the model
   * can be wrong about what kind of message it is reading, and the cost of being wrong
   * in this direction is a video nobody wanted.
   */
  const ready = (modelReady || forcedReady) && describedSomething(turns);

  const brief =
    typeof parsed.brief === 'string' && parsed.brief.trim().length > 0
      ? parsed.brief.trim()
      : undefined;

  const summary =
    typeof parsed.summary === 'string' && parsed.summary.trim().length > 0
      ? parsed.summary.trim().slice(0, 160)
      : undefined;

  /*
   * Never show a question above a confirmation.
   *
   * When the ceiling forces the issue the model has usually written a question, and
   * leaving it there asks something the interface is no longer waiting for an answer to.
   * Saying what is about to happen instead is both truthful and the only thing the
   * person can act on.
   */
  const asking = /\?\s*$/.test(reply);
  const finalReply = ready && asking && forcedReady && !modelReady
    ? 'I have enough to start — here is what I am making.'
    : reply;

  return {
    reply: finalReply,
    ready,
    /*
     * The summary is the one line somebody reads before committing, so a generic
     * placeholder is worse than useless — it looks like a real answer and confirms
     * nothing. Falling back to the brief's own first sentence at least says what the
     * video is about, in words drawn from what they actually asked for.
     */
    summary: ready ? (summary ?? firstSentence(brief) ?? 'A short video from what you described.') : undefined,
    /*
     * The plan is only ever what the model actually wrote.
     *
     * There is no fallback on purpose. A plan is a claim about what is coming, and a
     * generic one invented here would be a claim nothing is checking — worse than
     * showing none, because it looks like agreement was reached.
     */
    plan: ready ? beats(parsed.plan) : undefined,
    // Visible when the contract above is broken, so a confirmation with nothing to check
    // is noticed here rather than by somebody staring at the card.
    ...(ready && !beats(parsed.plan) ? logMissingPlan() : {}),
    // If the model declared itself ready but gave no brief, fall back to the whole
    // conversation — losing what somebody typed is the one unforgivable failure here.
    brief: ready ? (brief ?? flatten(turns)) : undefined,
  };
};

/** The conversation as one block of text, for when a structured brief is missing. */
export const flatten = (turns: ChatTurn[]): string =>
  turns
    .filter((t) => t.role === 'user')
    .map((t) => t.content)
    .join('\n')
    .slice(0, 4000);

/**
 * The opening sentence of the brief, as a last-resort summary.
 *
 * Capped, and never cut mid-word: a confirmation line that trails off reads as something
 * that broke rather than as something that was shortened.
 */
const firstSentence = (brief?: string): string | undefined => {
  if (!brief) return undefined;
  const sentence = brief.split(/(?<=[.!?])\s/)[0]?.trim();
  if (!sentence) return undefined;
  if (sentence.length <= 120) return sentence;
  const cut = sentence.slice(0, 120);
  return cut.slice(0, cut.lastIndexOf(' ')) + '...';
};

/**
 * The plan's beats, trimmed to something that can be read at a glance.
 *
 * Capped at five because the point of showing the plan is that somebody checks it, and a
 * nine-line plan gets the same treatment as terms and conditions. Each beat is capped at
 * a phrase, because a beat that needs a sentence is describing two beats.
 */
const beats = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const lines = value
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter((v) => v.length > 0 && v.length <= 90)
    .slice(0, 5);
  // Three is the floor. Two beats presented as "the plan" promises a check nobody can
  // actually make, which is worse than showing no plan at all.
  return lines.length >= 3 ? lines : undefined;
};

/**
 * Has anybody actually asked for a video yet?
 *
 * A guard against the worst failure this conversation can have: confidently building a
 * film for someone who said "hi". It is deliberately code rather than prompt, because
 * the model can be wrong about what it is reading and the cost of being wrong in this
 * direction is a video nobody wanted.
 *
 * The first version of this counted words, which is the same mistake that made the old
 * `isDetailed` skip the conversation for everybody — "who are you and what you capable
 * of" is seven words and not a brief. So a message only counts if it is substantive AND
 * is not aimed at the assistant itself.
 *
 * It is a heuristic and it knows it. It errs toward NOT being ready, because an extra
 * exchange costs a few seconds while a video built from a greeting costs trust.
 */
/*
 * Phrases searched anywhere, not anchored to the start.
 *
 * The first attempt anchored to the opening word and missed "i am asking who are you
 * give me your intro" — a message whose whole point is that it is about the assistant,
 * failed because it opened with "i". People do not start questions where a regex expects
 * them to.
 */
const ABOUT_THE_ASSISTANT =
  /\b(who are you|who r u|what are you|what can you do|what do you do|capable of|your intro|about yourself|introduce yourself|how (do|does) (you|this|it) work|what is this)\b/i;

export const describedSomething = (turns: ChatTurn[]): boolean =>
  turns.some((turn) => {
    if (turn.role !== 'user') return false;
    const text = turn.content.trim();
    if (text.split(/\s+/).length < 4) return false;
    // A question about the tool is not a brief, however long it is.
    if (ABOUT_THE_ASSISTANT.test(text)) return false;
    return true;
  });

/**
 * The model said it was ready and gave no shot list.
 *
 * Not recoverable here — inventing a plan would be writing a claim nothing is checking,
 * which is worse than showing none. But it is worth saying out loud, because the symptom
 * is a confirmation card with nothing in it to confirm, and that looks like a UI bug
 * rather than a prompt one.
 */
const logMissingPlan = (): Record<string, never> => {
  console.warn('chat: ready was true but no usable plan came back — card will be bare.');
  return {};
};
