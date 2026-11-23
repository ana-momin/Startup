import { useEffect, useState } from 'react';
import './thinking.css';

/**
 * What the assistant is doing while you wait.
 *
 * Three dots tell you something is happening. Naming the step tells you what — and the
 * difference is not cosmetic: a request that silently takes four seconds feels broken,
 * and the same four seconds narrated feels like work being done.
 *
 * The steps are honest about the real pipeline rather than invented filler: it reads
 * the request, plans the scenes, writes the copy, picks the palette. Somebody waiting
 * is being told the truth in the order it happens.
 */

const PLANNING = [
  'Reading what you asked for',
  'Working out the shape',
  'Writing the copy',
  'Choosing the look',
  'Timing the scenes',
];

const EDITING = [
  'Reading the current video',
  'Working out what to change',
  'Rewriting that part',
  'Checking the rest still fits',
];

export type ThinkingKind = 'planning' | 'editing';

/**
 * Steps advance on a timer rather than on real progress, because the server does the
 * whole job in one call and has nothing to report mid-way. The pacing is set to a
 * typical response so the last step is usually still showing when the answer lands —
 * a progress display that finishes before the work does is worse than none.
 */
export const Thinking = ({ kind = 'planning' }: { kind?: ThinkingKind }) => {
  const steps = kind === 'editing' ? EDITING : PLANNING;
  const [step, setStep] = useState(0);

  useEffect(() => {
    setStep(0);
    const timer = window.setInterval(() => {
      // Hold on the last one rather than looping. Looping would suggest it had started
      // over, which is the opposite of reassuring.
      setStep((s) => Math.min(s + 1, steps.length - 1));
    }, 1400);

    return () => window.clearInterval(timer);
  }, [steps.length]);

  return (
    <span className="thinking">
      <span className="thinking__dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span key={step} className="thinking__label">
        {steps[step]}
      </span>
    </span>
  );
};
