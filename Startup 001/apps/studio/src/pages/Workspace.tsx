import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Player } from '@motion/engine';
import type { SeekRequest } from '@motion/engine';
import {
  addScene,
  duplicateScene,
  moveScene,
  removeScene,
  setFormat,
  specSeconds,
} from '@motion/planner';
import type { FormatName, SceneKind, Tone, VideoSpec, VideoStyle } from '@motion/planner';
import { Icon } from '@/components/Icon';
import { IconMenu } from '@/components/IconMenu';
import { Streamed } from '@/components/Streamed';
import { Markdown } from '@/components/Markdown';
import { MessageActions } from '@/components/MessageActions';
import { Thinking } from '@/components/Thinking';
import { Timeline } from '@/components/Timeline';
import { buildComposition } from '@/lib/composition';
import type { Video } from '@/lib/api';
import { GeneratedVideo } from '@/videos';
import './workspace.css';

export type ExportState =
  | { status: 'idle' }
  | { status: 'rendering'; done: number; total: number }
  | { status: 'done'; filename: string }
  | { status: 'error'; message: string };

export type EditMessage = {
  role: 'user' | 'assistant';
  content: string;
  thinking?: boolean;
};

/**
 * A point you can come back to.
 *
 * Undo is a stack with no memory of what it undoes: pressing it four times is four acts
 * of faith, and there is no way to ask "put it back to how it was before I started
 * fiddling with the ending". A checkpoint is the same information with a name on it.
 *
 * It holds the spec as it was BEFORE the change, so reverting to a checkpoint restores
 * the state the label describes the end of. And it sits in the conversation rather than
 * in a separate history panel, because the conversation is already the record of what
 * happened to this film — an agent reply and a hand edit are both just things that
 * changed it, and splitting them across two lists would make the order impossible to
 * read.
 */
export type Checkpoint = {
  id: number;
  /** What changed. "Tone → bold", "Deleted Title", "Change from the agent". */
  label: string;
  /** The film as it was before that change. */
  spec: VideoSpec;
  /** Which message this followed, so the thread can interleave the two. */
  afterMessage: number;
  at: number;
};

type Props = {
  video: Video;
  busy?: boolean;
  messages: EditMessage[];
  onSpecChange: (spec: VideoSpec) => void;
  onAsk: (instruction: string) => void;
  onExport: () => void;
  exportState: ExportState;
  onDismissExport: () => void;
  autoplay?: boolean;
  /** Other videos, so you can switch without leaving the editor. */
  recents: Video[];
  onOpenVideo: (id: string) => void;
  onNew: () => void;
  onBack: () => void;
  /** Whether to arrive with the editing panel already out. */
  openPanel?: boolean;
};

/**
 * The editor.
 *
 * A full screen with no app navigation: once you are working on a video, the sidebar is
 * somewhere to leave rather than somewhere to go, and every pixel it takes is a pixel
 * not showing the thing being made.
 *
 * Conversation on the left, video on the right. That order matters — the panel is where
 * the work is *directed* from, and in a left-to-right language the thing you act with
 * belongs before the thing you act on.
 */
