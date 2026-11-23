import { Easing, Morph, boxFor, interpolate, streamFor, useCurrentFrame, useVideoConfig } from '@motion/engine';
import type { ShapeName } from '@motion/engine';
import { CROSSFADE, sceneStarts, specFrames } from '@motion/planner';
import type { SceneKind, VideoSpec } from '@motion/planner';
import { useLook, useSeed, useTone } from '../scenes/shared';
import { chooseEndLayout } from '../compose/endLayouts';
import { chooseTitleLayout } from '../compose/titleLayouts';
import { chooseListLayout } from '../compose/listLayouts';

/**
 * The thread: one shape that lives for the whole video.
 *
 * Every other element in a video is born when its scene starts and dies when it ends.
 * This one does not. It is the underline beneath the opening headline; at the cut it
 * stretches and turns to become the spine down the left of the list; then it swells into
 * the disc behind the number; then it settles under the closing line. Same object,
 * continuously, from the first frame to the last.
 *
 * This is the piece that is genuinely hard to copy, and it is worth explaining why it
 * matters rather than just that it looks good.
 *
 * A viewer decides whether something was *made* or *generated* in the first few seconds,
 * and the tell is continuity. Generated video is a sequence of independently correct
 * pictures. Designed video has decisions that persist across cuts — a colour that comes
 * back, a shape that returns, a rhythm that holds. An object the eye can track through a
 * cut is the strongest version of that, because the viewer does not have to notice it
 * consciously to feel that somebody was in charge.
 *
 * It costs one SVG path per frame, and it works only because shapes here are points
 * rather than hand-written paths, so a bar really can become a circle.
 */

/** Where the thread is during a scene, in fractions of the frame. */
type Target = {
  shape: ShapeName;
  /** Centre, 0 to 1 across and down the frame. */
  x: number;
  y: number;
  /** Half-width as a fraction of the frame's width. */
  size: number;
  /** Degrees. A bar turned 90° is a vertical rule. */
  rotate: number;
  opacity: number;
  /** Squash across the short axis. A bar needs to stay a bar as it grows. */
  squash: number;
};

/**
 * What the thread does in each kind of scene.
 *
 * Every role is something the scene would have wanted anyway — an underline, a spine
 * down a list, a field of colour behind a number. The thread is not decoration added on
 * top; it is the furniture those scenes need, supplied by one object instead of eight.
 */
const ROLE: Record<SceneKind, Target> = {
  // An underline, sitting under the headline.
  title: { shape: 'bar', x: 0.5, y: 0.715, size: 0.1, rotate: 0, opacity: 0.95, squash: 0.22 },
  // A short vertical mark beside the word, so the eye has an anchor while it changes.
  bigword: { shape: 'bar', x: 0.5, y: 0.68, size: 0.07, rotate: 0, opacity: 0.95, squash: 0.3 },
  // The spine the list hangs off.
  features: { shape: 'bar', x: 0.255, y: 0.54, size: 0.1, rotate: 90, opacity: 0.8, squash: 0.12 },
  steps: { shape: 'bar', x: 0.235, y: 0.54, size: 0.11, rotate: 90, opacity: 0.8, squash: 0.12 },
  // A field of colour behind the number. Big, quiet, and the reason a statistic reads as
  // a statement rather than as text that happens to be large.
  stat: { shape: 'circle', x: 0.5, y: 0.5, size: 0.17, rotate: 0, opacity: 0.16, squash: 1 },
  // The rule beside a quotation, which is how print has marked one for centuries.
  quote: { shape: 'bar', x: 0.24, y: 0.5, size: 0.1, rotate: 90, opacity: 0.8, squash: 0.14 },
  // Behind the device, wide and very faint: a ground for it to stand on, and the reason
  // a floating window does not look pasted onto the background.
  product: { shape: 'roundSquare', x: 0.5, y: 0.54, size: 0.3, rotate: 0, opacity: 0.1, squash: 0.62 },
  // Under the chart, as a baseline. The thread becoming the axis is the neatest job it
  // does all video, because that is a line the chart genuinely needs.
  chart: { shape: 'bar', x: 0.5, y: 0.78, size: 0.22, rotate: 0, opacity: 0.5, squash: 0.1 },
  // A rule beneath the chain, so the states read as sitting on one line.
  flow: { shape: 'bar', x: 0.5, y: 0.66, size: 0.16, rotate: 0, opacity: 0.45, squash: 0.08 },
  // Nothing: the cards are already the composition, and a line through them is clutter.
  constellation: { shape: 'bar', x: 0.5, y: 0.9, size: 0.08, rotate: 0, opacity: 0.2, squash: 0.1 },
  // Nothing. The frame already has moving interface and a line of type on top of it;
  // a rule through the middle of that is a third thing competing for the same space.
  overlay: { shape: 'bar', x: 0.5, y: 0.5, size: 0.02, rotate: 0, opacity: 0, squash: 0.1 },
  logo: { shape: 'circle', x: 0.5, y: 0.5, size: 0.15, rotate: 0, opacity: 0.13, squash: 1 },
  outro: { shape: 'bar', x: 0.5, y: 0.7, size: 0.09, rotate: 0, opacity: 0.95, squash: 0.2 },
};

