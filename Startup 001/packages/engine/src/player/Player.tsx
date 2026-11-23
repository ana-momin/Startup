import { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from './Canvas';
import type { Composition } from '../core/types';

/**
 * A request to jump to a moment.
 *
 * It carries an id because a seek is an *event*, not a value. Sending the bare frame
 * number means clicking the same clip twice looks unchanged to React and is ignored the
 * second time — so the player silently refuses to go back to a moment you have already
 * visited.
 */
export type SeekRequest = {
  frame: number;
  /** Anything that differs from the last request. A counter is enough. */
  id: number;
};

type PlayerProps = {
  composition: Composition;
  /**
   * Whether it is playing.
   *
   * Pass this to drive playback from outside, and the player will never change it on
   * its own — it reports what the viewer asked for through `onPlayingChange` and waits.
   * Leave it out and the player keeps its own state, starting from `autoPlay`.
   */
  playing?: boolean;
  /** Told whenever the player wants playback to start or stop. */
  onPlayingChange?: (playing: boolean) => void;
  /** Starting state when playback is not controlled from outside. */
  autoPlay?: boolean;
  /** Restart automatically when it reaches the end. */
  loop?: boolean;
  /**
   * Called on every frame change.
   *
   * Lets an editor draw its own playhead against the same clock the video is using,
   * rather than running a second timer that would slowly drift out of step with it.
   */
  onFrame?: (frame: number) => void;
  /** Jump the player to a moment from outside — clicking a clip in a timeline. */
  seek?: SeekRequest | null;
  /** Hide the built-in controls when the surrounding editor provides its own. */
  hideControls?: boolean;
};

/**
 * Preview player: play, pause, scrub, step frame by frame.
 *
 * Time is driven by the real clock rather than by counting rAF ticks, so a dropped
 * frame during preview does not make the animation drift. The frame we display is
 * always computed from elapsed time, which keeps preview honest about real speed.
 *
 * Playback can be owned by the player or by whoever renders it, but never by both.
 * Two copies of "is it playing" is how the play button ends up able to pause and
 * unable to start: the button flips the editor's copy, the player is still reading its
 * own, and nothing moves.
 */
export const Player = ({
  composition,
  playing: playingProp,
  onPlayingChange,
  autoPlay = true,
  loop = true,
  onFrame,
  seek,
  hideControls,
}: PlayerProps) => {
  const { fps, durationInFrames, component: Component } = composition;
  const lastFrame = Math.max(durationInFrames - 1, 0);

  const [frame, setFrame] = useState(0);
  const [ownPlaying, setOwnPlaying] = useState(autoPlay);

  const controlled = playingProp !== undefined;
  const playing = controlled ? playingProp : ownPlaying;

  /** Ask for playback to change, whoever happens to own the answer. */
  const requestPlaying = useCallback(
    (next: boolean) => {
      if (!controlled) setOwnPlaying(next);
      onPlayingChange?.(next);
    },
    [controlled, onPlayingChange],
  );

  const toggle = useCallback(() => requestPlaying(!playing), [requestPlaying, playing]);

  // Report the current frame outward. Kept in an effect rather than called inside the
  // animation loop so the parent's re-render never blocks the next frame.
  useEffect(() => {
    onFrame?.(frame);
  }, [frame, onFrame]);

  /*
   * Wall-clock anchor: which frame we started from, and when.
   *
   * Every jump has to move the anchor as well as the frame. Moving only the frame means
   * the next tick recomputes from the old anchor and drags the video straight back to
   * where it was — a seek that appears to do nothing.
   */
  const anchorRef = useRef({ frame: 0, time: 0 });
  const frameRef = useRef(0);
  frameRef.current = frame;

  const jump = useCallback(
    (target: number) => {
      const next = Math.min(Math.max(Math.round(target), 0), lastFrame);
      anchorRef.current = { frame: next, time: performance.now() };
      setFrame(next);
    },
    [lastFrame],
  );

  // An outside seek moves the playhead and nothing else. Whether it should also pause
  // is a decision for whoever asked — a timeline click pauses, a jump to the start when
  // opening a video should not.
  useEffect(() => {
    if (!seek) return;
    jump(seek.frame);
    // Only the request matters here; re-running because `jump` was rebuilt would
    // replay an old seek after a format change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seek]);

  useEffect(() => {
    if (!playing) return;

    // Resume from wherever the playhead actually is, read through a ref so turning
    // playback on never captures a stale frame.
    anchorRef.current = { frame: frameRef.current, time: performance.now() };
    let raf = 0;

    const tick = () => {
      const { frame: startFrame, time: startTime } = anchorRef.current;
      const elapsed = (performance.now() - startTime) / 1000;
      const next = startFrame + Math.floor(elapsed * fps);

      if (next >= durationInFrames) {
        if (loop) {
          anchorRef.current = { frame: 0, time: performance.now() };
          setFrame(0);
        } else {
          setFrame(lastFrame);
          requestPlaying(false);
          return;
        }
      } else {
        setFrame(next);
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // `frame` is intentionally excluded: including it would restart the loop every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, fps, durationInFrames, loop, lastFrame]);

  // Reset when switching to a different composition. The anchor moves with it, or the
  // first tick after the switch jumps to wherever the old video had got to.
  useEffect(() => {
    anchorRef.current = { frame: 0, time: performance.now() };
    setFrame(0);
  }, [composition.id]);

  const step = useCallback(
    (delta: number) => {
      requestPlaying(false);
      jump(frameRef.current + delta);
    },
    [requestPlaying, jump],
  );

  // Keyboard: space toggles, arrows step, shift+arrow jumps a second.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Never steal keys from somebody who is typing. Checking only for <input> meant
      // pressing space in a <textarea> played the video instead of typing a space —
      // which made the chat beside the player impossible to write in.
      const target = e.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable
      ) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        toggle();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        step(e.shiftKey ? fps : 1);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        step(e.shiftKey ? -fps : -1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle, step, fps]);

  const seconds = (frame / fps).toFixed(2);
  const total = (durationInFrames / fps).toFixed(2);

  return (
    <div style={styles.wrapper}>
      <div style={styles.stage}>
        <Canvas config={composition} frame={frame}>
          <Component />
        </Canvas>
      </div>

      <div style={{ ...styles.controls, display: hideControls ? 'none' : 'flex' }}>
        <button onClick={toggle} style={styles.button} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? '❚❚' : '▶'}
        </button>

        <input
          type="range"
          min={0}
          max={lastFrame}
          value={frame}
          onChange={(e) => {
            requestPlaying(false);
            jump(Number(e.target.value));
          }}
          style={styles.scrubber}
          aria-label="Timeline"
        />

        <span style={styles.time}>
          {seconds}s / {total}s
        </span>
        <span style={styles.frameCount}>frame {frame}</span>
      </div>
    </div>
  );
};

/**
 * Styles read the host app's design tokens when they exist, and fall back to sensible
 * values when they don't — so the player looks right inside our app and still works
 * if the engine is dropped into a different project.
 */
const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    gap: 10,
  },
  stage: {
    flex: 1,
    minHeight: 0,
    borderRadius: 10,
    overflow: 'hidden',
    /*
     * Transparent, so the host decides what sits behind the film.
     *
     * This was solid black, and because the stage stretches to fill whatever height it
     * is given while the canvas keeps the film's aspect ratio, every editor that was not
     * exactly 16:9 got thick black bars above and below. They read as wasted space
     * rather than as letterboxing, because nothing else in the interface is black.
     *
     * The film itself still paints its own background, so the picture is unaffected —
     * only the area around it changes, and that belongs to whoever is embedding the
     * player, not to the player.
     */
    backgroundColor: 'transparent',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '2px 2px 0',
  },
  button: {
    display: 'grid',
    placeItems: 'center',
    width: 32,
    height: 32,
    borderRadius: 8,
    border: 'none',
    backgroundColor: 'var(--btn, #ececec)',
    color: 'var(--btn-text, #0f0f0f)',
    fontSize: 12,
    cursor: 'pointer',
    flexShrink: 0,
  },
  scrubber: {
    flex: 1,
    accentColor: 'var(--text-soft, #b4b4b4)',
    cursor: 'pointer',
  },
  time: {
    fontVariantNumeric: 'tabular-nums',
    color: 'var(--text-muted, #8a8a8a)',
    fontSize: 12.5,
    flexShrink: 0,
  },
  frameCount: {
    fontVariantNumeric: 'tabular-nums',
    color: 'var(--text-faint, #6a6a6a)',
    fontSize: 12.5,
    flexShrink: 0,
  },
} satisfies Record<string, React.CSSProperties>;