export const Workspace = ({
  video,
  busy,
  messages,
  onSpecChange,
  onAsk,
  onExport,
  exportState,
  onDismissExport,
  autoplay = true,
  recents,
  onOpenVideo,
  onNew,
  onBack,
  openPanel = false,
}: Props) => {
  const { spec } = video;

  /*
   * Undo and redo.
   *
   * The editor had none, which makes every control in it slightly frightening: deleting
   * a scene, reordering two, or trying a different tone were all one-way doors, so the
   * safe move was always to not touch anything. An editor you are afraid of is one you
   * do not explore, and exploring is the whole point of having the controls.
   *
   * Held here rather than in the app because it is a property of this editing session:
   * opening a different video should not let you undo into somebody else's edits. The
   * stack is bounded because a spec is a sizeable object and nobody has ever wanted the
   * fortieth step back.
   */
  const past = useRef<VideoSpec[]>([]);
  const future = useRef<VideoSpec[]>([]);
  const [depth, setDepth] = useState({ back: 0, forward: 0 });

  const commit = useCallback(
    /*
     * The label names the change for the checkpoint list.
     *
     * Optional on purpose: a change that arrives without one came from the agent,
     * which is the only path that does not pass through here.
     */
    (next: VideoSpec, label?: string) => {
      pendingLabel.current = label ?? null;
      past.current = [...past.current.slice(-39), spec];
      future.current = [];
      setDepth({ back: past.current.length, forward: 0 });
      onSpecChange(next);
    },
    [spec, onSpecChange],
  );

  const undo = useCallback(() => {
    const previous = past.current.pop();
    if (!previous) return;
    future.current = [spec, ...future.current.slice(0, 39)];
    setDepth({ back: past.current.length, forward: future.current.length });
    onSpecChange(previous);
  }, [spec, onSpecChange]);

  const redo = useCallback(() => {
    const [next, ...rest] = future.current;
    if (!next) return;
    future.current = rest;
    past.current = [...past.current, spec];
    setDepth({ back: past.current.length, forward: future.current.length });
    onSpecChange(next);
  }, [spec, onSpecChange]);

  /*
   * The record of what has happened to this film.
   *
   * Watching the spec rather than hooking every button is what makes this reliable: a
   * change made by the agent and a change made by a slider arrive the same way, so one
   * rule catches both and nothing new has to remember to register itself. The label is
   * set by whoever is about to make the change; anything that arrives without one came
   * from the agent, because that is the only path that does not go through `commit`.
   */
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const checkpointId = useRef(1);
  const previousSpec = useRef(spec);
  const pendingLabel = useRef<string | null>(null);
  const reverting = useRef(false);

  useEffect(() => {
    if (previousSpec.current === spec) return;
    const before = previousSpec.current;
    previousSpec.current = spec;

    // Reverting is not itself an event worth recording; it would put a checkpoint on
    // the list for every attempt to get off the list.
    if (reverting.current) {
      reverting.current = false;
      pendingLabel.current = null;
      return;
    }

    const label = pendingLabel.current ?? 'Change from the agent';
    pendingLabel.current = null;
    setCheckpoints((list) => [
      ...list.slice(-19),
      {
        id: checkpointId.current++,
        label,
        spec: before,
        afterMessage: messages.length - 1,
        at: Date.now(),
      },
    ]);
  }, [spec, messages.length]);

  const revertTo = useCallback(
    (checkpoint: Checkpoint) => {
      reverting.current = true;
      past.current = [...past.current.slice(-39), spec];
      setDepth({ back: past.current.length, forward: future.current.length });
      onSpecChange(checkpoint.spec);
      // Everything from here on describes a film that no longer exists.
      setCheckpoints((list) => list.filter((c) => c.id < checkpoint.id));
    },
    [spec, onSpecChange],
  );

  // The shortcuts everybody already has in their fingers.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return;
      // Never steal the shortcut from a field somebody is typing in.
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  /*
   * The panel is out or away depending on how you got here.
   *
   * Coming from the conversation it is out: you were mid-sentence with the assistant a
   * moment ago, and the thread that produced this film is the obvious next thing to
   * reach for. Coming from Projects it is away: you came to watch something you already
   * made, and a third of the screen given to an empty "tell me what to change" box is in
   * the way of the one thing you asked for.
   *
   * Synced on the video rather than only at mount, because the editor is not remounted
   * when you switch films inside it — without this, the decision would be made once and
   * then be wrong for every video opened after.
   */
  const [panelOpen, setPanelOpen] = useState(openPanel);
  useEffect(() => setPanelOpen(openPanel), [video.id, openPanel]);

  /*
   * A reply opens the panel that holds it.
   *
   * The panel starts closed so a finished video is not hidden behind an empty chat box.
   * But a reply arriving into a panel nobody can see is worse than the original problem
   * — the assistant would be answering into the void. So anything new in the thread
   * brings it back.
   */
  const seen = useRef(messages.length);
  useEffect(() => {
    if (messages.length > seen.current) setPanelOpen(true);
    seen.current = messages.length;
  }, [messages.length]);
  const [selected, setSelected] = useState(0);
  const [frame, setFrame] = useState(0);
  const [seek, setSeek] = useState<SeekRequest | null>(null);
  const [playing, setPlaying] = useState(autoplay);


/**
 * The direction, in two words.
 *
 * The inspector spelled it out — "Product-led — the interface carries it" — which is the
 * right length for a card of its own and far too long for a line of header meta beside a
 * running time. The reasoning is in the conversation; this just names the choice.
 */
const DIRECTION_SHORT: Record<VideoStyle, string> = {
  'product-led': 'Product-led',
  typographic: 'Typographic',
  'camera-led': 'Camera-led',
};
  /**
   * How long the selected clip is actually on screen.
   *
   * Not its own `duration`: scenes overlap by a crossfade, so a clip's share of the film
   * is the gap until the next one starts. The timeline works it out the same way, and
   * two different numbers for one clip — one on the strip, one in the panel under it —
   * would be worse than no number at all.
   */
  /** What the selected clip is called, for its header and for every change label. */
  const sceneName = LABELS[spec.scenes[selected]?.kind ?? 'title'];

  // A scene can disappear under the selection when one is deleted.
  useEffect(() => {
    if (selected >= spec.scenes.length) setSelected(Math.max(spec.scenes.length - 1, 0));
  }, [spec.scenes.length, selected]);

  // Switching to a different video is a change of subject, not a change of app. Reset
  // what belongs to the old video and leave everything else where it was, so the
  // editor never feels like it reloaded.
  useEffect(() => {
    setSelected(0);
    setFrame(0);
    setSeek({ frame: 0, id: Date.now() });
    setPlaying(autoplay);
  }, [video.id, autoplay]);

  const composition = useMemo(
    () => buildComposition(spec, () => <GeneratedVideo spec={spec} />),
    [spec],
  );

  // A seek is a one-shot instruction, so it carries an id: clicking the same clip
  // twice has to jump both times, where sending the bare number would look unchanged
  // the second time and be ignored.
  const seekId = useRef(0);
  const requestSeek = useCallback((target: number) => {
    seekId.current += 1;
    setSeek({ frame: target, id: seekId.current });
    // Somebody who just clicked a specific moment wants to look at it, not watch it
    // slide away.
    setPlaying(false);
  }, []);

  const rendering = exportState.status === 'rendering';
  const progress = rendering ? exportState.done / Math.max(exportState.total, 1) : 0;

  return (
    <div className="editor">
      {/* ================= Header ================= */}
      <header className="editor__head">
        <button className="editor__back" onClick={onBack} title="Back to your videos">
          <Icon name="arrowRight" size={16} />
        </button>

        {/* The title is a switcher. Somebody comparing two versions of a video should
            not have to leave the editor and come back in to see the other one. */}
        <VideoSwitcher
          video={video}
          recents={recents}
          onOpen={onOpenVideo}
          onNew={onNew}
          /*
           * The film's facts, on one line.
           *
           * It read "1920×1080 · 12.4s · 5 scenes · Northwind" once, which is everything
           * the editor knows rather than anything the person needs. It is now the three
           * that describe the film rather than the file: how long it runs, the direction
           * it was made in, and whose it is. The direction moved here from the top of
           * every scene, where it was repeating itself once per clip.
           */
          meta={[
            `${specSeconds(spec).toFixed(1)}s`,
            spec.style ? DIRECTION_SHORT[spec.style] : undefined,
            spec.brandName,
          ]
            .filter(Boolean)
            .join(' · ')}
        />

        {/*
          Film-level controls, as icons.

          This bar carried a four-way tone switch and a three-way format switch spelled
          out in full, which made the row above a video busier than the video. Anything
          with a handful of choices is now one icon that opens them — the house pattern,
          and the one that keeps the bar the same size however many capabilities arrive
          later.
        */}
        <div className="editor__film">
          <button
            className="icon-btn"
            onClick={undo}
            disabled={depth.back === 0}
            title="Undo (Ctrl+Z)"
          >
            <Icon name="undo" size={15} />
          </button>
          <button
            className="icon-btn"
            onClick={redo}
            disabled={depth.forward === 0}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Icon name="redo" size={15} />
          </button>

          <span className="editor__divider" />

          <IconMenu
            icon="reframe"
            label="Shape"
            active={spec.format}
            choices={FORMAT_CHOICES}
            onChoose={(value) => {
              const next = value as FormatName;
              commit(setFormat(spec, next), `Shape \u2192 ${RATIOS[next]}`);
            }}
          />

          {/*
            Tone changes type scale, weight, alignment, pacing and how hard the motion
            snaps — the single biggest lever on whether two videos look like different
            films. Worth keeping; not worth four words of chrome at rest.
          */}
          <IconMenu
            icon="palette"
            label="Look"
            active={spec.tone}
            choices={TONE_CHOICES}
            onChoose={(value) => commit({ ...spec, tone: value as Tone }, `Tone \u2192 ${value}`)}
          />
        </div>


        {/*
          The handle for a panel that is not always wanted.
          It used to be out on arrival whichever way you came in, so opening a finished
          video from Projects gave a third of the screen to an empty "Tell me what to
          change" box with the film squeezed into the rest. Nobody opens a project to
          look at a blank chat. It now follows how you got here (see `openPanel`), and
          this is the way back to it either way — plus it opens by itself the moment a
          reply arrives, so an answer is never hidden behind a button.
        */}
        <button
          className={`editor__panel-toggle ${panelOpen ? 'is-active' : ''}`}
          onClick={() => setPanelOpen((v) => !v)}
          title={panelOpen ? 'Hide the conversation' : 'Ask for a change'}
        >
          <Icon name="sparkle" size={15} />
          Agent
        </button>

        <button className="btn btn--primary editor__export" onClick={onExport} disabled={rendering}>
          {rendering ? (
            <>
              <span className="btn__spinner" />
              {Math.round(progress * 100)}%
            </>
          ) : (
            <>
              <Icon name="download" size={15} />
              Export
            </>
          )}
        </button>
      </header>

      {/* ================= Body: panel left, video right ================= */}
      <div className={`editor__body ${panelOpen ? "" : "editor__body--solo"}`}>
        {panelOpen && (
        <aside className="editor__panel">
          <div className="editor__panel-head">
            <Icon name="sparkle" size={14} />
            Agent
            {checkpoints.length > 0 && (
              <em>
                {checkpoints.length} change{checkpoints.length === 1 ? '' : 's'}
              </em>
            )}
          </div>
          {/*
            One job: the conversation.
            It used to be two tabs — "Ask" and "Edit title" — which made asking and
            editing rivals for the same space, so neither read as the main way to work
            and choosing one hid the other. They are not rivals: asking is how you
            change the film, and the fields are how you adjust one shot of it. The
            fields have gone to live under the clip they belong to.
          */}
          <EditChat
            messages={messages}
            busy={busy}
            onAsk={onAsk}
            checkpoints={checkpoints}
            onRevert={revertTo}
          />
        </aside>
        )}

        <section className="editor__main">
          <div className="editor__stage">
            <Player
              key={`${spec.format}-${composition.durationInFrames}`}
              composition={composition}
              loop
              hideControls
              playing={playing}
              onPlayingChange={setPlaying}
              onFrame={setFrame}
              seek={seek}
            />
          </div>

          {/*
            The strip, and one icon holding everything you can do to the clip on it.

            The fields that used to sit under here are gone. They were a second editor
            competing with the first — the whole screen below the video was a form, and
            the thing the form described was squeezed into what was left. Changing a
            headline is a sentence to the agent, which is the point of having one.

            What remains are the operations no sentence makes quicker: reorder, copy,
            remove, add. One icon, options inside, same as everything else in the bar.
          */}
          <div className="editor__dock">
            <Timeline
              spec={spec}
              frame={frame}
              selected={selected}
              onSelect={setSelected}
              onSeek={requestSeek}
              playing={playing}
              onTogglePlay={() => setPlaying((p) => !p)}
            />

            <IconMenu
              icon="layers"
              drop="up"
              label={`${sceneName} — scene ${selected + 1} of ${spec.scenes.length}`}
              choices={[
                { value: 'earlier', label: 'Move earlier', icon: 'arrowUp', disabled: selected === 0 },
                {
                  value: 'later',
                  label: 'Move later',
                  icon: 'arrowRight',
                  disabled: selected >= spec.scenes.length - 1,
                },
                { value: 'duplicate', label: `Duplicate ${sceneName.toLowerCase()}`, icon: 'copy' },
                { value: 'add', label: 'Add a scene after', icon: 'plus' },
                {
                  value: 'delete',
                  label: `Delete ${sceneName.toLowerCase()}`,
                  icon: 'trash',
                  danger: true,
                  disabled: spec.scenes.length <= 1,
                },
              ]}
              onChoose={(value) => {
                if (value === 'earlier') {
                  commit(moveScene(spec, selected, selected - 1), `Moved ${sceneName} earlier`);
                  setSelected(Math.max(selected - 1, 0));
                } else if (value === 'later') {
                  commit(moveScene(spec, selected, selected + 1), `Moved ${sceneName} later`);
                  setSelected(Math.min(selected + 1, spec.scenes.length - 1));
                } else if (value === 'duplicate') {
                  commit(duplicateScene(spec, selected), `Duplicated ${sceneName}`);
                } else if (value === 'add') {
                  commit(addScene(spec, 'bigword', selected + 1), 'Added big words');
                  setSelected(selected + 1);
                } else if (value === 'delete') {
                  commit(removeScene(spec, selected), `Deleted ${sceneName}`);
                  setSelected(Math.max(selected - 1, 0));
                }
              }}
            />
          </div>
        </section>
      </div>

      {/* ================= Export ================= */}
      {rendering && (
        <div className="render-bar">
          <div className="render-bar__fill" style={{ width: `${progress * 100}%` }} />
          <div className="render-bar__text">
            <Icon name="layers" size={14} />
            <span>
              Rendering frame {exportState.done} of {exportState.total}
            </span>
            <em>{Math.round(progress * 100)}%</em>
          </div>
        </div>
      )}

      {(exportState.status === 'done' || exportState.status === 'error') && (
        <div className="toast">
          <Icon name={exportState.status === 'done' ? 'check' : 'layers'} size={16} />
          <div>
            {exportState.status === 'done' ? (
              <>
                <strong>Saved {exportState.filename}</strong>
                <span>Check your downloads — that is a real MP4.</span>
              </>
            ) : (
              <>
                <strong>Render failed.</strong>
                <span>{exportState.message}</span>
              </>
            )}
          </div>
          <button onClick={onDismissExport} aria-label="Dismiss">
            <Icon name="close" size={15} />
          </button>
        </div>
      )}
    </div>
  );
};

