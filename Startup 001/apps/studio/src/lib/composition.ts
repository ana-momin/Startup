import type { ComponentType } from 'react';
import type { Composition } from '@motion/engine';
import { specFrames, specSize, specSlug } from '@motion/planner';
import type { VideoSpec } from '@motion/planner';

/**
 * Bridge between a plan and something the engine can play.
 *
 * This lives in the app rather than in the planner because a Composition holds a React
 * component, and the planner must stay free of React so the server can use it. One
 * small function is the entire cost of that separation.
 */
export const buildComposition = (
  spec: VideoSpec,
  component: ComponentType,
): Composition => ({
  id: specSlug(spec),
  component,
  ...specSize(spec),
  fps: spec.fps,
  durationInFrames: specFrames(spec),
});
