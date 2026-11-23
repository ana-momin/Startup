import { createContext, useContext } from 'react';
import {
  AbsoluteFill,
  Easing,
  beat,
  beatPulse,
  entrance,
  idle,
  interpolate,
  spring,
  streamFor,
  useCurrentFrame,
  useVideoConfig,
} from '@motion/engine';
import type { Motif as MotifName, Palette, Tone, VideoStyle } from '@motion/planner';
import { toneFor, toneStyle } from '../tone';
import { LOOKS } from '../looks';
import type { Look } from '../looks';
import type { ToneStyle } from '../tone';
import { Motif } from './Motif';

/**
 * Shared building blocks every scene uses.
 *
 * These are what make all our videos feel like they came from the same studio, and —
 * through tone — what stops them all feeling like the same video.
 */

export const FONT =
  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

/* ---------- tone ---------- */

const ToneContext = createContext<ToneStyle>(toneStyle('clean'));
const MotifContext = createContext<MotifName>('none');

/**
 * The video's seed.
 *
 * Belongs to the whole video rather than to any scene, exactly like the tone and the
 * motif — so it travels the same way. Threading it through every component signature
 * would mean one forgotten prop somewhere quietly making a scene identical in every
 * video, which is the failure this whole mechanism exists to prevent.
 */
const SeedContext = createContext<number>(0);

/**
 * The video's look: its art direction.
 *
 * Travels the same way tone does, because it is the same kind of fact — a decision about
 * the whole film that every scene has to agree with. A scene that missed it would be
 * dressed differently from the one before it, which is worse than having no looks at all.
 */
const LookContext = createContext<Look>(LOOKS.studio);

export const ToneProvider = ({
  tone,
  style,
  motif = 'none',
  seed = 0,
  look = LOOKS.studio,
  children,
}: {
  tone: Tone | undefined;
  /**
   * The direction the director chose.
   *
   * It is folded into the tone rather than carried separately, because what it changes —
   * how much the camera moves — is already a field on the tone that everything reads.
   */
  style?: VideoStyle;
  motif?: MotifName;
  /** Drives every composition choice in the video. */
  seed?: number;
  /** The art direction for the whole film. */
  look?: Look;
  children: React.ReactNode;
}) => (
  <ToneContext.Provider value={toneFor(tone, style)}>
    <MotifContext.Provider value={motif}>
      <SeedContext.Provider value={seed}>
        <LookContext.Provider value={look}>{children}</LookContext.Provider>
      </SeedContext.Provider>
    </MotifContext.Provider>
  </ToneContext.Provider>
);

export const useTone = (): ToneStyle => useContext(ToneContext);

/**
 * The motif, read from context rather than passed to every scene.
 *
 * It belongs to the whole video, not to any one scene, so threading it through eight
 * component signatures would be noise — and one forgotten prop would mean a single
 * scene silently losing the background everything else has.
 */
export const useMotif = (): MotifName => useContext(MotifContext);

/** The video's seed, for any decision that should differ between videos but never within one. */
export const useSeed = (): number => useContext(SeedContext);

/** The video's art direction. */
export const useLook = (): Look => useContext(LookContext);

/**
 * Tone and look, already reconciled.
 *
 * Nearly every scene wants the combination rather than either one: the weight is the
 * tone's weight shifted by the look, the case is whichever of them has an opinion. Doing
 * that arithmetic at each call site would mean doing it slightly differently at each call
 * site, and the looks would stop being coherent within a fortnight.
 */
