/**
 * Traces the Pond symbol out of the supplied raster into a real vector path.
 *
 * The mark is not a symmetric construction — the inner counter is offset, so a
 * parametric reconstruction will never sit right. This walks the actual
 * ink/paper boundary instead: upscale, threshold, follow the cell edges into
 * closed loops, then Chaikin-smooth and fit cubics.
 */
import sharp from "sharp";
import fs from "fs";

const SRC = "../Material/Simple Pond AI Logo with White Bg.png";
const OUT = "../Material/vector/pond-mark.svg";
const REGION = { left: 430, top: 255, width: 256, height: 268 }; // symbol only
const UPSCALE = 6;
const THRESHOLD = 140;

const { data, info } = await sharp(SRC)
  .extract(REGION)
  .resize(REGION.width * UPSCALE, REGION.height * UPSCALE, { kernel: "lanczos3" })
  .greyscale()
  .raw()
  .toBuffer({ resolveWithObject: true });

const W = info.width;
const H = info.height;
const ink = (x, y) =>
  x >= 0 && y >= 0 && x < W && y < H && data[y * W + x] < THRESHOLD;

// --- Collect boundary edges, oriented so ink stays on one side -------------
// Each ink cell contributes an edge for every empty neighbour. Walking them
// clockwise per cell makes outer loops clockwise and holes counter-clockwise.
const edges = new Map(); // "x,y" -> [x,y] of the edge's end point
const key = (x, y) => `${x},${y}`;
const addEdge = (ax, ay, bx, by) => {
  let k = key(ax, ay);
  // Diagonal pinch points can start two edges; keep both in a small bucket.
  const list = edges.get(k);
  if (list) list.push([bx, by]);
  else edges.set(k, [[bx, by]]);
};

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (!ink(x, y)) continue;
    if (!ink(x, y - 1)) addEdge(x, y, x + 1, y);
    if (!ink(x + 1, y)) addEdge(x + 1, y, x + 1, y + 1);
    if (!ink(x, y + 1)) addEdge(x + 1, y + 1, x, y + 1);
    if (!ink(x - 1, y)) addEdge(x, y + 1, x, y);
  }
}

// --- Chain edges into closed loops -----------------------------------------
const loops = [];
while (edges.size) {
  const startKey = edges.keys().next().value;
  const [sx, sy] = startKey.split(",").map(Number);
  const loop = [[sx, sy]];
  let cx = sx;
  let cy = sy;

  for (;;) {
    const bucket = edges.get(key(cx, cy));
    if (!bucket || bucket.length === 0) break;
    const [nx, ny] = bucket.pop();
    if (bucket.length === 0) edges.delete(key(cx, cy));
    cx = nx;
    cy = ny;
    if (cx === sx && cy === sy) break;
    loop.push([cx, cy]);
  }
  if (loop.length > 60) loops.push(loop);
}

const area = (pts) => {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
};

// Keep only meaningful loops: the silhouette and its counter.
loops.sort((a, b) => Math.abs(area(b)) - Math.abs(area(a)));
const kept = loops.filter((l) => Math.abs(area(l)) > Math.abs(area(loops[0])) * 0.02);
console.log(
  "loops kept:",
  kept.map((l) => `${l.length}pts area=${Math.round(area(l))}`).join(" | "),
);

// --- Smooth the pixel staircase --------------------------------------------
const chaikin = (pts) => {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    out.push([x1 + (x2 - x1) * 0.25, y1 + (y2 - y1) * 0.25]);
    out.push([x1 + (x2 - x1) * 0.75, y1 + (y2 - y1) * 0.75]);
  }
  return out;
};

/** Ramer-Douglas-Peucker on a closed ring. */
const rdp = (pts, eps) => {
  const simplify = (s, e) => {
    let maxD = 0;
    let idx = -1;
    const [ax, ay] = pts[s];
    const [bx, by] = pts[e];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    for (let i = s + 1; i < e; i++) {
      const [px, py] = pts[i];
      const d = Math.abs(dy * px - dx * py + bx * ay - by * ax) / len;
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (maxD > eps && idx > 0) return [...simplify(s, idx), ...simplify(idx, e)];
    return [pts[s]];
  };
  const half = Math.floor(pts.length / 2);
  return [...simplify(0, half), ...simplify(half, pts.length - 1), pts[pts.length - 1]];
};

// --- Fit cubics through the points (Catmull-Rom -> Bezier) ------------------
const toPath = (pts, sx, sy, ox, oy) => {
  const P = pts.map(([x, y]) => [x * sx + ox, y * sy + oy]);
  const n = P.length;
  const at = (i) => P[(i % n + n) % n];
  const f = (v) => v.toFixed(2);

  let d = `M${f(P[0][0])} ${f(P[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f(c1[0])} ${f(c1[1])},${f(c2[0])} ${f(c2[1])},${f(p2[0])} ${f(p2[1])}`;
  }
  return d + "Z";
};

// --- Normalise into a tidy square viewBox ----------------------------------
let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
for (const [x, y] of kept[0]) {
  if (x < minX) minX = x;
  if (x > maxX) maxX = x;
  if (y < minY) minY = y;
  if (y > maxY) maxY = y;
}
const bw = maxX - minX;
const bh = maxY - minY;
const VB = 512;
const PADDING = 8;
const scale = (VB - PADDING * 2) / Math.max(bw, bh);
const ox = PADDING + (VB - PADDING * 2 - bw * scale) / 2 - minX * scale;
const oy = PADDING + (VB - PADDING * 2 - bh * scale) / 2 - minY * scale;

/** Ring-aware moving average; kills the residual staircase on near-axis runs. */
const smooth = (pts, taps) => {
  const n = pts.length;
  const half = Math.floor(taps / 2);
  return pts.map((_, i) => {
    let sx = 0;
    let sy = 0;
    for (let d = -half; d <= half; d++) {
      const [px, py] = pts[(i + d + n) % n];
      sx += px;
      sy += py;
    }
    return [sx / taps, sy / taps];
  });
};

const paths = kept.map((loop) => {
  let pts = loop;
  for (let i = 0; i < 4; i++) pts = chaikin(pts);
  pts = smooth(pts, 9);
  pts = smooth(pts, 7);
  pts = rdp(pts, 1.1);
  return toPath(pts, scale, scale, ox, oy);
});

console.log("points after simplify:", paths.map((p) => (p.match(/C/g) || []).length).join(", "));

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <title>Pond mark</title>
  <path fill="currentColor" fill-rule="evenodd" d="${paths.join(" ")}"/>
</svg>
`;
fs.mkdirSync("../Material/vector", { recursive: true });
fs.writeFileSync(OUT, svg);
console.log("wrote", OUT, svg.length, "bytes");

// Same path, as a module the Remotion compositions import.
fs.writeFileSync(
  "src/pond/markPath.ts",
  `/**
 * Traced from Material/Simple Pond AI Logo with White Bg.png by trace-mark.mjs.
 * Do not hand-edit — re-run the tracer instead.
 */
export const MARK_VIEWBOX = 512;
export const MARK_PATH =
  "${paths.join(" ")}";
`,
);
console.log("wrote src/pond/markPath.ts");
