import { cpus } from 'node:os';
import { chromium } from 'playwright';
import type { Browser, Page } from 'playwright';

/**
 * The renderer: a composition in, a real MP4 out.
 *
 *   Node  ──drives──>  Render pages ×N    real Chrome drawing our components
 *     │                      │
 *     │<──── screenshots ────┘            pixel-perfect, identical to the preview
 *     │
 *     └──feeds──>  Encoder page           WebCodecs turns frames into H.264
 *                        │
 *                        └──> MP4 bytes
 *
 * Several render pages, one encoder page. Capturing a frame costs far more than
 * encoding one, so the capture side is what gets parallelised — different pages draw
 * different frames at the same time while the encoder consumes them strictly in order.
 * Frames are pure functions of a frame number, which is the property that makes this
 * safe: no page needs to know what any other page is doing.
 *
 * No FFmpeg anywhere. The only binary involved is Chrome, doing the two things browsers
 * are already the best in the world at: laying out text and encoding video.
 */

export type RenderOptions = {
  /** Where the studio app is being served, e.g. http://localhost:5173 */
  baseUrl: string;
  /** The video to render. Shape must match the app's VideoSpec. */
  spec: unknown;
  /** Output pixel size and timing. */
  width: number;
  height: number;
  fps: number;
  totalFrames: number;
  /**
   * 'standard' captures near-lossless JPEG frames — the default, and roughly twice
   * as fast. 'lossless' captures PNG, which is slower because PNG compression is
   * expensive on the gradients our backgrounds use.
   *
   * Standard is the default deliberately: the H.264 encoding that follows is far
   * more lossy than a quality-96 JPEG, so PNG capture spends real time protecting
   * detail that the video codec discards a moment later.
   */
  quality?: 'standard' | 'lossless';
  /** How many frames to draw at once. Defaults to a sensible value for this machine. */
  concurrency?: number;
  /** Called after each captured frame, for progress reporting. */
  onProgress?: (done: number, total: number) => void;
  /** Reuse an already-running browser instead of launching one. */
  browser?: Browser;
};

export type RenderResult = {
  /** The finished MP4 file. */
  buffer: Buffer;
  /** Wall-clock milliseconds the render took. */
  durationMs: number;
};

export const renderToMp4 = async (options: RenderOptions): Promise<RenderResult> => {
  const { baseUrl, spec, width, height, fps, totalFrames, onProgress } = options;
  const startedAt = Date.now();

  const concurrency = clamp(
    options.concurrency ?? defaultConcurrency(),
    1,
    Math.min(8, totalFrames),
  );

  // How far ahead of the encoder we are willing to capture. Bounded on purpose:
  // without a ceiling, a fast capture side would buffer an entire video in memory.
  const lookahead = Math.max(concurrency * 3, 8);

  const ownsBrowser = !options.browser;
  const browser =
    options.browser ??
    (await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }));

  try {
    const context = await browser.newContext({
      viewport: { width, height },
      // Exactly one device pixel per CSS pixel. Anything else silently changes the
      // output resolution.
      deviceScaleFactor: 1,
    });

    // Screenshot format is the biggest single lever on speed: PNG compression of a
    // 1080p gradient is expensive, and the result then crosses the Node/browser
    // boundary as base64 on every frame.
    const shotOptions =
      options.quality === 'lossless'
        ? ({ type: 'png' } as const)
        : ({ type: 'jpeg', quality: 96 } as const);

    const renderPages = await Promise.all(
      Array.from({ length: concurrency }, () => openRenderPage(context, baseUrl)),
    );
    const encoderPage = await openRenderPage(context, baseUrl);

    // Every render page needs the same script before it can draw anything.
    await Promise.all(
      renderPages.map((page) => page.evaluate((value) => window.__setSpec(value), spec)),
    );

    const pool = createPagePool(renderPages);
    const pending = new Map<number, Promise<string>>();
    let scheduled = 0;
    let captured = 0;
    let oldestWanted = 0;

    const captureFrame = async (index: number): Promise<string> => {
      const page = await pool.acquire();
      try {
        await page.evaluate((n) => window.__setFrame(n), index);
        const shot = await page.locator('#video-canvas').screenshot(shotOptions);
        captured++;
        onProgress?.(captured, totalFrames);
        return shot.toString('base64');
      } finally {
        pool.release(page);
      }
    };

    /** Keep the capture queue topped up, without running ahead of the memory budget. */
    const fillQueue = () => {
      while (scheduled < totalFrames && scheduled < oldestWanted + lookahead) {
        const index = scheduled++;
        const work = captureFrame(index);
        // Attach a no-op handler so a failure while still queued is not reported as an
        // unhandled rejection. The real error still surfaces where the frame is awaited.
        work.catch(() => {});
        pending.set(index, work);
      }
    };

    fillQueue();

    await encoderPage.exposeFunction('__pullFrame', async (index: number) => {
      oldestWanted = index;
      fillQueue();

      const work = pending.get(index);
      if (!work) throw new Error(`Frame ${index} was never scheduled.`);

      const data = await work;
      // Drop it as soon as the encoder has it, so memory stays flat on long videos.
      pending.delete(index);
      return data;
    });

    const base64 = await encoderPage.evaluate((opts) => window.__encode(opts), {
      width,
      height,
      fps,
      totalFrames,
    });

    return {
      buffer: Buffer.from(base64, 'base64'),
      durationMs: Date.now() - startedAt,
    };
  } finally {
    // Only close what we opened. A caller who passed their own browser in almost
    // certainly wants to keep using it.
    if (ownsBrowser) await browser.close();
  }
};

/* ---------- internals ---------- */

type Context = Awaited<ReturnType<Browser['newContext']>>;

/**
 * Hands out render pages one at a time.
 *
 * A page can only draw one frame at a time — it has a single DOM. The pool is what
 * stops two capture jobs setting different frame numbers on the same page and
 * photographing each other's work.
 */
const createPagePool = (pages: Page[]) => {
  const free = [...pages];
  const waiting: ((page: Page) => void)[] = [];

  return {
    acquire: (): Promise<Page> => {
      const page = free.pop();
      if (page) return Promise.resolve(page);
      return new Promise<Page>((resolve) => waiting.push(resolve));
    },
    release: (page: Page) => {
      const next = waiting.shift();
      if (next) next(page);
      else free.push(page);
    },
  };
};

const openRenderPage = async (context: Context, baseUrl: string): Promise<Page> => {
  const page = await context.newPage();

  // Surface page errors instead of letting a render hang silently.
  page.on('pageerror', (error) => console.error('[render page]', error.message));

  await page.goto(`${baseUrl.replace(/\/$/, '')}/render.html`, { waitUntil: 'load' });

  // The page attaches its control functions on mount; nothing may be driven before then.
  await page.waitForFunction(() => window.__ready === true, undefined, {
    timeout: 20_000,
  });

  return page;
};

/**
 * Leave headroom. Each render page is a full browser tab rasterising 1080p, so taking
 * every core would make the machine unusable while a video renders.
 */
const defaultConcurrency = (): number => clamp(Math.floor(cpus().length / 2), 2, 6);

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/* The render surface adds these to its own window; declared here so Node's type
   checker understands the evaluate() calls above. */
declare global {
  interface Window {
    __setSpec: (spec: unknown) => Promise<void>;
    __setFrame: (frame: number) => Promise<void>;
    __encode: (options: {
      width: number;
      height: number;
      fps: number;
      totalFrames: number;
    }) => Promise<string>;
    __ready: boolean;
  }
}
