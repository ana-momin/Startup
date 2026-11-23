import type { Brief, Intent } from './brief.ts';

import { countWords } from './parse.ts';

import type { ScenePlan } from './types.ts';



/**

 * Directing the video.

 *

 * Two decisions live here, and they are the ones a motion designer is actually paid to

 * make:

 *

 *   1. **Order** — what the viewer sees first. A launch opens with the product; a

 *      results video opens with the number. Same material, different film.

 *

 *   2. **Timing** — how long each scene holds. The old version used fixed durations,

 *      which meant a two-word headline sat on screen as long as a nine-word one: the

 *      first felt sluggish, the second was unreadable. Timing is now derived from how

 *      long the words actually take to read.

 */



/* ---------- reading time ---------- */



/**

 * On-screen reading is slower than reading a page — the viewer cannot go back, and the

 * text is still animating in for the first moment. Roughly 2.5 words per second, plus

 * time for the entrance, plus a beat to rest on before the cut.

 */

const WORDS_PER_SECOND = 2.5;



type Beat = {

  /** Seconds for the entrance animation to finish. */

  entrance: number;

  /** Seconds of stillness after everything has arrived. */

  hold: number;

};



const readingFrames = (text: string, fps: number, beat: Beat): number => {

  const words = countWords(text);

  const seconds = beat.entrance + words / WORDS_PER_SECOND + beat.hold;

  return Math.round(seconds * fps);

};



/* ---------- scene builders ---------- */



const titleScene = (brief: Brief, fps: number): ScenePlan => {

  const { headline, subtitle, badge } = brief;



  // The opening holds a little longer than it strictly needs to. The first seconds are

  // when a viewer decides whether to keep watching, and rushing the title is the most

  // common mistake in amateur motion graphics.

  let duration = readingFrames(headline, fps, { entrance: 1.1, hold: 0.9 });

  if (badge) duration += Math.round(0.25 * fps);

  if (subtitle) duration += readingFrames(subtitle, fps, { entrance: 0.5, hold: 0.2 });



  return {

    kind: 'title',

    badge,

    headline,

    sub: subtitle,

    duration: clamp(duration, fps * 2.2, fps * 6),

  };

};



const featureScene = (brief: Brief, fps: number): ScenePlan => {

  const heading = featureHeading(brief.intent, brief.headline);



  // Each point arrives after the one before it, so the scene has to last long enough to

  // read all of them — not just the last.

  const perItem = brief.features.reduce(

    (total, item) => total + readingFrames(item, fps, { entrance: 0.45, hold: 0.15 }),

    0,

  );



  return {

    kind: 'features',

    heading,

    items: brief.features,

    duration: clamp(

      readingFrames(heading, fps, { entrance: 0.8, hold: 0.2 }) + perItem,

      fps * 2.5,

      fps * 10,

    ),

  };

};



const statScene = (brief: Brief, fps: number): ScenePlan => {

  const stat = brief.stat!;



  // The count itself takes about 1.7s, and the label needs reading after it lands.

  return {

    kind: 'stat',

    prefix: stat.prefix,

    value: stat.value,

    suffix: stat.suffix,

    label: stat.label,

    duration: clamp(

      Math.round(2.4 * fps) + readingFrames(stat.label, fps, { entrance: 0, hold: 0.5 }),

      fps * 2.5,

      fps * 6,

    ),

  };

};



const quoteScene = (brief: Brief, fps: number): ScenePlan => {

  const quote = brief.quote!;



  // A quote is read as a thought, not scanned as a slogan, so it gets a slower pace

  // and a longer rest at the end.

  return {

    kind: 'quote',

    quote: quote.text,

    author: quote.author,

    duration: clamp(

      readingFrames(quote.text, fps, { entrance: 0.9, hold: 1.1 }),

      fps * 3,

      fps * 9,

    ),

  };

};



/**

 * The product, when the brief is about software.

 *

 * Worth having in the rules planner and not only in the AI one. The model is on a free

 * tier that rate-limits, and when it is unavailable the rules take over — so anything

 * only the model can produce is a feature that silently disappears at exactly the moment

 * the product is busiest. The strongest scene we have should not be the first casualty

 * of a 429.

 *

 * The surface is read from the words the user already used. It is a keyword match and

 * nothing cleverer, which is the right amount of cleverness for a fallback: predictable,

 * instant, and wrong in ways that are obvious rather than subtle.

 */

const productScene = (brief: Brief, fps: number): ScenePlan => {

  const text = said(brief);



  const surface = /inbox|email|task|queue|ticket|list|table|row/.test(text)

    ? 'list'

    : /chat|message|assistant|support|conversation|reply/.test(text)

      ? 'chat'

      : /write|writing|doc|document|note|editor|draft/.test(text)

        ? 'editor'

        : 'dashboard';



  /*

   * Their own feature names go in the sidebar.

   *

   * A feature written as a sentence is dropped rather than truncated: a nav item reading

   * "Automatically declines the meetings" is instantly a fake screenshot, where "Inbox"

   * is just a product. Better to show an unlabelled interface than a wrong one.

   */

  const labels = brief.features

    .map((feature) => feature.split(/[,—–-]/)[0].trim().replace(/[.!?]+$/, ''))

    .filter((label) => label.length > 0 && countWords(label) <= 2)

    .slice(0, 5);



  return {

    kind: 'product',

    // A short, honest heading. The interface below it is doing the talking, so this

    // only has to name what the viewer is looking at.

    heading: surface === 'chat' ? 'In conversation'

      : surface === 'list' ? 'Everything in one place'

      : surface === 'editor' ? 'Where the work happens'

      : 'See it in action',

    // If they said mobile, show a phone. Otherwise the format decides: a browser window
    // in a vertical video is a stripe with nothing in it.
    device: /\bmobile|phone|ios|android|app store\b/.test(text) || brief.format === 'vertical'
      ? 'phone'
      : 'browser',

    surface,

    labels: labels.length >= 2 ? labels : undefined,

    // Long enough for the interface to assemble, the cursor to travel and the viewer to

    // look around it. Rushing this scene wastes the only one that shows the thing.

    duration: Math.round(fps * 6),

  };

};



