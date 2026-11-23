import type { Brief, Intent, QuoteFact, StatFact } from './brief.ts';
import { pickPalette } from './palette.ts';
import type { FormatName } from './types.ts';

/**
 * Reading the prompt.
 *
 * The job here is to separate three things people mix freely in one sentence:
 *
 *   1. **Content** — the words that belong on screen.
 *   2. **Style** — how it should look ("minimal", "black and white", "#FF7A45").
 *   3. **Instructions to us** — "make a video for…", "30 seconds", "1080p".
 *
 * Only the first belongs in the video. Failing to separate them is how a prompt ending
 * "Minimal, black and white." ends up with "Minimal, black and white" printed on screen.
 */

/* ---------- vocabulary ---------- */

/** Words that describe how it should look, never what it should say. */
const STYLE_WORDS = new Set([
  'minimal', 'minimalist', 'clean', 'simple', 'bold', 'cinematic', 'elegant', 'modern',
  'playful', 'corporate', 'professional', 'energetic', 'calm', 'dark', 'light', 'sleek',
  'premium', 'luxury', 'retro', 'vintage', 'futuristic', 'monochrome', 'mono', 'style',
  'aesthetic', 'vibe', 'look', 'feel', 'theme', 'tone', 'palette', 'colours', 'colors',
  'coloured', 'colored', 'urgent', 'punchy', 'dramatic', 'serious', 'friendly', 'loud',
  'quiet', 'soft', 'smooth', 'slick', 'polished', 'fun', 'moody', 'vibrant', 'subtle',
  'black', 'white', 'blue', 'red', 'green', 'orange', 'purple', 'violet', 'navy', 'gold',
  'amber', 'mint', 'coral', 'indigo', 'lilac', 'emerald', 'warm', 'cool',
]);

/** Words that describe the output shape, never the content. */
const FORMAT_WORDS = new Set([
  'vertical', 'horizontal', 'landscape', 'square', 'portrait', 'reel', 'reels', 'short',
  'shorts', 'tiktok', 'story', 'stories', 'feed', 'post', '9:16', '16:9', '1:1', '4k',
  '1080p', '720p', 'hd', 'fps', 'seconds', 'second', 'sec', 'minutes', 'minute', 'long',
]);

/** Connectors that carry no meaning of their own inside a fragment. */
const FILLER = new Set([
  'and', 'or', 'with', 'in', 'a', 'an', 'the', 'very', 'really', 'make', 'it', 'keep',
  'use', 'using', 'be', 'is', 'should', 'please', 'to', 'of', 'for', 'my', 'our',
]);

/** Openings that address us rather than the audience. */
const INSTRUCTION_STEPS: RegExp[] = [
  /^\s*(please|hey|ok(ay)?)[\s,]+/i,
  /^\s*can you\s+/i,
  /^\s*i\s+(want|need|would like)\s+(you to\s+)?(a|an|the)?\s*/i,
  /^\s*(make|create|generate|build|design|produce|give|do|write)\s+(me|us)?\s*(a|an|the)?\s*/i,
  /^\s*let\s+(everyone|people|them)\s+know\s+(that\s+)?/i,
  /^\s*(announce|announcing|tell|show|celebrate|promote|advertise|highlight)\s+(everyone|people|them|us)?\s*(that\s+)?/i,
];

/**
 * The word "video" and its cousins, plus the preposition that usually follows.
 * Applied repeatedly because people stack them: "testimonial video", "promo reel".
 */
const MEDIUM_WORDS =
  /\b(motion\s+graphics?|animation|video|clip|advert|advertisement|promo|reel|teaser|trailer|montage|testimonial|explainer|ad)\b\s*(for|about|of|on|that|which|to)?\s*/gi;

/** Numbers that are settings, not content. */
const DIRECTIVES: RegExp[] = [
  /#[0-9a-fA-F]{3,8}\b/g,                                  // hex colours
  /\b\d+\s*(seconds?|secs?|minutes?|mins?)\b/gi,           // "30 second"
  /\b(4k|1080p?|720p?|2160p?)\b/gi,                        // resolutions
  /\b\d+\s*fps\b/gi,                                       // frame rates
  /\b\d+\s*:\s*\d+\b/g,                                    // aspect ratios
];

