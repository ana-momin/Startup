import { useEffect, useRef, useState } from 'react';
import { Streamed } from '@/components/Streamed';
import { Markdown } from '@/components/Markdown';
import { MessageActions } from '@/components/MessageActions';
import { BrandMark } from '@/components/BrandMark';
import { Icon } from '@/components/Icon';
import { PromptBar } from '@/components/PromptBar';
import type { BrandOption, PromptOptions } from '@/components/PromptBar';
import { Thinking } from '@/components/Thinking';
import './chat.css';

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  /** Shown while the assistant is still thinking. */
  thinking?: boolean;
};

/** What we are about to make, waiting for a yes. */
export type Pending = {
  summary: string;
  /** The shape of the film, shown before it is built. */
  plan?: string[];
  brief: string;
  brand?: { name: string; color?: string; logoId?: string; mode?: 'dark' | 'light' };
};

type Props = {
  messages: ChatMessage[];
  busy: boolean;
  onSend: (text: string, options: PromptOptions) => void;
  brands?: BrandOption[];
  activeBrandId?: string | null;
  onSelectBrand?: (id: string | null) => void;
  onCreateBrand?: () => void;
  /** Set when the assistant has enough and is waiting for a yes. */
  pending?: Pending | null;
  onConfirm?: () => void;
  onCancelPending?: () => void;
  /** Who is signed in, for the greeting. Absent until they sign in. */
  userName?: string;
};

/**
 * The line above the box.
 *
 * It used to be a fixed heading and a sentence of instruction underneath — two pieces of
 * text saying one thing, and the second one explaining the first. Nobody needs to be told
 * to describe the video on a page whose only control is a box that says "describe the
 * video". Cutting it leaves the mark, one line, and the box.
 *
 * Written as openings without their question mark so the name can be dropped in as a
 * vocative: "What are we making" becomes "What are we making, Anas?" when we know who is
 * there and "What are we making?" when we do not. One pool, both cases, no line written
 * twice.
 *
 * Short on purpose. Anything longer than about five words stops being a greeting and
 * starts being a brief, and the person has not said anything yet.
 */
const GREETINGS = [
  'What are we making',
  'What should we make',
  'What are we launching',
  "What's the story",
  "What's the big idea",
  'What are we announcing',
  "What's worth watching",
  'What are we shipping',
  "What's on screen today",
  'What are we selling',
  "What's the film",
  'What are we showing off',
];

/**
 * One greeting, chosen once per visit.
 *
 * Picked in a `useState` initialiser rather than during render, because a line that
 * changed every time React re-rendered — on each keystroke in the box below it — would
 * be a flicker, not a welcome. It changes on reload, which is the whole point, and holds
 * still while you are reading it.
 */
const useGreeting = (name?: string): string => {
  const [line] = useState(() => GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);

  // First name only. "What are we making, Anas Khan?" is a summons, not a hello.
  const first = name?.trim().split(/\s+/)[0];
  return first ? `${line}, ${first}?` : `${line}?`;
};

/**
 * The conversation.
 *
 * Before the first message this is the start screen: a mark, a question and a box,
 * optically centred. There is no separate landing page to keep in sync.
 *
 * The controls under the box stay put once the conversation starts. They used to
 * disappear after the first message, which meant saying "hi" lost your brand selection
 * and your format — settings vanishing because you typed is never right.
 */