/**

 * Everything the user actually said, including the raw prompt.

 *

 * Reading only the extracted headline and features missed almost everything: when the

 * rules planner is running it is usually *because* extraction found little, so the

 * fields it produces are the worst possible place to look for evidence of what the

 * product is. "a mobile inbox that triages email" becomes the headline "Something worth

 * watching", and every keyword that mattered is gone. The original sentence still has

 * them.

 */

const said = (brief: Brief): string =>

  `${brief.prompt} ${brief.headline} ${brief.subtitle ?? ''} ${brief.features.join(' ')}`.toLowerCase();



/** Whether this brief is about software at all. A bakery does not get a dashboard. */

const isSoftware = (brief: Brief): boolean =>

  /\b(app|apps|platform|dashboard|software|tool|tools|saas|api|workspace|inbox|editor|integration|automat|workflow|analytics|report|sync|account|login|browser|mobile|web|product)\b/.test(

    said(brief),

  );



const outroScene = (brief: Brief, fps: number): ScenePlan => ({

  kind: 'outro',

  headline: brief.outro,

  cta: brief.cta,

  duration: clamp(

    readingFrames(brief.outro, fps, { entrance: 1, hold: 1.3 }),

    fps * 2.4,

    fps * 5,

  ),

});



/* ---------- the running order ---------- */



/**

 * Which scenes, in which order.

 *

 * The shape of a video depends on its job. Leading with the right thing is most of what

 * separates a video that holds attention from one that gets scrolled past.

 */

export const planScenes = (brief: Brief, fps: number, pace = 1): ScenePlan[] => {

  const scenes: ScenePlan[] = [];



  const hasFeatures = brief.features.length > 0;

  const hasStat = brief.stat !== undefined;

  const hasQuote = brief.quote !== undefined;

  // Seeing the thing beats reading about it, so software gets shown in every shape.

  const showProduct = isSoftware(brief);



  switch (brief.intent) {

    case 'milestone':

      // The number IS the story. Open on it, explain afterwards.

      if (hasStat) scenes.push(statScene(brief, fps));

      scenes.push(titleScene(brief, fps));

      if (showProduct) scenes.push(productScene(brief, fps));

      if (hasFeatures) scenes.push(featureScene(brief, fps));

      break;



    case 'testimonial':

      // Open with the person's words, then say who it is about.

      if (hasQuote) scenes.push(quoteScene(brief, fps));

      scenes.push(titleScene(brief, fps));

      if (showProduct) scenes.push(productScene(brief, fps));

      if (hasStat) scenes.push(statScene(brief, fps));

      break;



    case 'feature':

    case 'explainer':

      // A short title just to set context, then straight into the substance.

      scenes.push(titleScene(brief, fps));

      if (showProduct) scenes.push(productScene(brief, fps));

      if (hasFeatures) scenes.push(featureScene(brief, fps));

      if (hasStat) scenes.push(statScene(brief, fps));

      if (hasQuote) scenes.push(quoteScene(brief, fps));

      break;



    case 'promo':

      // Urgency first, proof second, and get to the call to action quickly.

      scenes.push(titleScene(brief, fps));

      if (showProduct) scenes.push(productScene(brief, fps));

      if (hasStat) scenes.push(statScene(brief, fps));

      if (hasFeatures) scenes.push(featureScene(brief, fps));

      break;



    case 'launch':

    case 'generic':

    default:

      scenes.push(titleScene(brief, fps));

      if (showProduct) scenes.push(productScene(brief, fps));

      if (hasFeatures) scenes.push(featureScene(brief, fps));

      if (hasStat) scenes.push(statScene(brief, fps));

      if (hasQuote) scenes.push(quoteScene(brief, fps));

      break;

  }



  scenes.push(outroScene(brief, fps));



  // Vertical video is watched fast and scrolled past faster, so it tightens on top of

  // whatever length was asked for. A floor of two seconds stops any scene becoming a

  // flash the viewer cannot read.

  const factor = pace * (brief.format === 'vertical' ? 0.85 : 1);

  if (factor === 1) return scenes;



  return scenes.map((scene) => ({

    ...scene,

    duration: Math.max(Math.round(scene.duration * factor), Math.round(fps * 2)),

  }));

};



/* ---------- wording ---------- */



/**

 * What to call the list.

 *

 * Falls back to a second choice when the obvious heading would repeat the headline —

 * "How it works" above a list, in a video whose title is already "How it works", reads

 * like a mistake.

 */

const featureHeading = (intent: Intent, headline: string): string => {

  const first = byIntent(intent);

  if (!sameWords(first, headline)) return first;



  return intent === 'explainer' ? 'Step by step' : "What's inside";

};



const byIntent = (intent: Intent): string => {

  switch (intent) {

    case 'explainer':

      return 'How it works';

    case 'promo':

      return "What you're getting";

    case 'milestone':

      return 'How we got here';

    case 'feature':

      return "What's new";

    default:

      return "What's inside";

  }

};



const sameWords = (a: string, b: string): boolean =>

  a.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() ===

  b.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();



const clamp = (value: number, min: number, max: number): number =>

  Math.round(Math.min(Math.max(value, min), max));

