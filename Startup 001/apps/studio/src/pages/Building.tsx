import { useEffect, useMemo, useRef, useState } from 'react';
import './building.css';

/**
 * The moment between asking and getting.
 *
 * This has been three different things. A list of ticked stages. Then the whole editor
 * with a storyboard animating inside the video frame. Both were busy, and both were
 * really the workspace wearing a costume — so arriving at the real workspace afterwards
 * felt like nothing had happened.
 *
 * This is the opposite: everything goes away. One line, centred, on an empty field. It
 * is the only screen in the product with nothing on it, which is exactly why the
 * workspace lands properly when it arrives.
 *
 * The line changes while you wait, and the set it draws from is shuffled per video, so
 * making two films does not show the same four sentences in the same order. The copy is
 * deliberately about THEIR film rather than about our pipeline: nobody waiting for a
 * video wants to be told about scene composition.
 */

export type BuildStage =
  | 'reading'
  | 'direction'
  | 'writing'
  | 'composing'
  | 'rendering'
  | 'done';

/**
 * One word, and it ends in -ing.
 *
 * The lines used to be sentences — "Working out what goes first", "Deciding what to
 * leave out". Each was true and each was four words too many: a wait is not the moment
 * to read, and a sentence that changes every two seconds asks to be read three times.
 *
 * A single present participle does the only job this text has, which is to say that
 * something is happening and it is happening to YOUR film. Shuffled, so two videos in a
 * row never read the same.
 */
const LINES = [
  'Cooking',
  'Thinking',
  'Sketching',
  'Framing',
  'Shaping',
  'Writing',
  'Composing',
  'Timing',
  'Arranging',
  'Cutting',
  'Colouring',
  'Staging',
  'Polishing',
  'Finishing',
];

type Props = {
  /** How far the pipeline has actually got. Only used to know when to hand over. */
  stage: BuildStage;
  /** Why the director chose the direction it chose, once it has. */
  direction?: string;
  onCancel: () => void;
};

/** How long each line sits before the next one. */
const DWELL = 2200;

export const Building = ({ direction, onCancel }: Props) => {
  /*
   * A different order every time.
   *
   * Picked once per mount with a shuffle rather than at random on each tick, so the same
   * line never appears twice in a row and two videos in a row never read the same.
   * "Cooking" is kept first because it is the friendliest thing to see in the half second
   * before anything else happens.
   */
  const lines = useMemo(() => {
    const rest = LINES.slice(1);
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    return [LINES[0], ...rest];
  }, []);

  const [index, setIndex] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    timer.current = setInterval(() => {
      setIndex((i) => (i + 1) % lines.length);
    }, DWELL);
    return () => clearInterval(timer.current);
  }, [lines.length]);

  /*
   * The director's own reason, once it has one, replaces the generic line.
   *
   * It is the one sentence here that is genuinely about their video, so when it arrives
   * it is worth more than anything in the pool — and it is the last thing they see before
   * the workspace opens.
   */
  const line = direction ?? lines[index];

  return (
    <div className="making">
      <p key={line} className="making__line">
        {line}
      </p>

      <span className="making__rule" aria-hidden="true">
        <i />
      </span>

      <button className="making__cancel" onClick={onCancel} type="button">
        Cancel
      </button>
    </div>
  );
};

/**
 * Walk the quiet stages forward on a timer.
 *
 * Kept for the stage value the app still tracks, though the screen no longer shows the
 * stage names — they were about our pipeline rather than their film.
 */
export const useBuildStages = (active: boolean, real: BuildStage): BuildStage => {
  const [walked, setWalked] = useState<BuildStage>('reading');

  useEffect(() => {
    if (!active) {
      setWalked('reading');
      return;
    }
    const order: BuildStage[] = ['reading', 'direction', 'writing', 'composing'];
    const at = [0, 1400, 3200, 6000];
    const timers = order.map((id, i) => setTimeout(() => setWalked(id), at[i]));
    return () => timers.forEach(clearTimeout);
  }, [active]);

  const rank = (s: BuildStage) =>
    ['reading', 'direction', 'writing', 'composing', 'rendering', 'done'].indexOf(s);
  return rank(real) > rank(walked) ? real : walked;
};