/* ---------- entry point ---------- */

export const parsePrompt = (rawPrompt: string): Brief => {
  const prompt = rawPrompt.trim();
  const lower = prompt.toLowerCase();

  // Colour and shape are read from the WHOLE prompt, including the style words we are
  // about to throw away — that is what those words are for.
  const palette = pickPalette(lower);
  const format = pickFormat(lower);

  // Quotes are literal copy. Pull them out before any cleaning runs, so it can never
  // chew into words somebody asked for verbatim.
  const { quotes, remainder } = extractQuoted(prompt);

  const content = stripStyleFragments(stripDirectives(remainder));
  const intent = detectIntent(lower);
  const product = extractProduct(content);

  // A short quoted phrase is a slogan and belongs in the headline; a longer one is
  // something somebody said and belongs in a quote scene. Deciding once, here, is what
  // stops the same sentence appearing twice in one video.
  const slogan = quotes.find((q) => countWords(q.text) <= 9);
  const quote = quotes.find((q) => q !== slogan && countWords(q.text) >= 6);

  const list = findList(content);
  const listWasFirstSentence =
    list !== null && normalise(list.sentence) === normalise(firstSentence(content));

  /*
   * Fall back to clauses when nothing looks like a list.
   *
   * Only ever a fallback: a brief that really was written as a list is still read as
   * one, exactly as before. This catches the far more common case of somebody writing
   * a sentence, where every fact about the product sits inside one clause the list
   * finder cannot see.
   */
  let features = list ? cleanItems(list.items) : cleanItems(findClauses(content, product));

  const headline = buildHeadline({
    slogan: slogan?.text,
    content,
    product,
    intent,
    list,
    listWasFirstSentence,
  });

  // When the headline was taken from the first item of a bare list, showing that item
  // again as a bullet is pure repetition.
  if (listWasFirstSentence && !list?.label && features.length > 1) {
    if (normalise(features[0]) === normalise(headline)) features = features.slice(1);
  }

  const stat = extractStat(content);

  return {
    prompt,
    intent,
    product,
    headline,
    subtitle: buildSubtitle({ content, headline, features, product, list }),
    badge: detectBadge(lower, intent),
    features,
    stat,
    quote,
    outro: detectOutro(lower, intent),
    cta: detectCta(lower, intent),
    palette,
    format,
  };
};

/* ---------- shape ---------- */

const pickFormat = (lower: string): FormatName => {
  if (/\b(reels?|tiktok|shorts?|vertical|portrait|stor(y|ies)|9:16)\b/.test(lower)) {
    return 'vertical';
  }
  if (/\b(square|1:1|instagram post|feed post)\b/.test(lower)) return 'square';
  return 'landscape';
};

/* ---------- quotes ---------- */

/**
 * Pull out quoted text, and any attribution that follows it.
 *
 * The attribution sits *outside* the quotation marks — `"…" — Sara Ahmed, Head of
 * Growth` — so it has to be matched here rather than searched for inside the quote,
 * which is what the first version got wrong.
 */
const extractQuoted = (prompt: string): { quotes: QuoteFact[]; remainder: string } => {
  const quotes: QuoteFact[] = [];

  const pattern =
    /["“”']([^"“”']{3,200})["“”']\s*(?:[-—–]\s*([A-Z][A-Za-z.]*(?:\s+[A-Z][A-Za-z.]*){0,3}(?:,\s*[A-Za-z ]{2,30})?))?/g;

  const remainder = prompt.replace(pattern, (_, text: string, author?: string) => {
    quotes.push({ text: text.trim(), author: author?.trim() });
    return ' ';
  });

  return { quotes, remainder };
};

/* ---------- cleaning ---------- */

const stripDirectives = (text: string): string =>
  DIRECTIVES.reduce((acc, pattern) => acc.replace(pattern, ' '), text)
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*(?=,|\.|$)/g, '')
    .trim();

