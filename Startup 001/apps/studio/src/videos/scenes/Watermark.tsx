import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from '@motion/engine';
import { useScale } from './shared';

/**
 * The logo, quietly, in the corner.
 *
 * Every broadcast channel does this and almost nobody notices it, which is exactly the
 * point: it marks the video as theirs without asking for attention. It fades in after
 * the opening has landed, so it never competes with the first thing the viewer reads,
 * and leaves before the end so the closing frame is clean.
 */
export const Watermark = ({ src }: { src: string }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const scale = useScale();

  const opacity = interpolate(
    frame,
    [20, 45, durationInFrames - 30, durationInFrames - 12],
    [0, 0.55, 0.55, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  if (opacity <= 0.01) return null;

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <img
        src={src}
        alt=""
        style={{
          position: 'absolute',
          right: 56 * scale,
          bottom: 48 * scale,
          height: 42 * scale,
          width: 'auto',
          maxWidth: 200 * scale,
          objectFit: 'contain',
          opacity,
        }}
      />
    </AbsoluteFill>
  );
};

/**
 * The logo at full size, for the brand card.
 *
 * `objectFit: contain` inside a fixed box is doing real work here: brand logos arrive
 * as wide wordmarks, tall stacked marks and square icons, and any of them must sit
 * correctly without us knowing which we were given.
 */
export const LogoMark = ({
  src,
  size,
  opacity = 1,
  transform,
}: {
  src: string;
  size: number;
  opacity?: number;
  transform?: string;
}) => (
  <img
    src={src}
    alt=""
    style={{
      height: size,
      width: 'auto',
      maxWidth: size * 3.2,
      objectFit: 'contain',
      opacity,
      transform,
    }}
  />
);
