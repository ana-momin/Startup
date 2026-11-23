/**
 * Shapes, and the ability to turn one into another.
 *
 * Morphing is the signature move of motion graphics and the thing no prompt-to-video
 * tool does, because it is genuinely awkward: two SVG paths written by hand almost never
 * have the same number of points, and interpolating between mismatched paths produces
 * garbage.
 *
 * The way around it is to stop treating shapes as paths. Every shape here is defined by
 * its corners, and any shape can be resampled to any number of points by walking its
 * perimeter. Resample both shapes to the same count and morphing becomes what it should
 * always have been: move each point towards its partner.
 *
 * Two details make the result read as one shape changing rather than a cloud of points
 * rearranging. Every shape starts at the top and runs clockwise, so a corner travels to
 * a corner rather than across the whole figure. And sampling is uniform along the
 * *perimeter* rather than between corners, so a long edge gets proportionally more
 * points and does not collapse while a short one bunches up.
 */

export type Point = readonly [number, number];

/** Named shapes, all drawn inside a -1..1 box so they can be scaled by one number. */
export type ShapeName =
  | 'circle'
  | 'square'
  | 'roundSquare'
  | 'triangle'
  | 'diamond'
  | 'pentagon'
  | 'hexagon'
  | 'star'
  | 'cross'
  | 'bar';

/**
 * Corners of a regular polygon, starting at the top and running clockwise.
 *
 * Starting at the top is not decoration. If one shape began at its right edge and
 * another at its top, every point would travel a quarter turn during the morph and the
 * shape would visibly rotate on its way — the classic sign of a morph done carelessly.
 */
const regular = (sides: number, radius = 1, rotate = 0): Point[] =>
  Array.from({ length: sides }, (_, i) => {
    const angle = -Math.PI / 2 + rotate + (i / sides) * Math.PI * 2;
    return [Math.cos(angle) * radius, Math.sin(angle) * radius] as Point;
  });

/** A star: outer and inner corners alternating. */
const star = (points: number, inner = 0.46): Point[] =>
  Array.from({ length: points * 2 }, (_, i) => {
    const angle = -Math.PI / 2 + (i / (points * 2)) * Math.PI * 2;
    const radius = i % 2 === 0 ? 1 : inner;
    return [Math.cos(angle) * radius, Math.sin(angle) * radius] as Point;
  });

/** A plus sign, as twelve corners. */
const cross = (arm = 0.34): Point[] => [
  [-arm, -1], [arm, -1], [arm, -arm], [1, -arm],
  [1, arm], [arm, arm], [arm, 1], [-arm, 1],
  [-arm, arm], [-1, arm], [-1, -arm], [-arm, -arm],
];

/**
 * A rounded square, as a superellipse.
 *
 * |x|^k + |y|^k = 1. At k = 2 it is a circle, and as k grows it squares off — so the
 * same formula covers the whole family and the corners stay smooth at every size, which
 * corner radii do not.
 */
const superellipse = (k: number, samples = 64): Point[] =>
  Array.from({ length: samples }, (_, i) => {
    const angle = -Math.PI / 2 + (i / samples) * Math.PI * 2;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const sign = (n: number) => (n < 0 ? -1 : 1);
    return [
      sign(c) * Math.pow(Math.abs(c), 2 / k),
      sign(s) * Math.pow(Math.abs(s), 2 / k),
    ] as Point;
  });

const SHAPES: Record<ShapeName, Point[]> = {
  // A 72-gon is indistinguishable from a circle at any size a video uses, and being a
  // polygon like everything else means it morphs with no special case.
  circle: regular(72),
  square: regular(4, Math.SQRT2, Math.PI / 4),
  roundSquare: superellipse(4),
  triangle: regular(3),
  diamond: regular(4),
  pentagon: regular(5),
  hexagon: regular(6),
  star: star(5),
  cross: cross(),
  // A wide flat bar — the shape a rule or an underline is, so a line can become a
  // circle without leaving the system.
  bar: [[-1, -0.12], [1, -0.12], [1, 0.12], [-1, 0.12]],
};

export const shapePoints = (name: ShapeName): Point[] => SHAPES[name];

/**
 * Resample a closed outline to exactly `count` points, spaced evenly along its length.
 *
 * Spacing by length rather than by corner is what keeps a morph honest: a square and a
 * triangle have different corner counts, and matching them corner-to-corner would drag
 * one edge across the figure while another stood still.
 */
export const resample = (points: Point[], count: number): Point[] => {
  const n = points.length;
  if (n === 0) return [];

  // Cumulative length around the outline, closing back to the first point.
  const lengths: number[] = [0];
  for (let i = 0; i < n; i++) {
    const [ax, ay] = points[i];
    const [bx, by] = points[(i + 1) % n];
    lengths.push(lengths[i] + Math.hypot(bx - ax, by - ay));
  }
  const total = lengths[n];
  if (total === 0) return Array.from({ length: count }, () => points[0]);

  const out: Point[] = [];
  let edge = 0;
  for (let i = 0; i < count; i++) {
    const target = (i / count) * total;
    while (edge < n - 1 && lengths[edge + 1] < target) edge += 1;
    const segment = lengths[edge + 1] - lengths[edge];
    const t = segment === 0 ? 0 : (target - lengths[edge]) / segment;
    const [ax, ay] = points[edge];
    const [bx, by] = points[(edge + 1) % n];
    out.push([ax + (bx - ax) * t, ay + (by - ay) * t]);
  }
  return out;
};

/**
 * Where a unit shape sits on the frame.
 *
 * Shapes are authored inside a -1..1 box so a caller can think about "a circle" without
 * thinking about pixels. Placement happens once, while the points are still points.
 */
export type Placement = {
  /** Centre, in pixels. */
  x: number;
  y: number;
  /** Half-width: the -1..1 box becomes 2 × size across. */
  size: number;
};

/** Points to an SVG path, placed on the frame. */
export const toPath = (points: Point[], place?: Placement): string => {
  if (points.length === 0) return '';
  const at = (p: Point): string => {
    const x = place ? p[0] * place.size + place.x : p[0];
    const y = place ? p[1] * place.size + place.y : p[1];
    return `${round(x)} ${round(y)}`;
  };
  const [first, ...rest] = points;
  return `M ${at(first)} ${rest.map((p) => `L ${at(p)}`).join(' ')} Z`;
};

/**
 * A path partway between two shapes.
 *
 * `t` of 0 is `from`, 1 is `to`. Both are resampled to the same point count first, so
 * any shape can become any other shape.
 */
export const morphPath = (
  from: ShapeName | Point[],
  to: ShapeName | Point[],
  t: number,
  options: Placement & {
    /** More points is smoother and costs more. 64 is past seeing a difference. */
    detail?: number;
  },
): string => {
  const { detail = 64, ...place } = options;
  const a = resample(Array.isArray(from) ? from : shapePoints(from), detail);
  const b = resample(Array.isArray(to) ? to : shapePoints(to), detail);
  const clamped = Math.min(Math.max(t, 0), 1);

  return toPath(
    a.map(
      (p, i) =>
        [
          p[0] + (b[i][0] - p[0]) * clamped,
          p[1] + (b[i][1] - p[1]) * clamped,
        ] as Point,
    ),
    place,
  );
};

/** One shape, placed. The same call as a morph that has not started. */
export const shapePath = (name: ShapeName, place: Placement, detail = 64): string =>
  toPath(resample(shapePoints(name), detail), place);

const round = (n: number): number => Math.round(n * 1000) / 1000;
