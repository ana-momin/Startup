import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas } from '@motion/engine';
import type { VideoSpec } from '@motion/planner';
import { buildComposition } from '@/lib/composition';
import { GeneratedVideo } from '@/videos';
import { encodeVideo } from '@/render/encode';
import type { EncodeOptions } from '@/render/encode';

/**
 * The render surface.
 *
 * A bare page whose only job is to draw one exact frame of one video, at true output
 * size, and hold still while a camera photographs it. The renderer drives it from
 * Node through the functions attached to `window` below.
 *
 * It reuses the *same* components the preview uses. That is the whole point: what the
 * customer watched in the browser is literally what gets exported, because it is the
 * same code rendering the same frame number.
 */

declare global {
  interface Window {
    /** Load the video to render. Called once, before any frame is requested. */
    __setSpec: (spec: VideoSpec) => Promise<void>;
    /** Draw one exact frame and resolve when the pixels have actually landed. */
    __setFrame: (frame: number) => Promise<void>;
    /** Encode a finished frame sequence into an MP4. Used on the encoder page. */
    __encode: (options: EncodeOptions) => Promise<string>;
    /** Provided by the renderer: hands back one frame as a base64 PNG. */
    __pullFrame: (index: number) => Promise<string>;
    /** Set once the page is wired up and safe to drive. */
    __ready: boolean;
  }
}

type State = {
  spec: VideoSpec | null;
  frame: number;
};

const RenderSurface = () => {
  const [state, setState] = useState<State>({ spec: null, frame: 0 });

  useEffect(() => {
    window.__setSpec = async (spec) => {
      setState({ spec, frame: 0 });
      // Text that renders before its font arrives would be photographed in the
      // fallback typeface. Waiting here is the difference between a clean export
      // and one where the first second uses the wrong font.
      await document.fonts.ready;
      await nextPaint();
    };

    window.__setFrame = async (frame) => {
      setState((s) => ({ ...s, frame }));
      await nextPaint();
    };

    window.__encode = encodeVideo;
    window.__ready = true;
  }, []);

  if (!state.spec) return null;

  const composition = buildComposition(state.spec, () => (
    <GeneratedVideo spec={state.spec!} />
  ));

  return (
    <Canvas config={composition} frame={state.frame} fit={false}>
      <GeneratedVideo spec={state.spec} />
    </Canvas>
  );
};

/**
 * Resolve only after the browser has painted.
 *
 * React schedules the state change, but the pixels are not on screen until the next
 * frame. Two nested rAF calls is the reliable way to be sure we photograph the new
 * frame rather than the previous one — the single most common bug in frame-by-frame
 * capture.
 */
const nextPaint = (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

createRoot(document.getElementById('surface')!).render(<RenderSurface />);
