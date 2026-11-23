import { brandBriefing, paletteFor, referenceBriefing } from '@motion/planner';
import type {
  BrandContext,
  ChartKind,
  FormatName,
  ListLayout,
  Motif,
  Palette,
  ScenePlan,
  SurfaceKind,
  TitleLayout,
  Tone,
  VideoSpec,
  VideoStyle,
} from '@motion/planner';
import { complete, parseJson } from './groq.ts';
import { chooseEnding, chooseOpening, fitToLength } from '@motion/planner';
import type { LengthName } from '@motion/planner';
import { PALETTES } from './palettes.ts';
import { asFormat, asMotif, asTitle, asTone, items, words } from './shape.ts';

/**
 * The director: a conversation in, a finished video plan out.
 *
 * The model writes the *copy and the structure* — what the video says and in what
 * order. It does not decide timing, easing or type scale. Those stay in our code,
 * because a language model has read about motion design; it has not developed an
 * opinion about it, and handing it the timings is how every AI video tool ends up
 * feeling the same.
 */

const SYSTEM = `You are a senior motion-graphics director writing video plans.

Return ONLY a JSON object of this exact shape:

{
  "style": "product-led" | "typographic" | "camera-led",
  "why": "one line on why that direction suits this brief",
  "title": "2-4 words naming THIS VIDEO, not the company",
  "tone": "clean" | "bold" | "editorial" | "kinetic",
  "motif": "none" | "grid" | "dots" | "rings" | "beams" | "scan",
  "palette": "midnight" | "ember" | "forest" | "violet" | "mono" | "gold" | "ocean" | "rose",
  "format": "landscape" | "vertical" | "square",
  "scenes": [ ... ]
}

CHOOSE A DIRECTION FIRST

"style" is the single most important decision you make, because it decides what the film
is built from. Pick it from the reference styles below, against what the product actually
is — not against what sounds impressive. A developer tool filmed as a product tour with no
interface worth showing is a worse video than the same brief done typographically.

"why" is one line, for the person to read before the video is made. It is a sentence
somebody can disagree with, which is the point.

SCENE TYPES — pick the ones that fit, never all of them:

{"kind":"title","badge":"optional 1-2 words","headline":"MAX 7 words","sub":"optional, MAX 12 words","layout":"center|left|stack"}
{"kind":"bigword","words":["3","TO","5","SHORT","WORDS"]}
{"kind":"features","heading":"MAX 4 words","items":["MAX 5 words each, 2-4 items"],"layout":"center|left|grid"}
{"kind":"steps","heading":"MAX 4 words","items":["MAX 5 words each, 2-4 items"]}
{"kind":"stat","prefix":"optional $ or none","value":50000,"suffix":"optional % x k m +","label":"MAX 4 words"}
{"kind":"quote","quote":"one real sentence","author":"optional name, role"}
{"kind":"product","heading":"MAX 5 words","caption":"optional, MAX 10 words","device":"browser|phone","surface":"dashboard|list|chat|editor","labels":["3-5 nav or row names, 1-2 words each"]}
{"kind":"chart","heading":"MAX 5 words","chart":"bars|line|donut","series":[{"label":"MAX 2 words","value":42}],"unit":"optional % h k ms","caption":"optional, MAX 10 words"}
{"kind":"flow","heading":"MAX 5 words","steps":["2-4 states, 1-2 words each, in order"],"caption":"optional, MAX 10 words"}
{"kind":"constellation","heading":"MAX 5 words","items":["4-6 feature or surface names, 1-3 words each"],"caption":"optional: a first name, shown on a cursor"}
{"kind":"overlay","heading":"MAX 4 words, lower case reads best","items":["5-8 page, doc or feature names, 1-3 words each"]}
{"kind":"logo","name":"the brand name","tagline":"optional, MAX 6 words"}
{"kind":"outro","headline":"MAX 5 words","cta":"MAX 4 words"}

THE TITLE IS THE VIDEO'S NAME, NOT THE BRAND'S
It appears in a list next to their other videos, so it has to tell them apart.
Good: "Offline sync launch", "Fifty thousand users", "Black Friday teaser".
Bad: the company name on its own — every video would be called the same thing.

THE DIRECTION DECIDES WHAT THE SCENES ARE MADE OF.
This is the rule that matters most, and it follows from the style you just chose.

- "product-led" and "camera-led" are films ABOUT an interface. If the subject is software
  — an app, a tool, a platform, a dashboard — the plan MUST contain at least one "product"
  scene. Describing software you refuse to show is a failed plan however good the words
  are; people want to see the thing.
- "typographic" is a film with NO product footage in it at all. Do not put a "product"
  scene in a typographic plan. Carry the argument with "flow", "constellation",
  "bigword", "stat" and type. This is the right call for infrastructure, APIs and
  developer tools, where there is no screen worth filming — and choosing it is not an
  excuse to skip the work, it is a different kind of work.

BUILD THE VIDEO FROM ONE OF THESE SHAPES. Pick the one that fits your direction:

  product-led / camera-led
    Software launch    title -> overlay -> product -> outro
    Software + data    title -> product -> chart -> logo
    Deep on features   overlay -> product -> product -> outro   (two different surfaces)
    Milestone          stat -> product -> bigword
    Testimonial        quote -> product -> logo
    Explainer          title -> steps -> product -> outro
    Loud social        bigword -> product -> stat
    Cold open          product -> title -> overlay -> outro

  typographic
    Technical launch   title -> flow -> stat -> logo
    Breadth            title -> constellation -> bigword
    One hard number    bigword -> stat -> flow -> outro
    How it works       steps -> flow -> title -> logo
    Not software       title -> features -> stat -> bigword
    Quiet close        flow -> bigword -> logo

TONE IS NOT DECORATION. IT CHANGES THE WHOLE FILM.
Measured over eight videos, you picked "clean" five times and "bold" three — "editorial"
and "kinetic" never once. Two of the four were dead. Tone decides type scale, weight,
alignment, how much air there is and how hard the motion snaps, so defaulting to clean
is choosing to make every film look the same.

  clean      Calm, centred, generous space. The default — which means it needs a REASON,
             not just an absence of one.
  bold       Heavy type, tight tracking, hard snaps. Urgency, sales, a launch that wants
             to feel like an event.
  editorial  Left-aligned, slower, more text, magazine-like. Anything considered: a
             milestone, an anniversary, a story about people, a product that competes on
             taste rather than speed. If the film has a sentence worth reading, this.
  kinetic    Big words, quick cuts, scale-driven. Social, short, loud, young. The right
             answer far more often than never.

Choose it from the subject. A tractor dealership's eightieth anniversary is editorial. A
fitness app launch is kinetic. A compliance feature is clean. A Black Friday teaser is
bold.

HOW IT ENDS IS A REAL CHOICE.
Four endings. None of them is the safe one, and none of them is the best one — each is
correct for a different film, and the test is what YOUR film has been arguing for the
last fifteen seconds:

  "outro"   — a line and a button. Correct when the film has asked for one specific
              action and the viewer now knows what it is. Needs a real "cta".
  "logo"    — the name and a tagline. Correct when the NAME is the message: a brand
              film, an anniversary, a rebrand.
  "bigword" — the claim, alone, no call to action. Correct when the idea is the point
              and a button would cheapen it.
  "stat"    — the number. Correct when the number IS the argument, which is stronger
              than stating it halfway through and then asking for a signup.

Decide from the film, then commit. If you find yourself choosing the same ending for a
dental clinic and a message queue, you have stopped reading the brief. A milestone video
that ends on a Sign Up button has thrown away its own ending — and a product launch with
a free trial that ends on a logo card has thrown away the click.

Two videos about different things should not come back with the same shape OR the same
ending.

HOW IT OPENS IS A CHOICE TOO, AND YOU ARE NOT MAKING IT.
Measured: six videos out of eight opened on a "title" card, though only six of the
fourteen shapes above do. A title card is the right open when the NAME is the news. It is
the wrong open when something else is, and usually something else is:

  "stat"    — the number first, the explanation after. A milestone, a record, a result.
  "overlay" — land inside the product before anyone says its name. A cold open.
  "quote"   — somebody else's words first. Trust, testimony, a film about people.
  "flow"    — the system first. Infrastructure, pipelines, anything with moving parts.
  "bigword" — the claim first. Loud, short, social.

The first second decides whether the rest is watched. If your first scene is a title
card, you should be able to say why that beats all five of these for THIS brief.

Pick the surface from what the product actually does:
- "dashboard" — analytics, reporting, anything with numbers. The safe default.
- "list" — inboxes, tasks, tables, queues, anything with rows.
- "chat" — support, assistants, messaging, anything conversational.
- "editor" — writing, documents, notes, code.

"labels" are the words in their sidebar or rows. Use their real feature names when the
brief gives them — "Invoices", "Runs", "Inbox" — because that is what makes it look like
their product and not a generic one. Never write sentences here.

TWO SCENES THAT CARRY A CLAIM A LIST CANNOT

"flow" is states with arrows between them: Draft -> Review -> Shipped. Use it whenever the
product does something in an ORDER. A list says "here are some things that exist"; a flow
says "this becomes that", which is almost always the actual claim. Two to four states,
one or two words each — it has to be read left to right in one glance.

"constellation" scatters fragments of the product in space: six surface or feature names,
shown as floating cards. Use it for breadth — "there is a lot of this" — where a feature
list would be flat. The items are NAMES of things (Roadmap, Standups, Release notes), not
sentences.

"overlay" puts the WORDS ON TOP OF THE MOVING PRODUCT: a short line sits in the middle of
the frame while cards of their real pages and features drift behind it, overlapping and
running off both edges. This is the strongest scene we have and the closest to how the
best product films actually look, because the claim and the evidence share one picture
instead of taking turns. Use it for a sweeping statement about the whole product —
"your docs", "all connected.", "every project" — never for a detail.

A product-led film should contain at least one "overlay". It is the shot people remember.

Prefer all of these over "features" when the content genuinely fits them. A video of three
bulleted lists is the thing we are trying not to make.

CHARTS ARE FOR NUMBERS YOU WERE GIVEN
"chart" only when the brief contains real figures. Never invent a series to fill it, and
never round one up to look better. "bars" compares a few things, "line" shows a change
over time, "donut" shows a single share of a whole — for a donut, give exactly one point.

"bigword" is a special effect, not a default opening. Use it in roughly one video in
four, and never in a video that is calm, considered or informative. A quiet product
explainer that opens with three words slamming onto the screen is wrong.

LAYOUT AND MOTIF
"layout" changes where things sit — use it to keep consecutive scenes from matching.
"motif" is a faint background pattern for the whole video. Choose one that fits:
grid and scan read technical, dots and rings read soft, beams read energetic,
none reads premium and quiet. Do not pick "none" every time.

HARD RULES
- Write REAL marketing copy. Never placeholders, never descriptions of copy.
- Never repeat the same words in two scenes.
- Word limits are limits, not targets. Short is better.
- NEVER INVENT FACTS: no statistics, testimonials, prices, discount codes, dates, URLs
  or features the user did not mention. If you lack a fact, write about the benefit.
  "Big savings" is fine; "50% off" and "Enter code BF2024" are lies.
- Only use "stat" for a number they actually gave you. Only use "quote" for a quote
  they actually gave you. Only use "chart" for figures they actually gave you.
- "product" is the exception to needing facts: it shows the SHAPE of their software, not
  claims about it. Use their feature names if given, generic ones if not.
- End with "outro" or "logo".`;

