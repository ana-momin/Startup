import { AbsoluteFill, Series, seedFrom, streamFor } from '@motion/engine';
import { CROSSFADE, colorScript } from '@motion/planner';
import type { Frame, Palette, ScenePlan, VideoSpec } from '@motion/planner';
import { ConstellationScene } from './scenes/ConstellationScene';
import { FlowScene } from './scenes/FlowScene';
import { OverlayScene } from './scenes/OverlayScene';
import { chooseLook } from './looks';
import { ColorField } from './motion/ColorField';
import { FrameFurniture } from './motion/FrameFurniture';
import { Thread } from './motion/Thread';

import {
  BigWordScene,
  ChartScene,
  FeatureScene,
  LogoScene,
  OutroScene,
  ProductScene,
  QuoteScene,
  StatScene,
  TitleScene,
  ToneProvider,
  Watermark,
} from './scenes';

/**
 * Turns a VideoSpec into an actual moving picture.
 *
 * This component knows nothing about prompts or AI — it only reads the spec. That
 * separation is what lets the planner be rules one day and a language model the next
 * without touching any animation code.
 */
export const GeneratedVideo = ({ spec }: { spec: VideoSpec }) => {
  /*
   * The seed, from the video's own text.
   *
   * Derived rather than stored, so it needs no migration and no new field on the spec —
   * and so it stays true to the engine's founding rule: a video is a pure function of
   * its inputs. The same prompt composes the same film forever; a different prompt lands
   * somewhere else entirely in the space of designs.
   *
   * The brand is in the mix because two videos for the same company should feel related,
   * and the title because two videos for the same brand should not be identical.
   */
  const seed = seedFrom(`${spec.brandId ?? ''}|${spec.title}|${spec.prompt}`);

  /*
   * The look is chosen once, here, for the whole film.
   *
   * Per scene it would be incoherent — art direction that changes every four seconds is
   * not art direction. It is constrained by the tone (a kinetic script set in a serif
   * with wide margins is a contradiction the viewer feels without naming it) and by the
   * content, because the poster look exists to say one short thing enormously and a
   * nine-word headline defeats it.
   */
  /*
   * The colour script: a full-frame treatment per scene.
   *
   * Every palette we shipped was near-black and every scene reused it, so whatever
   * changed in the layout or the motion, each video was a dark slide with a coloured
   * line on it. This is the change that matters most — the frame's colour is now part of
   * the composition, and it changes.
   */
  const frames = colorScript({
    scenes: spec.scenes.length,
    palette: spec.palette,
    mode: spec.palette.bg && isDarkHex(spec.palette.bg) && spec.tone === 'bold' ? 'dark' : 'light',
    pick: streamFor(seed, 'colour-script').next(),
    // The direction decides how loudly colour is allowed to speak.
    style: spec.style,
  });

  /*
   * The director's chosen direction narrows the look.
   *
   * Without this the style would be a label on the spec that changed nothing, which is
   * worse than not having one — a stated decision the output ignores is a lie. A
   * typographic piece gets the looks built on type and colour; a product-led one gets
   * the restrained looks that let an interface be the loudest thing in the frame.
   */
  const look = chooseLook(spec.tone ?? 'clean', streamFor(seed, 'look'), {
    longestHeadline: longestHeadlineWords(spec),
    vertical: spec.format === 'vertical',
    style: spec.style,
  });

  return (
    <ToneProvider
      tone={spec.tone}
      /* The direction reaches the camera through the tone. */
      style={spec.style}
      motif={spec.motif}
      seed={seed}
      look={look}
    >
    <AbsoluteFill style={{ backgroundColor: spec.palette.bg }}>
      {/* Colour, as a designed element. Drawn once, behind every cut, and it changes. */}
      <ColorField spec={spec} frames={frames} />

      {/* One shape that survives every cut. Behind the words, so it is furniture the
          scene is built on rather than something laid over the top of it. */}
      <Thread spec={spec} />

      <Series>
        {spec.scenes.map((scene, i) => (
          <Series.Scene
            key={i}
            durationInFrames={scene.duration}
            offset={i === 0 ? 0 : -CROSSFADE}
          >
            <SceneRenderer
              scene={scene}
              spec={spec}
              index={i}
              // Each scene is coloured by its own place in the script, not by one palette
              // shared across the whole film.
              frame={frames[i % frames.length]}
              // Where this scene sits in the running order. Only the video knows this,
              // which is why shot distance has to be decided here and handed down.
              position={spec.scenes.length <= 1 ? 0.5 : i / (spec.scenes.length - 1)}
            />
          </Series.Scene>
        ))}
      </Series>

      {/* Both of these sit outside the Series so they span the whole video rather than
          restarting with every scene. Continuity across the cut is the point: it is what
          makes five clips read as one film. */}
      {/*
        The corner ticks, chapter counter and progress rule have been taken out.

        They were added to stop frames looking empty, and they did — by putting the same
        instrument-panel chrome on every video we made. Once colour is doing real work
        the frames are not empty, and the furniture is just a costume that every film was
        wearing. Restraint was the thing that was missing, not decoration.

        The component is kept: a look can still ask for it, and a technical brand
        genuinely suits it. It is no longer the default for everyone.
      */}
      {spec.watermark === true && <FrameFurniture spec={spec} />}
      {spec.watermark && spec.logoUrl && <Watermark src={spec.logoUrl} />}
      </AbsoluteFill>
    </ToneProvider>
  );
};

