import { loadFont } from "@remotion/google-fonts/Inter";
import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { PENDING_ON_LIGHT } from "./theme";

export const { fontFamily } = loadFont("normal", {
  weights: ["300", "400", "500", "700"],
  subsets: ["latin"],
});

/**
 * The signature move of the reference cut: a word arrives already visible but
 * pale and heavily blurred, then resolves to full weight and colour. Words are
 * staggered, so at any instant the line reads as sharp -> soft -> ghost from
 * left to right.
 */
const RESOLVE = 20; // frames a single word takes to sharpen
const LEAD = 9; // frames a word is visible, blurred, before its own beat

export type Word = {
  readonly text: string;
  /** Renders in the accent colour once resolved. */
  readonly accent?: boolean;
};

const wordProgress = (frame: number, beat: number) =>
  interpolate(frame, [beat - LEAD, beat + RESOLVE], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

export const KineticLine: React.FC<{
  words: readonly Word[];
  /** Frame the first word begins resolving. */
  start: number;
  /** Frames between successive words. */
  stagger?: number;
  fontSize: number;
  color: string;
  accentColor?: string;
  pending?: string;
  /** Total horizontal travel across the line's time on screen. */
  drift?: number;
  driftOver?: number;
  top?: number | string;
  align?: "center" | "left";
  left?: number;
  weight?: number;
}> = ({
  words,
  start,
  stagger = 13,
  fontSize,
  color,
  accentColor,
  pending = PENDING_ON_LIGHT,
  drift = 150,
  driftOver = 150,
  top = "50%",
  align = "center",
  left = 0,
  weight = 300,
}) => {
  const frame = useCurrentFrame();

  const shift = interpolate(frame, [start - LEAD, start + driftOver], [0, drift], {
    extrapolateLeft: "clamp",
    extrapolateRight: "extend",
  });

  return (
    <div
      style={{
        position: "absolute",
        top,
        left: align === "center" ? 0 : left,
        right: align === "center" ? 0 : undefined,
        translate: `${shift}px -50%`,
        display: "flex",
        justifyContent: align === "center" ? "center" : "flex-start",
        alignItems: "baseline",
        gap: `${fontSize * 0.26}px`,
        fontFamily,
        fontWeight: weight,
        fontSize,
        letterSpacing: "-0.022em",
        lineHeight: 1.05,
        whiteSpace: "pre",
      }}
    >
      {words.map((w, i) => {
        const p = wordProgress(frame, start + i * stagger);
        const resolved = w.accent ? (accentColor ?? color) : color;
        return (
          <span
            key={i}
            style={{
              color: p > 0.999 ? resolved : pending,
              opacity: interpolate(p, [0, 0.28, 1], [0, 0.85, 1]),
              filter: `blur(${interpolate(p, [0, 0.55, 1], [26, 4, 0])}px)`,
              translate: `${interpolate(p, [0, 1], [26, 0])}px 0px`,
            }}
          >
            {/* Cross-fade the resolved colour over the pale one so the word
                warms up rather than snapping. */}
            <span style={{ position: "relative", color: pending }}>
              {w.text}
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  color: resolved,
                  opacity: interpolate(p, [0.25, 1], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }),
                }}
              >
                {w.text}
              </span>
            </span>
          </span>
        );
      })}
    </div>
  );
};

/**
 * A fixed prefix with a trailing word that blur-swaps through a list, the way
 * "One network for Talent / User / Execution" cycles in the reference.
 */
export const SwapLine: React.FC<{
  prefix: string;
  options: readonly string[];
  start: number;
  hold: number;
  fontSize: number;
  color: string;
  accentColor: string;
  left: number;
  top: number | string;
  drift?: number;
  driftOver?: number;
}> = ({
  prefix,
  options,
  start,
  hold,
  fontSize,
  color,
  accentColor,
  left,
  top,
  drift = 130,
  driftOver = 200,
}) => {
  const frame = useCurrentFrame();

  const shift = interpolate(frame, [start, start + driftOver], [0, drift], {
    extrapolateLeft: "clamp",
    extrapolateRight: "extend",
  });

  const intro = interpolate(frame, [start, start + 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        translate: `${shift}px -50%`,
        display: "flex",
        alignItems: "baseline",
        gap: `${fontSize * 0.3}px`,
        fontFamily,
        fontWeight: 300,
        fontSize,
        letterSpacing: "-0.018em",
        whiteSpace: "pre",
      }}
    >
      <span
        style={{
          color,
          opacity: intro,
          filter: `blur(${interpolate(intro, [0, 1], [18, 0])}px)`,
        }}
      >
        {prefix}
      </span>
      <span style={{ position: "relative", display: "inline-block" }}>
        {/* Hidden spacer fixes the box to the longest option, so every option
            can be absolutely positioned and share one exact baseline. */}
        <span style={{ visibility: "hidden" }}>
          {options.reduce((a, b) => (b.length > a.length ? b : a))}
        </span>
        {options.map((opt, i) => {
          const at = start + 14 + i * hold;
          const last = i === options.length - 1;
          const alive = last
            ? interpolate(frame, [at - 4, at + 9], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.16, 1, 0.3, 1),
              })
            : interpolate(
                frame,
                [at - 4, at + 9, at + hold - 7, at + hold],
                [0, 1, 1, 0],
                {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: [
                    Easing.bezier(0.16, 1, 0.3, 1),
                    Easing.linear,
                    Easing.bezier(0.5, 0, 0.9, 0.4),
                  ],
                },
              );
          if (alive <= 0) return null;
          return (
            <span
              key={opt}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                color: accentColor,
                opacity: alive,
                filter: `blur(${interpolate(alive, [0, 1], [16, 0])}px)`,
                translate: `${interpolate(alive, [0, 1], [20, 0])}px 0px`,
              }}
            >
              {opt}
            </span>
          );
        })}
      </span>
    </div>
  );
};