/**
 * The thread has to sit where the scene actually put its content.
 *
 * A list scene gets a spine down its left edge, which is right when the list is
 * left-aligned and wrong when it is centred — the spine ends up stranded in empty space
 * beside nothing, which looks like a rendering fault rather than a design. Alignment is
 * a property of the tone, so the thread can simply ask.
 */
const roleFor = (kind: SceneKind, align: 'center' | 'left'): Target => {
  const role = ROLE[kind];
  const isSpine = role.rotate === 90;
  if (!isSpine || align === 'left') return role;

  // Centred layouts get a rule under the heading instead: the same job, done the way a
  // centred composition does it.
  return { ...role, x: 0.5, y: 0.335, rotate: 0, size: 0.075, squash: 0.16 };
};

/**
 * Where the ending actually put its content.
 *
 * The table above was written when every scene was centred, so the outro's rule sits at
 * the middle of the frame. The ending is composed now — it can be hung left, split
 * across a baseline or dropped into the bottom third — and a rule pinned to the centre
 * of a frame whose content is all on the left is not a through-line, it is a stray mark.
 * In the sheets it read as a rendering fault, which is the worst thing a deliberate
 * element can look like.
 *
 * This recomputes the same layout the scene computes, from the same seed and the same
 * stream, and lands the thread on the mark that layout asked for. It works because a
 * composition here is a pure function of its inputs — the same property that lets the
 * preview match the export. Nothing is passed between the two; they simply agree,
 * because they are both reading the same arithmetic.
 *
 * The scene no longer draws that mark itself. One mark, drawn by the object whose job is
 * to carry across the cut.
 */
/**
 * The spine belongs to the list, wherever the list went.
 *
 * The table put it at 23% across the frame, which was right when every list started at
 * the left margin. Compositions move it: a heading can hold the left third with the
 * points beside it, in which case a spine on the far left is a line next to nothing. So
 * it is placed against the items' own left edge, which is the one position where a spine
 * is doing its job.
 *
 * Arrangements that run across the frame — bands, a grid, columns — have no left edge to
 * hang off, so the thread becomes a short rule under the heading instead. Same mark,
 * placed the way that composition would place it.
 */
const listTarget = (
  items: string[],
  isSteps: boolean,
  seed: number,
  index: number,
  width: number,
  height: number,
  margin: number,
): Target => {
  const layout = chooseListLayout(items, streamFor(seed, `list-layout-${index}`), {
    vertical: height > width,
    isSteps,
  });

  if (layout.horizontal || layout.style === 'grid' || layout.style === 'bands') {
    const box = boxFor(layout.heading, { width, height, margin });
    const size = Math.min(box.width / 2, width * 0.075) / width;
    return {
      shape: 'bar',
      x: layout.headingAnchor.includes('left')
        ? (box.left + size * width) / width
        : (box.left + box.width / 2) / width,
      y: (box.top + box.height + height * 0.012) / height,
      size,
      rotate: 0,
      opacity: 0.8,
      squash: 0.16,
    };
  }

  const box = boxFor(layout.items, { width, height, margin });
  // A hair outside the items, so it is a margin rule rather than a strike through them.
  const gap = width * 0.03;

  /*
   * The spine is as long as the list, not as long as the region.
   *
   * The items region is cut for the longest list it might hold, so three points in a
   * five-row box left the rule trailing most of a frame below the last of them — a line
   * pointing at nothing, which is the opposite of what a spine is for. It runs from the
   * top of the region down past the last item and stops.
   */
  const span = box.height * Math.min(1, (items.length + 1.3) / 5);

  return {
    shape: 'bar',
    x: (box.left - gap) / width,
    y: (box.top + span / 2) / height,
    size: span / 2 / width,
    rotate: 90,
    opacity: 0.8,
    squash: 0.12,
  };
};