/* ---------- switching videos without leaving ---------- */

const VideoSwitcher = ({
  video,
  recents,
  meta,
  onOpen,
  onNew,
}: {
  video: Video;
  recents: Video[];
  meta: string;
  onOpen: (id: string) => void;
  onNew: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const others = recents.filter((v) => v.id !== video.id);

  return (
    <div className="editor__switcher" ref={ref}>
      <button className="editor__title" onClick={() => setOpen((o) => !o)}>
        <span className="editor__title-row">
          <h1>{video.title}</h1>
          <Icon name="chevronRight" size={14} />
        </span>
        <span>{meta}</span>
      </button>

      {open && (
        <div className="menu editor__switcher-menu">
          {others.length === 0 ? (
            <p className="menu__empty">This is your only video so far.</p>
          ) : (
            others.map((other) => (
              <button
                key={other.id}
                className="menu__item"
                onClick={() => {
                  onOpen(other.id);
                  setOpen(false);
                }}
              >
                <span className="menu__text">
                  <span
                    className="menu__swatch"
                    style={{ background: other.spec.palette.accent }}
                  />
                  {other.title}
                </span>
              </button>
            ))
          )}

          <span className="menu__rule" />
          <button
            className="menu__item"
            onClick={() => {
              onNew();
              setOpen(false);
            }}
          >
            <span className="menu__text">
              <Icon name="plus" size={13} />
              New video
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

/* ---------- the conversation ---------- */

/** Openers, shown only on an empty thread. Nobody knows what to type first. */
const SUGGESTIONS = [
  'Make it punchier',
  'Shorter',
  'Try a bolder look',
  'Add a closing card',
];

const EditChat = ({
  checkpoints,
  onRevert,
  messages,
  busy,
  onAsk,
}: {
  messages: EditMessage[];
  checkpoints: Checkpoint[];
  onRevert: (checkpoint: Checkpoint) => void;
  busy?: boolean;
  onAsk: (text: string) => void;
}) => {
  const [value, setValue] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /*
   * Follow the reply as it reveals, not only when it arrives.
   *
   * A reply that grows word by word grows *downwards*, so a thread scrolled once at the
   * start ends up looking at the top of a message whose end is off screen. Scrolling on
   * each tick keeps the newest words in view, which is the whole reason to reveal them
   * in reading order.
   */
  /*
   * Scroll the container, and only when the person is already at the bottom.
   *
   * Three separate problems with the old one-liner, all of which showed up as "the chat
   * doesn't scroll down":
   *
   *   `scrollIntoView` walks up to whichever ancestor happens to scroll, which is not
   *   reliably the thread — and on mount, before layout has settled, it frequently did
   *   nothing at all. Setting `scrollTop` on the element we mean is unambiguous.
   *
   *   `behavior: 'smooth'` cannot finish before the next reveal tick fires, so during a
   *   streaming reply every tick restarted an animation that never arrived. The reveal
   *   jumps; the first paint of an existing thread jumps.
   *
   *   And it pulled you to the bottom unconditionally, so scrolling up to re-read
   *   something while a reply was arriving yanked you back down mid-sentence.
   */
  const threadRef = useRef<HTMLDivElement>(null);
  const stuckToBottom = useRef(true);

  const atBottom = () => {
    const el = threadRef.current;
    if (!el) return true;
    // A little slack: "close enough to the bottom" is what people mean by at the bottom.
    return el.scrollHeight - el.scrollTop - el.clientHeight < 48;
  };

  const scrollToEnd = useCallback((force = false) => {
    const el = threadRef.current;
    if (!el) return;
    if (!force && !stuckToBottom.current) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  // A new message always wins: sending one is an explicit request to see what comes back.
  useEffect(() => {
    stuckToBottom.current = true;
    scrollToEnd(true);
  }, [messages.length, scrollToEnd]);

  // Opening a video lands at the newest message, with no animation to miss. Keyed on
  // mount rather than on the video id, because this panel is remounted per video.
  useEffect(() => {
    requestAnimationFrame(() => scrollToEnd(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 130)}px`;
  }, [value]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    onAsk(trimmed);
    setValue('');
    // Focus survives the send, the same as in the composer on the new-video page. A
    // conversation you have to click back into before every message is not one.
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <div className="edit-chat">
      <div
        className="edit-chat__thread scroll-bare"
        ref={threadRef}
        /* Remember whether they are following along, so a reply never drags them away
           from something they scrolled back to read. */
        onScroll={() => { stuckToBottom.current = atBottom(); }}
      >
        {messages.length === 0 && checkpoints.length === 0 ? (
          <div className="edit-chat__intro">
            <p>Tell me what to change and I'll change it.</p>
            <div className="edit-chat__suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} disabled={busy}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/*
              Anything that happened before the first message, which is everything when
              somebody opens a finished video and starts moving clips around without
              saying a word.
            */}
            {checkpoints
              .filter((c) => c.afterMessage < 0)
              .map((c) => (
                <CheckpointCard key={c.id} checkpoint={c} onRevert={() => onRevert(c)} />
              ))}

            {messages.map((message, i) => (
              <Fragment key={i}>
                <div
                  className={`edit-bubble edit-bubble--${message.role} ${message.thinking ? 'is-thinking' : ''}`}
                >
                  {message.thinking ? (
                    <Thinking kind="editing" />
                  ) : message.role === 'assistant' && i === messages.length - 1 ? (
                    <Streamed text={message.content} onTick={() => scrollToEnd()} />
                  ) : (
                    <Markdown className="md" text={message.content} />
                  )}
                </div>

                {/* The same row as the main thread: copy it, or tell us it was wrong. */}
                {message.role === 'assistant' && !message.thinking && (
                  <MessageActions text={message.content} />
                )}

                {/* What that message changed, immediately under it. */}
                {checkpoints
                  .filter((c) => c.afterMessage === i)
                  .map((c) => (
                    <CheckpointCard key={c.id} checkpoint={c} onRevert={() => onRevert(c)} />
                  ))}
              </Fragment>
            ))}
          </>
        )}
        <div ref={endRef} />
      </div>

      <div className="edit-chat__composer">
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send(value);
            }
          }}
          placeholder="Ask for a change…"
          rows={1}
          /* Never disabled, for the same reason as the composer on the new-video page:
             disabling a focused control blurs it, and nothing ever gives the focus back. */
        />
        <button onClick={() => send(value)} disabled={!value.trim() || busy} aria-label="Send">
          {busy ? <span className="prompt__spinner" /> : <Icon name="arrowUp" size={16} />}
        </button>
      </div>
    </div>
  );
};

/**
 * One change, with a way back to before it.
 *
 * Shaped as a card rather than a bubble because it is not something anybody said — it is
 * a thing that happened, and the two should not look alike in a transcript. The revert
 * button stays quiet until the card is hovered or focused: it is an escape hatch, and an
 * escape hatch that shouts competes with the conversation it is sitting in.
 */
const CheckpointCard = ({
  checkpoint,
  onRevert,
}: {
  checkpoint: Checkpoint;
  onRevert: () => void;
}) => (
  <div className="ck">
    <span className="ck__tick">
      <Icon name="check" size={11} />
    </span>
    <span className="ck__label">{checkpoint.label}</span>
    <span className="ck__time">{shortTime(checkpoint.at)}</span>
    <button className="ck__revert" onClick={onRevert} title="Put the film back to before this">
      <Icon name="undo" size={12} />
      Revert
    </button>
  </div>
);

/** "just now", then minutes. A checkpoint older than an hour is ancient history here. */
const shortTime = (at: number): string => {
  const seconds = Math.floor((Date.now() - at) / 1000);
  if (seconds < 50) return 'just now';
  const minutes = Math.round(seconds / 60);
  return minutes < 60 ? `${minutes}m ago` : `${Math.round(minutes / 60)}h ago`;
};

/* ---------- add scene ---------- */

const LABELS: Record<SceneKind, string> = {
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

const RATIOS: Record<FormatName, string> = {
  landscape: '16:9',
  vertical: '9:16',
  square: '1:1',
};

/** The three shapes, with what each one is for. */
const FORMAT_CHOICES = [
  { value: 'landscape', label: '16:9', hint: 'Landscape — sites, email, YouTube' },
  { value: 'vertical', label: '9:16', hint: 'Vertical — stories, Reels, TikTok' },
  { value: 'square', label: '1:1', hint: 'Square — feeds' },
];

/**
 * The four looks.
 *
 * The hints are the whole point of hiding these behind an icon: the segmented control
 * had room for the name and nothing else, so "editorial" and "kinetic" were picked by
 * guesswork or not at all. A menu has room to say what they do.
 */
const TONE_CHOICES = [
  { value: 'clean', label: 'Clean', hint: 'Calm, centred, generous space' },
  { value: 'bold', label: 'Bold', hint: 'Heavy type, tight tracking, hard cuts' },
  { value: 'editorial', label: 'Editorial', hint: 'Left-aligned, slower, considered' },
  { value: 'kinetic', label: 'Kinetic', hint: 'Big words, quick cuts, scale-driven' },
];
