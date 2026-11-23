import {
  Easing,
  Slot,
  boxFor,
  fitText,
  interpolate,
  spring,
  streamFor,
  useCurrentFrame,
  useVideoConfig,
} from '@motion/engine';
import type { Palette } from '@motion/planner';
import { PlainLine, PlainLineBox } from '../motion/PlainLine';
import { SceneShell } from '../motion/SceneShell';
import { chooseEndLayout } from '../compose/endLayouts';
import { onDark, useBeats, useScale, useSeed, useStyle, useTone } from './shared';

type Props = {
  headline: string;
  cta?: string;
  palette: Palette;
  duration: number;
  index?: number;
  /** Where this scene sits in the video, 0 to 1. Sets how far back the camera stands. */
  position?: number;
};

/**
 * The closing scene: what you want the viewer to do next.
 *
 * The button lands last and keeps a slow breath afterwards, so the final frame still
 * has life in it. A video that freezes dead on its last frame feels like it crashed —
 * and the last frame is the one that sits on screen while somebody decides whether to
 * act on it.
 */
export const OutroScene = ({ headline, cta, palette, duration, index = 0, position }: Props) => {
  const scale = useScale();
  const style = useStyle();
  const tone = style.tone;
  const on = useBeats();
  const seed = useSeed();
  const { width, height } = useVideoConfig();

  const layout = chooseEndLayout(headline, streamFor(seed, `end-layout-${index}`), {
    hasTail: Boolean(cta),
    vertical: height > width,
  });

  const box = boxFor(layout.lead, { width, height, margin: style.margin });
  const size = fitText({
    text: headline,
    width: box.width,
    height: box.height * 0.94,
    max: 150 * scale * layout.scale * tone.headlineScale,
    min: 28 * scale,
    leading: style.advance,
    ratio: style.charRatio,
  });

  return (
    <SceneShell duration={duration} index={index} position={position} kind="outro">
      {/*
        The closing line, set plainly.

        The ending is the one frame that sits on screen while somebody decides whether to
        act, so it is the worst possible place for a typographic trick. One line, one
        size, ramping to the brand colour on the last word — which also means the call to
        action underneath it is arriving into the brand's colour rather than against it.
      */}
      <Slot region={layout.lead} anchor={layout.leadAnchor} margin={style.margin}>
        <PlainLineBox align={layout.leadAnchor.includes('left') ? 'left' : 'center'}>
          <PlainLine
            text={headline}
            size={size}
            palette={palette}
            delay={on(0.25)}
            align={layout.leadAnchor.includes('left') ? 'left' : 'center'}
            ramp
          />
        </PlainLineBox>
      </Slot>

      {/*
        The mark is the thread's, not this scene's.

        Both were drawing one, so every ending had two: the layout's rule where the
        composition wanted it, and the through-line pinned to the centre of the frame.
        Side by side they looked like a fault rather than a decision. The thread now
        reads this same layout and lands on the mark itself, which is better than either
        — the one rule the composition asked for is also the object that came through
        the cut to get there.
      */}

      {cta ? (
        <Slot
          region={layout.tail}
          anchor={layout.tailAnchor}
          margin={style.margin}
          // The same breathing room the title scene needs, for the same reason: adjacent
          // regions both filled to their shared edge leave nothing between them.
          /*
           * Room above the button, and more of it when the thread's rule is in the way.
           *
           * The composition puts its mark between the line and the call to action, and
           * the thread draws itself there. With only the old clearance the button landed
           * on top of the rule — two deliberate elements overlapping, which reads as
           * neither. The mark needs its own air, so the button starts below it.
           */
          style={
            layout.tailAnchor.startsWith('top')
              ? { paddingTop: size * 0.38 }
              : undefined
          }
        >
          <CtaButton label={cta} palette={palette} scale={scale} delay={on(1.5)} />
        </Slot>
      ) : null}
    </SceneShell>
  );
};

const CtaButton = ({
  label,
  palette,
  scale,
  delay,
}: {
  label: string;
  palette: Palette;
  scale: number;
  delay: number;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tone = useTone();
  const local = frame - delay;

  const pop = spring({ frame: local, fps, config: 'bouncy' });

  // The fill wipes across before the label appears, so the button builds itself rather
  // than arriving finished.
  const fill = interpolate(local, [0, 20], [100, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.easeOutExpo,
  });

  const labelIn = interpolate(local, [10, 24], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Starts only after the button has settled, so the two motions never fight.
  const glow = interpolate(local, [24, 46, 68], [0.3, 0.7, 0.3], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.easeInOutQuad,
  });

  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        transform: `scale(${0.88 + pop * 0.12})`,
        padding: `${20 * scale}px ${44 * scale}px`,
        borderRadius: 16 * scale,
        border: `${1.5 * scale}px solid ${palette.accent}`,
        boxShadow: onDark(palette.bg)
          ? `0 0 ${70 * scale}px ${palette.accent}${Math.round(glow * 255).toString(16).padStart(2, '0')}`
          : undefined,
      }}
    >
      <span
        style={{
          position: 'absolute',
          inset: 0,
          background: palette.accent,
          clipPath: `inset(0 ${fill}% 0 0)`,
        }}
      />
      <span
        style={{
          position: 'relative',
          opacity: labelIn,
          fontSize: 32 * scale,
          fontWeight: 650,
          letterSpacing: tone.upper ? 2 * scale : -0.3 * scale,
          textTransform: tone.upper ? 'uppercase' : 'none',
          color: palette.bg,
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
    </div>
  );
};
