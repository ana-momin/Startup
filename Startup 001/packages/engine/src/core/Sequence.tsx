import type { CSSProperties, ReactNode } from 'react';
import { FrameProvider, useCurrentFrame } from './context';
import { AbsoluteFill } from './layout';

type SequenceProps = {
  /** Frame on the parent timeline where this starts. */
  from?: number;
  /** How many frames it stays on screen. Omit to run to the end. */
  durationInFrames?: number;
  children: ReactNode;
  /** Set false to lay out in normal flow instead of covering the frame. */
  layout?: 'absolute-fill' | 'none';
  style?: CSSProperties;
};

/**
 * Shifts time for its children, and hides them outside their window.
 *
 * This is what turns a pile of animations into a timeline. A Sequence starting at frame
 * 60 tells its children "you are at frame 0" when the video reaches frame 60. So every
 * animation is written starting from zero and can be moved anywhere without touching
 * its internals.
 *
 *   <Sequence from={0}  durationInFrames={90}><TitleScene /></Sequence>
 *   <Sequence from={90} durationInFrames={120}><FeatureScene /></Sequence>
 */
export const Sequence = ({
  from = 0,
  durationInFrames,
  children,
  layout = 'absolute-fill',
  style,
}: SequenceProps) => {
  const parentFrame = useCurrentFrame();
  const localFrame = parentFrame - from;

  // Not started yet.
  if (localFrame < 0) return null;
  // Already finished.
  if (durationInFrames !== undefined && localFrame >= durationInFrames) return null;

  const content =
    layout === 'absolute-fill' ? (
      <AbsoluteFill style={style}>{children}</AbsoluteFill>
    ) : (
      children
    );

  return <FrameProvider value={localFrame}>{content}</FrameProvider>;
};

type SeriesProps = {
  children: ReactNode;
};

type SceneProps = {
  /** Length of this scene in frames. */
  durationInFrames: number;
  children: ReactNode;
  /** Overlap with the previous scene, for crossfades. Negative pulls it earlier. */
  offset?: number;
};

/**
 * Plays scenes one after another without hand-counting start frames.
 *
 * Counting frames by hand is where multi-scene videos usually break — change one
 * scene's length and every later number is wrong. Series does the arithmetic.
 *
 *   <Series>
 *     <Series.Scene durationInFrames={90}><Intro /></Series.Scene>
 *     <Series.Scene durationInFrames={120} offset={-15}><Body /></Series.Scene>
 *   </Series>
 */
export const Series = ({ children }: SeriesProps) => {
  let cursor = 0;

  const scenes = childrenToArray(children).map((child, index) => {
    if (!isSceneElement(child)) {
      throw new Error('<Series> only accepts <Series.Scene> children.');
    }
    const { durationInFrames, offset = 0, children: sceneChildren } = child.props;
    const start = cursor + offset;
    cursor = start + durationInFrames;

    return (
      <Sequence key={index} from={start} durationInFrames={durationInFrames}>
        {sceneChildren}
      </Sequence>
    );
  });

  return <>{scenes}</>;
};

/** Declares one scene in a <Series>. Rendered by Series, never on its own. */
const Scene = ({ children }: SceneProps) => <>{children}</>;
Series.Scene = Scene;

/* --- helpers --- */

import { Children, isValidElement } from 'react';
import type { ReactElement } from 'react';

const childrenToArray = (children: ReactNode): ReactNode[] =>
  Children.toArray(children);

const isSceneElement = (child: ReactNode): child is ReactElement<SceneProps> =>
  isValidElement(child) && child.type === Scene;