export const useStyle = () => {
  const tone = useTone();
  const look = useLook();

  return {
    tone,
    look,
    family: look.headlineFamily,
    labelFamily: look.labelFamily,
    weight: Math.min(Math.max(tone.headlineWeight + look.weightShift, 200), 900),
    tracking: tone.tracking + look.trackingShift,
    leading: tone.leading,
    upper: look.case === 'upper' ? true : look.case === 'sentence' ? false : tone.upper,
    /** Supporting text size, derived from the look's contrast ratio. */
    supportRatio: 1 / look.contrast,
    /**
     * Character width and true line advance, for fitting text to a region.
     *
     * The advance is not the line height: MaskedText separates its lines with a gap as
     * well, so measuring by line height alone under-counts and the last line lands on
     * whatever sits below it. Weight widens the face too, which is why both the look's
     * face and the resolved weight are in here.
     */
    charRatio:
      look.charRatio +
      (tone.headlineWeight + look.weightShift >= 800 ? 0.035 : 0) +
      Math.max(tone.tracking + look.trackingShift, 0) * 0.5,
    advance: tone.leading + Math.max(tone.leading - 0.92, 0),
    margin: look.margin,
    motion: tone.motion * look.motionShift,
  };
};

/**
 * Whether a colour is dark enough for light to glow against it.
 *
 * Glows, soft shadows and coloured halos were written when every frame was near-black,
 * where they read as light. On paper the same effects are grey smudges — the shadow
 * behind a big number turned it from a figure into something smeared, and a "glowing"
 * rule became a fuzzy grey line.
 *
 * Light does not glow on white. Anything that adds luminance has to ask first.
 */
export const onDark = (color: string): boolean => {
  const value = color.replace('#', '');
  if (value.length < 6) return true;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16) / 255);
  const channel = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b) < 0.4;
};

/**
 * Whether this scene is a full field of the brand colour.
 *
 * Inferred rather than passed, and exactly true by construction: on a field the accent
 * *is* the text colour, because the background has taken the brand colour and emphasis
 * has nowhere else to come from.
 *
 * Worth knowing, because a field is the one frame where a glow is actively harmful. The
 * accent is black or white there, so "a halo of accent light" renders as a black smear
 * behind the thing it was meant to lift — which is what happened to the big number the
 * first time the colour script ran.
 */
export const onColorField = (palette: Palette): boolean =>
  palette.accent.toLowerCase() === palette.text.toLowerCase();

/* ---------- rhythm ---------- */

/**
 * Delays, expressed in beats instead of frames.
 *
 *   const on = useBeats();
 *   <Headline delay={on(1)} />       // lands on the downbeat
 *   <Sub      delay={on(2.5)} />     // lands on the offbeat after it
 *
 * Every hand-typed delay in a scene was a guess, and a pile of individually reasonable
 * guesses is what arrhythmia sounds like. Going through the tone's tempo means the whole
 * video agrees with itself about when things are allowed to happen — and a soundtrack
 * dropped on afterwards appears to have been written for it.
 */
export const useBeats = (): ((n: number) => number) => {
  const { fps } = useVideoConfig();
  const { bpm } = useTone();
  const seed = useSeed();

  /*
   * Rhythm varies between videos, within musical limits.
   *
   * A full score subsystem — entrances compiled into a timeline and sampled per frame —
   * was the plan here, and on inspection it would have bought almost nothing that the
   * beat grid and the entrance library do not already give. What was genuinely missing
   * was that every video played at exactly the tone's tempo, so two films in the same
   * tone shared a pulse as well as a look.
   *
   * A seeded tempo shift is the whole of that value for a line of code. It is kept
   * inside ±12% because tempo is the one thing a viewer feels most precisely: further
   * than that and a "clean" video stops reading as clean and starts reading as a
   * different tone entirely, which would undo the point of having tones.
   */
  const swing = 1 + (streamFor(seed, 'tempo').next() - 0.5) * 0.24;
  return (n: number) => beat(n * swing, bpm, fps);
};

/** A small accent that fires on the pulse and decays. Multiply it into a scale. */
export const usePulse = (every = 2, decay = 9): number => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { bpm } = useTone();
  return beatPulse({ frame, bpm, fps, every, decay });
};

/* ---------- scale ---------- */

