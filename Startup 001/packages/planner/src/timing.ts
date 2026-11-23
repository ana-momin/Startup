import { FORMATS, specDuration } from './types.ts';
import type { VideoSpec } from './types.ts';

/**
 * How long a video actually is, and how big.
 *
 * Kept separate from anything that draws, because both the browser and the render
 * server need these numbers and the server must not have to import React to get them.
 */

/** Frames of overlap between scenes, so cuts crossfade instead of snapping. */
export const CROSSFADE = 8;

/**
 * Total frames in the finished video.
 *
 * Because scenes overlap, this is shorter than the sum of their durations. Getting it
 * wrong leaves dead black frames on the end — the kind of small sloppiness that makes
 * a product feel unfinished.
 */
export const specFrames = (spec: VideoSpec): number => {
  const overlaps = Math.max(spec.scenes.length - 1, 0) * CROSSFADE;
  return Math.max(specDuration(spec) - overlaps, 1);
};

/** Runtime in seconds, for display. */
export const specSeconds = (spec: VideoSpec): number => specFrames(spec) / spec.fps;

/** Output pixel size for this video's format. */
export const specSize = (spec: VideoSpec): { width: number; height: number } =>
  FORMATS[spec.format];

/** A filename-safe name derived from the title. */
export const specSlug = (spec: VideoSpec): string =>
  spec.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'video';