/**
 * Picks the right scene component for a plan entry.
 *
 * The switch is exhaustive: adding a new scene kind to the types will make TypeScript
 * fail here until it is handled. That is deliberate — a silently missing scene would
 * ship as a blank gap in somebody's video.
 */
const SceneRenderer = ({
  scene,
  spec,
  index,
  position,
  frame,
}: {
  scene: ScenePlan;
  spec: VideoSpec;
  /** Position in the video, which is what decides how this scene arrives. */
  index: number;
  /** The same position as a 0-to-1 fraction, for how far back the camera stands. */
  position: number;
  /** This scene's colours, from the video's colour script. */
  frame: Frame;
}) => {
  /*
   * The scene's colours arrive as a palette.
   *
   * A Frame and a Palette describe the same thing, so the script's output is handed to
   * scenes through the prop they already take. Nothing downstream had to change to stop
   * every scene being the same colour — which is the point of having had that contract
   * in the first place.
   */
  const palette: Palette = {
    bg: frame.bg,
    text: frame.text,
    muted: frame.muted,
    accent: frame.accent,
    accentSoft: frame.field ? frame.text : frame.accent,
  };

  switch (scene.kind) {
    case 'title':
      return (
        <TitleScene
          badge={scene.badge}
          headline={scene.headline}
          sub={scene.sub}
          palette={palette}
          duration={scene.duration}
          index={index}
          position={position}
        />
      );

    case 'bigword':
      return (
        <BigWordScene
          words={scene.words}
          palette={palette}
          duration={scene.duration}
          index={index}
          position={position}
        />
      );

    case 'features':
      return (
        <FeatureScene
          heading={scene.heading}
          items={scene.items}
          palette={palette}
          duration={scene.duration}
          index={index}
          position={position}
        />
      );

    case 'steps':
      /*
       * Steps and features are the same shape with one difference: an order.
       *
       * They had separate components drawing nearly identical pictures, which meant every
       * layout improvement had to be made twice and drifted apart when it wasn't. The
       * arrangement chooser handles the difference properly — an ordered list gets
       * numbered, an unordered one never does, because numbering a list of benefits
       * invents a sequence that isn't there.
       */
      return (
        <FeatureScene
          heading={scene.heading}
          items={scene.items}
          palette={palette}
          duration={scene.duration}
          index={index}
          position={position}
          ordered
        />
      );

    case 'stat':
      return (
        <StatScene
          prefix={scene.prefix}
          value={scene.value}
          suffix={scene.suffix}
          label={scene.label}
          palette={palette}
          duration={scene.duration}
          index={index}
          position={position}
        />
      );

    case 'quote':
      return (
        <QuoteScene
          quote={scene.quote}
          author={scene.author}
          palette={palette}
          duration={scene.duration}
          index={index}
          position={position}
        />
      );

    case 'logo':
      return (
        <LogoScene
          name={scene.name}
          tagline={scene.tagline}
          logoUrl={spec.logoUrl}
          palette={palette}
          duration={scene.duration}
          index={index}
          position={position}
        />
      );

    case 'product':
      return (
        <ProductScene
          /* The brand's own accent, so the interface keeps it even on a colour field. */
          brandAccent={spec.palette.accent}
          uiDark={frame.dark && frame.field === false}
          heading={scene.heading}
          caption={scene.caption}
          device={scene.device}
          surface={scene.surface}
          domain={scene.domain}
          labels={scene.labels}
          palette={palette}
          duration={scene.duration}
          index={index}
          position={position}
        />
      );

    case 'chart':
      return (
        <ChartScene
          heading={scene.heading}
          chart={scene.chart}
          series={scene.series}
          unit={scene.unit}
          caption={scene.caption}
          palette={palette}
          duration={scene.duration}
          index={index}
          position={position}
        />
      );

    case 'flow':
      return (
        <FlowScene
          heading={scene.heading}
          steps={scene.steps}
          caption={scene.caption}
          palette={palette}
          duration={scene.duration}
          index={index}
          position={position}
        />
      );

    case 'constellation':
      return (
        <ConstellationScene
          heading={scene.heading}
          items={scene.items}
          caption={scene.caption}
          palette={palette}
          duration={scene.duration}
          index={index}
          position={position}
        />
      );

    case 'overlay':
      return (
        <OverlayScene
          heading={scene.heading}
          items={scene.items}
          palette={palette}
          duration={scene.duration}
          index={index}
          position={position}
        />
      );

    case 'outro':
      return (
        <OutroScene
          headline={scene.headline}
          cta={scene.cta}
          palette={palette}
          duration={scene.duration}
          index={index}
          position={position}
        />
      );
  }
};

/**
 * The longest headline in the video, in words.
 *
 * Looks are chosen for the whole film, so the constraint has to be the worst case rather
 * than the first scene: a poster treatment that fits the opening title and then buries
 * the outro is not a look that fits.
 */
const longestHeadlineWords = (spec: VideoSpec): number =>
  spec.scenes.reduce((most, scene) => {
    const text =
      'headline' in scene ? scene.headline : 'heading' in scene ? scene.heading : '';
    const words = String(text ?? '').trim().split(/\s+/).filter(Boolean).length;
    return Math.max(most, words);
  }, 0);

/** Whether a hex colour is dark enough that the film should be built around darkness. */
const isDarkHex = (hex: string): boolean => {
  const value = hex.replace('#', '');
  if (value.length < 6) return false;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.22;
};
