import {
  contrast,
  ensureContrast,
  fromHsl,
  isDark,
  mix,
  parseColor,
  toHex,
  toHsl,
} from './color.ts';
import type { Palette } from './types.ts';

/**
 * The colour script.
 *
 * Borrowed from animation, where a colour script is a strip of the whole film in
 * thumbnails, made before anything is animated, to decide what each sequence *feels*
 * like. It is the thing that stops a film being one mood for ninety minutes.
 *
 * Our videos had no such thing. Every palette we shipped was near-black — #06070F,
 * #030B08, #0A0A0A — and every scene used the same one. So whatever changed in the
 * layout, the typography or the motion, each video was a dark slide with a coloured
 * line on it, and they all looked like each other because at the level the eye reads
 * first, they *were* each other.
 *
 * Colour is the most powerful tool in graphic design and we were using one of them.
 * Here every scene gets its own full-frame treatment, and the sequence is composed:
 * white, white, the brand colour filling the entire frame, white, black. That single
 * change does more for a video than every layout in the composition library, because a
 * cut from white to a full field of colour is *felt* before it is read.
 */

/** One scene's full-frame treatment. */
export type Frame = {
  /** Fills the entire frame. */
  bg: string;
  /** Headlines. */
  text: string;
  /** Supporting text. */
  muted: string;
  /** Rules, marks, emphasis. */
  accent: string;
  /**
   * Whether the brand colour is filling the frame.
   *
   * Scenes need to know: on a colour field the accent *is* the background, so emphasis
   * has to come from the text colour instead, and a coloured rule would be invisible.
   */
  field: boolean;
  /** Whether this frame is dark, for choosing shadows and image treatments. */
  dark: boolean;
};

/**
 * The shapes a colour script can take.
 *
 * Each is a real editorial decision about where the energy of the film sits, not a
 * random ordering. They are written as roles rather than colours so the same shape works
 * for any brand.
 */
type Beat = 'paper' | 'field' | 'ink' | 'tint';

type Shape = { name: string; beats: Beat[] };

const SHAPES: Shape[] = [
  // Quiet, then one moment of full colour. The commonest and the most useful: the field
  // lands exactly where the argument does.
  { name: 'one-moment', beats: ['paper', 'paper', 'field', 'paper', 'ink'] },
  // Opens and closes in colour, calm in between. Feels like a brand film.
  { name: 'bookend', beats: ['field', 'paper', 'paper', 'tint', 'field'] },
  // Builds to darkness. Suits a product that ends on something serious.
  { name: 'nightfall', beats: ['paper', 'tint', 'paper', 'ink', 'ink'] },
  // Alternates hard. Punchy, for short social pieces.
  { name: 'strobe', beats: ['field', 'paper', 'field', 'paper', 'field'] },
  // All light, colour only in the elements. The most restrained, and often the best.
  { name: 'gallery', beats: ['paper', 'paper', 'tint', 'paper', 'paper'] },
  // Dark throughout with one bright break. For brands that really are dark.
  { name: 'midnight', beats: ['ink', 'ink', 'field', 'ink', 'ink'] },
];

/**
 * Which shapes each direction is allowed.
 *
 * The references differ most visibly in how loudly they use colour, and that is a choice
 * about the film rather than about the brand:
 *
 * - The typographic film uses full-frame colour as whole scenes and lets the colour
 *   change carry the cut. It needs the shapes with fields in them.
 * - The product-led film is near-white with enormous negative space and a bold colour
 *   moment as punctuation. One field, placed well.
 * - The camera-led film is light and soft the whole way through; a hard cut to a field
 *   would break the continuous move that is the entire point of it.
 *
 * Nothing is forbidden outright to a brand that is genuinely dark — `mode: 'dark'`
 * inverts whichever shape is chosen, so a dark brand still gets a dark film.
 */
const BY_STYLE: Record<string, string[]> = {
  typographic: ['strobe', 'bookend', 'one-moment'],
  'product-led': ['one-moment', 'gallery', 'bookend'],
  'camera-led': ['gallery', 'one-moment'],
};

export type ScriptOptions = {
  /** How many scenes need a treatment. */
  scenes: number;
  /** The brand's palette. Its accent is the colour that fills a field. */
  palette: Palette;
  /** Light or dark overall. Light unless the brand insists otherwise. */
  mode?: 'light' | 'dark';
  /** 0-1, from the video's seed. Picks the shape. */
  pick?: number;
  /**
   * The direction the director chose, which narrows the shapes.
   *
   * Without it the shape was pure seed: a film built to be carried by its camera could
   * be handed a strobe, and then the camera and the colour were telling two different
   * stories at the same time.
   */
  style?: string;
};

