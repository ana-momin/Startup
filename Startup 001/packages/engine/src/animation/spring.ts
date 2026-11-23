/**
 * Spring physics.
 *
 * Easing curves have a fixed duration. Springs instead simulate a real weight on a real
 * spring, so motion has weight and settles naturally. This is the difference between
 * "animated" and "alive", and it is a big part of why good motion design feels good.
 *
 * Implemented as the closed-form solution of a damped harmonic oscillator, so any frame
 * can be computed directly without simulating every frame before it. That keeps the
 * engine pure: frame 500 costs the same as frame 1.
 */

export type SpringConfig = {
  /** How heavy the object feels. Higher = slower, more lumbering. */
  mass: number;
  /** How stiff the spring is. Higher = faster, more urgent. */
  stiffness: number;
  /** How quickly it settles. Low = bouncy, high = no bounce. */
  damping: number;
  /** Starting speed. Useful for motion that continues an earlier gesture. */
  initialVelocity?: number;
  /** If true, the value never overshoots past its target. */
  overshootClamping?: boolean;
};

/**
 * Presets, named by feel rather than by numbers.
 * Named presets are how every video we make stays in the same "voice".
 */
export const SpringPresets = {
  /** Calm and professional. Our default. */
  gentle: { mass: 1, stiffness: 100, damping: 20 },
  /** Fast and responsive, barely any bounce. Good for UI elements. */
  snappy: { mass: 1, stiffness: 200, damping: 26 },
  /** Playful overshoot. Use sparingly. */
  bouncy: { mass: 1, stiffness: 180, damping: 12 },
  /** Heavy and deliberate. Good for big titles landing. */
  heavy: { mass: 3, stiffness: 120, damping: 34 },
  /** No bounce at all, just a smooth settle. */
  stiff: { mass: 1, stiffness: 300, damping: 40 },
} as const satisfies Record<string, SpringConfig>;

export type SpringPresetName = keyof typeof SpringPresets;

type SpringArgs = {
  /** Current frame, usually relative to when the animation started. */
  frame: number;
  /** Frames per second of the composition. */
  fps: number;
  /** Physics settings, or the name of a preset. */
  config?: SpringConfig | SpringPresetName;
  /** Value at rest before the spring starts. Default 0. */
  from?: number;
  /** Value the spring settles on. Default 1. */
  to?: number;
  /** Frames to wait before the spring begins. */
  delay?: number;
};

/**
 * Value of a spring at a given frame.
 *
 * Returns a number you multiply or feed into a transform:
 *
 *   const scale = spring({ frame, fps, config: 'snappy' });
 *   <div style={{ transform: `scale(${scale})` }} />
 */
export const spring = ({
  frame,
  fps,
  config = 'gentle',
  from = 0,
  to = 1,
  delay = 0,
}: SpringArgs): number => {
  const resolved: SpringConfig =
    typeof config === 'string' ? SpringPresets[config] : config;

  const { mass, stiffness, damping, initialVelocity = 0, overshootClamping = false } =
    resolved;

  // Time in seconds since the spring started. Before that, hold the start value.
  const t = (frame - delay) / fps;
  if (t <= 0) return from;

  const delta = to - from;

  // Natural frequency and damping ratio: the two numbers that define the motion.
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));

  let position: number;

  if (zeta < 1) {
    // Underdamped: it overshoots and oscillates before settling.
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    const A = delta;
    const B = (zeta * w0 * delta - initialVelocity) / wd;
    position =
      to - Math.exp(-zeta * w0 * t) * (A * Math.cos(wd * t) + B * Math.sin(wd * t));
  } else {
    // Critically damped or overdamped: settles directly, no bounce.
    const A = delta;
    const B = delta * w0 - initialVelocity;
    position = to - Math.exp(-w0 * t) * (A + B * t);
  }

  if (overshootClamping) {
    return to > from
      ? Math.min(position, to)
      : Math.max(position, to);
  }

  return position;
};

/**
 * How many frames a spring needs before it is visually at rest.
 *
 * Needed so scenes can be timed correctly — a scene should not cut while its title is
 * still wobbling.
 */
export const springDuration = ({
  fps,
  config = 'gentle',
  threshold = 0.005,
}: {
  fps: number;
  config?: SpringConfig | SpringPresetName;
  threshold?: number;
}): number => {
  const maxFrames = fps * 10; // Nothing in our design system should take over 10s.
  for (let frame = 0; frame < maxFrames; frame++) {
    const value = spring({ frame, fps, config });
    if (Math.abs(1 - value) < threshold) {
      // Confirm it stays settled rather than passing through on its way past.
      const next = spring({ frame: frame + 1, fps, config });
      if (Math.abs(1 - next) < threshold) return frame;
    }
  }
  return maxFrames;
};
