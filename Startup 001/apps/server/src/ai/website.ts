import { hasCharacter, parseColor, rankBrandColors, toHex } from '@motion/planner';
import { getBrowser } from '../browser.ts';

/**
 * Reading a brand off its own website.
 *
 * The fastest onboarding is the one nobody types into. A company's website already
 * contains everything we need — their name, what they do, their colour, their logo —
 * and they have already spent money getting it right.
 *
 * We open the real page in Chrome rather than fetching the HTML and running regexes
 * over it. That matters more than it sounds: most modern sites define their colours in
 * compiled stylesheets, CSS variables or inline styles that only exist once the page
 * has run. Asking the browser for *computed* colours gets the colour a visitor actually
 * sees, which is the colour that is genuinely theirs.
 */

export type SiteBrand = {
  name?: string;
  description?: string;
  /** Their homepage headline — the clearest sentence they own. */
  tagline?: string;
  /** What their main button says, which is the action they actually want. */
  action?: string;
  color?: string;
  /**
   * Other colours worth offering.
   *
   * Guessing one colour and presenting it as fact is the wrong shape for this problem —
   * a site has several real brand colours and no amount of cleverness reliably picks
   * the one somebody means. Showing what we found and letting them tap the right one
   * takes a single click and is right every time.
   */
  colorOptions: string[];
  /** Absolute URL of the best logo candidate we found. */
  logoUrl?: string;
  mode?: 'dark' | 'light';
  website: string;
};

/** What the page hands back. Kept flat because it has to cross into Node as JSON. */
type Scraped = {
  title?: string;
  siteName?: string;
  description?: string;
  /** The big line on the homepage — usually the clearest thing they ever wrote. */
  headline?: string;
  /** The line under it, which normally explains what the headline means. */
  subhead?: string;
  /** What their own buttons say, which is the truest signal of the action they want. */
  actions: string[];
  themeColor?: string;
  bodyBackground?: string;
  colors: string[];
  logoCandidates: string[];
};

export const readWebsite = async (rawUrl: string): Promise<SiteBrand> => {
  const url = normaliseUrl(rawUrl);
  const browser = await getBrowser();

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    // Some sites serve a stripped page to unknown clients. Looking like a normal
    // browser gets us the page a customer would actually see.
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36',
  });

  const page = await context.newPage();

  try {
    // 'commit' rather than 'load' or even 'domcontentloaded': a big marketing site with
    // video backgrounds, chat widgets and analytics may keep the network busy for a
    // long time, and we do not need any of that. We only need the page to exist.
    await page.goto(url, { waitUntil: 'commit', timeout: 20_000 });

    // Give styles, fonts and the first paint a moment — but never let this decide
    // whether the import succeeds. A slow site should still give us something.
    await page
      .waitForLoadState('domcontentloaded', { timeout: 8000 })
      .catch(() => undefined);
    /*
     * Wait for the header to actually exist and have been laid out.
     *
     * A fixed pause was the wrong tool. On a heavy homepage the navigation is still
     * being built at 1500ms, so every svg in it measured zero, the size gate rejected
     * all of them, and the logo quietly fell through to the app icon — a purple tile
     * instead of the wordmark. The failure was invisible because the import still
     * succeeded, just with the wrong picture.
     *
     * Waiting for the thing we are about to read is both faster on light pages and
     * correct on heavy ones. The pause afterwards is for webfonts and entrance
     * animations to settle, which no selector can tell us about.
     */
    await page
      .waitForSelector('header, nav, [class*="header"], [class*="navbar"]', { timeout: 6000 })
      .catch(() => null);
    await page.waitForTimeout(1200);

    const scraped = (await page.evaluate(scrapeInPage)) as Scraped;

    // A page that rendered nothing usable is a failure worth reporting, rather than an
    // empty brand presented as a successful import.
    if (!scraped.title && scraped.colors.length === 0) {
      throw new Error('That page did not load anything we could read.');
    }

    return interpret(scraped, url);
  } finally {
    await context.close();
  }
};