/**
 * Remove fragments that are entirely about style.
 *
 * The test is strict on purpose: a fragment is dropped only when *every* meaningful
 * word in it is a style or format word. So "Minimal, black and white" goes, while
 * "a green finance app" stays — "finance" and "app" are real content, and "green" is
 * describing the product, not the video.
 *
 * Being conservative matters more than being thorough. Dropping a style word by
 * accident costs nothing; dropping a product name is a broken video.
 */
const stripStyleFragments = (text: string): string => {
  const fragments = text.split(/([.!?,;\n]+)/);

  const kept = fragments.map((fragment) => {
    if (/^[.!?,;\n\s]*$/.test(fragment)) return fragment;

    const words = fragment
      .toLowerCase()
      .split(/\s+/)
      .map((w) => w.replace(/[^a-z0-9:%$]/g, ''))
      .filter((w) => w.length > 0 && !FILLER.has(w));

    // Nothing meaningful left after the directives were stripped — drop the leftovers.
    if (words.length === 0) return ' ';

    return words.every((w) => STYLE_WORDS.has(w) || FORMAT_WORDS.has(w)) ? ' ' : fragment;
  });

  return kept
    .join('')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.!?,;])/g, '$1')
    .replace(/([,;])\s*(?=[,;.])/g, '')
    .replace(/^[\s,;.\-–—]+/, '')
    .trim();
};

/** Strip the part of a sentence addressed to us rather than to the audience. */
const stripInstructions = (text: string): string => {
  let result = text;
  for (const step of INSTRUCTION_STEPS) result = result.replace(step, '');
  result = result.replace(MEDIUM_WORDS, ' ');
  return result
    .replace(/^\s*(for|about|of|on|that|to)\s+/i, '')
    .replace(/^[\s,;.\-–—]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
};

/* ---------- product ---------- */

const extractProduct = (content: string): string | undefined => {
  const patterns = [
    /\b(?:called|named)\s+([A-Z][\w-]*(?:\s+[A-Z][\w-]*)?)/,
    /\b(?:introducing|announcing|launch(?:ing)?|meet)\s+([A-Z][\w-]*(?:\s+[A-Z][\w-]*)?)/,
    /\bfor\s+([A-Z][\w-]*(?:\s+[A-Z][\w-]*)?)\s*(?:,|\.|\s+the\b|\s+a\b|\s+an\b|$)/,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      const name = match[1].trim();
      // These match the capital-letter shape but are never product names.
      if (!/^(the|we|our|it|this|that|new|now|i|you)$/i.test(name)) return name;
    }
  }
  return undefined;
};

/* ---------- lists ---------- */

type ListSource = {
  /** Text before the colon, when there was one: "How it works". */
  label?: string;
  items: string[];
  /** The sentence it came from, so the headline can avoid repeating it. */
  sentence: string;
};

/**
 * Find the bullet points.
 *
 * Three shapes, in order of confidence:
 *   1. "Features: a, b, c"      — a keyword and a colon
 *   2. "How it works: a, b, c"  — any colon followed by a list
 *   3. "a, b, c"                — a bare comma list of three or more short items
 *
 * Splitting at the colon matters: without it, "How it works: upload your data" becomes
 * a single bullet reading "How it works: upload your data".
 */
const findList = (content: string): ListSource | null => {
  for (const sentence of content.split(/[.!?\n]+/)) {
    const trimmed = sentence.trim();
    if (trimmed.length === 0) continue;

    const colon = trimmed.indexOf(':');
    if (colon > 0) {
      const label = trimmed.slice(0, colon).trim();
      const after = trimmed.slice(colon + 1).trim();
      const items = splitItems(after);
      if (items.length >= 2) return { label, items, sentence: trimmed };
    }

    const keyword = trimmed.match(
      /\b(?:features?|includes?|including|benefits?|points?|highlights?|covers?|with)\s+(.+)/i,
    );
    if (keyword) {
      const items = splitItems(keyword[1]);
      if (items.length >= 2) {
        return { label: undefined, items, sentence: trimmed };
      }
    }

    const bare = splitItems(trimmed);
    if (bare.length >= 3) return { items: bare, sentence: trimmed };
  }
  return null;
};

