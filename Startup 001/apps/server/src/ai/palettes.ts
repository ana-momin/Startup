import type { Palette } from '@motion/planner';

/**
 * The palettes the director may choose from.
 *
 * A fixed set rather than free-form colour, because a language model asked for "nice
 * colours" will happily return combinations with no contrast, or a body text grey that
 * disappears on its own background. Every palette here has been checked as a whole:
 * text on background, accent on background, muted still readable.
 *
 * A brand hex from the user always overrides this — their colour is not a suggestion.
 */
export const PALETTES = {
  midnight: {
    bg: '#06070F',
    accent: '#6C9BFF',
    accentSoft: '#A7C2FF',
    text: '#FFFFFF',
    muted: '#8B90A6',
  },
  ember: {
    bg: '#0D0604',
    accent: '#FF7A45',
    accentSoft: '#FFB08A',
    text: '#FFFFFF',
    muted: '#A08A80',
  },
  forest: {
    bg: '#030B08',
    accent: '#3ED598',
    accentSoft: '#8FE9C4',
    text: '#FFFFFF',
    muted: '#7E9A8E',
  },
  violet: {
    bg: '#0A0616',
    accent: '#A87AFF',
    accentSoft: '#C9AEFF',
    text: '#FFFFFF',
    muted: '#948AAE',
  },
  mono: {
    bg: '#0A0A0A',
    accent: '#FFFFFF',
    accentSoft: '#D6D6D6',
    text: '#FFFFFF',
    muted: '#7A7A7A',
  },
  gold: {
    bg: '#0C0A04',
    accent: '#E8B44A',
    accentSoft: '#F5D896',
    text: '#FFFFFF',
    muted: '#9C9078',
  },
  ocean: {
    bg: '#030A10',
    accent: '#39C2D8',
    accentSoft: '#8FE2EE',
    text: '#FFFFFF',
    muted: '#7794A0',
  },
  rose: {
    bg: '#100509',
    accent: '#FF6B8A',
    accentSoft: '#FFA8BB',
    text: '#FFFFFF',
    muted: '#A8808A',
  },
} as const satisfies Record<string, Palette>;

export type PaletteName = keyof typeof PALETTES;
