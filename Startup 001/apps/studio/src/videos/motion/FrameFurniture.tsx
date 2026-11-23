import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from '@motion/engine';
import { CROSSFADE, sceneStarts, specFrames } from '@motion/planner';
import type { VideoSpec } from '@motion/planner';
import { useLook, useScale, useTone } from '../scenes/shared';

/**
 * The furniture: the marks that sit on the frame rather than in it.
 *
 * Corner ticks, a chapter counter, a segmented progress rule along the bottom. None of
 * it is content and nobody watching would mention it, which is exactly why it works —
 * it is the difference between a picture with words on it and a frame that somebody
 * composed.
 *
 * Two things it earns beyond looking right.
 *
 * It fills the frame. The honest diagnosis of the old videos was not that the motion was
 * bad, it was that 80% of every frame was empty black and the eye had nothing to hold.
 * Furniture gives the composition edges and corners to be anchored against.
 *
 * It survives the cut. Everything else in a video restarts when a scene changes — this
 * is drawn once, outside the scene sequence, so it runs continuously from the first
 * frame to the last. A viewer reads that continuity as one film rather than five clips,
 * and the progress rule quietly answers "how much is left", which is the question that
 * decides whether somebody keeps watching.
 */

const MONO =
  "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";

export const FrameFurniture = ({ spec }: { spec: VideoSpec }) => {
  const frame = useCurrentFrame();
  const scale = useScale();
  const tone = useTone();
  const look = useLook();

  const total = Math.max(specFrames(spec), 1);
  const starts = sceneStarts(spec, CROSSFADE);
  const { accent, muted } = spec.palette;

  // Everything arrives after the first scene has had a moment alone. Furniture that is
  // present on frame zero reads as chrome around the video; furniture that assembles
  // reads as part of it.
  const arrive = interpolate(frame, [8, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.entrance,
  });
  // And leaves before the end, so the last frame is clean for whatever comes after it.
  const leave = interpolate(frame, [total - 22, total - 6], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.easeInOutQuad,
  });
  const on = arrive * leave;
  if (on < 0.01) return null;

  /*
   * Some looks have no furniture at all.
   *
   * Corner marks and a chapter counter are a deliberate style, not a neutral default —
   * they say "instrument panel", which is right for a developer tool and wrong for a
   * wellbeing brand. A look that is mostly about restraint cannot have a broadcast
   * package bolted onto it and still be that look.
   */
  if (look.furniture === 'none') return null;
  const minimal = look.furniture === 'minimal';

  // Which scene are we in? The counter is the only part of the furniture that changes,
  // which makes it the only part anybody consciously notices.
  const current = starts.reduce((found, start, i) => (frame >= start ? i : found), 0);

  const margin = 54 * scale;
  const tick = 26 * scale;
  const hair = Math.max(1, 1.5 * scale);
  // Quieter tones want more of this; kinetic video is busy enough already.
  const ink = (tone.motion > 0.9 ? 0.38 : 0.62) * (minimal ? 0.6 : 1);

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', opacity: on }}>
      {/* Corner ticks. Two lines each, drawn outward from the corner. */}
      {CORNERS.map(([vertical, horizontal], i) => {
        // Staggered so the frame assembles rather than snapping into place.
        const draw = interpolate(frame, [10 + i * 3, 30 + i * 3], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.entrance,
        });
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              [vertical]: margin,
              [horizontal]: margin,
              width: tick,
              height: tick,
              [`border${cap(vertical)}`]: `${hair}px solid ${accent}`,
              [`border${cap(horizontal)}`]: `${hair}px solid ${accent}`,
              opacity: ink * 0.7 * draw,
              transform: `scale(${0.6 + draw * 0.4})`,
              transformOrigin: `${horizontal} ${vertical}`,
            }}
          />
        );
      })}

      {/* Brand mark, top left. Small, and never louder than the headline. */}
      {spec.brandName && !minimal ? (
        <span
          style={{
            position: 'absolute',
            top: margin - 4 * scale,
            left: margin + tick + 18 * scale,
            fontFamily: look.labelFamily,
            fontSize: 17 * scale,
            letterSpacing: 3 * scale,
            textTransform: 'uppercase',
            color: muted,
            opacity: ink,
          }}
        >
          {spec.brandName}
        </span>
      ) : null}

      {/* Chapter counter, top right. */}
      <span
        style={{
          position: 'absolute',
          top: margin - 4 * scale,
          right: margin + tick + 18 * scale,
          fontFamily: MONO,
          fontSize: 17 * scale,
          letterSpacing: 2.5 * scale,
          color: muted,
          opacity: ink,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {pad(current + 1)}
        <span style={{ opacity: 0.45 }}> / {pad(spec.scenes.length)}</span>
      </span>

      {/*
        The progress rule: one segment per scene, so the bar is a picture of the video's
        structure and not just a percentage. Watching a segment fill tells you how long
        this idea lasts; watching how many are left tells you how long the video does.
      */}
      <div
        style={{
          position: 'absolute',
          left: margin,
          right: margin,
          bottom: margin,
          display: 'flex',
          gap: 6 * scale,
          height: hair * 2,
        }}
      >
        {spec.scenes.map((_, i) => {
          const start = starts[i];
          const span = (i < starts.length - 1 ? starts[i + 1] : total) - start;
          const through = Math.min(Math.max((frame - start) / Math.max(span, 1), 0), 1);
          return (
            <div
              key={i}
              style={{
                flexGrow: span,
                position: 'relative',
                borderRadius: 999,
                backgroundColor: `${muted}2E`,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: `${through * 100}%`,
                  borderRadius: 999,
                  backgroundColor: accent,
                  opacity: ink + 0.2,
                }}
              />
            </div>
          );
        })}
      </div>

      {/*
        A centre hairline lived here and has been taken out.
        On paper it was the axis centred type is placed against; on screen it ran
        straight through the middle of the headline, because the headline is also on
        that axis. Structure the viewer can see cutting through the content is not
        structure — the grid in the backdrop already does the job, behind the words
        where it belongs.
      */}
    </AbsoluteFill>
  );
};

const CORNERS = [
  ['top', 'left'],
  ['top', 'right'],
  ['bottom', 'left'],
  ['bottom', 'right'],
] as const;

const cap = (s: string): string => s[0].toUpperCase() + s.slice(1);
const pad = (n: number): string => String(n).padStart(2, '0');