type RawPlan = {
  /** The direction the director chose, and its one-line reason. */
  style?: unknown;
  why?: unknown;
  title?: unknown;
  tone?: unknown;
  motif?: unknown;
  palette?: unknown;
  format?: unknown;
  scenes?: unknown;
};

export type DirectOptions = {
  /** Overrides whatever the model chose, when the user picked one explicitly. */
  format?: FormatName;
  /**
   * How long the film should be, as the person asked for it.
   *
   * This replaces a pace multiplier. A multiplier scaled whatever the scenes happened to
   * add up to, which meant the duration the picker promised was never aimed at — "short,
   * eight seconds" measured twelve-point-eight, and "long, twenty-five" measured eleven.
   * A target is something the output can be held to; a multiplier is not.
   */
  length?: LengthName;
  /** The brand this video belongs to. Drives the palette and the writing. */
  brand?: BrandContext;
  /** Absolute URL of the brand logo, ready for the renderer to load. */
  logoUrl?: string;
};

export const directVideo = async (
  conversation: string,
  options: DirectOptions = {},
): Promise<VideoSpec> => {
  // The brand briefing goes in the system message, not the user message. Instructions
  // about voice and what never to say belong with the other rules — buried in the
  // request they get treated as background rather than as constraints.
  const briefing = brandBriefing(options.brand);

  /*
   * The reference styles ride along with every plan request.
   *
   * Built from data rather than written into the prompt string, so adding a fourth
   * reference is one entry in one array — no prompt editing, and no way for the prompt
   * and the documented standard to drift apart from each other.
   */
  const references = referenceBriefing();

  /*
   * How long the film is, and therefore how many scenes it can hold.
   *
   * The fit afterwards guarantees the duration whatever comes back, but a plan with
   * seven scenes for an eight-second film is still the wrong plan — the fit has to throw
   * three of them away, and the three it keeps were written as part of a longer argument.
   * Telling the director the shape up front means it writes the film that fits.
   */
  const length = options.length ?? 'standard';
  const budget = SHAPE_FOR[length];

  const system = briefing
    ? `${SYSTEM}\n\n${budget}\n\n${references}\n\n${briefing}`
    : `${SYSTEM}\n\n${budget}\n\n${references}`;

  const raw = await complete({
    messages: [
      { role: 'system', content: system },
      /*
       * The two hardest constraints go last, in the user message.
       *
       * They were in the system prompt and were being ignored: asked for a
       * twenty-five second film the director kept returning three scenes, which the fit
       * then had to stretch to eight seconds each — twice the pace of any reference
       * film, and the single most boring thing a video can do. The scene count and the
       * ending are the two decisions it reliably defaults on, and an instruction at the
       * end of the prompt is followed far more often than the same instruction buried in
       * the middle of a long system message.
       */
      { role: 'user', content: conversation },
      { role: 'user', content: DEMANDS[length] },
    ],
    json: true,
    // High: this is the creative step, and repetition across videos is the failure we
    // are trying to avoid.
    temperature: 0.9,
    /*
     * Sized from what it actually uses, because the reservation is the real cost.
     *
     * Groq's free allowance is 8,000 tokens a MINUTE, and `max_tokens` is reserved
     * against it whether or not the model uses them. This prompt measures 2,862 tokens,
     * so a 4,500 reservation put a single plan at 7,292 of the minute's 8,000 — one call
     * and the allowance was gone. Everything after it got a 429, and a 429 meant the
     * offline rules planner. That is why the agent felt rule-based: most of the time it
     * genuinely was.
     *
     * Measured at medium effort: 1,678 completion tokens. 2,200 is a comfortable ceiling
     * with a third to spare, and takes a plan from 7,292 to 5,062.
     */
    /*
     * Enough room for the plan on the FIRST call.
     *
     * 2,200 was below what this job actually produces, so the opening reply was cut off
     * every time and the request was repeated at 3,520 — on every model in the list, on
     * every cold start. Two wasted round trips before a word of the plan existed, which
     * is most of the twenty seconds the founder was staring at.
     *
     * The reservation still learns from real replies after three samples; this is only
     * the number it starts from, and starting it near the truth costs nothing because an
     * unused reservation is returned.
     */
    maxTokens: 3600,
    /*
     * Medium, not high.
     *
     * This is the one genuinely creative judgement in the pipeline, so it is not dropped
     * to low — but high triples the reasoning for no better plan. Measured: low produced
     * title>product>overlay>features>outro, medium produced the same shape. The thinking
     * is billed in full and never shown.
     */
    reasoningEffort: 'medium',
    job: 'director',
  });

  const plan = parseJson<RawPlan>(raw);
  return toSpec(plan, conversation, options);
};