const titleTarget = (
  headline: string,
  sub: string | undefined,
  seed: number,
  index: number,
  width: number,
  height: number,
  margin: number,
  fallbackAlign: 'center' | 'left',
): Target => {
  const layout = chooseTitleLayout(headline, streamFor(seed, `title-layout-${index}`), {
    hasSub: Boolean(sub),
    vertical: height > width,
  });

  // Several arrangements deliberately have no rule. Those keep the table's answer, which
  // for a title is an underline beneath the words and is right wherever they sit.
  if (!layout.rule) return roleFor('title', fallbackAlign);

  const box = boxFor(layout.rule, { width, height, margin });
  // A region taller than it is wide is a vertical rule, which the thread does by turning.
  const tall = layout.rule.rows / 8 > layout.rule.span / 12;
  const anchor = layout.headlineAnchor;
  const size = tall ? box.height / 2 / width : Math.min(box.width / 2, width * 0.09) / width;

  const x = tall
    ? (box.left + box.width / 2) / width
    : anchor.includes('left')
      ? (box.left + size * width) / width
      : anchor.includes('right')
        ? (box.left + box.width - size * width) / width
        : (box.left + box.width / 2) / width;

  return {
    shape: 'bar',
    x,
    y: tall ? (box.top + box.height / 2) / height : (box.top + box.height / 2) / height,
    size,
    rotate: tall ? 90 : 0,
    opacity: 0.95,
    squash: tall ? 0.12 : 0.2,
  };
};

const endTarget = (
  headline: string,
  cta: string | undefined,
  seed: number,
  index: number,
  width: number,
  height: number,
  margin: number,
): Target => {
  const layout = chooseEndLayout(headline, streamFor(seed, `end-layout-${index}`), {
    hasTail: Boolean(cta),
    vertical: height > width,
  });

  const size = 0.045;
  const anchor = layout.leadAnchor;

  /*
   * Above the line when there is a button, below it when there is not.
   *
   * Every one of these arrangements puts its mark in the gap between the closing line
   * and the call to action, which is exactly where the button goes. Padding the button
   * down only moved the collision; the rule and the button were still touching, and two
   * deliberate elements overlapping reads as neither.
   *
   * So when a button exists the mark goes ABOVE the line instead — a rule over a closing
   * statement is as old as print, it cannot collide with anything, and it leaves the
   * line and its action sitting together as one block, which is what they are.
   */
  const region = cta
    ? {
        col: layout.lead.col,
        row: Math.max(layout.lead.row - 1, 0),
        span: Math.min(layout.lead.span, 3),
        rows: 1,
      }
    : (layout.mark ?? {
        col: layout.lead.col,
        row: Math.min(layout.lead.row + layout.lead.rows, 7),
        span: Math.min(layout.lead.span, 3),
        rows: 1,
      });

  const box = boxFor(region, { width, height, margin });

  const x = anchor.includes('left')
    ? (box.left + size * width) / width
    : anchor.includes('right')
      ? (box.left + box.width - size * width) / width
      : (box.left + box.width / 2) / width;

  return {
    shape: 'bar',
    x,
    y: (box.top + box.height / 2) / height,
    size,
    rotate: 0,
    opacity: 0.95,
    squash: 0.2,
  };
};

