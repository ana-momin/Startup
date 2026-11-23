import { createContext, useContext } from 'react';
import type { VideoConfig } from './types';

/**
 * Two pieces of information flow down the component tree:
 *
 *   1. WHICH FRAME are we drawing right now?
 *   2. WHAT SHAPE is the video? (size, fps, length)
 *
 * Everything an animation needs comes from these two.
 */

const FrameContext = createContext<number | null>(null);
const ConfigContext = createContext<VideoConfig | null>(null);

export const FrameProvider = FrameContext.Provider;
export const ConfigProvider = ConfigContext.Provider;

/**
 * The frame being drawn right now.
 *
 * Inside a <Sequence>, this is already shifted — a Sequence that starts at frame 60
 * reports frame 0 to its children at that moment. So every animation can be written as
 * if it starts at zero, and can be moved anywhere on the timeline without rewriting it.
 */
export const useCurrentFrame = (): number => {
  const frame = useContext(FrameContext);
  if (frame === null) {
    throw new Error('useCurrentFrame() must be used inside a <Composition>.');
  }
  return frame;
};

/** Size, fps and length of the video being drawn. */
export const useVideoConfig = (): VideoConfig => {
  const config = useContext(ConfigContext);
  if (config === null) {
    throw new Error('useVideoConfig() must be used inside a <Composition>.');
  }
  return config;
};

/** Current time in seconds. Handy when thinking in time rather than frames. */
export const useCurrentTime = (): number => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps;
};