/* ---------- turning a model's answer into something safe to render ---------- */

const toSpec = (plan: RawPlan, prompt: string, options: DirectOptions): VideoSpec => {
  // A brand's own tone beats the model's guess: they told us how they want to look, and
  // a model picking "kinetic" for a law firm every third video is not a feature.
  const tone = options.brand?.tone ?? asTone(plan.tone) ?? 'clean';
  const format = options.format ?? asFormat(plan.format) ?? 'landscape';

  // Brand colours win over anything the model chose, and go through the contrast
  // checker on the way so a difficult brand colour still produces a readable video.
  const fallbackPalette = asPaletteName(plan.palette);
  const palette = options.brand?.color
    ? paletteFor(options.brand, fallbackPalette)
    : options.brand?.mode
      ? paletteFor(options.brand, fallbackPalette)
      : fallbackPalette;

  /*
   * Build at natural lengths, then fit the film to what was asked for.
   *
   * Two steps on purpose. The scene builders know what each kind of shot wants to be —
   * a product scene is longer than a title because something happens inside it — and
   * that relative shape is worth keeping. The fit then holds the total to the target
   * while preserving those proportions, and drops scenes rather than squeezing them when
   * the content genuinely will not compress.
   */
  const built = buildScenes(plan.scenes, tone, format, 1, prompt);
  /*
   * Fit the length, then decide how it finishes.
   *
   * The ending is chosen after the fit rather than before, because the fit can drop
   * scenes — and deciding how a film closes before knowing which scenes survive means
   * deciding about a film that does not exist yet.
   */
  const fitted = fitToLength(built, options.length ?? 'standard');
  /*
   * What the director proposed, before we decide anything.
   *
   * Env-gated because it answers a question that keeps coming back: when every film
   * ends the same way, is that the model reaching for one shape or our own code
   * rewriting them all to one? Guessing at that cost a whole round once.
   */
  if (process.env.ENDING_DEBUG) {
    const proposed = fitted[fitted.length - 1];
    const cta = proposed.kind === 'outro' ? proposed.cta : undefined;
    console.log(`[ending] proposed=${proposed.kind} cta=${cta ? JSON.stringify(cta) : 'none'}`);
  }

  const closed = chooseEnding(fitted, {
    // The brief, so the same request always ends the same way and different ones vary.
    seed: `${options.brand?.name ?? ''}|${prompt}`,
    name: options.brand?.name ?? (typeof plan.title === 'string' ? plan.title.trim() : undefined),
    // The direction leans the choice: a product film with a button should usually keep
    // it, a typographic one should usually land on the word.
    style: asStyle(plan.style),
    tone,
  });

  /*
   * The opening is decided last, after the ending.
   *
   * Order matters: the opening promotes a scene out of the middle, and the ending may
   * have just replaced the final card. Choosing the lead first would mean choosing it
   * from a film that no longer exists, and could promote a scene the ending then
   * overwrote.
   */
  const scenes = chooseOpening(closed, {
    seed: `${options.brand?.name ?? ''}|${prompt}`,
    style: asStyle(plan.style),
    tone,
  });

  return {
    // The video's own name, never the brand's — a list where every row says "Pine" is
    // a list nobody can use.
    /*
     * The direction the film was made in, kept on the spec.
     *
     * Not decoration: the renderer reads it to decide how much the camera moves and how
     * heavily colour is used, and the editor shows it so the choice is visible and can be
     * argued with. A decision nobody can see is a decision nobody can correct.
     */
    style: asStyle(plan.style),
    styleWhy: typeof plan.why === 'string' ? plan.why.trim().slice(0, 160) : undefined,
    title: asTitle(plan.title) ?? 'Untitled video',
    prompt,
    format,
    tone,
    motif: asMotif(plan.motif) ?? 'none',
    fps: 30,
    palette,
    scenes,
    brandName: options.brand?.name,
    logoUrl: options.logoUrl,
    // Only worth doing when there is a logo AND more than a couple of scenes; on a
    // five-second video a corner mark is clutter rather than branding.
    watermark: Boolean(options.logoUrl) && scenes.length >= 3,
  };
};

