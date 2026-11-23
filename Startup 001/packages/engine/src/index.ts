/**
 * The engine's public API.
 *
 * Everything an animation needs is exported from here, and nothing else should be
 * imported from deeper paths. Keeping one front door means we can rebuild the insides
 * later without breaking a single video.
 *
 * This code is ours. No third-party video framework, no license fees, no vendor.
 */

/* Core */
export { useCurrentFrame, useVideoConfig, useCurrentTime } from './core/context';
export { Sequence, Series } from './core/Sequence';
export { AbsoluteFill, Center, Column, Row } from './core/layout';
export type { VideoConfig, Composition } from './core/types';

/* Animation */
export { interpolate, interpolateColors, clamp } from './animation/interpolate';
export type { InterpolateOptions, ExtrapolateMode } from './animation/interpolate';
export { Easing, cubicBezier } from './animation/easing';
export type { EasingFn } from './animation/easing';
export { spring, springDuration, SpringPresets } from './animation/spring';
export type { SpringConfig, SpringPresetName } from './animation/spring';
export { entrance, idle } from './animation/entrance';
export type { EntranceOptions } from './animation/entrance';

/* Shapes — geometry that draws itself and turns into other geometry */
export { Draw, Morph, linePath, arcPath, rectPath, bracketPath, chevronPath, underlinePath } from './shapes/Draw';
export { shapePoints, resample, toPath, morphPath, shapePath } from './shapes/geometry';
export type { ShapeName, Point, Placement } from './shapes/geometry';

/* Camera — a space to move through, and depth inside it */
export { Stage, Layer, useCamera } from './camera/Stage';
export {
  resolveCamera,
  travel,
  push,
  pull,
  impact,
  drift,
  locked,
  NEUTRAL,
} from './camera/camera';
export type { CameraState, CameraKeyframe, Direction } from './camera/camera';

/* Composition — layout as data, and the seeded variation that drives it */
export { Slot } from './compose/Slot';
export { COLUMNS, ROWS, boxFor, alignmentFor, mirror, shift } from './compose/grid';
export type { Region, Anchor, Box, GridConfig } from './compose/grid';
export { seedFrom, randomFrom, streamFor } from './compose/seed';
export { fitText } from './compose/fit';
export { Enter } from './compose/Enter';
export { entranceStyle, chooseEntrance } from './compose/entrances';
export type { EntranceName, EntranceStyle, Role } from './compose/entrances';
export type { FitOptions } from './compose/fit';
export type { Random } from './compose/seed';

/* Rhythm — the grid everything lands on */
export { framesPerBeat, beat, beatAt, snapToBeat, beatPulse, TEMPO } from './rhythm/beat';
export type { TempoName } from './rhythm/beat';

/* Player */
export { Player } from './player/Player';
export type { SeekRequest } from './player/Player';
export { Canvas } from './player/Canvas';