/* ---------- what runs inside the page ---------- */

/**
 * Serialised into the browser, so it can use no imports and no TypeScript at runtime.
 *
 * It collects colours from the elements that carry brand identity — buttons, links,
 * headers — rather than from every element on the page. A full sweep returns mostly
 * the greys of body text and borders, and the real colour gets lost in them.
 */
const scrapeInPage = (): Scraped => {
  const meta = (selector: string): string | undefined =>
    document.querySelector(selector)?.getAttribute('content')?.trim() || undefined;

  /*
   * Colours, weighted by how much the source actually means.
   *
   * The first version collected everything and trusted the order it happened to arrive
   * in, which meant a border colour from some CSS variable could outrank the background
   * of the primary button. Those are not equally good evidence: a company chooses the
   * colour of its main call-to-action deliberately, and nothing else on a page is
   * chosen with anything like that much care.
   *
   * So each source carries a weight, and the strongest wins. It is the difference
   * between "a colour from their site" and "their colour".
   */
  const scored: { value: string; weight: number }[] = [];
  const push = (value: string | null | undefined, weight: number) => {
    if (!value || value.includes('gradient')) return;
    scored.push({ value, weight });
  };

  // The strongest signal there is: a meta tag where they have written down their colour.
  push(meta('meta[name="theme-color"]'), 100);

  /*
   * Design-system variables, ranked by what they are called.
   *
   * A variable named --color-primary or --brand-accent is the brand colour stated
   * outright. A variable named --gray-300 is not, however early it appears.
   */
  const root = getComputedStyle(document.documentElement);
  for (let i = 0; i < root.length && i < 600; i++) {
    const name = root[i];
    if (!name.startsWith('--')) continue;
    const value = root.getPropertyValue(name).trim();
    if (!/^(#|rgb)/.test(value)) continue;

    const named = name.toLowerCase();
    if (/(gray|grey|neutral|slate|zinc|stone|white|black|border|muted|surface|background)/.test(named)) {
      continue;
    }
    if (/(brand|primary|accent)/.test(named)) push(value, 90);
    else if (/(action|cta|link|highlight|theme)/.test(named)) push(value, 70);
    else push(value, 25);
  }

  /*
   * The primary button.
   *
   * Taken from the first few buttons only, and from the top of the page, because the
   * one that matters is above the fold. A footer full of secondary links would
   * otherwise outvote it by sheer number.
   */
  const buttons = Array.from(
    document.querySelectorAll('button, a[class*="button"], a[class*="btn"], a[class*="cta"]'),
  ).slice(0, 10);

  for (const node of buttons) {
    const el = node as HTMLElement;
    const style = getComputedStyle(el);
    // A filled button's background is the brand colour. A ghost button's is transparent,
    // and then its text or border carries the colour instead.
    const background = style.backgroundColor;
    const filled = background && !/rgba\(0,\s*0,\s*0,\s*0\)|transparent/.test(background);
    push(background, filled ? 85 : 0);
    if (!filled) {
      push(style.color, 60);
      push(style.borderColor, 50);
    }
  }

  // Links and headings: real evidence, but weaker — plenty of sites leave these default.
  for (const selector of ['header a', 'nav a', 'h1', 'h2', 'a']) {
    for (const node of Array.from(document.querySelectorAll(selector)).slice(0, 8)) {
      push(getComputedStyle(node as Element).color, 35);
    }
  }

  scored.sort((a, b) => b.weight - a.weight);
  const colors = scored.filter((entry) => entry.weight > 0).map((entry) => entry.value);

  /*
   * Logo candidates, scored rather than listed in the order they were found.
   *
   * The old order put og:image above the page's own header image, and og:image is
   * almost always a social share card — a screenshot with a headline baked into it.
   * That is why imports kept coming back with something that was from the right company
   * and was not their logo.
   *
   * What we actually want is the mark in the top-left of their own page.
   */
  const logoScores: { url: string; score: number }[] = [];
  const addLogo = (value: string | null | undefined, score: number) => {
    if (value) logoScores.push({ url: value, score });
  };

  const header = document.querySelector('header, nav, [class*="header"], [class*="navbar"]');

  for (const img of Array.from(document.querySelectorAll('img')).slice(0, 60)) {
    const el = img as HTMLImageElement;
    const haystack = `${el.className} ${el.alt} ${el.src} ${el.id}`.toLowerCase();
    const looksLikeLogo = /logo|brand|wordmark|symbol|icon/.test(haystack);
    if (!looksLikeLogo) continue;

    // Inside the header beats anywhere else — a footer often carries a different lockup,
    // and a page body often carries customers' logos rather than their own.
    const inHeader = header ? header.contains(el) : false;
    // A very wide image is a wordmark or a banner rather than the icon.
    const ratio = el.naturalWidth && el.naturalHeight ? el.naturalWidth / el.naturalHeight : 1;
    const iconish = ratio > 0.5 && ratio < 2.2;

    addLogo(el.currentSrc || el.src, (inHeader ? 80 : 40) + (iconish ? 12 : 0));
  }

  /*
   * The inline <svg> that is actually the logo.
   *
   * Taking the first svg in the header was wrong in a way that only shows up on real
   * sites: the first one is very often a hamburger, a chevron or a search glyph, and
   * imports came back with an arrow icon where the brand mark should be. A header
   * usually contains several svgs and exactly one of them is the logo.
   *
   * What identifies it is not its shape but its *position in the document*: a logo is
   * the thing in the top-left that links to the homepage. That is a convention so
   * consistent it is effectively a rule, and it is far more reliable than anything that
   * could be guessed from the path data.
   */
  if (header) {
    const svgScores: { svg: SVGElement; score: number }[] = [];

    for (const node of Array.from(header.querySelectorAll('svg')).slice(0, 12)) {
      const el = node as SVGElement;
      const rect = el.getBoundingClientRect();

      // Too small to be a logo, or not rendered at all.
      if (rect.width < 20 || rect.height < 12) continue;

      let score = 30;

      // The strongest signal there is: it links to the homepage.
      const link = el.closest('a');
      const href = link?.getAttribute('href') ?? '';
      if (link && (href === '/' || href === '' || /^https?:\/\/[^/]+\/?$/.test(href))) {
        score += 45;
      }

      /*
       * What it calls itself, and what it sits inside, are different evidence.
       *
       * Both are good for recognising a logo — a link labelled "Stripe homepage" around
       * an svg labelled "Stripe logo" is about as clear as it gets. But only the svg's
       * own names can be grounds for rejecting one, and having that backwards cost real
       * accuracy: Stripe's logo sits inside a link whose class describes the navigation
       * it belongs to, a structural word in that class matched the blocklist, and the
       * actual logo was thrown away in favour of the app icon on every single import.
       *
       * A parent's class says where a thing is. Only the thing itself says what it is.
       */
      const own = `${el.getAttribute('class') ?? ''} ${el.getAttribute('aria-label') ?? ''} ${el.getAttribute('id') ?? ''}`.toLowerCase();
      const context = `${link?.getAttribute('aria-label') ?? ''} ${link?.getAttribute('class') ?? ''} ${link?.getAttribute('title') ?? ''}`.toLowerCase();
      const named = `${own} ${context}`;

      if (/logo|brand|wordmark/.test(named)) score += 40;
      // A logo is very often labelled as the way home rather than as a logo. Notion's
      // reads "Notion – Home" and links to /product, so the homepage rule misses it
      // entirely and this is the only signal left.
      else if (/\bhome\b/.test(named)) score += 34;

      // Judged on its own name only, and never over-ruling something that has actually
      // called itself a logo.
      const saysLogo = /logo|brand|wordmark/.test(own);
      if (
        !saysLogo &&
        /menu|hamburger|burger|close|arrow|chevron|caret|search|toggle|icon-|social|twitter|github|linkedin/.test(own)
      ) {
        continue;
      }

      /*
       * Icons are small and square; marks are bigger, and wordmarks are wide.
       *
       * A 24x24 svg in a header is a glyph with near-certainty — that is the size icon
       * sets are drawn at — so size does most of the separating on its own.
       */
      if (rect.width >= 80) score += 20;
      else if (rect.width >= 40) score += 8;
      if (rect.width / Math.max(rect.height, 1) > 1.8) score += 10;

      // Earlier in the header is more likely to be the logo, because that is where it goes.
      score += Math.max(0, 8 - svgScores.length * 2);

      svgScores.push({ svg: el, score });
    }

    svgScores.sort((a, b) => b.score - a.score);

    /*
     * An extracted svg has to survive being taken out of its page.
     *
     * Two failures that both look like "the logo is missing", and neither is visible
     * from the markup being present:
     *
     * A sprite reference. Plenty of sites draw icons as <use href="#some-id"> pointing
     * at a symbol defined elsewhere in the document. Lift the svg out and the reference
     * points at nothing, so it renders as an empty box — which is exactly what happened
     * to one of the three test sites.
     *
     * And `currentColor`, which resolves against inherited CSS that does not come with
     * it. On a page it is the brand colour; standing alone it is whatever the viewer's
     * default happens to be, which on a white card is often invisible.
     *
     * So each candidate is checked for drawable geometry of its own, and colours are
     * resolved to something concrete before it leaves.
     */
    for (const candidate of svgScores) {
      const clone = candidate.svg.cloneNode(true) as SVGElement;
      if (!clone.getAttribute('xmlns')) {
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      }

      let markup = new XMLSerializer().serializeToString(clone);
      if (markup.length > 40000) continue;

      // Points at a symbol that is not coming with it.
      if (/<use\b[^>]*(href|xlink:href)\s*=\s*["']#/.test(markup)) continue;

      // Nothing of its own to draw.
      if (!/<(path|circle|rect|ellipse|polygon|polyline|text)\b/.test(markup)) continue;

      /*
       * Give the svg the colour it inherited, without flattening it.
       *
       * Replacing every `currentColor` with one resolved value destroyed two-tone marks:
       * a logo whose outer shape is `currentColor` and whose inner detail is an explicit
       * white came out as a single solid blob. Setting `color` on the root instead lets
       * `currentColor` resolve exactly as it did on the page while anything with its own
       * fill keeps it — which is what the attribute is for.
       */
      const resolved = getComputedStyle(candidate.svg).color;
      if (resolved) clone.setAttribute('style', `color:${resolved}`);
      markup = new XMLSerializer().serializeToString(clone);

      addLogo(`data:image/svg+xml;utf8,${encodeURIComponent(markup)}`, Math.min(candidate.score, 92));
      break;
    }
  }

  addLogo(meta('meta[property="og:logo"]'), 75);
  // A maskable app icon: square, transparent, usually the mark on its own. Good.
  addLogo(document.querySelector<HTMLLinkElement>('link[rel*="apple-touch-icon"]')?.href, 70);
  addLogo(document.querySelector<HTMLLinkElement>('link[rel="icon"]')?.href, 55);
  addLogo(document.querySelector<HTMLLinkElement>('link[rel="shortcut icon"]')?.href, 50);
  // Last resort. Usually a share card with words on it, which is why it is last.
  addLogo(meta('meta[property="og:image"]'), 20);

  logoScores.sort((a, b) => b.score - a.score);
  const logoCandidates = logoScores.map((entry) => entry.url);

  // The hero. A company's homepage headline is the most carefully written sentence
  // they own — far better material than a meta description written for search engines.
  const text = (el: Element | null): string | undefined => {
    const value = el?.textContent?.replace(/\s+/g, ' ').trim();
    return value && value.length > 2 && value.length < 160 ? value : undefined;
  };

  const h1 = document.querySelector('h1');
  const headline = text(h1);

  // The line under the headline: the next block of prose inside the same section.
  let subhead: string | undefined;
  if (h1) {
    const section = h1.closest('section, header, div') ?? document.body;
    for (const node of Array.from(section.querySelectorAll('p, h2'))) {
      const value = text(node);
      if (value && value !== headline && value.split(' ').length >= 5) {
        subhead = value;
        break;
      }
    }
  }

  // What their own buttons say. "Start free trial" and "Book a demo" are two very
  // different companies, and neither is guessable from a description.
  const actions: string[] = [];
  const clickable = document.querySelectorAll(
    'a[class*="button"], a[class*="btn"], a[class*="cta"], button',
  );
  for (const node of Array.from(clickable).slice(0, 14)) {
    const value = text(node);
    if (value && value.split(' ').length <= 5) actions.push(value);
  }

  return {
    title: document.title?.trim() || undefined,
    siteName: meta('meta[property="og:site_name"]'),
    description:
      meta('meta[name="description"]') ||
      meta('meta[property="og:description"]') ||
      undefined,
    headline,
    subhead,
    actions,
    themeColor: meta('meta[name="theme-color"]'),
    bodyBackground: getComputedStyle(document.body).backgroundColor,
    colors,
    logoCandidates,
  };
};

/* ---------- turning what we found into a brand ---------- */

const interpret = (scraped: Scraped, url: string): SiteBrand => {
  const ranked = rankBrandColors(scraped.colors, 6);

  // A declared theme-color is the one colour the company explicitly chose to represent
  // itself to browsers, so it goes to the front of the list.
  const declared =
    scraped.themeColor && isUsable(scraped.themeColor)
      ? normalise(scraped.themeColor)
      : null;

  const options = declared
    ? [declared, ...ranked.filter((c) => c !== declared)].slice(0, 6)
    : ranked;

  /*
   * What they do, in their own words.
   *
   * The homepage headline plus its subhead beats a meta description almost every time:
   * the meta tag is written for search engines and is often a keyword list, while the
   * hero is the sentence a real person agonised over.
   */
  const headline = deduplicate(scraped.headline);
  const subhead = deduplicate(scraped.subhead);

  const fromHero = join(headline, subhead);
  const description =
    clean(fromHero && fromHero.length > 24 ? fromHero : undefined, 300) ??
    clean(scraped.description, 300);

  return {
    website: url,
    name: cleanName(scraped.siteName ?? scraped.title, url),
    description,
    tagline: clean(headline, 90),
    action: pickAction(scraped.actions),
    color: options[0],
    colorOptions: options,
    logoUrl: scraped.logoCandidates.find(isUsableLogo),
    mode: guessMode(scraped.bodyBackground),
  };
};

/**
 * The action they actually want people to take.
 *
 * Navigation words are filtered out — "Log in" and "Pricing" are on every site and say
 * nothing. What is left is the button they built the page around.
 */
const pickAction = (actions: string[]): string | undefined => {
  const ignore =
    /^(log ?in|sign ?in|menu|close|search|pricing|docs|blog|about|contact|home|careers|support|help|english|accept|cookies?)$/i;

  const candidate = actions.find(
    (action) => !ignore.test(action.trim()) && action.trim().length > 2,
  );

  return candidate ? clean(candidate, 40) : undefined;
};

/** theme-color arrives as anything CSS accepts; the rest of the list is hex. */
const normalise = (value: string): string => {
  const rgb = parseColor(value);
  return rgb ? toHex(rgb) : value.toUpperCase();
};

/**
 * theme-color is very often the page background rather than the brand colour.
 *
 * Linear declares near-black and Vercel declares near-white; taking either literally
 * produces a video in a colour the company never chose. Only accept it when it is
 * actually a colour.
 */
const isUsable = (value: string): boolean => {
  const rgb = parseColor(value);
  return rgb !== null && hasCharacter(rgb);
};

const guessMode = (background: string | undefined): 'dark' | 'light' | undefined => {
  if (!background) return undefined;
  const match = background.match(/\d+/g);
  if (!match || match.length < 3) return undefined;
  const [r, g, b] = match.map(Number);
  return (r + g + b) / 3 < 110 ? 'dark' : 'light';
};

/**
 * Page titles are full of marketing furniture: "Pine — The calm note app | Home".
 * Cutting at the first separator gets the name; the rest is a tagline.
 */
const cleanName = (raw: string | undefined, url: string): string | undefined => {
  if (!raw) return hostName(url);

  const name = raw.split(/[|–—·:]/)[0].trim();
  if (name.length === 0 || name.length > 40) return hostName(url);
  return name;
};

const hostName = (url: string): string | undefined => {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').split('.')[0];
    return host ? host[0].toUpperCase() + host.slice(1) : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Collapse text that repeats itself.
 *
 * Animated heroes render the same sentence several times in one element — one copy
 * visible, the rest stacked behind for the transition — and `textContent` returns all
 * of them. Linear's homepage comes back as its headline three times over.
 *
 * Finding the shortest prefix the whole string is built from catches it without
 * touching sentences that merely happen to repeat a word.
 */
const deduplicate = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  const text = value.trim();
  if (text.length < 24) return text;

  // The copies are rarely byte-identical — Linear's differ by a missing space where a
  // line break used to be — so the check ignores spacing and case entirely and works
  // on a stripped version, mapping positions back to the original at the end.
  const stripped: string[] = [];
  const positions: number[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (/\s/.test(ch)) continue;
    stripped.push(ch.toLowerCase());
    positions.push(i);
  }

  const key = stripped.slice(0, 14).join('');
  if (key.length < 14) return text;

  // Where does the opening reappear? That index is where the second copy starts.
  const repeat = stripped.join('').indexOf(key, 1);
  if (repeat === -1) return text;

  return text.slice(0, positions[repeat]).trim();
};

/** Join two sentences without producing "together.. Capture context". */
const join = (first?: string, second?: string): string | undefined => {
  if (!first) return second;
  if (!second) return first;

  const separator = /[.!?]$/.test(first.trim()) ? ' ' : '. ';
  return `${first.trim()}${separator}${second.trim()}`;
};

const clean = (value: string | undefined, max: number): string | undefined => {
  if (!value) return undefined;
  const text = value.replace(/\s+/g, ' ').trim();
  return text.length > 0 ? text.slice(0, max) : undefined;
};

const isHttp = (value: string): boolean => /^https?:\/\//i.test(value);

/**
 * A logo we can actually keep.
 *
 * Normally a URL to fetch. The exception is an inline <svg> lifted straight out of the
 * page, which has no URL at all — and which is very often the real mark, because a
 * company that cares about its logo tends to ship it as vector markup rather than as a
 * bitmap. Carried across as a data URL so the one case that matters most is not the one
 * case we drop.
 */
const isUsableLogo = (value: string): boolean =>
  isHttp(value) || value.startsWith('data:image/svg+xml');

/**
 * Accept what people actually type.
 *
 * Nobody types "https://". Requiring it would turn the single most valuable field in
 * onboarding into an error message.
 */
export const normaliseUrl = (raw: string): string => {
  const trimmed = raw.trim();
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  const parsed = new URL(withScheme);
  if (!parsed.hostname.includes('.')) throw new Error('That does not look like a website.');

  // Only ever fetch public web addresses. Without this check, a hostname pointing at
  // an internal address turns this endpoint into a way to make our server read things
  // on its own network that nobody outside should be able to reach.
  if (isPrivateHost(parsed.hostname)) {
    throw new Error('That address cannot be reached from here.');
  }

  return parsed.toString();
};

const isPrivateHost = (hostname: string): boolean => {
  const host = hostname.toLowerCase();

  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) {
    return true;
  }
  if (host === '0.0.0.0' || host === '::1' || host === '[::1]') return true;

  // IPv4 ranges reserved for private networks and link-local metadata services.
  const parts = host.split('.').map(Number);
  if (parts.length === 4 && parts.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)) {
    const [a, b] = parts;
    if (a === 10 || a === 127) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 169 && b === 254) return true;
  }

  return false;
};
