import type { Random } from '@motion/engine';
import type { Tone, VideoStyle } from '@motion/planner';

/**
 * Art direction.
 *
 * Tone already controlled how fast things move and how heavy the type is. What it could
 * never control is the thing a designer actually decides first: what *kind* of piece
 * this is. A financial report, a fashion campaign and a developer tool launch can share
 * a palette, a tone of voice and a running order and still look nothing alike, because
 * the typography, the density of the grid, the presence of rules and labels, and the way
 * colour is used are all different decisions.
 *
 * A look bundles those decisions so they stay consistent with each other. That mutual
 * consistency is the whole point — a serif headline over a technical corner-marker grid
 * is not a new look, it is two looks fighting. Bundling them means a video can be varied
 * without being incoherent, which is the difference between range and randomness.
 *
 * Type families are deliberately generic CSS stacks rather than bundled font files.
 * Shipping a typeface means checking its licence for embedding and redistribution, and
 * the licence rule on this project is absolute — so until a specific open-licensed family
 * is chosen and checked, the looks vary weight, tracking, case, scale contrast and
 * colour instead. That is most of the difference anyway; a serif and a sans set at the
 * same weight and tracking look more alike than two sans cuts set differently.
 */

export type LookName = 'studio' | 'press' | 'signal' | 'poster' | 'bloom' | 'broadcast';

export type Look = {
  name: LookName;
  /** What it is for, in one line. Shown in the editor so the choice is legible. */
  intent: string;

  /* ---- type ---- */
  headlineFamily: string;
  labelFamily: string;
  /** Added to the tone's weight. Negative makes a look lighter throughout. */
  weightShift: number;
  /** Added to the tone's tracking, as a fraction of font size. */
  trackingShift: number;
  /** Force uppercase headlines, force lowercase, or leave the tone to decide. */
  case: 'upper' | 'sentence' | 'tone';
  /**
   * How much bigger a headline is than its supporting line.
   *
   * The single most characteristic number in a typographic system. Editorial work sits
   * near 3; a poster is 8 or more, which is why a poster reads as a poster even in
   * silhouette.
   */
  contrast: number;

  /* ---- the grid ---- */
  /** Safe margin as a fraction of the shorter side. Bigger reads calmer and more premium. */
  margin: number;

  /* ---- colour ---- */
  /** How colour is used beyond the accent: as blocks, as fine lines, or barely at all. */
  colour: 'block' | 'line' | 'wash';

  /* ---- furniture ---- */
  furniture: 'full' | 'minimal' | 'none';

  /* ---- motion ---- */
  /** Transitions this look will use. */
  cuts: ('rise' | 'wipe' | 'push' | 'iris' | 'fade' | 'split')[];
  /** Multiplier on how far the camera travels. */
  motionShift: number;
  /**
   * Average character width as a fraction of font size, for this look's headline face.
   *
   * Type cannot be measured without laying it out, and laying it out would make a frame
   * depend on fonts having loaded — which would break the rule that a frame is a pure
   * function of its inputs. So it is estimated, and the estimate has to belong to the
   * look, because a serif at a given size is meaningfully wider than a grotesque and
   * sizing both with one number overflows one of them.
   *
   * Measured by eye against the real faces at display sizes, then rounded up, because
   * type one step small looks considered and type one step large looks broken.
   */
  charRatio: number;
};

export const LOOKS: Record<LookName, Look> = {
  /** The safe, confident default. Nothing unusual, nothing wrong. */
  studio: {
    name: 'studio',
    intent: 'Clear and confident. The safe choice for almost anything.',
    headlineFamily: "'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif",
    labelFamily: "'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif",
    weightShift: 0,
    trackingShift: 0,
    case: 'tone',
    contrast: 4,
    margin: 0.072,
    colour: 'block',
    furniture: 'full',
    cuts: ['rise', 'wipe', 'push', 'fade'],
    motionShift: 1,
    charRatio: 0.52,
  },

  /**
   * Editorial. Tight grid, low contrast, rules doing the structural work.
   * Reads as considered because it is the only look that does not raise its voice.
   */
  press: {
    name: 'press',
    intent: 'Considered and editorial. For explaining something properly.',
    headlineFamily: "Georgia, 'Times New Roman', 'Iowan Old Style', serif",
    labelFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
    weightShift: -100,
    trackingShift: 0.012,
    case: 'sentence',
    contrast: 2.8,
    margin: 0.09,
    colour: 'line',
    furniture: 'full',
    cuts: ['rise', 'fade', 'wipe'],
    motionShift: 0.6,
    charRatio: 0.58,
  },

  /**
   * Technical. Monospace labels, tight tracking, hard cuts, everything on the grid.
   * The look developer tools have used for a decade, because it says "made by people who
   * read documentation" faster than any sentence could.
   */
  signal: {
    name: 'signal',
    intent: 'Technical and precise. For developer and infrastructure products.',
    headlineFamily: "'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif",
    labelFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
    weightShift: 40,
    trackingShift: -0.012,
    case: 'sentence',
    contrast: 3.4,
    margin: 0.055,
    colour: 'line',
    furniture: 'full',
    cuts: ['wipe', 'push', 'split'],
    motionShift: 0.85,
    charRatio: 0.51,
  },

  /**
   * Poster. Enormous type, extreme contrast, colour in blocks rather than accents.
   * Says one thing loudly, which is why it needs short copy and gets checked for it.
   */
  poster: {
    name: 'poster',
    intent: 'Loud and graphic. For a single message, short and hard.',
    headlineFamily: "'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif",
    labelFamily: "'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif",
    weightShift: 100,
    trackingShift: -0.03,
    case: 'upper',
    contrast: 8,
    margin: 0.045,
    colour: 'block',
    furniture: 'minimal',
    cuts: ['push', 'split', 'wipe'],
    motionShift: 1.25,
    charRatio: 0.55,
  },

  /**
   * Soft. Light weights, wide tracking, a lot of air, almost no furniture.
   * The only look that is mostly about what it leaves out.
   */
  bloom: {
    name: 'bloom',
    intent: 'Calm and spacious. For wellbeing, design and consumer brands.',
    headlineFamily: "'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif",
    labelFamily: "'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif",
    weightShift: -180,
    trackingShift: 0.01,
    case: 'sentence',
    contrast: 3,
    margin: 0.11,
    colour: 'wash',
    furniture: 'none',
    cuts: ['fade', 'rise', 'iris'],
    motionShift: 0.55,
    charRatio: 0.5,
  },

  /**
   * Broadcast. Bands, lower thirds, strong accent blocks, fast snaps.
   * Built for a feed, where a video has under a second to say what it is.
   */
  broadcast: {
    name: 'broadcast',
    intent: 'Punchy and immediate. Built for social feeds.',
    headlineFamily: "'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif",
    labelFamily: "'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif",
    weightShift: 60,
    trackingShift: -0.02,
    case: 'upper',
    contrast: 5.5,
    margin: 0.06,
    colour: 'block',
    furniture: 'minimal',
    cuts: ['push', 'wipe', 'split', 'iris'],
    motionShift: 1.15,
    charRatio: 0.54,
  },
};

