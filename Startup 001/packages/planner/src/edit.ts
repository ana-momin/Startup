import { FORMATS } from './types.ts';
import type { FormatName, Palette, ScenePlan, SceneKind, VideoSpec } from './types.ts';

/**
 * Editing a plan.
 *
 * This is the promise the whole product rests on: "make scene two slower" should change
 * scene two and leave everything else alone. Diffusion tools cannot do that — they can
 * only roll the dice again. Here a video is data, so editing is just changing data.
 *
 * Every function returns a new spec rather than modifying the old one. That keeps React
 * able to see that something changed, and makes undo a matter of keeping the previous
 * value rather than writing a reversal for every operation.
 */

/* ---------- scenes ---------- */

export const updateScene = (
  spec: VideoSpec,
  index: number,
  patch: Partial<ScenePlan>,
): VideoSpec => {
  if (index < 0 || index >= spec.scenes.length) return spec;

  return {
    ...spec,
    scenes: spec.scenes.map((scene, i) =>
      // The cast is needed because a patch cannot be proven to match this scene's
      // variant; callers only ever pass fields from the scene they are editing.
      i === index ? ({ ...scene, ...patch } as ScenePlan) : scene,
    ),
  };
};

export const removeScene = (spec: VideoSpec, index: number): VideoSpec => {
  // A video with no scenes renders as nothing at all, so the last one cannot go.
  if (spec.scenes.length <= 1) return spec;
  return { ...spec, scenes: spec.scenes.filter((_, i) => i !== index) };
};

export const duplicateScene = (spec: VideoSpec, index: number): VideoSpec => {
  const scene = spec.scenes[index];
  if (!scene) return spec;

  const scenes = [...spec.scenes];
  scenes.splice(index + 1, 0, { ...scene });
  return { ...spec, scenes };
};

export const moveScene = (spec: VideoSpec, from: number, to: number): VideoSpec => {
  if (from === to) return spec;
  if (from < 0 || from >= spec.scenes.length) return spec;
  if (to < 0 || to >= spec.scenes.length) return spec;

  const scenes = [...spec.scenes];
  const [moved] = scenes.splice(from, 1);
  scenes.splice(to, 0, moved);
  return { ...spec, scenes };
};

/** Add a fresh scene of the given kind, with placeholder copy the person can replace. */
export const addScene = (spec: VideoSpec, kind: SceneKind, at?: number): VideoSpec => {
  const scenes = [...spec.scenes];
  const index = at ?? scenes.length;
  scenes.splice(index, 0, blankScene(kind, spec.fps));
  return { ...spec, scenes };
};

const blankScene = (kind: SceneKind, fps: number): ScenePlan => {
  switch (kind) {
    case 'bigword':
      return { kind, words: ['THIS', 'CHANGES', 'EVERYTHING'], duration: fps * 3 };
    case 'flow':
      return {
        kind,
        heading: 'How it works',
        steps: ['Start', 'Build', 'Ship'],
        duration: fps * 4,
      };
    case 'constellation':
      return {
        kind,
        heading: 'Everything in one place',
        items: ['Overview', 'Tasks', 'Docs', 'People'],
        duration: fps * 5,
      };
    case 'product':
      // Starts as a dashboard with unnamed rows: the shape is right immediately, and
      // whoever added it fills in their own feature names.
      return {
        kind,
        heading: 'See it in action',
        device: 'browser',
        surface: 'dashboard',
        duration: fps * 6,
      };
    case 'chart':
      // Deliberately a flat, obviously placeholder series. A chart that arrives with
      // plausible-looking numbers is one somebody forgets to replace.
      return {
        kind,
        heading: 'The numbers',
        chart: 'bars',
        series: [
          { label: 'One', value: 1 },
          { label: 'Two', value: 1 },
          { label: 'Three', value: 1 },
        ],
        duration: fps * 5,
      };
    case 'features':
      return {
        kind,
        heading: "What's inside",
        items: ['First point', 'Second point', 'Third point'],
        duration: fps * 5,
      };
    case 'steps':
      return {
        kind,
        heading: 'How it works',
        items: ['First step', 'Second step', 'Third step'],
        duration: fps * 5,
      };
    case 'stat':
      return { kind, value: 100, suffix: '%', label: 'Your metric', duration: fps * 3 };
    case 'quote':
      return {
        kind,
        quote: 'Something a customer said about you.',
        author: 'Their name',
        duration: fps * 4,
      };
    case 'logo':
      return { kind, name: 'Your brand', tagline: 'Your tagline', duration: fps * 3 };
    case 'outro':
      return { kind, headline: 'Get started today', cta: 'Try it free', duration: fps * 3 };
    case 'title':
    default:
      return { kind: 'title', headline: 'Your headline here', duration: fps * 3 };
  }
};

/* ---------- whole-video settings ---------- */

export const setFormat = (spec: VideoSpec, format: FormatName): VideoSpec => ({
  ...spec,
  format,
});

export const setPalette = (spec: VideoSpec, patch: Partial<Palette>): VideoSpec => ({
  ...spec,
  palette: { ...spec.palette, ...patch },
});

export const setTitle = (spec: VideoSpec, title: string): VideoSpec => ({
  ...spec,
  title: title.trim() || spec.title,
});

/**
 * Change a scene's length in seconds rather than frames.
 *
 * Frames are what the engine counts, but nobody thinks in frames. Clamped so a scene
 * can never be shorter than its own entrance animation, which would look broken.
 */
export const setSceneSeconds = (
  spec: VideoSpec,
  index: number,
  seconds: number,
): VideoSpec => {
  const frames = Math.round(clamp(seconds, 1.2, 20) * spec.fps);
  return updateScene(spec, index, { duration: frames } as Partial<ScenePlan>);
};

/* ---------- reading the plan ---------- */

/** The frame each scene starts on, accounting for the crossfade overlap. */
export const sceneStarts = (spec: VideoSpec, crossfade: number): number[] => {
  let cursor = 0;
  return spec.scenes.map((scene, i) => {
    const start = i === 0 ? 0 : cursor - crossfade;
    cursor = start + scene.duration;
    return Math.max(start, 0);
  });
};

/** Output pixel size for a format, without needing the whole spec. */
export const sizeOf = (format: FormatName): { width: number; height: number } =>
  FORMATS[format];

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);
