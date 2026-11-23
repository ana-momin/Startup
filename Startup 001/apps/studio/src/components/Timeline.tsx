import { useCallback, useRef } from 'react';
import { CROSSFADE, sceneStarts, specFrames } from '@motion/planner';
import type { SceneKind, VideoSpec } from '@motion/planner';
import { Icon } from './Icon';
import './timeline.css';

type Props = {
  spec: VideoSpec;
  /** The frame the player is showing right now. */
  frame: number;
  selected: number;
  onSelect: (index: number) => void;
  /** Jump the player to a frame. */
  onSeek: (frame: number) => void;
  playing: boolean;
  onTogglePlay: () => void;
};

/**
 * The timeline, with a playhead.
 *
 * Clips are sized by their real frame count, so the strip is a true picture of the
 * video's shape rather than a row of equal boxes — a scene that takes a third of the
 * runtime looks like it does.
 *
 * The playhead is the part that makes this an editor rather than a list. Being able to
 * see *where you are* while the video runs, and to click a moment to go there, is the
 * difference between watching a preview and working on something.
 */
export const Timeline = ({
  spec,
  frame,
  selected,
  onSelect,
  onSeek,
  playing,
  onTogglePlay,
}: Props) => {
  const starts = sceneStarts(spec, CROSSFADE);

  // The same number the player counts to. Working it out separately here is what put
  // the playhead and the clip fills on different scales — they drifted apart by one
  // crossfade per scene, which is exactly the desync that showed up on screen.
  const total = Math.max(specFrames(spec), 1);

  /**
   * How wide each clip should be.
   *
   * Scenes overlap, so a clip's share of the timeline is the gap until the next one
   * starts — not its own duration. Using duration made every clip slightly too wide
   * and pushed the later ones out of alignment with the playhead.
   */
  const spans = spec.scenes.map((_, i) =>
    i < spec.scenes.length - 1 ? starts[i + 1] - starts[i] : total - starts[i],
  );

  const position = Math.min(Math.max(frame / total, 0), 1);

  /*
   * Scrubbing: press anywhere and drag.
   *
   * Clicking jumped to a moment, which is half of what a timeline is for. The other half
   * is dragging — holding the playhead and moving it to find a frame by eye. Without it
   * the marker looked draggable, behaved like a label, and every attempt to grab it
   * silently did nothing.
   *
   * The listeners go on the window rather than on the strip, because a hand dragging
   * along a 40-pixel-tall bar leaves it constantly. Bound to the element measured at
   * press time so the geometry cannot change underneath the drag.
   */
  const stripRef = useRef<HTMLDivElement>(null);

  const frameFromClientX = useCallback(
    (clientX: number): number => {
      const box = stripRef.current?.getBoundingClientRect();
      if (!box || box.width === 0) return 0;
      const ratio = (clientX - box.left) / box.width;
      return Math.round(Math.min(Math.max(ratio, 0), 1) * total);
    },
    [total],
  );

  const startScrub = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onSeek(frameFromClientX(e.clientX));

      const move = (event: MouseEvent) => onSeek(frameFromClientX(event.clientX));
      const stop = () => {
        window.removeEventListener('mousemove', move);
        window.removeEventListener('mouseup', stop);
        document.body.style.userSelect = '';
      };

      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', stop);
      // Dragging across a page selects the text it passes over, which makes a scrub look
      // like a mistake halfway through.
      document.body.style.userSelect = 'none';
    },
    [frameFromClientX, onSeek],
  );

  return (
    <div className="tl">
      <button className="tl__play" onClick={onTogglePlay} aria-label={playing ? 'Pause' : 'Play'}>
        {playing ? <PauseIcon /> : <Icon name="play" size={13} />}
      </button>

      {/*
        One bar, not a row of cards.

        Every scene used to be a bordered rectangle with its name and its length stacked
        inside it, separated by gaps — a strip four times taller than it needed to be,
        taking room from the only thing on this screen anybody came to look at. A
        timeline's job is to show proportion and position, and a single track with
        divisions in it does that better than cards do, because the divisions are the
        proportions rather than decoration around them.
      */}
      <div className="tl__strip" ref={stripRef} onMouseDown={startScrub}>
        {spec.scenes.map((scene, i) => (
          <button
            key={i}
            className={`tl__seg ${i === selected ? 'is-selected' : ''}`}
            style={{ flexGrow: spans[i] }}
            onMouseDown={(e) => {
              // Selects the scene, and still begins a scrub — so a press that lands on a
              // clip and then drags behaves like a press anywhere else.
              onSelect(i);
              startScrub(e);
            }}
            title={`${SCENE_LABELS[scene.kind]} · ${(spans[i] / spec.fps).toFixed(1)}s`}
          >
            {/* Hidden by the CSS when the segment is too narrow to hold it. */}
            <span className="tl__name">{SCENE_LABELS[scene.kind]}</span>
          </button>
        ))}

        {/* How far through the film we are, across the whole track rather than per clip. */}
        <span className="tl__past" style={{ width: `${position * 100}%` }} />

        {/* The playhead sits above everything so it is never hidden behind a segment. */}
        <span className="tl__playhead" style={{ left: `${position * 100}%` }} />
      </div>

      <span className="tl__time">
        {(frame / spec.fps).toFixed(1)}
        <em>/ {(total / spec.fps).toFixed(1)}s</em>
      </span>
    </div>
  );
};

const PauseIcon = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="4" height="16" rx="1" />
    <rect x="14" y="4" width="4" height="16" rx="1" />
  </svg>
);

const SCENE_LABELS: Record<SceneKind, string> = {
  title: 'Title',
  bigword: 'Big words',
  features: 'Points',
  steps: 'Steps',
  stat: 'Number',
  quote: 'Quote',
  product: 'Product',
  chart: 'Chart',
  flow: 'Flow',
  constellation: 'Pieces',
  overlay: 'Words over product',
  logo: 'Brand',
  outro: 'Ending',
};
