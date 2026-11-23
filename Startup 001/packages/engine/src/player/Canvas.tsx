import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ConfigProvider, FrameProvider } from '../core/context';
import type { VideoConfig } from '../core/types';

type CanvasProps = {
  config: VideoConfig;
  frame: number;
  children: ReactNode;
  /** Scale the canvas down to fit its container. On for preview, off for rendering. */
  fit?: boolean;
};

/**
 * Draws one frame of a video at its true pixel size.
 *
 * The canvas is ALWAYS laid out at the real output size (e.g. 1920x1080) and then
 * visually scaled to fit. That matters: a 64px font is 64px in the exported file no
 * matter how small the preview window is. What you see is exactly what renders.
 *
 * The wrapper is sized to the *scaled* result rather than left at full size, because a
 * transform changes how something looks but not how much room it takes up. Leaving the
 * layout box at 1080x1920 inside a small panel is what makes a vertical video hang out
 * of its frame.
 */
export const Canvas = ({ config, frame, children, fit = true }: CanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(fit ? 0 : 1);

  useEffect(() => {
    if (!fit) {
      setScale(1);
      return;
    }
    const container = containerRef.current;
    if (!container) return;

    const update = () => {
      const { width, height } = container.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      // Fit inside the container, never scale past 1:1.
      setScale(Math.min(width / config.width, height / config.height, 1));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, [config.width, config.height, fit]);

  // Before the first measurement there is no honest size to draw at. Rendering at the
  // wrong scale for one frame is what causes the visible jump on load.
  const measured = scale > 0;

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          // The visible footprint: real size multiplied by the fit scale.
          width: config.width * (measured ? scale : 1),
          height: config.height * (measured ? scale : 1),
          flexShrink: 0,
          position: 'relative',
          overflow: 'hidden',
          visibility: measured ? 'visible' : 'hidden',
        }}
      >
        <div
          // This id is how the renderer finds the exact area to capture.
          id="video-canvas"
          style={{
            width: config.width,
            height: config.height,
            transform: measured ? `scale(${scale})` : undefined,
            // Scaling from the top-left keeps the scaled box aligned with the wrapper
            // above. Centre origin would push it up and to the left by half the
            // difference, which is exactly how content ends up outside the frame.
            transformOrigin: 'top left',
            position: 'absolute',
            top: 0,
            left: 0,
            overflow: 'hidden',
            backgroundColor: 'black',
          }}
        >
          <ConfigProvider value={config}>
            <FrameProvider value={frame}>{children}</FrameProvider>
          </ConfigProvider>
        </div>
      </div>
    </div>
  );
};
