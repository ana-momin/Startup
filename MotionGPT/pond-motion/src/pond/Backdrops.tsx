import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { C, rnd } from "./theme";

/**
 * The pale field the light scenes sit on: near-white with big soft blue
 * washes drifting through it on the diagonal.
 */
export const LightField: React.FC<{ base?: string; intensity?: number }> = ({
  base = C.pale,
  intensity = 1,
}) => {
  const frame = useCurrentFrame();

  const blobs = [
    { c: C.wash, x: 88, y: 14, w: 1500, h: 1100, a: 0.5, sp: 0.0058, amp: 130 },
    { c: C.washSoft, x: 8, y: 86, w: 1400, h: 1000, a: 0.62, sp: -0.0044, amp: 150 },
    { c: C.wash, x: 46, y: 108, w: 1700, h: 780, a: 0.3, sp: 0.0071, amp: 100 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: base, overflow: "hidden" }}>
      {blobs.map((b, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${b.x}%`,
            top: `${b.y}%`,
            width: b.w,
            height: b.h,
            marginLeft: -b.w / 2,
            marginTop: -b.h / 2,
            borderRadius: "50%",
            background: `radial-gradient(closest-side, ${b.c} 0%, transparent 72%)`,
            opacity: b.a * intensity,
            translate: `${Math.sin(frame * b.sp + i * 1.7) * b.amp}px ${
              Math.cos(frame * b.sp * 0.72 + i) * b.amp * 0.5
            }px`,
          }}
        />
      ))}
      {/* Diagonal sheen, the same one that sweeps the reference light frames */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(118deg, rgba(255,255,255,0.85) 8%, rgba(255,255,255,0) 42%, rgba(255,255,255,0) 62%, rgba(255,255,255,0.7) 96%)",
        }}
      />
    </AbsoluteFill>
  );
};

/** Slowly drifting blue specks over the opening white frames. */
export const DotField: React.FC<{ count?: number; opacity?: number }> = ({
  count = 54,
  opacity = 1,
}) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {new Array(count).fill(0).map((_, i) => {
        const size = 5 + rnd(i * 5.1) * 6;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${rnd(i) * 100}%`,
              top: `${rnd(i + 77) * 100}%`,
              width: size,
              height: size,
              borderRadius: "50%",
              backgroundColor: C.blue,
              opacity: (0.14 + rnd(i + 31) * 0.4) * opacity,
              translate: `${Math.sin(frame * 0.009 + i) * 34}px ${
                Math.cos(frame * 0.0071 + i * 1.3) * 26
              }px`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Full-bleed brand blue, matching the sampled gradient of the reference. */
export const BlueField: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(152deg, ${C.blueDeep} 0%, ${C.blueMid} 46%, ${C.blueLite} 100%)`,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "62%",
          top: "22%",
          width: 1700,
          height: 1400,
          marginLeft: -850,
          marginTop: -700,
          borderRadius: "50%",
          background:
            "radial-gradient(closest-side, rgba(255,255,255,0.30) 0%, transparent 70%)",
          translate: `${Math.sin(frame * 0.008) * 90}px ${Math.cos(frame * 0.006) * 60}px`,
        }}
      />
      {/* Faint engineering grid, just enough to give the field a surface */}
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.055) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.055) 1px, transparent 1px)",
          backgroundSize: "96px 96px",
          backgroundPosition: `${frame * 0.28}px ${frame * 0.14}px`,
        }}
      />
    </AbsoluteFill>
  );
};

/**
 * Pill chip. On the blue field these are the Founders / AI Agents / Investors
 * labels that float in around the mark.
 */
export const Chip: React.FC<{
  label: string;
  x: number;
  y: number;
  start: number;
  fontFamily: string;
  drift?: number;
}> = ({ label, x, y, start, fontFamily, drift = 0 }) => {
  const frame = useCurrentFrame();

  const p = interpolate(frame, [start, start + 26], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  if (p <= 0) return null;

  const float = Math.sin((frame - start) * 0.028 + drift) * 9;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        translate: `0px ${float + interpolate(p, [0, 1], [26, 0])}px`,
        padding: "22px 50px",
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.94)",
        boxShadow: "0 18px 46px rgba(12,44,110,0.22)",
        fontFamily,
        fontWeight: 400,
        fontSize: 46,
        letterSpacing: "-0.01em",
        color: C.ink,
        opacity: p,
        filter: `blur(${interpolate(p, [0, 0.6, 1], [14, 2, 0])}px)`,
        scale: interpolate(p, [0, 1], [0.86, 1], {
          output: "perceptual-scale",
        }),
      }}
    >
      {label}
    </div>
  );
};

/** Minimal glyphs for the floating circular chips on the light scenes. */
const GLYPHS: Record<string, React.ReactNode> = {
  people: (
    <>
      <circle cx="9" cy="8.5" r="3.2" />
      <circle cx="16.5" cy="9.5" r="2.4" />
      <path d="M3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
      <path d="M15.5 19c0-2.4 1.6-4 3.8-4 1.4 0 2.7.7 2.7 2.4" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <ellipse cx="12" cy="12" rx="3.6" ry="8.4" />
      <path d="M3.6 12h16.8M5 7.2h14M5 16.8h14" />
    </>
  ),
  spark: <path d="M12 3.2l2.3 5.6 5.6 2.3-5.6 2.3L12 19l-2.3-5.6L4.1 11l5.6-2.3z" />,
  coin: (
    <>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M12 7.4v9.2M9.6 9.6h4a1.9 1.9 0 010 3.8h-3.6a1.9 1.9 0 000 3.8h4.4" />
    </>
  ),
  chat: (
    <>
      <path d="M20.4 11.4c0 3.9-3.8 7-8.4 7-1 0-2-.15-2.9-.43L4.2 19.6l1.3-3.5A6.6 6.6 0 013.6 11.4c0-3.9 3.8-7 8.4-7s8.4 3.1 8.4 7z" />
    </>
  ),
};

/**
 * The soft circular icon chips that orbit the copy on the reference's light
 * frames. Depth comes from size, tint and a permanent touch of blur on the
 * ones meant to sit behind.
 */
export const SoftChip: React.FC<{
  glyph: keyof typeof GLYPHS;
  x: number;
  y: number;
  size: number;
  start: number;
  depth?: number;
  seed?: number;
}> = ({ glyph, x, y, size, start, depth = 0, seed = 0 }) => {
  const frame = useCurrentFrame();

  const p = interpolate(frame, [start, start + 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  if (p <= 0) return null;

  const near = 1 - depth;
  const drift = Math.sin((frame - start) * 0.022 + seed) * (10 + depth * 12);

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        background: `linear-gradient(150deg, rgba(255,255,255,0.95), rgba(210,229,253,${0.5 + near * 0.4}))`,
        boxShadow: `0 ${10 + near * 16}px ${24 + near * 30}px rgba(33,102,246,${0.08 + near * 0.14})`,
        opacity: p * (0.42 + near * 0.58),
        filter: `blur(${depth * 4 + interpolate(p, [0, 0.6, 1], [16, 2, 0])}px)`,
        translate: `0px ${drift + interpolate(p, [0, 1], [22, 0])}px`,
        scale: interpolate(p, [0, 1], [0.8, 1], { output: "perceptual-scale" }),
      }}
    >
      <svg
        width={size * 0.46}
        height={size * 0.46}
        viewBox="0 0 24 24"
        fill="none"
        stroke={C.blue}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.55 + near * 0.4}
      >
        {GLYPHS[glyph]}
      </svg>
    </div>
  );
};