const splitItems = (text: string): string[] =>
  text
    .split(/,|\band\b|•|;|\//i)
    .map((s) => s.replace(/^[\s\-–—]+|[.!?\s]+$/g, '').trim())
    .filter((s) => s.length >= 3 && countWords(s) <= 6);


/**
 * Points pulled out of a description that was never written as a list.
 *
 * The list finder above only recognises a list that looks like one — commas, a colon,
 * the word "including". Measured against eight real briefs, that left most of them with
 * nothing: "Smile Lane, a family dental clinic now open on Saturdays" produced zero
 * points, because the one clause carrying every fact in the sentence is eight words long
 * and the item filter caps items at six.
 *
 * The cost was not only empty scenes. A film with no points has two scenes, and two
 * scenes cannot fill a twenty-five second video without each card holding for twelve
 * seconds — so "long" came back at eleven. One missing extractor was showing up as a
 * duration bug.
 *
 * So a long clause is split again, at the words English uses to join a description to
 * the thing it describes: "a family dental clinic now open on Saturdays" becomes "A
 * family dental clinic" and "Open on Saturdays", which is what somebody writing this
 * brief as bullets would have written in the first place.
 */
const JOINS = /\s+(?:that|which|who|now|with|featuring|plus|so you can|designed to|built to|made to)\s+/i;

/** A clause addressed to us about the film, rather than a fact about the product. */
const ABOUT_THE_VIDEO = /\b(?:video|animation|clip|film|reel|advert|promo|teaser|explainer)\s+(?:for|about|of|to)\b/i;

const findClauses = (content: string, product?: string): string[] => {
  const pieces: string[] = [];

  /*
   * Sentence breaks, but not the dot inside a number.
   *
   * Splitting on every full stop turned "99.99% uptime" into the point "99% uptime" —
   * a fact on screen that nobody wrote and that is not true. A decimal point is not the
   * end of a sentence.
   */
  for (const piece of content.split(/(?<![0-9])[.!?](?![0-9])|\n+|,/)) {
    /*
     * Throw away the clause that is about the video rather than about the product.
     *
     * The first point on screen was "A short video for Smile Lane" — the brief's own
     * instruction to us, promoted to a selling point. Cleaning that phrase up was tried
     * first and gave "A short Smile Lane", which is worse: a fragment nobody wrote. A
     * clause addressed to us is not content, so it is dropped whole.
     *
     * Matched only when the medium word points at something ("video FOR Ada"), so a
     * brief about a video editing app still keeps its own description.
     */
    const trimmed = piece.replace(/^[-–—\s]+/, '').trim();
    if (trimmed.length < 3) continue;
    if (ABOUT_THE_VIDEO.test(trimmed)) continue;

    // The product name is the title of the film, not a bullet on it.
    if (product && normalise(trimmed) === normalise(product)) continue;

    const words = countWords(trimmed);
    if (words >= 2 && words <= 6) {
      pieces.push(trimmed);
      continue;
    }

    // Too long to read as one card, so split it where the sentence already hinges.
    const parts = trimmed.split(JOINS).map((part) => part.trim()).filter(Boolean);
    if (parts.length < 2) continue;
    for (const part of parts) {
      const n = countWords(part);
      if (n >= 2 && n <= 6) pieces.push(part);
    }
  }

  return pieces;
};

/** Cap, tidy and de-duplicate. More than four points on screen is a slide, not a video. */
const cleanItems = (items: string[]): string[] => dedupe(items).slice(0, 4).map(capitalise);

/* ---------- headline ---------- */

const buildHeadline = ({
  slogan,
  content,
  product,
  intent,
  list,
  listWasFirstSentence,
}: {
  slogan?: string;
  content: string;
  product?: string;
  intent: Intent;
  list: ListSource | null;
  listWasFirstSentence: boolean;
}): string => {
  // Somebody asked for these exact words. The full stop goes: a headline is a
  // statement on screen, not a sentence in a paragraph.
  if (slogan) return capitalise(slogan.replace(/[.,;:]+$/, ''));

  // "How it works: a, b, c" — the part before the colon is the headline.
  if (list?.label && listWasFirstSentence) {
    const label = stripInstructions(list.label);
    if (countWords(label) >= 2) return capitalise(trimWords(label, 9));
  }

  if (product) {
    const descriptor = describeProduct(content, product);
    if (descriptor) return capitalise(`${product}, ${descriptor}`);
    if (intent === 'launch') return `Meet ${product}`;
    return capitalise(product);
  }

  // A bare list with no label: use its first item rather than printing the whole list
  // as a headline and then again as bullets.
  if (listWasFirstSentence && list && !list.label) {
    return capitalise(list.items[0]);
  }

  const cleaned = stripInstructions(firstSentence(content));
  const words = cleaned.split(/\s+/).filter(Boolean);

  // Headlines longer than nine words stop being headlines.
  if (words.length >= 2) {
    return capitalise(words.slice(0, 9).join(' ').replace(/[,;:]$/, ''));
  }

  return fallbackHeadline(intent, product);
};

/** When the prompt gave us nothing usable, say something honest rather than nothing. */
const fallbackHeadline = (intent: Intent, product?: string): string => {
  switch (intent) {
    case 'testimonial':
      return 'What our customers say';
    case 'milestone':
      return 'A new milestone';
    case 'promo':
      return 'Limited time only';
    case 'launch':
      return product ? `Meet ${product}` : 'Something new';
    default:
      return product ?? 'Something worth watching';
  }
};

/** "Pine, the calm note-taking app" → "the calm note-taking app". */
const describeProduct = (content: string, product: string): string | undefined => {
  const match = content.match(
    new RegExp(`${escapeRegex(product)}\\s*,\\s*((?:the|a|an)\\s+[^.,!?]{3,48})`, 'i'),
  );
  if (!match) return undefined;

  const descriptor = match[1].trim();
  return countWords(descriptor) <= 7 ? descriptor : undefined;
};

/* ---------- subtitle ---------- */

/**
 * The supporting line.
 *
 * Only shown when there is genuinely a second thing to say. Repeating the headline in
 * smaller type, or echoing the feature list that is about to appear anyway, is worse
 * than leaving the space empty.
 */
const buildSubtitle = ({
  content,
  headline,
  features,
  product,
  list,
}: {
  content: string;
  headline: string;
  features: string[];
  product?: string;
  list: ListSource | null;
}): string | undefined => {
  const headlineWords = new Set(tokens(headline));
  const featureWords = new Set(features.flatMap(tokens));

  const candidates = content
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    // The sentence the bullets came from is about to be shown as bullets.
    .filter((s) => !list || normalise(s) !== normalise(list.sentence))
    .map(stripInstructions)
    .filter((s) => countWords(s) >= 3 && countWords(s) <= 16)
    .filter((s) => !/^(features?|includes?|benefits?|points?|highlights?)\b/i.test(s))
    // Leftovers from a half-stripped instruction read as broken copy.
    .filter((s) => !/[,;:]\s*$/.test(s) && !/\s,|,,/.test(s));

  for (const candidate of candidates) {
    const words = tokens(candidate);
    if (words.length === 0) continue;

    if (overlap(words, headlineWords) > 0.6) continue;
    if (overlap(words, featureWords) > 0.6) continue;
    if (product && words.length <= 2 && words.includes(product.toLowerCase())) continue;

    return capitalise(candidate.replace(/[,;:]$/, ''));
  }
  return undefined;
};

const overlap = (words: string[], against: Set<string>): number =>
  words.length === 0 ? 0 : words.filter((w) => against.has(w)).length / words.length;

/* ---------- stat ---------- */

/**
 * A headline number.
 *
 * Numbers that are instructions to us are stripped before this runs, so anything left
 * is genuinely part of the message.
 */
const extractStat = (content: string): StatFact | undefined => {
  const pattern =
    /(\$|£|€)?\s*(\d[\d,]*(?:\.\d+)?)\s*(%|x|k|m|b|\+)?\s*([a-zA-Z][a-zA-Z\s-]{2,28})?/g;

  for (const match of content.matchAll(pattern)) {
    const value = Number(match[2].replace(/,/g, ''));
    if (!Number.isFinite(value) || value === 0) continue;

    const label = (match[4] ?? '').trim();
    const firstWord = label.split(/\s+/)[0]?.toLowerCase() ?? '';
    if (FORMAT_WORDS.has(firstWord)) continue;

    return {
      prefix: match[1],
      value,
      suffix: match[3]?.toLowerCase(),
      label: label ? capitalise(trimWords(label, 4)) : 'And counting',
    };
  }
  return undefined;
};

/* ---------- intent and wording ---------- */

const detectIntent = (lower: string): Intent => {
  if (/\b(testimonial|review|customer said|quote from|said about)\b/.test(lower)) {
    return 'testimonial';
  }
  if (/\b(sale|discount|% off|percent off|limited time|ends (soon|sunday|today)|black friday|deal)\b/.test(lower)) {
    return 'promo';
  }
  if (/\b(how it works|explain|tutorial|guide|walkthrough|teach|step by step)\b/.test(lower)) {
    return 'explainer';
  }
  // A milestone needs an actual number. Without this, "hit publish" reads as a
  // milestone because of the word "hit".
  if (/\b(hit|reached|passed|crossed|milestone|celebrat|anniversary)\b/.test(lower) && /\d/.test(lower)) {
    return 'milestone';
  }
  if (/\b(launch|launching|introduc|announc|unveil|releas|new app|new product|beta)\b/.test(lower)) {
    return 'launch';
  }
  if (/\b(features?|what's new|whats new|update|capabilit)\b/.test(lower)) return 'feature';
  return 'generic';
};

const detectBadge = (lower: string, intent: Intent): string | undefined => {
  if (/\bbeta\b/.test(lower)) return 'Now in beta';
  if (/\bearly access\b/.test(lower)) return 'Early access';
  if (/\b(sale|discount|offer|limited time)\b/.test(lower)) return 'Limited time';
  if (/\bv?\d+\.\d+\b|\bupdate\b/.test(lower)) return 'Update';
  if (intent === 'launch') return 'Introducing';
  if (intent === 'milestone') return 'Milestone';
  if (/\bnew\b/.test(lower)) return 'New';
  return undefined;
};

const detectOutro = (lower: string, intent: Intent): string => {
  if (/\bwaitlist\b/.test(lower)) return 'Join the waitlist';
  if (intent === 'promo') return 'Don’t miss it';
  if (intent === 'milestone') return 'Thank you';
  if (intent === 'testimonial') return 'See why they switched';
  if (/\bavailable\b|\blaunch\b/.test(lower)) return 'Available now';
  return 'Get started today';
};

const detectCta = (lower: string, intent: Intent): string => {
  if (/\bwaitlist\b/.test(lower)) return 'Join the waitlist';
  if (/\bdownload\b|\bapp store\b|\bgoogle play\b/.test(lower)) return 'Download now';
  if (/\bdemo\b|\bbook\b|\bcall\b/.test(lower)) return 'Book a demo';
  if (/\bsign ?up\b|\bregister\b|\bjoin\b/.test(lower)) return 'Sign up free';
  if (intent === 'promo') return 'Shop the sale';
  return 'Try it free';
};

/* ---------- small helpers ---------- */

export const countWords = (text: string): number =>
  text.trim().split(/\s+/).filter(Boolean).length;

const firstSentence = (text: string): string => {
  const sentence = text.split(/[.!?\n]+/).find((s) => s.trim().length > 0);
  return (sentence ?? text).trim();
};

const trimWords = (text: string, max: number): string =>
  text.split(/\s+/).slice(0, max).join(' ');

const tokens = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 2 && !FILLER.has(w));

const normalise = (text: string): string =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Capitalise the first letter and nothing else.
 *
 * Title Case would break product names and acronyms — "iPhone" must not become
 * "IPhone", and "AI summaries" must not become "Ai Summaries".
 */
const capitalise = (text: string): string => {
  const trimmed = text.trim();
  return trimmed.length === 0 ? trimmed : trimmed[0].toUpperCase() + trimmed.slice(1);
};

const dedupe = (items: string[]): string[] => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = normalise(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const escapeRegex = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