const asPaletteName = (value: unknown): Palette => {
  const name = typeof value === 'string' ? value.toLowerCase() : '';
  return PALETTES[name as keyof typeof PALETTES] ?? PALETTES.midnight;
};

/* ---------- scenes ---------- */

const buildScenes = (
  value: unknown,
  tone: Tone,
  format: FormatName,
  pace: number,
  source: string,
): ScenePlan[] => {
  const list = Array.isArray(value) ? value : [];
  const scenes: ScenePlan[] = [];

  for (const entry of list.slice(0, 8)) {
    const scene = buildScene(entry, tone, format, pace, scenes.length);
    if (!scene) continue;

    // A number the user never mentioned is an invented statistic. Wording rules in the
    // prompt reduce this; only a check against the source text stops it.
    if (scene.kind === 'stat' && !mentions(source, scene.value)) continue;

    scenes.push(scene);
  }

  if (scenes.length === 0) {
    return [
      {
        kind: 'title',
        headline: 'Something went wrong',
        sub: 'Try describing the video again.',
        duration: 90,
      },
    ];
  }

  // Every film needs a last frame. A model that stops early leaves the video ending
  // mid-thought, which reads as broken rather than brief.
  const last = scenes[scenes.length - 1];
  if (last.kind !== 'outro' && last.kind !== 'logo') {
    scenes.push({
      kind: 'outro',
      headline: 'Get started today',
      duration: Math.round(2.6 * 30 * pace),
    });
  }

  return scenes;
};

