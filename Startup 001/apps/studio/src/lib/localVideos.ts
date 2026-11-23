import type { VideoSpec } from '@motion/planner';
import type { Video } from './api';

/**
 * Videos made before signing in.
 *
 * Asking someone to create an account before they have seen what the product does is
 * the fastest way to lose them, so the whole thing works signed out and keeps the work
 * in this browser. When they do sign up, everything here moves into their account and
 * nothing is lost — which is the only reason it is acceptable to let them start without
 * one.
 */

const KEY = 'motion.local.videos';
const LIMIT = 20;

export const loadLocal = (): Video[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // A hand-edited or half-written entry should cost one video, not the whole list.
    return parsed.filter(isVideo).map((v) => ({ ...v, local: true }));
  } catch {
    return [];
  }
};

export const saveLocal = (videos: Video[]): void => {
  try {
    localStorage.setItem(KEY, JSON.stringify(videos.slice(0, LIMIT)));
  } catch {
    // Private browsing blocks storage, and a full quota throws. Losing the local copy
    // is survivable; crashing the app over it is not.
  }
};

export const clearLocal = (): void => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* see above */
  }
};

export const makeLocalVideo = (spec: VideoSpec, prompt: string): Video => {
  const now = Date.now();
  return {
    id: `local-${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    title: spec.title,
    prompt,
    spec,
    createdAt: now,
    updatedAt: now,
    local: true,
  };
};

const isVideo = (value: unknown): value is Video => {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.title === 'string' &&
    !!v.spec &&
    typeof v.spec === 'object' &&
    Array.isArray((v.spec as VideoSpec).scenes)
  );
};
