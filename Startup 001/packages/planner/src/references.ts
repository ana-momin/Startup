/**
 * What good looks like, written down — second pass.
 *
 * The first pass sampled twelve frames out of sixty-six seconds and turned them into
 * three paragraphs of adjectives: "light, near-white, large negative space". All true,
 * all useless, because none of it tells you what to *draw*. Anas was right to call it
 * one or two percent.
 *
 * This pass walked all three films at a fifth of a second, measured every cut, and looked
 * at every distinct composition. What follows is specific enough to build from, and the
 * numbers are measured rather than remembered.
 *
 * The rule for this file: if an entry could describe a hundred different videos, it is
 * not an observation, it is a mood. Delete it and look again.
 */

export type Reference = {
  id: string;
  /** What the piece is, in a line. */
  summary: string;

  /** Measured, not remembered. */
  measured: {
    seconds: number;
    cuts: number;
    /** Scene holds in seconds, in order. The shape of the edit. */
    holds: number[];
    meanHold: number;
    medianHold: number;
    /** Mean frame luminance, 0-255, and what share of frames are light or dark. */
    luminance: number;
    lightShare: number;
    darkShare: number;
  };

  /** How the film is built — the thing that decides everything else. */
  structure: string;
  /** What happens in the first three seconds. */
  opening: string;
  /** How the ending resolves. */
  ending: string;

  /** Type: sizes, cases, colour, and what sits inside a line. */
  typography: string[];
  /** Colour: how many, where, and how it changes. */
  colour: string[];
  /** The repeatable graphic systems — the drawable parts. */
  graphics: string[];
  /** What the camera does, and when. */
  camera: string[];
  /** How one shot becomes the next. */
  transitions: string[];

  /** The kind of product or message this approach suits. */
  suits: string;
};

