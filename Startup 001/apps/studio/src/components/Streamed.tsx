import { Markdown } from './Markdown';
import { useEffect, useRef, useState } from 'react';

/**
 * Text that arrives a word at a time.
 *
 * Honest about what this is: the whole reply has already been received, and this reveals
 * it progressively. It is a presentation choice, not network streaming — the words are
 * not arriving from the model as you watch them.
 *
 * It is still worth doing, for a reason that has nothing to do with pretending. A block
 * of text that appears all at once has to be *found* before it can be read: the eye
 * lands somewhere in the middle and works outwards. Text that arrives in reading order
 * puts the eye at the first word and keeps it moving, so a long reply feels shorter than
 * the same reply pasted in. It also gives the interface somewhere to put the pause that
 * a conversation needs, instead of snapping from silence to a wall of words.
 *
 * The pace is set by a total budget rather than a fixed delay per word. A per-word delay
 * is fine for one sentence and unbearable for a paragraph — the reply everyone is most
 * impatient with would be the one made slowest. This finishes in about the same time
 * whatever the length, and long replies simply reveal several words per tick.
 */

type Props = {
  text: string;
  /** Roughly how long the whole reveal should take, in milliseconds. */
  budget?: number;
  /** Told when the last word lands, so a scroller can follow along. */
  onTick?: () => void;
};

/** How often a new chunk appears. ~24fps: smooth enough to read as typing. */
const TICK = 42;

export const Streamed = ({ text, budget = 900, onTick }: Props) => {
  const [shown, setShown] = useState(0);

  // Keeping the words split in a ref means a re-render from the parent does not restart
  // a reveal that is already halfway through.
  const words = useRef<string[]>([]);
  const source = useRef('');
  if (source.current !== text) {
    source.current = text;
    words.current = text.split(/(\s+)/);
  }

  useEffect(() => {
    const total = words.current.length;
    if (total === 0) return;

    // How many words per tick to land inside the budget. At least one, or a long reply
    // would never finish.
    const ticks = Math.max(Math.round(budget / TICK), 1);
    const perTick = Math.max(Math.ceil(total / ticks), 1);

    setShown(0);
    let count = 0;
    const timer = setInterval(() => {
      count += perTick;
      setShown(count);
      onTick?.();
      if (count >= total) clearInterval(timer);
    }, TICK);

    return () => clearInterval(timer);
    // Deliberately keyed on the text alone: `onTick` is usually an inline function, and
    // depending on it would restart the reveal on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, budget]);

  const done = shown >= words.current.length;

  /*
   * Rendered as Markdown, including halfway through.
   *
   * Partial Markdown is safe to render: an opening `**` with no closing one is simply
   * two asterisks until the rest arrives, and a list grows an item at a time. The
   * alternative — plain text while revealing, then a reformat at the end — makes the
   * whole reply jump as it lands, which is worse than a momentary asterisk.
   */
  return (
    <Markdown
      className="md"
      text={words.current.slice(0, shown).join('')}
      /*
        A caret while there is more to come. It is the difference between a reply that is
        still arriving and one that stopped early — without it, a pause mid-reveal is
        indistinguishable from a truncated answer.
      */
      trailing={!done ? <span className="streamed__caret" aria-hidden="true" /> : undefined}
    />
  );
};