const buildScene = (
  value: unknown,
  tone: Tone,
  format: FormatName,
  pace: number,
  index: number,
): ScenePlan | null => {
  if (!value || typeof value !== 'object') return null;
  const s = value as Record<string, unknown>;

  const frames = (seconds: number) =>
    Math.round(seconds * 30 * pace * verticalTighten(format));

  switch (s.kind) {
    case 'title': {
      const headline = words(s.headline, 8);
      if (!headline) return null;
      const sub = words(s.sub, 14);

      return {
        kind: 'title',
        badge: words(s.badge, 3) || undefined,
        headline,
        sub: sub || undefined,
        layout: titleLayout(s.layout, tone, index),
        duration: frames(readSeconds(headline) + (sub ? readSeconds(sub) * 0.7 : 0) + 1.6),
      };
    }

    case 'bigword': {
      const list = items(s.words, 4, 5);
      if (list.length < 2) return null;
      // Each word needs its own beat — about two thirds of a second is the shortest a
      // word can hold and still be read rather than glimpsed.
      return {
        kind: 'bigword',
        words: list,
        duration: Math.max(frames(0.5 + list.length * 0.7), 30 * 1.8),
      };
    }

    case 'features':
    case 'steps': {
      const list = items(s.items, 5, 4);
      if (list.length === 0) return null;
      const heading =
        words(s.heading, 5) || (s.kind === 'steps' ? 'How it works' : "What's inside");

      const duration = frames(
        1.2 + list.reduce((total, item) => total + readSeconds(item) + 0.5, 0),
      );

      return s.kind === 'steps'
        ? { kind: 'steps', heading, items: list, duration }
        : {
            kind: 'features',
            heading,
            items: list,
            layout: listLayout(s.layout, tone, list.length),
            duration,
          };
    }

    case 'stat': {
      const value = Number(s.value);
      if (!Number.isFinite(value) || value === 0) return null;
      const label = words(s.label, 5) || 'And counting';
      return {
        kind: 'stat',
        prefix: typeof s.prefix === 'string' ? s.prefix.slice(0, 2) : undefined,
        value,
        suffix:
          typeof s.suffix === 'string' ? s.suffix.slice(0, 2).toLowerCase() : undefined,
        label,
        duration: frames(2.6 + readSeconds(label)),
      };
    }

    case 'quote': {
      const quote = words(s.quote, 28);
      if (!quote) return null;
      return {
        kind: 'quote',
        quote,
        author: words(s.author, 6) || undefined,
        duration: frames(1.6 + readSeconds(quote) * 1.15),
      };
    }

    case 'product': {
      /*
       * Labels are the thing that makes a drawn interface look like *theirs*.
       *
       * They are also the easiest place for a model to start writing marketing copy, so
       * anything longer than a couple of words is dropped rather than shrunk — a
       * sidebar item reading "Automatically declines your meetings" is instantly a fake
       * screenshot, where "Inbox" is just a product.
       */
      const labels = items(s.labels, 2, 5)
        .map((label) => label.replace(/[.!?]+$/, ''))
        .filter((label) => label.length <= 18);

      const heading = words(s.heading, 6) || undefined;
      const caption = words(s.caption, 11) || undefined;

      return {
        kind: 'product',
        heading,
        caption,
        device: s.device === 'phone' ? 'phone' : 'browser',
        surface: asSurface(s.surface),
        labels: labels.length ? labels : undefined,
        // It needs longer than a text scene: the interface has to assemble, the cursor
        // has to travel, and the viewer has to be given time to look around it.
        duration: frames(
          4.2 + (heading ? readSeconds(heading) : 0) + (caption ? readSeconds(caption) : 0),
        ),
      };
    }

    case 'chart': {
      /*
       * Every value has to be a real number the model was handed.
       *
       * The prompt says not to invent a series, and prompts are not a guarantee. A chart
       * is the most credible thing in a video and therefore the most damaging place to
       * be wrong — an invented figure drawn at full height is a claim a company could be
       * held to, so an unusable series drops the whole scene rather than guessing at it.
       */
      const series = Array.isArray(s.series)
        ? s.series
            .map((point: { label?: unknown; value?: unknown }) => ({
              label: words(point?.label, 3),
              value: Number(point?.value),
            }))
            .filter((point) => point.label && Number.isFinite(point.value) && point.value >= 0)
            .slice(0, 7)
        : [];

      if (series.length === 0) return null;

      const chart: ChartKind = asChart(s.chart);
      // A donut answers "how much of the whole", which only one number can do. Several
      // points asked of a donut is a bar chart that chose the wrong shape.
      if (chart === 'donut' && series.length > 1) series.length = 1;

      const heading = words(s.heading, 6) || undefined;
      const caption = words(s.caption, 11) || undefined;

      return {
        kind: 'chart',
        heading,
        chart,
        series,
        unit: typeof s.unit === 'string' ? s.unit.slice(0, 3) : undefined,
        caption,
        duration: frames(
          3.4 + series.length * 0.45 + (caption ? readSeconds(caption) : 0),
        ),
      };
    }

    case 'flow': {
      const steps = items(s.steps, 3, 4)
        .map((step) => step.replace(/[.!?]+$/, ''))
        .filter((step) => step.length <= 22);
      // Two states is the minimum that can mean "becomes"; one is just a label.
      if (steps.length < 2) return null;

      const heading = words(s.heading, 6) || undefined;
      const caption = words(s.caption, 11) || undefined;

      return {
        kind: 'flow',
        heading,
        steps,
        caption,
        duration: frames(2.6 + steps.length * 0.7 + (caption ? readSeconds(caption) : 0)),
      };
    }

    case 'constellation': {
      // Names of things, not sentences. Anything longer is a feature description that
      // belongs in a list, and it would not fit on a card anyway.
      const list = items(s.items, 3, 6).filter((item) => item.length <= 26);
      if (list.length < 3) return null;

      const heading = words(s.heading, 6) || undefined;

      return {
        kind: 'constellation',
        heading,
        items: list,
        caption: words(s.caption, 2) || undefined,
        duration: frames(3.2 + list.length * 0.4),
      };
    }

    case 'overlay': {
      /*
       * Enough cards to keep the frame busy behind the words.
       *
       * The scene doubles whatever it is given so the column never runs out mid-shot,
       * but starting from two means seeing the same two names four times, and repetition
       * is exactly what makes a background read as a texture rather than as a product.
       */
      const list = items(s.items, 4, 8).filter((item) => item.length <= 24);
      if (list.length < 4) return null;

      const heading = words(s.heading, 5);
      if (!heading) return null;

      return {
        kind: 'overlay',
        heading,
        items: list,
        // Long enough for the column to make a full pass behind the line. Cut short, the
        // drift reads as a glitch rather than as a world going by.
        duration: frames(4.6),
      };
    }

    case 'logo': {
      const name = words(s.name, 4);
      if (!name) return null;
      return {
        kind: 'logo',
        name,
        tagline: words(s.tagline, 7) || undefined,
        duration: frames(2.6),
      };
    }

    case 'outro': {
      const headline = words(s.headline, 6) || 'Get started today';
      return {
        kind: 'outro',
        headline,
        cta: words(s.cta, 5) || undefined,
        duration: frames(1.9 + readSeconds(headline)),
      };
    }

    default:
      return null;
  }
};

