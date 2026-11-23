/**
 * The VideoSpec: the contract between "understanding the request" and "drawing the
 * video".
 *
 * This is the most important type in the product. A rule-based planner can fill it in;
 * so can a language model. Because the drawing side only ever sees a VideoSpec, the
 * brain can be swapped without touching a single animation.
 *
 * It is also what makes editing possible: "make scene 2 shorter" is a change to this
 * object, not a re-roll of a video. That is the thing diffusion tools cannot do.
 */

/**
 * Output formats our first users actually need.
 *
 * Kept here rather than in the engine because these describe what a *video* is, and the
 * server needs them without pulling React in behind them.
 */
export const FORMATS = {
  /** YouTube, landing pages, X posts. */
  landscape: { width: 1920, height: 1080 },
  /** Reels, TikTok, Shorts. */
  vertical: { width: 1080, height: 1920 },
  /** Feed posts. */
  square: { width: 1080, height: 1080 },
} as const;

export type FormatName = keyof typeof FORMATS;

/**
 * The overall feel.
 *
 * Tone is the single biggest lever on whether two videos look like different films or
 * the same template twice. It changes type scale, weight, alignment, colour blocking
 * and how the motion behaves — not just a colour.
 */
export type Tone =
  /** Calm, centred, generous space. The safe default. */
  | 'clean'
  /** Heavy type, tight tracking, hard colour blocks, fast snaps. */
  | 'bold'
  /** Left-aligned, slower, more text, magazine-like. */
  | 'editorial'
  /** Big words, quick cuts, scale-driven motion. Made for vertical. */
  | 'kinetic';

export type Palette = {
  /** Page background. */
  bg: string;
  /** Main brand colour: highlights, buttons, key words. */
  accent: string;
  /** Lighter accent for secondary emphasis. */
  accentSoft: string;
  /** Headline colour. */
  text: string;
  /** Supporting text colour. */
  muted: string;
};

/** Where a scene's content sits. Some tones prefer one over the other. */
export type Align = 'center' | 'left';

/**
 * Layout variants.
 *
 * The single biggest reason two videos look like the same template is that every scene
 * of a given kind is drawn the same way. A variant changes the actual arrangement —
 * where things sit, how they enter, what scale they are — so a title scene in one video
 * does not look like a title scene in the next.
 */
export type TitleLayout = 'center' | 'left' | 'stack';
export type ListLayout = 'center' | 'left' | 'grid';

/**
 * Background motifs.
 *
 * A quiet geometric pattern behind everything. Barely noticed on its own, but it is
 * what stops the background being the same drifting glow in every single video — and
 * it costs almost nothing to draw.
 */
export type Motif = 'none' | 'grid' | 'dots' | 'rings' | 'beams' | 'scan';

