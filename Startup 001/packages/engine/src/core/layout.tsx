import type { CSSProperties, ReactNode } from 'react';

/**
 * Layout primitives.
 *
 * Video layout is different from web layout: there is no scrolling, no responsive
 * breakpoints, and every element is positioned inside a fixed canvas. These primitives
 * make that explicit so animations never fight the browser's normal flow.
 */

type FillProps = {
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
};

/**
 * Covers the entire frame. The base layer for almost every scene.
 * Layers stack in render order, like layers in a design tool.
 */
export const AbsoluteFill = ({ children, style, className }: FillProps) => (
  <div
    className={className}
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      ...style,
    }}
  >
    {children}
  </div>
);

/** Fills the frame and centers its children both ways. */
export const Center = ({ children, style, className }: FillProps) => (
  <AbsoluteFill
    className={className}
    style={{ justifyContent: 'center', alignItems: 'center', ...style }}
  >
    {children}
  </AbsoluteFill>
);

type StackProps = FillProps & {
  /** Space between children, in pixels. */
  gap?: number;
  /** Cross-axis alignment. */
  align?: CSSProperties['alignItems'];
  /** Main-axis alignment. */
  justify?: CSSProperties['justifyContent'];
};

/** Children laid out top to bottom. */
export const Column = ({
  children,
  gap = 0,
  align = 'center',
  justify = 'center',
  style,
  className,
}: StackProps) => (
  <div
    className={className}
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: align,
      justifyContent: justify,
      gap,
      ...style,
    }}
  >
    {children}
  </div>
);

/** Children laid out left to right. */
export const Row = ({
  children,
  gap = 0,
  align = 'center',
  justify = 'center',
  style,
  className,
}: StackProps) => (
  <div
    className={className}
    style={{
      display: 'flex',
      flexDirection: 'row',
      alignItems: align,
      justifyContent: justify,
      gap,
      ...style,
    }}
  >
    {children}
  </div>
);
