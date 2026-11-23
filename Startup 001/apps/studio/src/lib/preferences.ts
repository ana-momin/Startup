import type { FormatName, LengthPreference, Tone } from '@motion/planner';

/**
 * What every new video starts from.
 *
 * Kept in this browser rather than on the server: these are workspace preferences, not
 * account data, and somebody who works on a laptop and a desktop usually wants
 * different defaults on each — a vertical-first phone setup and a wide-first monitor.
 *
 * Setting these once is the difference between choosing three things per video and
 * choosing none, which over a week of daily use is the whole feeling of the product.
 */
export type Preferences = {
  format: FormatName;
  length: LengthPreference;
  /** Undefined means "let each video choose what suits it". */
  tone?: Tone;
  /** Stop the interface animating. Videos are unaffected. */
  reduceMotion: boolean;
  /** Whether a video starts playing as soon as it opens. */
  autoplay: boolean;
};

const KEY = 'motion.preferences';

export const DEFAULTS: Preferences = {
  format: 'landscape',
  length: 'standard',
  tone: undefined,
  reduceMotion: false,
  autoplay: true,
};

export const loadPreferences = (): Preferences => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;

    const parsed = JSON.parse(raw) as Partial<Preferences>;

    // Merged onto the defaults rather than trusted wholesale: a preferences object
    // saved by an older version is missing whatever was added since, and a missing
    // field should mean "use the default", not "undefined".
    return {
      ...DEFAULTS,
      ...parsed,
      format: isFormat(parsed.format) ? parsed.format : DEFAULTS.format,
      length: isLength(parsed.length) ? parsed.length : DEFAULTS.length,
      tone: isTone(parsed.tone) ? parsed.tone : undefined,
      reduceMotion: parsed.reduceMotion === true,
      autoplay: parsed.autoplay !== false,
    };
  } catch {
    return DEFAULTS;
  }
};

export const savePreferences = (preferences: Preferences): void => {
  try {
    localStorage.setItem(KEY, JSON.stringify(preferences));
  } catch {
    // Private browsing blocks storage. Losing a preference is survivable; crashing
    // the app over one is not.
  }
};

const isFormat = (value: unknown): value is FormatName =>
  value === 'landscape' || value === 'vertical' || value === 'square';

const isLength = (value: unknown): value is LengthPreference =>
  value === 'short' || value === 'standard' || value === 'long';

const isTone = (value: unknown): value is Tone =>
  value === 'clean' || value === 'bold' || value === 'editorial' || value === 'kinetic';
