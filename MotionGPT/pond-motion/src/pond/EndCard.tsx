import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { fontFamily } from "./Kinetic";
import { MARK_PATH, MARK_VIEWBOX } from "./markPath";
import { C } from "./theme";

export const PondMark: React.FC<{ size: number; color?: string }> = ({
  size,
  color = C.ink,
}) => (
  <svg
    width={size}
    height={size}
    viewBox={`0 0 ${MARK_VIEWBOX} ${MARK_VIEWBOX}`}
    style={{ display: "block" }}
  >
    <path d={MARK_PATH} fill={color} fillRule="evenodd" />
  </svg>
);

/** Clean white sign-off, the way the reference lands its logo. */
export const EndCard: React.FC<{ start: number }> = ({ start }) => {
  const frame = useCurrentFrame();

  const p = interpolate(frame, [start, start + 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const tag = interpolate(frame, [start + 20, start + 44], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: C.white,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 74,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 44,
          opacity: p,
          filter: `blur(${interpolate(p, [0, 0.6, 1], [30, 4, 0])}px)`,
          scale: interpolate(p, [0, 1], [0.9, 1], {
            output: "perceptual-scale",
          }),
        }}
      >
        <PondMark size={168} />
        <span
          style={{
            fontFamily,
            fontWeight: 700,
            fontSize: 176,
            letterSpacing: "-0.045em",
            color: C.ink,
            lineHeight: 1,
          }}
        >
          Pond AI
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 26,
          opacity: tag,
          translate: `0px ${interpolate(tag, [0, 1], [18, 0])}px`,
          filter: `blur(${interpolate(tag, [0, 0.7, 1], [12, 2, 0])}px)`,
        }}
      >
        <div style={{ width: 96, height: 1, backgroundColor: "rgba(11,21,38,0.22)" }} />
        <span
          style={{
            fontFamily,
            fontWeight: 400,
            fontSize: 40,
            letterSpacing: "0.06em",
            color: C.inkSoft,
          }}
        >
          joinpond.ai
        </span>
        <div style={{ width: 96, height: 1, backgroundColor: "rgba(11,21,38,0.22)" }} />
      </div>
    </AbsoluteFill>
  );
};