export const REFERENCES: Reference[] = [
  {
    id: 'product-led',
    summary:
      'Notion 3.7. Sixty-six seconds. The interface and the words occupy the same space ' +
      'rather than taking turns: type is set over moving UI, and UI fragments are set ' +
      'inside sentences as if they were words.',

    measured: {
      seconds: 66.4,
      cuts: 10,
      holds: [16.0, 4.6, 7.0, 0.8, 3.0, 4.6, 4.0, 4.6, 14.0, 3.4, 4.4],
      meanHold: 6.04,
      medianHold: 4.6,
      luminance: 196,
      lightShare: 0.73,
      darkShare: 0.17,
    },

    structure:
      'Eleven held sequences, but two of them run sixteen and fourteen seconds — inside ' +
      'those the camera keeps working, so the film reads as far more than eleven moments. ' +
      'Long product sequences alternate with short typographic punches. Roughly three ' +
      'quarters light, one quarter a hard cut to near-black.',

    opening:
      'A single blue text caret blinking on white, with a soft blue radial glow behind ' +
      'it. Then the wordmark TYPES itself in beside the logo. No title card, no headline ' +
      '— the film opens on the smallest possible object and lets it write the name.',

    ending:
      'Three steps on one near-white frame: the logo mark alone and enormous, then the ' +
      'mark shrinks and the wordmark appears beside it, then a small grey version line ' +
      'drops in underneath. The resolve is a scale change, not a cut.',

    typography: [
      'Type sits ON TOP of the moving interface, in the middle of the frame, while UI scrolls behind it. The words and the product are not given separate regions.',
      'UI objects are set INLINE inside a sentence at text height, on the baseline: "Docs [page card] and [chip] agents", "You didn\'t just [card] take notes." The object is a word.',
      'Two tones in one headline: "in one works" black, "pace." blue. Also "Write it once." white over "Every agent knows how." in grey — the second line is dimmer than the first.',
      'Headlines are TYPED, with a live caret left at the end of the line.',
      'Mixed scale inside one headline: "TEACH" small above "EVERY AGENT" large, both uppercase and centred.',
      'Headlines are small relative to the frame — around a tenth of the frame height — never filling it.',
      'Small coloured tag chips scattered in the frame corners around a headline, each with a tiny cursor arrow beside it.',
    ],

    colour: [
      'Near-white #F7F6F3 and one blue. A second colour appears only inside real UI (coloured avatars, emoji, tag chips) — never as a design choice.',
      'Hard cuts between near-white and near-black sequences. The dark ones are genuinely dark, not a dark grey.',
      'The same objects survive the light-to-dark change, re-lit rather than replaced.',
      'Soft radial glow behind a lone object on white, in the brand colour at very low opacity.',
    ],

    graphics: [
      'Fragments of interface at mixed scales and 3-10° rotations, overlapping each other and running off the frame edge. Not spaced out inside a safe area.',
      'Cards carry real content: an emoji icon, a title, two lines of body, a small tag chip, and a meta label ("Used by 3 agents").',
      'A dot-matrix world map — small coloured dots on a grid forming continents — used as a background behind type.',
      'An orbital: a central card with two concentric dotted rings carrying about thirty small integration logos, with tiny labels at the ring edges.',
      'That orbital then becomes a tiled background texture in the next shot, repeated across a dark frame.',
      'A hard vertical split, dark half against light half, with type in one half and the product in the other — and the divider SLIDES between shots.',
      'A phone shown in perspective, rotated and running off the bottom-right corner, not centred and not whole.',
      'Named cursors and hover states on real controls, as if someone is using it.',
    ],

    camera: [
      'Pull back from an extreme detail to reveal the whole interface — opens on a single glyph, ends on a full panel.',
      'Push into a full interface to find one message, one button, one input.',
      'Both moves are continuous and slow, with no cut inside them. The long sequences are one shot.',
      'A short sequence can be a single static frame holding one object with nothing else on screen.',
    ],

    transitions: [
      'Hard cut on the typographic punches.',
      'No cut at all inside a product sequence — the camera is the edit.',
      'Objects carry across a cut and are re-arranged rather than replaced.',
    ],

    suits:
      'Software with an interface worth showing. Collaboration tools, anything where the ' +
      'product is a place people work.',
  },

  {
    id: 'typographic',
    summary:
      'Fireworks AI. Forty-five seconds, thirteen scenes, the fastest of the three. Built ' +
      'entirely from type, flat colour and geometric systems — no product footage at all.',

    measured: {
      seconds: 45.1,
      cuts: 12,
      holds: [1.2, 0.8, 2.0, 2.4, 4.0, 7.6, 5.8, 2.8, 2.2, 6.2, 4.8, 1.2, 4.1],
      meanHold: 3.47,
      medianHold: 2.8,
      luminance: 149,
      lightShare: 0.49,
      darkShare: 0.38,
    },

    structure:
      'Thirteen scenes with a median hold of 2.8 seconds, and the opening four run 1.2, ' +
      '0.8, 2.0 and 2.4 seconds — it starts fast and settles. Alternates hard between ' +
      'saturated purple, pure white and near-black. Almost an even split of light and dark.',

    opening:
      'Black, with a soft purple glow bleeding in from just outside the TOP edge. The ' +
      'glow grows into a huge white-to-purple arc filling the upper two thirds, and the ' +
      'first word sits on the white part of it. On the next shot the arc has moved to the ' +
      'BOTTOM — the light source travels between shots.',

    ending:
      'White frame, enormous thin-outline versions of the logo geometry behind, the small ' +
      'logo at the top, the line in the middle, and a monospace URL at the bottom. No ' +
      'button — a typed address.',

    typography: [
      'The second half of a sentence in a TINT OF THE BACKGROUND colour, not grey: "Your loop" white, "reward function" in a lighter purple on a purple field.',
      'A tiny monospace label floating above the headline ("10,000+ Gpus", "Fireworks"), far smaller than anything else in the frame.',
      'A dot marker on one or both sides of a centred line, with a hairline rule running from the frame edge to it.',
      'Headlines are medium-large and centred with real air around them — roughly a twelfth of the frame height. Never enormous.',
      'A rounded-square icon tile set inline beside a word, at word height.',
      'A monospace pill ("Now Generally Available") sitting under a lockup.',
    ],

    colour: [
      'One saturated purple, pure white, near-black. No third hue anywhere in forty-five seconds.',
      'Whole scenes are a single flat field of the brand colour, edge to edge — used as a scene, not as an accent.',
      'A list of items tinted in graduated steps of the one colour, darkest at the top to lightest at the bottom.',
      'A block mosaic: the frame built from flat hard-edged squares ramping from near-black to bright purple, with individual cells flashing brighter.',
      'A soft arc gradient bleeding in from off-frame, as if a light source sits just outside the shot.',
    ],

    graphics: [
      'A construction grid of hairlines with a DOT at every intersection, drawn in a tint of whatever colour the frame is.',
      'Edge-anchored data strips: columns of thin horizontal lines at the left and right edges, like a barcode, which grow and fill inward with white blocks.',
      'Tiled symbol patterns at very low contrast — a field of small asterisks in one shot, small circles in the next. The pattern changes between shots.',
      'The frame divided into vertical panels with thin gaps, which SLIDE horizontally like a filmstrip, carrying different content in each panel.',
      'Flow chips: white rounded rectangles with coloured text, where the ARROW gets its own chip.',
      'That flow then GROWS — two new states are inserted into the middle of the chain and the whole row scales down to make room.',
      'Four tiny dots at the corners of a card, as registration marks.',
      'Enormous thin-outline versions of the logo geometry as a background, cropped by the frame.',
    ],

    camera: [
      'Almost no camera movement. The frame holds and the content changes — median movement within a shot is 0.62% of the frame per fifth of a second.',
      'The one exception is pushing into a single chip until it fills the frame.',
    ],

    transitions: [
      'Hard cuts, carried by colour. White to purple to black with nothing in between.',
      'The gradient arc moves position from one shot to the next, which links them without a dissolve.',
      'A diagram changes by gaining members rather than by being replaced.',
    ],

    suits:
      'Infrastructure, developer tools, APIs, anything technical — and any product whose ' +
      'interface is not the point.',
  },

  {
    id: 'camera-led',
    summary:
      'Base44 Superagents. Forty-nine seconds. After the first six, the entire film is ONE ' +
      'interface, and the camera is the only editor. The frame is a viewport onto ' +
      'something larger than itself.',

    measured: {
      seconds: 49.2,
      cuts: 10,
      holds: [16.2, 2.2, 9.8, 0.8, 1.6, 9.0, 1.6, 1.2, 2.0, 2.4, 2.4],
      meanHold: 4.47,
      medianHold: 2.2,
      luminance: 228,
      lightShare: 0.96,
      darkShare: 0.0,
    },

    structure:
      'Sixteen seconds, then nine, then another nine — three long continuous moves with ' +
      'short repositioning beats between them. Ninety-six per cent of frames are light and ' +
      'NOT ONE frame is dark. The brightest and gentlest of the three by a wide margin.',

    opening:
      'A soft multi-colour gradient mesh — pink, green, yellow, orange — occupying the ' +
      'lower half of a warm off-white frame, with the logo lockup centred above it. No ' +
      'type animation, no hard edge anywhere.',

    ending:
      'Back to the same gradient mesh, now grown taller, with one line of type over it; ' +
      'then the logo alone on near-white with only a trace of the gradient left at the ' +
      'bottom. The film returns to where it started.',

    typography: [
      'Almost no standalone typography. Nearly every word on screen is INSIDE the interface — a message, a label, a button.',
      'Scale range is enormous: from a timestamp a few pixels tall to a single line of post text filling forty per cent of the frame height.',
      'Body text regularly runs off BOTH edges of the frame. Lines are not composed to fit; the frame is cropping something larger.',
      'One phrase inside a block of text highlighted with a pale lavender block, as if selected.',
      'Bold is used inside sentences to pick out the claim ("3x more engagement", "40% more comments").',
      'Only two standalone lines of type in the whole film, both at the very end.',
    ],

    colour: [
      'Warm off-white, near-white cards, a single orange brand colour used almost only for the caret and the logo.',
      'Soft multi-colour gradient mesh at the open and close — four hues, no hard edge — and nowhere else.',
      'Green used once, for a "Connected" state. Colour means something rather than decorating.',
      'No dark frames at all.',
    ],

    graphics: [
      'Chat bubbles with real timestamps, at every scale from tiny to frame-filling.',
      'A link-preview card inside a message, containing a real video still.',
      'A permission card with "Connected" and "Reject" buttons — an actual interaction, not a pretty mockup.',
      'Real photography: a person\'s avatar, and a live-action shot of a laptop on a sunlit desk with plants, showing the finished work.',
      'A composer input at extreme scale, filling the frame width and bleeding off both edges, with a coloured caret typing into it.',
      'Soft shadows, generous corner radii, no borders anywhere.',
    ],

    camera: [
      'The camera is the only editor. One interface, moved around continuously for forty seconds.',
      'Push in until a single input fills the frame and its text is cut off by both edges.',
      'Pull back until a chat bubble is a small object in a mostly empty frame.',
      'Lateral moves to follow a conversation down and across, not just in and out.',
      'The move is slow and eased — median movement within a shot is 0.31% of the frame per fifth of a second, the same as the Notion film and half the Fireworks one.',
    ],

    transitions: [
      'Almost none. Where a cut exists it is a reposition inside the same world.',
      'The only real cuts are into and out of the gradient-mesh bookends, and into the live-action shot.',
    ],

    suits:
      'Assistants, agents, chat-based products, and anything whose value is a sequence of ' +
      'steps happening on the user\'s behalf.',
  },
];

