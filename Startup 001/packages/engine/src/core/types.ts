/**
 * Core types for the animation engine.
 *
 * The whole engine rests on one idea: a video is a PURE FUNCTION of a frame number.
 * Give it frame 0, you get the first picture. Give it frame 90, you get the picture at
 * 3 seconds (at 30fps). Nothing is stored, nothing drifts, nothing is random.
 *
 * That is what makes preview and final render match EXACTLY, and what makes the same
 * prompt always produce the same video.
 */

export type VideoConfig = {
  /** Output width in pixels. */
  width: number;
  /** Output height in pixels. */
  height: number;
  /** Frames per second. 30 for web, 60 for silky UI motion. */
  fps: number;
  /** Total length of the video, counted in frames (not seconds). */
  durationInFrames: number;
};

/** A named video that can be previewed and rendered. */
export type Composition = {
  /** Unique id, also used in the preview URL. */
  id: string;
  /** The React component that draws a single frame. */
  component: React.ComponentType;
} & VideoConfig;

/*
 * Output formats (16:9, 9:16, 1:1) deliberately live in @motion/planner, not here.
 * They describe what a *video* is, and the server needs them without dragging React
 * along. The engine only needs to know how to draw whatever size it is handed.
 */
