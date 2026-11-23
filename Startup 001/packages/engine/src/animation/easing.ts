/**
 * Easing curves.
 *
 * An easing takes a progress value from 0 to 1 and bends it. Linear motion (no easing)
 * is what makes amateur animation look like amateur animation — real objects never move
 * at a constant speed. They accelerate and settle.
 *
 * These are pure math functions, no dependencies. They are the first layer of "taste".
 */

export type EasingFn = (t: number) => number;

export const linear: EasingFn = (t) => t;

/* --- Quadratic: gentle, good for small UI moves --- */
export const easeInQuad: EasingFn = (t) => t * t;
export const easeOutQuad: EasingFn = (t) => 1 - (1 - t) * (1 - t);
export const easeInOutQuad: EasingFn = (t) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

/* --- Cubic: the everyday workhorse --- */
export const easeInCubic: EasingFn = (t) => t * t * t;
export const easeOutCubic: EasingFn = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic: EasingFn = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/* --- Quart / Quint: stronger, more dramatic --- */
export const easeOutQuart: EasingFn = (t) => 1 - Math.pow(1 - t, 4);
export const easeOutQuint: EasingFn = (t) => 1 - Math.pow(1 - t, 5);
export const easeInOutQuart: EasingFn = (t) =>
  t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;

/* --- Expo: snappy starts, long elegant settles. Great for text. --- */
export const easeOutExpo: EasingFn = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
export const easeInExpo: EasingFn = (t) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10));
export const easeInOutExpo: EasingFn = (t) => {
  if (t === 0) return 0;
  if (t === 1) return 1;
  return t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;
};

/* --- Circ: mechanical, precise --- */
export const easeOutCirc: EasingFn = (t) => Math.sqrt(1 - Math.pow(t - 1, 2));
export const easeInOutCirc: EasingFn = (t) =>
  t < 0.5
    ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2
    : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2;

/* --- Back: overshoots slightly, then returns. Playful but still professional. --- */
export const easeOutBack: EasingFn = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

/**
 * A cubic Bezier curve, the same model design tools and CSS use.
 * This is what lets us match a brand's exact motion feel.
 *
 * Solved with Newton-Raphson, falling back to bisection when the curve is too flat
 * for Newton to converge.
 */
export const cubicBezier = (x1: number, y1: number, x2: number, y2: number): EasingFn => {
  const A = (a: number, b: number) => 1 - 3 * b + 3 * a;
  const B = (a: number, b: number) => 3 * b - 6 * a;
  const C = (a: number) => 3 * a;

  const calc = (t: number, a: number, b: number) =>
    ((A(a, b) * t + B(a, b)) * t + C(a)) * t;
  const slope = (t: number, a: number, b: number) =>
    3 * A(a, b) * t * t + 2 * B(a, b) * t + C(a);

  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;

    // Newton-Raphson: fast when the curve has a usable slope.
    let t = x;
    for (let i = 0; i < 8; i++) {
      const currentSlope = slope(t, x1, x2);
      if (currentSlope === 0) break;
      const currentX = calc(t, x1, x2) - x;
      t -= currentX / currentSlope;
    }

    // Bisection fallback keeps us correct on flat sections.
    if (t < 0 || t > 1) {
      let low = 0;
      let high = 1;
      t = x;
      while (low < high) {
        const currentX = calc(t, x1, x2);
        if (Math.abs(currentX - x) < 1e-6) break;
        if (currentX < x) low = t;
        else high = t;
        t = (high - low) / 2 + low;
      }
    }

    return calc(t, y1, y2);
  };
};

/**
 * Named curves that our design system leans on.
 * Having these named (instead of raw numbers scattered everywhere) is how output
 * stays consistent across every video we ever make.
 */
export const Easing = {
  linear,
  easeInQuad,
  easeOutQuad,
  easeInOutQuad,
  easeInCubic,
  easeOutCubic,
  easeInOutCubic,
  easeOutQuart,
  easeOutQuint,
  easeInOutQuart,
  easeInExpo,
  easeOutExpo,
  easeInOutExpo,
  easeOutCirc,
  easeInOutCirc,
  easeOutBack,
  cubicBezier,

  /** Material-style standard curve. Safe default for almost anything. */
  standard: cubicBezier(0.4, 0.0, 0.2, 1),
  /** Things entering the screen: quick in, soft landing. */
  entrance: cubicBezier(0.16, 1, 0.3, 1),
  /** Things leaving the screen: soft start, quick exit. */
  exit: cubicBezier(0.7, 0, 0.84, 0),
  /** Confident, premium feel. Our house default for headline text. */
  smooth: cubicBezier(0.25, 0.1, 0.25, 1),
} as const;