export type ScenePlan =
  | {
      kind: 'title';
      badge?: string;
      headline: string;
      sub?: string;
      align?: Align;
      layout?: TitleLayout;
      duration: number;
    }
  | {
      /** Kinetic typography: a few words, one at a time, filling the frame. */
      kind: 'bigword';
      words: string[];
      duration: number;
    }
  | {
      kind: 'features';
      heading: string;
      items: string[];
      align?: Align;
      layout?: ListLayout;
      duration: number;
    }
  | {
      /** Numbered steps. Reads as a process rather than a list of benefits. */
      kind: 'steps';
      heading: string;
      items: string[];
      duration: number;
    }
  | {
      kind: 'stat';
      prefix?: string;
      value: number;
      suffix?: string;
      label: string;
      duration: number;
    }
  | {
      kind: 'quote';
      quote: string;
      author?: string;
      duration: number;
    }
  | {
      /** A brand card: the name, optionally a line under it. */
      kind: 'logo';
      name: string;
      tagline?: string;
      duration: number;
    }
  | {
      /**
       * The product, on screen.
       *
       * The interface is synthesised from the brand rather than screenshotted, which is
       * the only way this can work from a prompt: nobody uploads anything, and it is on
       * brand by construction. It is honest about what it is — a representation of the
       * product, the way an illustration in a brochure is — and it is the scene a SaaS
       * founder actually wants, because "here is the thing" beats any amount of
       * describing it.
       */
      kind: 'product';
      heading?: string;
      caption?: string;
      /** What it is running on. */
      device?: DeviceKind;
      /** Which kind of interface to draw. */
      surface?: SurfaceKind;
      /** Shown in the address bar. Their own domain, if we know it. */
      domain?: string;
      /** Labels for the interface: nav items, row titles, whatever the surface uses. */
      labels?: string[];
      duration: number;
    }
  | {
      /**
       * A number that draws itself.
       *
       * A statistic spoken aloud is a claim; a statistic drawn in front of you is
       * evidence. Values are only ever what the planner was given — nothing here
       * invents a number.
       */
      kind: 'chart';
      heading?: string;
      chart: ChartKind;
      series: ChartPoint[];
      /** Appended to every value: '%', 'k', 'ms'. */
      unit?: string;
      caption?: string;
      duration: number;
    }
  | {
      /**
       * A process: states with arrows between them.
       *
       * A list says "here are some things that exist". A flow says "this becomes that",
       * which is almost always the actual claim a product is making — and it is the
       * clearest way to show that something happens in an order.
       */
      kind: 'flow';
      heading?: string;
      /** Two to four states, in order. */
      steps: string[];
      caption?: string;
      duration: number;
    }
  | {
      /**
       * Fragments of the interface, scattered in space.
       *
       * A single window says "here is a screenshot". Six fragments at six scales say
       * "there is a lot of this and you are seeing part of it" — a stronger claim, and an
       * honest one, because showing a corner implies the rest without inventing it.
       */
      kind: 'constellation';
      heading?: string;
      items: string[];
      caption?: string;
      duration: number;
    }
  | {
      /**
       * Words over moving interface.
       *
       * The one scene where type and product share the frame instead of taking turns.
       * The cards pass behind the line, clipped by both edges, so the shot reads as a
       * view onto a working product rather than a caption above a picture of one.
       */
      kind: 'overlay';
      heading: string;
      /** Names for the cards passing behind — their real features where we know them. */
      items: string[];
      duration: number;
    }
  | {
      kind: 'outro';
      headline: string;
      cta?: string;
      duration: number;
    };

/** What the product scene is running on. */
export type DeviceKind = 'browser' | 'phone';

/**
 * The kinds of interface we know how to draw.
 *
 * Deliberately a small, closed set. A model free to invent screens would produce a
 * different-looking product every time it was asked, which is the opposite of what a
 * brand video is for.
 */
export type SurfaceKind =
  /** Sidebar, metric tiles, a chart block. The default shape of B2B software. */
  | 'dashboard'
  /** Rows arriving one at a time, with a toggle. Inboxes, tasks, tables. */
  | 'list'
  /** Messages alternating. Support tools, assistants, anything conversational. */
  | 'chat'
  /** A document with text filling in. Writing and editing tools. */
  | 'editor';

export type ChartKind = 'bars' | 'line' | 'donut';

export type ChartPoint = {
  label: string;
  value: number;
};

export type SceneKind = ScenePlan['kind'];

/**
 * The direction a video is made in.
 *
 * Chosen by the director from the reference styles, and carried on the spec because the
 * renderer needs it — how much the camera moves and how heavily colour is used are
 * different answers for a product tour and a typographic piece.
 */
export type VideoStyle = 'product-led' | 'typographic' | 'camera-led';

export type VideoSpec = {
  /** The direction this film was made in, when the director chose one. */
  style?: VideoStyle;
  /** One line on why that direction suits the brief, for the person to read. */
  styleWhy?: string;

  /** Short name shown in the UI. */
  title: string;
  /** The request this was built from, kept so we can re-plan after an edit. */
  prompt: string;
  format: FormatName;
  tone: Tone;
  /** Background pattern for the whole video. */
  motif?: Motif;
  fps: number;
  palette: Palette;
  scenes: ScenePlan[];

  /**
   * The brand this video belongs to.
   *
   * Stored on the spec rather than looked up at render time, because a video should
   * keep looking the way it looked when it was approved. Changing a brand's colour
   * next month must not silently rewrite last month's finished videos.
   */
  brandId?: string;
  brandName?: string;
  /** Where the logo image lives, ready for the renderer to load. */
  logoUrl?: string;
  /** Show the logo quietly in the corner of every scene. */
  watermark?: boolean;
};

/** Total length of a spec, in frames, before scene overlap is taken off. */
export const specDuration = (spec: VideoSpec): number =>
  spec.scenes.reduce((total, scene) => total + scene.duration, 0);