export const Chat = ({
  messages,
  busy,
  onSend,
  brands,
  activeBrandId,
  onSelectBrand,
  onCreateBrand,
  pending,
  onConfirm,
  onCancelPending,
  userName,
}: Props) => {
  const endRef = useRef<HTMLDivElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  /*
   * Follow the conversation as it grows — by scrolling the thread, not by asking the
   * browser to find it.
   *
   * `scrollIntoView` walks up to whichever ancestor happens to scroll, and with a smooth
   * behaviour it cannot finish before the next reveal tick restarts it. The confirmation
   * card is the worst case: it is the tallest thing in the thread and it appears last,
   * so if the scroll does not land, the one element the person needs is the one off
   * screen. Setting `scrollTop` on the element we mean always lands.
   *
   * Two frames of delay because the card animates in — measuring before it has its
   * height scrolls to where the bottom used to be.
   */
  useEffect(() => {
    const el = threadRef.current;
    if (!el) return;
    const scroll = () => { el.scrollTop = el.scrollHeight; };
    scroll();
    const raf = requestAnimationFrame(() => requestAnimationFrame(scroll));
    const settle = setTimeout(scroll, 320);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(settle);
    };
  }, [messages, pending]);

  const greeting = useGreeting(userName);

  const empty = messages.length === 0;

  return (
    <div className={`chat ${empty ? 'chat--empty' : ''}`}>
      {empty ? (
        <div className="chat__intro">
          <h1 className="chat__title rise">
            <Icon name="logo" size={40} />
            <span>{greeting}</span>
          </h1>
        </div>
      ) : (
        <div className="chat__thread scroll-bare" ref={threadRef}>
          {messages.map((message, i) => (
            <div key={i} className={`bubble bubble--${message.role}`}>
              {message.role === 'assistant' && (
                <span className="bubble__avatar">
                  <Icon name="logo" size={14} />
                </span>
              )}
              <div className="bubble__stack">
              <div className={`bubble__body ${message.thinking ? 'is-thinking' : ''}`}>
                {message.thinking ? (
                  <Thinking kind="planning" />
                ) : message.role === 'assistant' && i === messages.length - 1 ? (
                  /* Only the newest reply is revealed. Replaying the whole thread every
                     time the panel re-renders would be a nervous tic, not a feature. */
                  <Streamed text={message.content} />
                ) : (
                  /* Older replies render straight away, same formatting, no reveal. */
                  <Markdown className="md" text={message.content} />
                )}
              </div>

              {/* Only on a finished assistant reply: there is nothing to copy or judge
                  while it is still thinking, and a user's own message needs neither. */}
              {message.role === 'assistant' && !message.thinking && (
                <MessageActions text={message.content} />
              )}
              </div>
            </div>
          ))}

          {pending && (
            <Confirmation
              pending={pending}
              busy={busy}
              onConfirm={onConfirm}
              onCancel={onCancelPending}
            />
          )}

          {/*
            A real spacer, not a zero-height marker.

            Chrome does not reliably include a scroll container's bottom padding in its
            scrollHeight, so the last element ends up flush against the bottom edge and
            looks clipped even when it is whole. An element with actual height is the one
            way to guarantee the breathing room, and this marker was already here.
          */}
          <div ref={endRef} style={{ flexShrink: 0, height: 10 }} />
        </div>
      )}

      <div className={`chat__composer ${empty ? 'rise d3' : ''}`}>
        <PromptBar
          onSubmit={onSend}
          busy={busy}
          autoFocus
          placeholder={empty ? 'Describe the video you want…' : 'Add anything else…'}
          brands={brands}
          activeBrandId={activeBrandId}
          onSelectBrand={onSelectBrand}
          onCreateBrand={onCreateBrand}
        />
      </div>
    </div>
  );
};

/* ---------- the confirmation ---------- */

/**
 * What is about to be made, and a button.
 *
 * Shaped as a small card rather than another chat bubble: it is a decision point, and a
 * decision that looks like conversation gets scrolled past.
 *
 * It had grown into a form — an icon in a chip, a label, a summary, five numbered beats
 * on a ruled list, a brand row explaining what a brand kit is, a swatch repeating the
 * colour already shown in the mark, then two buttons. Nine pieces of information for one
 * yes-or-no, and the summary, which is the only line anybody actually reads before
 * deciding, was the fourth thing down.
 *
 * Now there is the sentence, one quiet line of facts, and the choice. The shot list has
 * not gone anywhere — it is behind the scene count, because it matters enormously to the
 * one person in ten who wants to check it and is noise to the nine who do not.
 */
const Confirmation = ({
  pending,
  busy,
  onConfirm,
  onCancel,
}: {
  pending: Pending;
  busy: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}) => {
  const [showPlan, setShowPlan] = useState(false);
  const beats = pending.plan ?? [];

  return (
    <div className="confirm">
      <p className="confirm__summary">{pending.summary}</p>

      {/*
        One line of facts, under the sentence they belong to.

        The brand used to have its own bordered row with a caption reading "Its colours,
        logo and voice" — a definition of what a brand kit is, shown to somebody who
        built one. The mark and the name say it.
      */}
      <div className="confirm__meta">
        {pending.brand && (
          <span className="confirm__brand">
            <BrandMark
              name={pending.brand.name}
              logoId={pending.brand.logoId}
              color={pending.brand.color}
              mode={pending.brand.mode}
              size={18}
            />
            {pending.brand.name}
          </span>
        )}

        {beats.length > 0 && (
          <>
            {pending.brand && <span className="confirm__sep">·</span>}
            {/*
              The shot list, one click away.

              This is the last moment a misunderstanding is free — after this there is a
              render, and once somebody has watched a video being made they argue with it
              far less than they would have argued with four lines of text. So it stays.
              But it is a check, not a briefing, and a check that is always open is just
              more to read.
            */}
            <button
              className={`confirm__peek ${showPlan ? 'is-open' : ''}`}
              onClick={() => setShowPlan((v) => !v)}
              aria-expanded={showPlan}
            >
              {beats.length} scenes
              <Icon name="chevronRight" size={13} />
            </button>
          </>
        )}
      </div>

      {/* Numbered, because the order is the point: a plan is a sequence, and three beats
          in the wrong order is a different film from the same three beats. */}
      {showPlan && (
        <ol className="confirm__plan">
          {beats.map((beat, i) => (
            <li key={i}>
              <span className="confirm__beat">{i + 1}</span>
              {beat}
            </li>
          ))}
        </ol>
      )}

      <div className="confirm__actions">
        <button className="btn btn--outline" onClick={onCancel} disabled={busy}>
          Change something
        </button>
        <button className="btn btn--primary confirm__go" onClick={onConfirm} disabled={busy}>
          {busy ? (
            <>
              <span className="btn__spinner" />
              Making it
            </>
          ) : (
            <>
              <Icon name="sparkle" size={14} />
              Make it
            </>
          )}
        </button>
      </div>
    </div>
  );
};
