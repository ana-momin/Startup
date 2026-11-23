import {
  Center,
  Column,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from '@motion/engine';
import type { Palette } from '@motion/planner';
import { MaskedLine } from '../motion/MaskedText';
import { SceneShell } from '../motion/SceneShell';
import { useBeats, useScale, useTone } from './shared';
import { LogoMark } from './Watermark';

type Props = {
  name: string;
  tagline?: string;
  /** The real brand logo, when there is one. */
  logoUrl?: string;
  palette: Palette;
  duration: number;
  index?: number;
  /** Where this scene sits in the video, 0 to 1. Sets how far back the camera stands. */
  position?: number;
};

/**
 * The brand card.
 *
 * What a real film ends on: the name, held still, with everything else removed. The
 * letters arrive from a wide track and settle into place — the standard logo resolve,
 * because it reads as a name being *stated* rather than typed.
 *
 * Tracking closing as the name lands is most of why a logo resolve feels expensive.
 * It is one interpolated value and almost nobody thinks to animate it.
 */
export const LogoScene = ({
  name,
  tagline,
  logoUrl,
  palette,
  duration,
  index,
  position,
}: Props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = useScale();
  const tone = useTone();
  const on = useBeats();

  const enter = spring({ frame, fps, config: tone.spring, delay: on(0.25) });

  const tracking = interpolate(frame, [3, 32], [30, 2], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.easeOutExpo,
  });

  const size = Math.min(150, 1150 / Math.max(name.length, 5)) * scale;

  // A ring expanding out from behind the name once it has settled.
  const ring = interpolate(frame, [24, 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.easeOutExpo,
  });

  return (
    <SceneShell palette={palette} duration={duration} index={index} position={position} kind="logo" transition="iris">
      <Center>
        <div
          style={{
            position: 'absolute',
            width: 900 * scale * ring,
            height: 900 * scale * ring,
            borderRadius: '50%',
            border: `${1.5 * scale}px solid ${palette.accent}`,
            opacity: (1 - ring) * 0.4,
          }}
        />

        <Column gap={26 * scale}>
          {logoUrl ? (
            // A real logo replaces the wordmark entirely. Showing both is the mistake
            // that makes a brand card look like a placeholder.
            <LogoMark
              src={logoUrl}
              size={130 * scale}
              opacity={interpolate(frame, [3, 22], [0, 1], { extrapolateRight: 'clamp' })}
              transform={`scale(${0.9 + enter * 0.1})`}
            />
          ) : (
            <span
              style={{
                opacity: interpolate(frame, [3, 20], [0, 1], { extrapolateRight: 'clamp' }),
                transform: `scale(${0.94 + enter * 0.06})`,
                fontSize: size,
                fontWeight: 800,
                letterSpacing: tracking * scale,
                lineHeight: 1,
                color: palette.text,
                whiteSpace: 'nowrap',
              }}
            >
              {name}
            </span>
          )}

          {tagline && (
            <MaskedLine delay={on(2)} duration={22} size={28 * scale}>
              <span
                style={{
                  display: 'block',
                  fontSize: 28 * scale,
                  fontWeight: 400,
                  letterSpacing: 3.2 * scale,
                  textTransform: 'uppercase',
                  color: palette.muted,
                  textAlign: 'center',
                }}
              >
                {tagline}
              </span>
            </MaskedLine>
          )}
        </Column>
      </Center>
    </SceneShell>
  );
};