/**
 * What all three agree on — rewritten from the measurements.
 *
 * The first version of this list said "about four seconds a scene". The real medians are
 * 4.6, 2.8 and 2.2 seconds, and the means are dragged up by long continuous camera moves
 * that contain many moments but no cuts. "Four seconds a scene" was close enough to sound
 * right and wrong enough to build the wrong thing.
 */
export const SHARED_RULES = [
  'Light dominates. Two of the three are over 70% light frames and one has no dark frame at all. Dark is a punctuation mark.',
  'One brand colour plus neutrals. Any second colour belongs to real interface content, never to the design.',
  'The median shot is 2 to 5 seconds, but a long shot is allowed to run 10 to 16 seconds IF the camera keeps working inside it.',
  'Headlines are small — a tenth to a twelfth of the frame height. None of the three fills the frame with type.',
  'Content is allowed to run off the frame edge. A composition that fits neatly inside a safe margin looks like a slide.',
  'Objects are rotated a few degrees and overlap each other. Nothing sits on a perfect grid.',
  'The camera moves INTO things, and the move is slow: around 0.3% of the frame per fifth of a second.',
  'Never more than one idea on screen at a time, however much is drawn.',
  'Something survives every cut — an object, a colour, a light source — and is re-arranged rather than replaced.',
];