/**
 * The interfaces and charts we know how to draw.
 *
 * Checked against the model's answer rather than trusted, because a model asked for one
 * of four words will occasionally return a fifth — and an unrecognised surface would
 * render as an empty window, which looks like the product is broken.
 */
const SURFACES: SurfaceKind[] = ['dashboard', 'list', 'chat', 'editor'];
const CHARTS: ChartKind[] = ['bars', 'line', 'donut'];

/*
 * Guards rather than `includes`.
 *
 * `SURFACES.includes(value)` is true at runtime and proves nothing to the type checker,
 * so the unknown was flowing straight into the spec. It happened to work because the
 * list and the type agree — but nothing was enforcing that, and a typo in either would
 * have shipped silently. These narrow properly.
 */
const asSurface = (value: unknown): SurfaceKind =>
  SURFACES.find((s) => s === value) ?? 'dashboard';

const asChart = (value: unknown): ChartKind => CHARTS.find((c) => c === value) ?? 'bars';

/* ---------- layout ---------- */

/**
 * Pick a layout when the model did not.
 *
 * Alternating by position is deliberate: two centred title scenes in a row is the
 * single most template-looking thing a video can do, and the model forgets to vary it
 * far more often than it remembers.
 */
const titleLayout = (
  value: unknown,
  tone: Tone,
  index: number,
): TitleLayout | undefined => {
  if (value === 'center' || value === 'left' || value === 'stack') return value;
  if (tone === 'editorial') return 'left';
  if (tone === 'kinetic') return 'stack';
  return index % 2 === 0 ? 'center' : 'left';
};

