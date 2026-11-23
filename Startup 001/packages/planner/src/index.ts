/**
 * The planner.
 *
 * Prompt in, VideoSpec out — the single most important boundary in the product.
 * Everything downstream (scenes, renderer, export) reads a VideoSpec and knows nothing
 * about prompts or AI, so the brain can be replaced without touching a single animation.
 *
 * It lives in its own package because two very different places need it: the browser,
 * for instant feedback, and the server, which is where a real model's API key will live
 * once we add one. Shared code, one implementation, no drift.
 *
 * Deliberately free of browser and Node APIs — no DOM, no filesystem, no React — so it
 * runs anywhere without a shim.
 */

/* Generating */
export { generateSpec } from './generate.ts';
export type { GenerateOptions, LengthPreference } from './generate.ts';

/* Asking before building */
export { questionsFor, mergeAnswers } from './intake.ts';
export type { Question, QuestionId, Answers } from './intake.ts';

/* Editing */
export {
  updateScene,
  removeScene,
  duplicateScene,
  moveScene,
  addScene,
  setFormat,
  setPalette,
  setTitle,
  setSceneSeconds,
  sceneStarts,
  sizeOf,
} from './edit.ts';

/* Brand */
export { paletteFor, reportFor, brandBriefing } from './brand.ts';
export type { Brand, BrandContext, PaletteReport } from './brand.ts';
export {
  parseHex,
  parseColor,
  toHex,
  toHsl,
  fromHsl,
  contrast,
  luminance,
  ensureContrast,
  isDark,
  mix,
  pickBrandColor,
  rankBrandColors,
  hasCharacter,
  MIN_CONTRAST,
} from './color.ts';
export type { Rgb, Hsl } from './color.ts';

/* Timing and shape */
export { TARGET_SECONDS, fitToLength, runtime } from './fit.ts';
export { chooseEnding } from './ending.ts';
export { chooseOpening } from './opening.ts';
export type { LengthName } from './fit.ts';
export { REFERENCES, SHARED_RULES, STRUCTURAL_DEVICES, referenceBriefing } from './references.ts';
export type { Reference } from './references.ts';
export { colorScript } from './script.ts';
export type { Frame, ScriptOptions } from './script.ts';
export { CROSSFADE, specFrames, specSeconds, specSize, specSlug } from './timing.ts';
export { FORMATS, specDuration } from './types.ts';
export type {
  VideoSpec,
  ScenePlan,
  SceneKind,
  Palette,
  FormatName,
  Tone,
  Align,
  Motif,
  TitleLayout,
  VideoStyle,
  DeviceKind,
  SurfaceKind,
  ChartKind,
  ChartPoint,
  ListLayout,
} from './types.ts';
