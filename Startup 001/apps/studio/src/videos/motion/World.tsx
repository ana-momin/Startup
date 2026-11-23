import {
  AbsoluteFill,
  Easing,
  Layer,
  Stage,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from '@motion/engine';
import type { CameraKeyframe } from '@motion/engine';
import type { Palette } from '@motion/planner';
import { Backdrop, useScale, useTone } from '../scenes/shared';

/**
 * The world the whole video takes place in, and the lens it is filmed through.
 *
 * Both are drawn once, outside the scene sequence, and run from the first frame to the
 * last without restarting.
 *
 * This started as a bug. Every scene used to draw its own background, so during a
 * transition — when the outgoing scene is being clipped away and the incoming one has
 * not opened yet — neither covered the frame and a black gap appeared at the edge. The
 * obvious patch would have been to make the transitions overlap more.
 *
 * The real answer was that the question was wrong. A background is not a property of a
 * shot; it is the place the shots happen in. Once it belongs to the film, the gap cannot
 * exist, because there is always something behind the content — and the video gains the
 * thing it was missing: cuts that move *within* one continuous space instead of between
 * unrelated pictures. It is also cheaper, because one backdrop is drawn per frame rather
 * than one per overlapping scene.
 *
 * The lens follows the same logic. A vignette and out-of-focus foreground belong to the
 * camera, so they sit outside the cut as well. A vignette that restarts on every scene
 * is a vignette the viewer can feel restarting.
 */

/** The continuous background, with its own slow move across the whole runtime. */
export const World = ({ palette }: { palette: Palette }) => {
  const { durationInFrames } = useVideoConfig();
  const tone = useTone();

  /*
   * One unbroken move from the first frame to the last.
   *
   * It is deliberately slower than anything a scene does. The background moving at a
   * different rate from the words is the entire parallax effect — if they travelled
   * together the picture would merely be sliding, and sliding is not depth.
   */
  const camera: CameraKeyframe[] = [
    { at: 0, x: -0.09 * tone.motion, y: 0.04 * tone.motion, zoom: 1, easing: Easing.linear },
    {
      at: durationInFrames,
      x: 0.09 * tone.motion,
      y: -0.04 * tone.motion,
      zoom: 1 + 0.18 * tone.motion,
      easing: Easing.easeInOutQuad,
    },
  ];

  return (
    <Stage camera={camera}>
      <Layer depth={1} bleed={26}>
        <Backdrop palette={palette} />
      </Layer>

      {/*
        In front of everything and soft, which is what something nearer than the thing
        you are looking at has to be. The softness comes from the gradients themselves
        rather than from a blur filter: a blur here cost more render time than every
        other element in the video put together.

        Because it is closer it sweeps past faster than the words do, and that difference
        in speed is most of what makes the frame read as a space rather than a picture.
      */}
      <Layer depth={2.4} bleed={14}>
        <Bokeh palette={palette} />
      </Layer>
    </Stage>
  );
};

/** The lens falloff. Sits above the scenes, locked, never moving. */
export const Lens = () => (
  <AbsoluteFill
    style={{
      pointerEvents: 'none',
      background:
        'radial-gradient(ellipse at center, transparent 52%, rgba(0,0,0,0.38) 100%)',
    }}
  />
);

/**
 * Two soft out-of-focus shapes passing in front of everything.
 *
 * Cheap in every sense — two divs, no images — and it does more for the feeling of depth
 * than the background does, because it gives the eye something unambiguously *near*.
 * Kept faint on purpose: the moment you can identify what the shape is, it stops being
 * atmosphere and starts being a mistake.
 */
const Bokeh = ({ palette }: { palette: Palette }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const scale = useScale();
  const tone = useTone();

  const progress = interpolate(frame, [0, Math.max(durationInFrames, 1)], [0, 1]);
  const strength = tone.motion;

  return (
    <AbsoluteFill style={{ overflow: 'visible', opacity: 0.55 * strength }}>
      <div
        style={{
          position: 'absolute',
          left: `${-16 + progress * 34 * strength}%`,
          top: '10%',
          width: 460 * scale,
          height: 460 * scale,
          borderRadius: '50%',
          background: `radial-gradient(circle at 35% 35%, ${palette.accent}33, transparent 70%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: `${-12 + progress * 24 * strength}%`,
          bottom: '4%',
          width: 340 * scale,
          height: 340 * scale,
          borderRadius: '50%',
          background: `radial-gradient(circle at 60% 40%, ${palette.accentSoft}28, transparent 68%)`,
        }}
      />
    </AbsoluteFill>
  );
};