/**
 * Scale factor so one scene works in every aspect ratio.
 *
 * All sizes are written for a 1920-wide frame and multiplied by this. Without it we
 * would need a separate design for landscape, vertical and square — three times the
 * work and three times the bugs.
 */
export const useScale = (): number => {
  const { width, height } = useVideoConfig();
  const base = Math.min(width / 1920, height / 1080);
  // Tall formats have far less width per unit of height, so type has to grow back or
  // it reads as tiny text floating in a column.
  return base * (width < height ? 1.55 : 1);
};

/** Fade the whole scene in and out so cuts are never harsh. */
export const useSceneOpacity = (duration: number): number => {
  const frame = useCurrentFrame();
  return interpolate(frame, [0, 7, duration - 9, duration], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
};

/* ---------- backdrop ---------- */

/**
 * The scene background: brand-coloured light that slowly drifts.
 *
 * Every scene shares it, so cuts feel like moves inside one world rather than jumps
 * between unrelated slides. Tone controls how present it is — an editorial piece wants
 * calm paper, a bold one wants the colour pushing through.
 *
 * There is deliberately no CSS blur on these gradients. A radial gradient that fades to
 * transparent is already soft, and a blur filter over a full-screen element forces the
 * whole surface to be rasterised again every single frame. Measured on a 319-frame
 * render it was the difference between eight seconds and five minutes, in exchange for
 * a softness nobody could point to.
 *
 * The vignette used to live here and now belongs to the shell, on a layer locked to the
 * camera. It is a property of the lens, not of the scenery: once the background started
 * drifting for parallax, a vignette drifting with it read as a dark smudge painted onto
 * the world.
 */
export const Backdrop = ({ palette }: { palette: Palette }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width } = useVideoConfig();
  const tone = useTone();
  const motif = useMotif();

  const drift = interpolate(frame, [0, durationInFrames], [0, width * 0.06]);
  const breathe = interpolate(
    frame,
    [0, durationInFrames / 2, durationInFrames],
    [1, 1.12, 1],
    { easing: Easing.easeInOutQuad },
  );

  const strength = tone.backdrop;

  return (
    <AbsoluteFill style={{ backgroundColor: palette.bg, overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          left: `calc(50% - 45% + ${drift}px)`,
          top: '-30%',
          width: '90%',
          height: '120%',
          transform: `scale(${breathe})`,
          background: `radial-gradient(ellipse at center, ${palette.accent}${alpha(0.34 * strength)} 0%, transparent 66%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: `calc(20% - ${drift * 0.7}px)`,
          bottom: '-40%',
          width: '70%',
          height: '90%',
          background: `radial-gradient(ellipse at center, ${palette.accentSoft}${alpha(0.2 * strength)} 0%, transparent 68%)`,
        }}
      />
      <Motif motif={motif} palette={palette} />
    </AbsoluteFill>
  );
};

/** A 0-1 opacity as the two hex digits CSS colours want. */
const alpha = (value: number): string =>
  Math.round(Math.min(Math.max(value, 0), 1) * 255)
    .toString(16)
    .padStart(2, '0');

/* ---------- text ---------- */

type WordRevealProps = {
  text: string;
  delay?: number;
  size: number;
  color: string;
  /** Colour applied to the last word, for emphasis. */
  highlight?: string;
  align?: 'center' | 'left';
  maxWidth?: number | string;
  /** Override the tone's stagger, for text that should read slower. */
  stagger?: number;
  weight?: number;
};

/**
 * Words arriving one at a time, rising out of a blur.
 *
 * Staggering is the single highest-value trick in motion design: it walks the viewer's
 * eye along the sentence in reading order instead of dropping a wall of text on them.
 * How fast, how far and how hard they land all come from the tone.
 */
export const WordReveal = ({
  text,
  delay = 0,
  size,
  color,
  highlight,
  align,
  maxWidth = '90%',
  stagger,
  weight,
}: WordRevealProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tone = useTone();

  const words = text.split(' ');
  const step = stagger ?? tone.stagger;
  const alignment = align ?? tone.align;

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: alignment === 'center' ? 'center' : 'flex-start',
        gap: `${size * (tone.leading - 0.9)}px ${size * 0.26}px`,
        maxWidth,
        textAlign: alignment,
      }}
    >
      {words.map((word, i) => {
        const local = frame - delay - i * step;
        const rise = spring({ frame: local, fps, config: tone.spring });
        const opacity = interpolate(local, [0, 9], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const blur =
          tone.blur === 0
            ? 0
            : interpolate(local, [0, 13], [tone.blur, 0], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              });

        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity,
              transform: `translateY(${(1 - rise) * size * tone.travel}px)`,
              filter: blur > 0.05 ? `blur(${blur}px)` : undefined,
              fontSize: size,
              fontWeight: weight ?? tone.headlineWeight,
              lineHeight: tone.leading,
              letterSpacing: size * tone.tracking,
              textTransform: tone.upper ? 'uppercase' : 'none',
              color: highlight && i === words.length - 1 ? highlight : color,
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};

type FadeUpProps = {
  children: React.ReactNode;
  delay?: number;
  distance?: number;
  style?: React.CSSProperties;
};

/**
 * A simple, confident entrance for anything that is not a headline.
 *
 * It winds up before it moves. A few frames of travel in the wrong direction is what
 * separates something arriving from something appearing — and it does a practical job
 * too: the counter-move tells the eye that this spot is about to matter, so the viewer
 * is already looking when the content lands rather than hunting for it afterwards.
 */
export const FadeUp = ({ children, delay = 0, distance = 26, style }: FadeUpProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - delay;

  const progress = entrance({ frame: local, fps, config: 'gentle', anticipation: 0.12 });

  const opacity = interpolate(local, [0, 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.smooth,
  });

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${(1 - progress) * distance}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** The small pill above a headline. */
export const Badge = ({
  text,
  palette,
  scale,
  delay = 0,
}: {
  text: string;
  palette: Palette;
  scale: number;
  delay?: number;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tone = useTone();
  const local = frame - delay;

  const enter = spring({ frame: local, fps, config: 'snappy' });
  const opacity = interpolate(local, [0, 11], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // The badge lands early and then has to sit there for the rest of the scene, which is
  // the one thing nothing in a piece of motion design should do. A pixel and a half of
  // drift is not something anyone will see; it is the difference between an element that
  // is present and one that has been pasted on.
  const float = idle({ frame: local, fps, amount: 1.6, period: 5 });

  // Bold and kinetic get a filled pill; the quieter tones get an outline.
  const solid = tone.upper;

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${(1 - enter) * 18 * scale + float}px)`,
        padding: `${10 * scale}px ${22 * scale}px`,
        borderRadius: 999,
        border: solid ? 'none' : `${Math.max(1, scale)}px solid ${palette.accent}55`,
        backgroundColor: solid ? palette.accent : `${palette.accent}16`,
        color: solid ? palette.bg : palette.accentSoft,
        fontSize: 22 * scale,
        fontWeight: solid ? 700 : 600,
        letterSpacing: 2.4 * scale,
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </div>
  );
};

/** A short rule that draws itself. Used to anchor left-aligned layouts. */
export const Rule = ({
  palette,
  scale,
  delay = 0,
  width = 64,
}: {
  palette: Palette;
  scale: number;
  delay?: number;
  width?: number;
}) => {
  const frame = useCurrentFrame();
  const grow = interpolate(frame - delay, [0, 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.entrance,
  });

  return (
    <div
      style={{
        width: width * scale * grow,
        height: 4 * scale,
        borderRadius: 999,
        backgroundColor: palette.accent,
        boxShadow: onDark(palette.bg) ? `0 0 ${18 * scale}px ${palette.accent}88` : undefined,
      }}
    />
  );
};
