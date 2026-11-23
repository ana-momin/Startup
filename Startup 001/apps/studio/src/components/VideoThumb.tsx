import { useMemo } from 'react';
import { Canvas } from '@motion/engine';
import { specFrames, specSize } from '@motion/planner';
import type { VideoSpec } from '@motion/planner';
import { GeneratedVideo } from '@/videos';

/**
 * A still frame of a real video.
 *
 * Not a mock, not a coloured rectangle — the actual engine drawing the actual video at
 * one frozen moment. This is only affordable because a frame is a pure function of a
 * frame number: no player, no timers, no animation loop. Just React rendering once.
 *
 * The frame chosen is a little way into the second scene rather than frame zero, where
 * most videos are still fading up from nothing and every thumbnail would be black.
 */
export const VideoThumb = ({ spec }: { spec: VideoSpec }) => {
  const { config, frame } = useMemo(() => {
    const { width, height } = specSize(spec);
    const total = specFrames(spec);

    // Roughly a third of the way in: past the opening fade, before the closing one.
    const target = Math.round(total * 0.34);

    return {
      config: { width, height, fps: spec.fps, durationInFrames: total },
      frame: Math.min(Math.max(target, 12), Math.max(total - 1, 12)),
    };
  }, [spec]);

  return (
    <Canvas config={config} frame={frame}>
      <GeneratedVideo spec={spec} />
    </Canvas>
  );
};
