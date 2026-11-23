import type { CSSProperties, ReactNode } from 'react';
import { useVideoConfig } from '../core/context';
import { alignmentFor, boxFor } from './grid';
import type { Anchor, GridConfig, Region } from './grid';

/**
 * Content placed on the grid.
 *
 * A slot knows nothing about what it contains — a headline, a chart, a device mockup, a
 * rule. That is the whole point: once placement is separated from content, the same
 * headline can be centred, hung off the left margin, dropped into a lower third or set
 * across the top, and none of those is a new component.
 *
 * It is also what makes a composition describable as data, which is what makes a library
 * of compositions possible, which is what stops every video looking the same.
 */

type SlotProps = {
  region: Region;
  /** Where the content sits inside its region. */
  anchor?: Anchor;
  /** Safe margin as a fraction of the shorter side. */
  margin?: number;
  children: ReactNode;
  style?: CSSProperties;
  /**
   * Draw the region's edges. Development only — invaluable when a composition looks
   * wrong and it is not obvious whether the layout or the content is at fault.
   */
  debug?: boolean;
};

export const Slot = ({
  region,
  anchor = 'center',
  margin = 0.072,
  children,
  style,
  debug,
}: SlotProps) => {
  const { width, height } = useVideoConfig();
  const config: GridConfig = { width, height, margin };
  const box = boxFor(region, config);
  const { justify, align, text } = alignmentFor(anchor);

  return (
    <div
      style={{
        /*
         * The caller's styles go first, and the geometry after.
         *
         * Spreading them last let a caller silently override the region: a `width: 100%`
         * meant for the content replaced the slot's computed width, and the slot then ran
         * from its left edge to the full width of the *frame* — so the content spilled off
         * the right of the picture. It looked like a layout bug and was an ordering bug.
         *
         * A slot's position and size belong to the composition, and nothing passed in
         * should be able to take them. Anything a caller genuinely needs to change about
         * the geometry is a change to the composition.
         */
        ...style,
        position: 'absolute',
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: justify,
        alignItems: align,
        textAlign: text,
        // A slot is a place to put something, not a clipping mask. Overflow is visible so
        // type that slightly exceeds its region is *seen* to overflow during development
        // rather than silently losing its descenders in the export.
        overflow: 'visible',
        outline: debug ? '1px dashed rgba(255,0,128,0.55)' : undefined,
      }}
    >
      {children}
    </div>
  );
};