/**
 * The devices every one of these films uses that a plain layout engine cannot express.
 *
 * Kept separate from the per-reference lists because this is the honest answer to "what
 * is the gap". These are not style preferences; they are structural, and a system that
 * places text in one region and a picture in another cannot produce any of them.
 */
export const STRUCTURAL_DEVICES = [
  'Type over moving interface, sharing the same space rather than taking turns.',
  'Interface objects set inline inside a sentence, on the text baseline.',
  'Content that bleeds off the frame edge, so the frame reads as a viewport rather than a page.',
  'A single continuous camera move that contains many moments and no cuts.',
  'Objects that persist across a cut and are re-lit or re-arranged.',
  'A diagram that changes by gaining members, rather than cutting to a different diagram.',
  'Two tones within one line of text, where the second is a tint of the background.',
  'Text that types itself, with a live caret left behind.',
];

/**
 * The references as prompt text.
 *
 * Takes a style, and that argument matters more than it looks.
 *
 * The first version of this returned all three vocabularies in full. Once the references
 * went from three paragraphs to the real detail, that was three thousand tokens of three
 * different films competing inside one prompt — and the planner got measurably worse,
 * returning two-scene plans and dropping the reason for its own choice. Not truncation;
 * the model simply lost the thread. More information made it dumber.
 *
 * So: choosing a direction needs only what each film is FOR, and composing for a
 * direction needs only the vocabulary of the one that was chosen. Nobody ever needs all
 * three at once, and sending all three was the mistake.
 */
export const referenceBriefing = (style?: string): string => {
  const chosen = REFERENCES.find((r) => r.id === style);

  // No direction yet: enough to choose with, and no more.
  if (!chosen) {
    const menu = REFERENCES.map(
      (r) =>
        `"${r.id}" — ${r.summary}\n` +
        `   Structure: ${r.structure}\n` +
        `   Suits: ${r.suits}`,
    ).join('\n\n');

    return (
      `REFERENCE STYLES — pick the one that fits this brief.\n\n${menu}\n\n` +
      `RULES ALL OF THEM FOLLOW\n- ${SHARED_RULES.join('\n- ')}`
    );
  }

  // A direction is set: the whole vocabulary of that one film.
  const m = chosen.measured;
  return (
    `YOU ARE COMPOSING IN THE "${chosen.id}" STYLE.\n\n${chosen.summary}\n\n` +
    `Measured from the reference: ${m.seconds}s, ${m.cuts} cuts, median hold ` +
    `${m.medianHold}s, ${Math.round(m.lightShare * 100)}% light frames, ` +
    `${Math.round(m.darkShare * 100)}% dark.\n` +
    `Shot lengths in order: ${m.holds.join(', ')}s.\n\n` +
    `STRUCTURE: ${chosen.structure}\n\n` +
    `IT OPENS: ${chosen.opening}\n\n` +
    `IT ENDS: ${chosen.ending}\n\n` +
    `TYPOGRAPHY\n- ${chosen.typography.join('\n- ')}\n\n` +
    `COLOUR\n- ${chosen.colour.join('\n- ')}\n\n` +
    `GRAPHIC SYSTEMS\n- ${chosen.graphics.join('\n- ')}\n\n` +
    `CAMERA\n- ${chosen.camera.join('\n- ')}\n\n` +
    `CUTS\n- ${chosen.transitions.join('\n- ')}\n\n` +
    `RULES ALL THREE REFERENCES FOLLOW\n- ${SHARED_RULES.join('\n- ')}`
  );
};
