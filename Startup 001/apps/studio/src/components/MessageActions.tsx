import { useState } from 'react';
import { Icon } from './Icon';
import './message-actions.css';

/**
 * What you can do with a reply once it has arrived.
 *
 * Copy, and a verdict. Deliberately only three: the row sits under every assistant
 * message in the thread, so anything added here is added dozens of times down the page —
 * and a row of six faint icons under each paragraph is noise whatever the icons do.
 *
 * Shown on hover, and always once something has been pressed, so a thread you are
 * reading stays a thread you are reading.
 */
export const MessageActions = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const [vote, setVote] = useState<'up' | 'down' | null>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      // Long enough to read, short enough that it is gone before the next reply.
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // A browser that refuses the clipboard is not worth an error dialog over.
    }
  };

  return (
    <div className={`acts ${vote ? 'is-set' : ''}`}>
      <button className={`acts__btn ${copied ? 'is-done' : ''}`} onClick={copy} title="Copy">
        <Icon name={copied ? 'check' : 'copy'} size={13} />
        {copied && <span>Copied</span>}
      </button>
      <button
        className={`acts__btn ${vote === 'up' ? 'is-on' : ''}`}
        onClick={() => setVote((v) => (v === 'up' ? null : 'up'))}
        title="Good answer"
        aria-pressed={vote === 'up'}
      >
        <ThumbIcon />
      </button>
      <button
        className={`acts__btn acts__btn--down ${vote === 'down' ? 'is-on' : ''}`}
        onClick={() => setVote((v) => (v === 'down' ? null : 'down'))}
        title="Bad answer"
        aria-pressed={vote === 'down'}
      >
        <ThumbIcon />
      </button>
    </div>
  );
};

/* One glyph, flipped for the other verdict — two drawings of the same hand would never
   quite match, and a mismatched pair is more noticeable than either icon alone. */
const ThumbIcon = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 21V10l4.5-7a2 2 0 0 1 3 2.3L13.5 9H19a2 2 0 0 1 2 2.4l-1.4 7A2 2 0 0 1 17.6 20H7Z" />
    <path d="M7 10H4a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3" />
  </svg>
);