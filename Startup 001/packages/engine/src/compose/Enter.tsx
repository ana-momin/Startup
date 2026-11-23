import type { CSSProperties, ReactNode } from 'react';
import { useCurrentFrame, useVideoConfig } from '../core/context';
import { entranceStyle } from './entrances';
import type { EntranceName } from './entrances';
import type { SpringPresetName } from '../animation/spring';

/**
 * Anything, arriving.
 *
 * The point of wrapping this is that the choice of *how* something arrives stops being
 * baked into the component that draws it. A headline no longer knows that it rises; it
 * knows it is a hero, and something upstream decides what a hero does in this video.
 * That separation is what lets one video's headline wipe in and the next one's come into
 * focus without either component changing.
 */

type EnterProps = {
  name: EntranceName;
  /** Frame the entrance begins, on this scene's clock. */
  delay?: number;
  /** How far it travels. Pass the element's own size so big things move further. */
  distance?: number;
  config?: SpringPresetName;
  duration?: number;
  children: ReactNode;
  style?: CSSProperties;
  /** Laid out in normal flow by default; `block` when it needs its own line. */
  display?: CSSProperties['display'];
};

export const Enter = ({
  name,
  delay = 0,
  distance = 40,
  config = 'snappy',
  duration = 22,
  children,
  style,
  display = 'block',
}: EnterProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = entranceStyle(name, {
    frame: frame - delay,
    fps,
    config,
    distance,
    duration,
  });

  return (
    <div
      style={{
        display,
        opacity: entrance.opacity,
        transform: entrance.transform,
        clipPath: entrance.clipPath,
        filter: entrance.filter,
        /*
         * Only promoted while it is actually moving.
         *
         * A permanent compositing layer costs memory for every element in the video and
         * buys nothing once the element has settled — and on a renderer that rasterises
         * every frame from scratch it is pure overhead. Dropping the hint when the
         * entrance is done is free.
         */
        willChange: entrance.opacity < 1 ? 'transform, opacity' : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