const listLayout = (value: unknown, tone: Tone, count: number): ListLayout | undefined => {
  if (value === 'center' || value === 'left' || value === 'grid') return value;
  // Four short items read better as a grid than as a tall column, especially in
  // landscape where a column wastes most of the frame.
  if (count === 4) return 'grid';
  return tone === 'editorial' ? 'left' : 'center';
};

/* ---------- timing ---------- */

/**
 * On-screen reading is slower than reading a page: the viewer cannot go back, and the
 * text is still arriving for the first moment. Roughly 2.5 words per second.
 */
const readSeconds = (text: string): number => text.split(/\s+/).length / 2.5;

/** Vertical video is watched fast and scrolled past faster. */
const verticalTighten = (format: FormatName): number => (format === 'vertical' ? 0.88 : 1);

/**
 * Does this number actually appear in what the user wrote?
 *
 * Checks the digits with separators removed, so "40,000" and "40000" match, and also
 * the shorthand people write — 40k for 40000, 2m for 2000000.
 */
const mentions = (source: string, value: number): boolean => {
  const digits = source.replace(/[,\s]/g, '');
  if (digits.includes(String(value))) return true;

  if (value >= 1000 && value % 1000 === 0) {
    if (new RegExp(`\\b${value / 1000}k\\b`, 'i').test(digits)) return true;
  }
  if (value >= 1_000_000 && value % 1_000_000 === 0) {
    if (new RegExp(`\\b${value / 1_000_000}m\\b`, 'i').test(digits)) return true;
  }
  return false;
};

