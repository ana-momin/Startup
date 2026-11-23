import { ArrayBufferTarget, Muxer } from 'mp4-muxer';

export type EncodeOptions = {
  width: number;
  height: number;
  fps: number;
  totalFrames: number;
  /** Target bitrate in bits per second. */
  bitrate?: number;
};

/**
 * Encode a sequence of captured frames into an MP4, inside the browser.
 *
 * Two deliberate choices here, both about ownership:
 *
 * 1. **WebCodecs, not FFmpeg.** Chrome ships a hardware-accelerated H.264 encoder and
 *    exposes it to JavaScript. A default FFmpeg build carries GPL codecs (libx264)
 *    that could force us to open-source this entire product. Using the browser's own
 *    encoder sidesteps that completely — and it is faster.
 *
 * 2. **mp4-muxer (MIT) for the container.** WebCodecs gives us encoded chunks; something
 *    still has to write the MP4 file structure around them. That is a small, fixed job
 *    against a frozen file format.
 *
 * Frames are pulled one at a time from the renderer rather than passed in as an array,
 * so memory stays flat whether the video is 5 seconds or 5 minutes.
 */
export const encodeVideo = async (options: EncodeOptions): Promise<string> => {
  const { width, height, fps, totalFrames } = options;

  if (typeof VideoEncoder === 'undefined') {
    throw new Error('This browser has no WebCodecs support, so it cannot encode video.');
  }

  // Roughly 0.1 bits per pixel per frame — good quality for motion graphics, which are
  // mostly flat colour and sharp edges rather than noisy camera footage.
  const bitrate = options.bitrate ?? Math.round(width * height * fps * 0.1);

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: {
      codec: 'avc',
      width,
      height,
      frameRate: fps,
    },
    // The whole file is produced at once, so the index can live at the front —
    // which is what lets a browser start playing before the download finishes.
    fastStart: 'in-memory',
  });

  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (error) => {
      throw error;
    },
  });

  encoder.configure({
    codec: 'avc1.4d0034', // H.264 Main profile, level 5.2 — plays everywhere.
    width,
    height,
    bitrate,
    framerate: fps,
  });

  const microsPerFrame = 1_000_000 / fps;

  for (let index = 0; index < totalFrames; index++) {
    const encoded = await window.__pullFrame(index);
    const bitmap = await createImageBitmap(toBlob(encoded));

    // Straight from the decoded image to a video frame. Drawing through an
    // intermediate canvas first would copy every pixel twice for no benefit.
    const frame = new VideoFrame(bitmap, {
      timestamp: Math.round(index * microsPerFrame),
      duration: Math.round(microsPerFrame),
    });

    // A keyframe every two seconds keeps seeking responsive without bloating the file.
    encoder.encode(frame, { keyFrame: index % (fps * 2) === 0 });
    frame.close();
    bitmap.close();

    // Let the queue drain when it gets long, so memory stays flat on long videos.
    // Waiting for a 'dequeue' event rather than calling flush() matters: flush drains
    // the encoder completely and stalls its pipeline, which turns a parallel encoder
    // into a serial one.
    if (encoder.encodeQueueSize > 12) {
      await new Promise<void>((resolve) => {
        encoder.addEventListener('dequeue', () => resolve(), { once: true });
      });
    }
  }

  await encoder.flush();
  encoder.close();
  muxer.finalize();

  return arrayBufferToBase64(target.buffer);
};

/* ---------- transfer helpers ---------- */

/**
 * Frames cross the Node/browser boundary as base64 because that boundary only carries
 * JSON. It costs about a third more bytes than raw binary, which is a fair price for
 * not having to run a socket between the two.
 */
/**
 * Decode base64 straight to bytes.
 *
 * The obvious version — `fetch('data:image/png;base64,' + s)` — makes the browser
 * parse a multi-megabyte URL string for every single frame, which is far slower than
 * decoding the bytes directly. createImageBitmap sniffs the real format from the
 * bytes, so the declared type barely matters.
 */
const toBlob = (base64: string): Blob => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: 'image/png' });
};

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  // Chunked so a long video does not blow the argument limit of String.fromCharCode.
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
};
