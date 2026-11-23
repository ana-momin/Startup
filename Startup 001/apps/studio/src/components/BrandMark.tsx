import { useState } from 'react';
import { assetUrl } from '@/lib/api';
import './brand-mark.css';

/**
 * A brand, shown as itself.
 *
 * Five places in this app drew a brand, and all five did it differently: one showed the
 * real logo, three showed a coloured dot, one showed the first letter. The dot is the
 * worst of them — we have the company's actual logo sitting in the asset store and we
 * were representing them with a circle of their approximate colour.
 *
 * The hard part is not fetching the image, it is that a logo is a transparent PNG with
 * no idea what is behind it. A black wordmark on our dark surface is invisible; a white
 * one on our light surface is invisible; and which of those we have is not knowable from
 * the file. So the logo always sits on a plate chosen from what we DO know — whether the
 * site it came from was light or dark, which is recorded when the brand is imported.
 * A light-mode site almost always has a dark logo, and the reverse.
 *
 * The fallback is a real fallback: only when there is no logo at all, or the file fails
 * to load, and then it is the initial on the brand's own colour rather than a bare dot.
 */

type Props = {
  name: string;
  logoId?: string;
  /** The brand's colour, for the fallback and the plate tint. */
  color?: string;
  /**
   * Whether the site the logo came from was light or dark.
   *
   * This is the only signal we have about what the logo looks like, and it is a good
   * one. Default light, because most sites are.
   */
  mode?: 'dark' | 'light';
  /** Edge length in pixels. The plate is square; the logo fits inside it. */
  size?: number;
  /** Square with rounded corners, or a circle. */
  shape?: 'square' | 'circle';
  className?: string;
};

export const BrandMark = ({
  name,
  logoId,
  color,
  mode = 'light',
  size = 28,
  shape = 'square',
  className = '',
}: Props) => {
  const [failed, setFailed] = useState(false);
  const showLogo = Boolean(logoId) && !failed;

  /*
   * The plate is measured from the logo, not guessed from the site.
   *
   * The first version used the site's light/dark mode as a proxy for the logo's own
   * colour: a dark site probably has a light logo. It is a reasonable guess and it was
   * wrong immediately — stripe.com reads as a dark site and serves a dark navy wordmark,
   * so the logo went onto a dark plate and all but disappeared. Which is the exact
   * failure this component exists to prevent.
   *
   * So the pixels decide. Once the image has loaded it is drawn to a tiny canvas and the
   * average luminance of everything that is not transparent is measured — that is the
   * logo's real colour, whatever the site around it was doing. Dark ink gets a light
   * plate; light ink gets a dark one.
   *
   * The site mode is still the starting value, because it is right more often than not
   * and it means the plate is sensible for the frame or two before the image decodes.
   */
  const [inkIsDark, setInkIsDark] = useState(mode !== 'dark');
  const plate = inkIsDark ? '#FFFFFF' : '#17171A';

  return (
    <span
      className={`brandmark brandmark--${shape} ${showLogo ? '' : 'brandmark--letter'} ${className}`}
      style={{
        width: size,
        height: size,
        // Only the logo gets a plate. The fallback is the brand's colour itself, and
        // putting that on a white square would be two shapes where one will do.
        background: showLogo ? plate : (color ?? '#5A5AE6'),
        borderRadius: shape === 'circle' ? '50%' : Math.max(size * 0.22, 5),
      }}
      title={name}
    >
      {showLogo ? (
        <img
          ref={(node) => {
            /*
             * Measure on mount as well as on load.
             *
             * `onLoad` does not fire for an image the browser already has cached, and
             * every brand mark after the first one in a session is cached — so the
             * measurement silently never ran for exactly the cases that appear most.
             */
            if (node?.complete && node.naturalWidth > 0) {
              const dark = isDarkInk(node);
              if (dark !== undefined) setInkIsDark(dark);
            }
          }}
          src={assetUrl(logoId!)}
          alt=""
          /*
           * Needed to read the pixels back.
           *
           * The assets are served from the API on a different port, which makes them
           * cross-origin — and drawing a cross-origin image to a canvas taints it, so
           * `getImageData` throws and the measurement quietly fell back to the guess.
           * Requesting it anonymously, with the server's CORS headers, keeps the canvas
           * clean.
           */
          crossOrigin="anonymous"
          /* Contain, never cover: a cropped logo is a damaged logo, and wordmarks are
             usually far wider than they are tall. */
          onError={() => setFailed(true)}
          onLoad={(e) => {
            const dark = isDarkInk(e.currentTarget);
            if (dark !== undefined) setInkIsDark(dark);
          }}
        />
      ) : (
        <span className="brandmark__letter" style={{ fontSize: size * 0.46 }}>
          {initial(name)}
        </span>
      )}
    </span>
  );
};

/** The first letter that is actually a letter. "·Acme" should show an A, not a dot. */
const initial = (name: string): string => {
  const match = /\p{L}|\p{N}/u.exec(name ?? '');
  return (match?.[0] ?? '?').toUpperCase();
};

/**
 * Is the ink in this logo dark?
 *
 * Drawn to a small canvas and averaged over every pixel that is not basically
 * transparent — a logo is mostly empty space, and including it would make every
 * transparent PNG look "light" regardless of what is actually drawn on it.
 *
 * Returns undefined rather than guessing when it cannot tell: an image from another
 * origin taints the canvas and throws, and a logo that is entirely transparent has no
 * ink to measure. The caller keeps whatever it had, which is the site-mode guess.
 *
 * Our logos are served from our own API, so the taint case should not arise — but it
 * costs one try/catch to be certain, and an exception here would blank the component.
 */
const isDarkInk = (img: HTMLImageElement): boolean | undefined => {
  try {
    const size = 24;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return undefined;

    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);

    let total = 0;
    let weight = 0;
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3] / 255;
      if (alpha < 0.35) continue;
      // Rec. 709 luma: green carries most of perceived brightness.
      total += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) * alpha;
      weight += alpha;
    }

    if (weight < 4) return undefined;
    return total / weight < 128;
  } catch {
    return undefined;
  }
};