export const Thread = ({ spec }: { spec: VideoSpec }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const tone = useTone();
  const look = useLook();
  const seed = useSeed();

  const total = Math.max(specFrames(spec), 1);
  /*
   * The thread steps back now that colour is carrying the film.
   *
   * It was designed against a near-black frame where a faint accent line reads as
   * structure. On paper, and especially on a full colour field, the same line is a smear
   * across the middle of the composition. It is still the through-line; it is just no
   * longer competing with the thing it is meant to support.
   */
  const restraint = 0.55;
  const starts = sceneStarts(spec, CROSSFADE);
  const scenes = spec.scenes;
  if (scenes.length === 0) return null;

  // Which scene are we in, and which one is next?
  let i = 0;
  for (let n = 0; n < starts.length; n++) if (frame >= starts[n]) i = n;
  const next = Math.min(i + 1, scenes.length - 1);

  // The scenes that compose their own position are asked where they put it; the rest
  // keep the table's answer, which is still right for them.
  const targetFor = (n: number): Target => {
    const scene = scenes[n];
    if (scene.kind === 'outro') {
      return endTarget(scene.headline, scene.cta, seed, n, width, height, look.margin);
    }
    if (scene.kind === 'features' || scene.kind === 'steps') {
      return listTarget(
        scene.items, scene.kind === 'steps', seed, n, width, height, look.margin,
      );
    }
    if (scene.kind === 'title') {
      return titleTarget(
        scene.headline, scene.sub, seed, n, width, height, look.margin, tone.align,
      );
    }
    return roleFor(scene.kind, tone.align);
  };

  const from = targetFor(i);
  const to = targetFor(next);

  /*
   * The change happens across the cut, not inside a scene.
   *
   * It begins a few frames before the next scene arrives and finishes a few frames
   * after, so the thread is visibly mid-transformation at the moment the picture
   * changes. That overlap is the whole point: a shape that finished changing before the
   * cut is two shapes, and the eye has nothing to follow through.
   */
  const boundary = starts[next];
  const t =
    i === next
      ? 0
      : interpolate(frame, [boundary - 12, boundary + 10], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.easeInOutCubic,
        });

  const lerp = (a: number, b: number) => a + (b - a) * t;

  const x = lerp(from.x, to.x) * width;
  const y = lerp(from.y, to.y) * height;
  const size = lerp(from.size, to.size) * width;
  /*
   * A big turn happens all at once, in the dark.
   *
   * Easing a bar from upright to flat means showing it at 37° for several frames, and a
   * diagonal line across the frame never reads as an object turning — it reads as
   * something broken. So a large change is switched instantly, at the exact midpoint of
   * the transition, which is where the thread has drawn back to almost nothing anyway.
   * Small adjustments still ease, because those look like what they are.
   */
  const turn = Math.abs(to.rotate - from.rotate);
  const rotate = turn > 30 ? (t < 0.5 ? from.rotate : to.rotate) : lerp(from.rotate, to.rotate);
  const squash = turn > 30 ? (t < 0.5 ? from.squash : to.squash) : lerp(from.squash, to.squash);

  // It draws itself on at the start and lets go at the end, rather than being present on
  // frame zero — an object that was always there is scenery, not a character.
  const born = interpolate(frame, [4, 22], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.entrance,
  });
  const gone = interpolate(frame, [total - 20, total - 4], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  /*
   * It gathers itself in the middle of a change.
   *
   * A bar turning upright passes through 45°, and for a few frames a diagonal line
   * across the frame reads as a mistake rather than as an object in motion. Drawing back
   * and reforming turns those frames into the most deliberate part of the move — which
   * is also how it works on paper: a hand lifts the pen between strokes.
   *
   * It only applies to changes big enough to be awkward, so a bar that merely slides
   * from one place to another is not interrupted for no reason.
   */
  const upheaval = Math.min(
    (Math.abs(to.rotate - from.rotate) / 90 + (from.shape === to.shape ? 0 : 1)) / 2,
    1,
  );
  const gather = 1 - Math.sin(t * Math.PI) * 0.95 * upheaval;

  const opacity =
    lerp(from.opacity, to.opacity) * born * gone * gather * (0.7 + tone.motion * 0.3) * restraint;
  if (opacity < 0.01) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        color: spec.palette.accent,
        // Rotation and squash are applied to the whole layer rather than baked into the
        // points, so a bar can turn upright without its ends being resampled every frame.
        transform: `rotate(${rotate}deg) scaleY(${squash})`,
        transformOrigin: `${x}px ${y}px`,
      }}
    >
      <Morph
        through={[from.shape, to.shape]}
        progress={t}
        at={{ x, y, size: size * (0.55 + gather * 0.45) }}
        color={spec.palette.accent}
        opacity={opacity}
        detail={56}
      />
    </div>
  );
};
