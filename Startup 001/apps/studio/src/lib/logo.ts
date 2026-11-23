/**
 * Reading a logo the customer uploads.
 *
 * Two jobs, both done in the browser before anything is sent: shrink the image, and
 * pull the brand colour out of it.
 *
 * Extracting the colour here rather than on the server is the right call — the browser
 * already has a full image decoder and a canvas, so it costs nothing, while doing the
 * same work in Node would mean an image-decoding dependency for one small feature.
 */

export type LoadedLogo = {
  /** Resized PNG or the original SVG, as a data URL ready to upload. */
  dataUrl: string;
  width: number;
  height: number;
  /** The most brand-like colour found in the image, if any. */
  color?: string;
  /** Whether the logo is mostly light or mostly dark. */
  mode?: 'dark' | 'light';
};

const MAX_DIMENSION = 512;
const MAX_BYTES = 2 * 1024 * 1024;

export const readLogoFile = async (file: File): Promise<LoadedLogo> => {
  if (file.size > MAX_BYTES) throw new Error('That image is over 2 MB.');

  const raw = await readAsDataUrl(file);

  // SVG is already small and resolution-independent, and rasterising it would throw
  // away the one property that makes it the best possible logo format.
  if (file.type === 'image/svg+xml') {
    return { dataUrl: raw, width: 0, height: 0 };
  }

  const image = await loadImage(raw);
  const scale = Math.min(MAX_DIMENSION / Math.max(image.width, image.height), 1);
  const width = Math.max(Math.round(image.width * scale), 1);
  const height = Math.max(Math.round(image.height * scale), 1);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Could not read that image.');

  context.drawImage(image, 0, 0, width, height);

  const analysis = analyse(context.getImageData(0, 0, width, height));

  return {
    // PNG, not JPEG: logos have hard edges and transparency, both of which JPEG ruins.
    dataUrl: canvas.toDataURL('image/png'),
    width,
    height,
    ...analysis,
  };
};

/* ---------- colour analysis ---------- */

/**
 * Find the brand colour inside a logo.
 *
 * Pixels are bucketed by hue rather than counted exactly — a logo has thousands of
 * near-identical shades from anti-aliasing, and counting exact values would rank a
 * hundred slightly different blues below one flat grey.
 *
 * Transparent, near-white, near-black and unsaturated pixels are skipped: they are the
 * background and the outline, never the identity.
 */
const analyse = (data: ImageData): { color?: string; mode?: 'dark' | 'light' } => {
  const buckets = new Map<number, { count: number; r: number; g: number; b: number }>();
  let visible = 0;
  let lightSum = 0;

  const pixels = data.data;

  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3];
    if (alpha < 200) continue;

    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];

    visible++;
    lightSum += (r + g + b) / 3;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const lightness = (max + min) / 2 / 255;
    const saturation =
      max === min ? 0 : (max - min) / (255 - Math.abs(max + min - 255));

    if (saturation < 0.25 || lightness < 0.1 || lightness > 0.9) continue;

    // 24 buckets is one every 15 degrees of hue — fine enough to tell blue from
    // purple, coarse enough that anti-aliasing noise lands in the same place.
    const hue = hueOf(r, g, b);
    const key = Math.floor(hue / 15);

    const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
    bucket.count++;
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    buckets.set(key, bucket);
  }

  const best = [...buckets.values()].sort((a, b) => b.count - a.count)[0];

  const mode: 'dark' | 'light' | undefined =
    visible === 0 ? undefined : lightSum / visible < 128 ? 'light' : 'dark';

  // A logo that is mostly dark reads best on a light background, and the other way
  // round — hence the apparent inversion above.

  if (!best || best.count < visible * 0.02) return { mode };

  return {
    color: toHex(
      Math.round(best.r / best.count),
      Math.round(best.g / best.count),
      Math.round(best.b / best.count),
    ),
    mode,
  };
};

const hueOf = (r: number, g: number, b: number): number => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const delta = max - Math.min(rn, gn, bn);

  if (delta === 0) return 0;

  let h: number;
  if (max === rn) h = ((gn - bn) / delta) % 6;
  else if (max === gn) h = (bn - rn) / delta + 2;
  else h = (rn - gn) / delta + 4;

  return (h * 60 + 360) % 360;
};

const toHex = (r: number, g: number, b: number): string =>
  `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()}`;

/* ---------- file plumbing ---------- */

const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.readAsDataURL(file);
  });

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('That file is not an image we can read.'));
    image.src = src;
  });