/**
 * Looks that suit each tone.
 *
 * Tone is what the words are doing and look is how the frame is dressed, so not every
 * pairing makes sense: a kinetic script set in a serif with nine percent margins is a
 * contradiction the viewer feels even if they cannot name it. Constraining the pairing is
 * what keeps variation from becoming noise.
 */
const BY_TONE: Record<Tone, LookName[]> = {
  clean: ['studio', 'signal', 'bloom', 'press'],
  bold: ['poster', 'broadcast', 'studio'],
  editorial: ['press', 'studio', 'bloom'],
  kinetic: ['broadcast', 'poster'],
};

/**
 * Looks that suit each direction.
 *
 * The director now states what kind of film this is before anything is drawn, and that
 * decision has to reach the frame or it is only a label. The mapping is not arbitrary:
 *
 * - A typographic piece has no product footage, so type and colour have to carry the
 *   whole thing. It gets the looks that are built to be loud.
 * - A product-led piece has an interface in it, and the interface must be the loudest
 *   object in the frame. It gets the restrained looks — a poster treatment around a
 *   dashboard is two things shouting at once.
 * - A camera-led piece is soft and continuous, so it gets the soft looks.
 */
const BY_STYLE: Record<VideoStyle, LookName[]> = {
  typographic: ['poster', 'signal', 'broadcast', 'studio'],
  'product-led': ['studio', 'bloom', 'press'],
  'camera-led': ['bloom', 'studio', 'press'],
};

/**
 * Pick a look.
 *
 * Content gets a veto before the seed gets a vote, and for a real reason: the poster look
 * exists to say one short thing enormously, and handing it a nine-word headline produces
 * a wall of type that fills the frame and communicates nothing. The seed chooses between
 * what remains.
 */
export const chooseLook = (
  tone: Tone,
  random: Random,
  content: {
    longestHeadline: number;
    vertical: boolean;
    /** The direction the director chose, when it chose one. */
    style?: VideoStyle;
  },
): Look => {
  let allowed = BY_TONE[tone] ?? BY_TONE.clean;

  /*
   * The direction narrows, it does not override.
   *
   * Tone wins a straight fight, because a look carries its own cut list and motion
   * multiplier and those have to agree with how the script reads — a kinetic script in a
   * magazine look is broken in a way the viewer feels. So this is an intersection, and
   * when the two sets do not overlap at all (a kinetic product-led film, say) the tone
   * set stands. Narrowing an empty set to nothing would hand every such video the
   * fallback look, which is how you end up with one look again by accident.
   */
  if (content.style) {
    const byStyle = BY_STYLE[content.style];
    const both = allowed.filter((name) => byStyle.includes(name));
    if (both.length > 0) allowed = both;
  }

  if (content.longestHeadline > 4) {
    allowed = allowed.filter((name) => name !== 'poster');
  }

  /*
   * A tall frame has no room for a wide margin.
   *
   * Eleven percent of the short side in a 9:16 video is a margin on every edge of a frame
   * that was already narrow, and the words end up in a column two thirds the width of the
   * screen. Airy looks are for frames that have air.
   */
  if (content.vertical) {
    allowed = allowed.filter((name) => LOOKS[name].margin <= 0.08);
  }

  const fallback: LookName[] = ['studio'];
  return LOOKS[random.pick(allowed.length > 0 ? allowed : fallback)];
};