/** Re-exported so callers can size a video without importing the planner too. */
export type { Motif };

/**
 * The direction, checked rather than trusted.
 *
 * A model asked to pick one of three words will occasionally return a fourth, and an
 * unrecognised style would quietly fall through to whatever the renderer defaults to —
 * which is exactly the behaviour this whole mechanism exists to replace.
 */
const asStyle = (value: unknown): VideoStyle | undefined =>
  value === 'product-led' || value === 'typographic' || value === 'camera-led'
    ? value
    : undefined;

/**
 * The shape each length can actually hold.
 *
 * Worked backwards from how long things take to read rather than guessed. A scene with
 * words on it needs roughly two seconds minimum, a product shot needs three and a half,
 * and every cut gives back a quarter of a second of overlap — so eight seconds is three
 * scenes, not five, and pretending otherwise produces a film nobody can follow.
 *
 * The fit enforces the total regardless. This exists so the plan that arrives is already
 * the right film, instead of a longer one with its middle cut out.
 */
const SHAPE_FOR: Record<LengthName, string> = {
  short: `HOW LONG THIS ONE IS: about EIGHT seconds. That is THREE scenes, at most four.
Pick the three that carry the whole argument and leave everything else out. At this
length a list of four features is the wrong scene — there is no time to read it. One
claim, one piece of evidence, one ending.`,

  standard: `HOW LONG THIS ONE IS: about FIFTEEN seconds. That is FOUR or FIVE scenes.
Enough for an opening, the evidence, one supporting beat and an ending. It is not enough
for two lists and a chart.`,

  long: `HOW LONG THIS ONE IS: about TWENTY-FIVE seconds. That is SIX or SEVEN scenes.
There is room to build a real argument: open, show the thing, support it with something
only they could have told you, change register once, and close. Use the room — a
four-scene plan stretched over twenty-five seconds is four slow scenes, not a longer
film.`,
};

/**
 * The last thing the director reads before it answers.
 *
 * Deliberately short and blunt. Everything here is also said in the system prompt, and
 * was being ignored there — a model asked for twenty-five seconds returned three scenes
 * eight times out of eight. Repeating the count as the final instruction, with the exact
 * number, is what makes it stick.
 */
const DEMANDS: Record<LengthName, string> = {
  short: `Return EXACTLY 3 scenes. Not 4, not 2. Choose the ending from outro, logo,
bigword or stat — whichever the film is actually arguing for.`,

  standard: `Return EXACTLY 5 scenes. Not 3, not 4. Choose the ending from outro, logo,
bigword or stat — whichever the film is actually arguing for, and not "outro" by habit.`,

  long: `Return EXACTLY 7 scenes. Not 3, not 4, not 5 — SEVEN. Twenty-five seconds across
four scenes is six seconds a shot, which is twice as slow as any film worth copying and
reads as a slideshow. Seven scenes means roughly three seconds each, which is the pace
you are aiming for. Choose the ending from outro, logo, bigword or stat — whichever the
film is actually arguing for, and not "outro" by habit.`,
};
