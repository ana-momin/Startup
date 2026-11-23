import type { FormatName, Palette } from './types.ts';

/**
 * A Brief: what the prompt actually asked for, once it has been understood.
 *
 * This sits between reading the prompt and directing the video, and separating the two
 * is the point. Reading is a language problem; directing is a design problem. Keeping
 * them apart means the reading half can be handed to a real model later while the
 * directing half — where our taste lives — stays exactly as it is.
 */

export type Intent =
  /** A new thing exists. Open with impact. */
  | 'launch'
  /** Show what it does. Lead with the list. */
  | 'feature'
  /** A number worth celebrating. Lead with the number. */
  | 'milestone'
  /** Someone else's words. Let them breathe. */
  | 'testimonial'
  /** Time-limited. Urgency and a hard call to action. */
  | 'promo'
  /** Teach something. Steady pace, more room per point. */
  | 'explainer'
  /** Nothing specific detected. A safe, balanced shape. */
  | 'generic';

export type StatFact = {
  prefix?: string;
  value: number;
  suffix?: string;
  label: string;
};

export type QuoteFact = {
  text: string;
  author?: string;
};

export type Brief = {
  /** The original prompt, untouched. */
  prompt: string;

  /** What kind of video this is. Decides the scene order. */
  intent: Intent;

  /** The thing being talked about: "Pine", "Acme Pro". */
  product?: string;

  /** The main line on screen. Always present. */
  headline: string;

  /** A supporting line under the headline, when the prompt gave us one worth showing. */
  subtitle?: string;

  /** Small label above the headline: "Introducing", "Now in beta". */
  badge?: string;

  /** Bullet points, already cleaned and capped to a readable number. */
  features: string[];

  /** A headline number, if the prompt contained one worth animating. */
  stat?: StatFact;

  /** A testimonial or pull quote. */
  quote?: QuoteFact;

  /** Closing line and button text. */
  outro: string;
  cta: string;

  /** Look and shape. */
  palette: Palette;
  format: FormatName;
};