export const colorScript = ({
  scenes,
  palette,
  mode = 'light',
  pick = 0,
  style,
}: ScriptOptions): Frame[] => {
  const accent = parseColor(palette.accent) ?? { r: 90, g: 110, b: 255 };

  /*
   * Paper is tinted with the brand's own hue, never pure white.
   *
   * A brand colour on #FFFFFF looks like a colour on a browser default. The same colour
   * on a paper that carries two percent of its own hue looks like it was chosen, because
   * the whole frame now belongs to one family. It is a two-line change and it is most of
   * the difference between "designed" and "styled".
   */
  const hue = toHsl(accent).h;
  const paperRgb = fromHsl({ h: hue, s: 0.14, l: 0.975 });
  const inkRgb = fromHsl({ h: hue, s: 0.3, l: 0.07 });

  const paper = toHex(paperRgb);
  const ink = toHex(inkRgb);

  /*
   * Text on a colour field is whichever of black or white can actually be read on it.
   *
   * Not a preference — a measurement. A brand yellow needs black text and a brand navy
   * needs white, and guessing wrong makes the most striking frame in the video the one
   * nobody can read.
   */
  const onField = contrast(accent, inkRgb) > contrast(accent, paperRgb) ? inkRgb : paperRgb;

  /*
   * The shape, from the seed, out of whatever the direction allows.
   *
   * The seed still chooses — two typographic films are not the same film — but it
   * chooses from a shortlist the direction agrees with.
   */
  const names = style ? BY_STYLE[style] : undefined;
  const pool: Shape[] =
    names === undefined ? SHAPES : SHAPES.filter((s) => names.includes(s.name));
  const shapes = pool.length > 0 ? pool : SHAPES;
  const shape = shapes[Math.floor(Math.min(Math.max(pick, 0), 0.999) * shapes.length)];

  // A dark brand inverts the whole script: paper becomes ink and back.
  const beats = mode === 'dark' ? shape.beats.map(invert) : shape.beats;

  return Array.from({ length: scenes }, (_, i) => {
    const beat = beats[i % beats.length];
    return frameFor(beat, { accent, paperRgb, inkRgb, onField, paper, ink, palette });
  });
};

const invert = (beat: Beat): Beat =>
  beat === 'paper' ? 'ink' : beat === 'ink' ? 'paper' : beat;

const frameFor = (
  beat: Beat,
  ctx: {
    accent: { r: number; g: number; b: number };
    paperRgb: { r: number; g: number; b: number };
    inkRgb: { r: number; g: number; b: number };
    onField: { r: number; g: number; b: number };
    paper: string;
    ink: string;
    palette: Palette;
  },
): Frame => {
  const { accent, paperRgb, inkRgb, onField, paper, ink } = ctx;

  switch (beat) {
    case 'field': {
      // The brand colour, edge to edge. The loudest thing the video can do, which is
      // why a script gets one or two of them and not five.
      const on = toHex(onField);
      return {
        bg: toHex(accent),
        text: on,
        // Not a grey: a tinted step towards the background, so supporting text on a
        // colour field still belongs to it.
        muted: toHex(mix(onField, accent, 0.32)),
        accent: on,
        field: true,
        dark: isDark(accent),
      };
    }

    case 'ink': {
      const readable = toHex(ensureContrast(accent, inkRgb, 4.5, 'lighter'));
      return {
        bg: ink,
        text: paper,
        muted: toHex(mix(paperRgb, inkRgb, 0.42)),
        accent: readable,
        field: false,
        dark: true,
      };
    }

    case 'tint': {
      /*
       * A wash of the brand colour: present, but text still sits on it comfortably.
       *
       * The step between paper and a full field. Without it a script only has two
       * volumes — silent and shouting — and everything in between has to be faked with
       * elements rather than with the frame itself.
       */
      const washed = mix(paperRgb, accent, 0.12);
      const readable = toHex(ensureContrast(accent, washed, 4.5, 'darker'));
      return {
        bg: toHex(washed),
        text: ink,
        muted: toHex(mix(inkRgb, washed, 0.45)),
        accent: readable,
        field: false,
        dark: false,
      };
    }

    case 'paper':
    default: {
      // The accent has to survive being put on near-white, which a pale brand colour
      // does not do on its own.
      const readable = toHex(ensureContrast(accent, paperRgb, 4.5, 'darker'));
      return {
        bg: paper,
        text: ink,
        muted: toHex(mix(inkRgb, paperRgb, 0.45)),
        accent: readable,
        field: false,
        dark: false,
      };
    }
  }
};
