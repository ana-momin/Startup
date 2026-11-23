import { Easing, interpolate, useCurrentFrame, useVideoConfig } from '@motion/engine';
import type { Motif as MotifName, Palette } from '@motion/planner';
import { useScale } from './shared';

/**
 * The background pattern.
 *
 * A faint geometric layer under everything. On its own nobody would mention it — but it
 * is most of what stops every video looking like the same drifting glow, and it costs
 * almost nothing to draw because it is all repeating CSS gradients rather than elements.
 *
 * Each one moves slowly and differently, so the background reads as alive without ever
 * competing with the words on top of it.
 */
export const Motif = ({ motif, palette }: { motif: MotifName; palette: Palette }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const scale = useScale();

  if (motif === 'none') return null;

  // Everything fades up rather than being there from frame zero, so the pattern feels
  // like part of the film instead of part of the page.
  const opacity = interpolate(frame, [0, 24], [0, 1], { extrapolateRight: 'clamp' });
  const progress = frame / Math.max(durationInFrames, 1);
  const accent = palette.accent;

  const shared: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
  };

  switch (motif) {
    case 'grid': {
      // A technical grid that drifts diagonally. Two gradients, one repeating cell.
      const cell = 110 * scale;
      const shift = progress * cell;
      return (
        <div
          style={{
            ...shared,
            opacity: opacity * 0.9,
            backgroundImage: `
              linear-gradient(to right, ${accent}38 1px, transparent 1px),
              linear-gradient(to bottom, ${accent}38 1px, transparent 1px)`,
            backgroundSize: `${cell}px ${cell}px`,
            backgroundPosition: `${shift}px ${shift}px`,
            // Fading the edges stops the grid looking like a screenshot of a spreadsheet.
            maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 78%)',
            WebkitMaskImage:
              'radial-gradient(ellipse at center, black 20%, transparent 78%)',
          }}
        />
      );
    }

    case 'dots': {
      const cell = 64 * scale;
      const drift = progress * cell * 1.5;
      return (
        <div
          style={{
            ...shared,
            opacity: opacity * 0.9,
            backgroundImage: `radial-gradient(${accent}55 ${1.6 * scale}px, transparent ${1.7 * scale}px)`,
            backgroundSize: `${cell}px ${cell}px`,
            backgroundPosition: `${drift}px ${-drift * 0.6}px`,
            maskImage: 'radial-gradient(ellipse at center, black 15%, transparent 75%)',
            WebkitMaskImage:
              'radial-gradient(ellipse at center, black 15%, transparent 75%)',
          }}
        />
      );
    }

    case 'rings': {
      // Concentric circles expanding outward, like something dropped in water.
      const base = Math.max(width, height);
      return (
        <div style={{ ...shared, opacity: opacity * 0.7 }}>
          {[0, 1, 2, 3].map((i) => {
            // Each ring has its own phase, so they arrive in a steady rhythm rather
            // than all pulsing together.
            const phase = (progress * 1.4 + i * 0.25) % 1;
            const size = base * (0.25 + phase * 1.1);
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: size,
                  height: size,
                  marginLeft: -size / 2,
                  marginTop: -size / 2,
                  borderRadius: '50%',
                  border: `${1.4 * scale}px solid ${accent}`,
                  opacity: (1 - phase) * 0.5,
                }}
              />
            );
          })}
        </div>
      );
    }

    case 'beams': {
      // Wide diagonal shafts of light sweeping across the frame.
      const sweep = interpolate(progress, [0, 1], [-30, 30], {
        easing: Easing.easeInOutQuad,
      });
      return (
        <div
          style={{
            ...shared,
            opacity: opacity * 0.65,
            backgroundImage: `repeating-linear-gradient(
              115deg,
              transparent 0px,
              transparent ${150 * scale}px,
              ${accent}22 ${150 * scale}px,
              ${accent}22 ${230 * scale}px)`,
            transform: `translateX(${sweep * scale}px) rotate(-2deg) scale(1.3)`,
            maskImage: 'linear-gradient(to bottom, transparent, black 40%, transparent)',
            WebkitMaskImage:
              'linear-gradient(to bottom, transparent, black 40%, transparent)',
          }}
        />
      );
    }

    case 'scan': {
      // Fine horizontal lines with a brighter band travelling down them.
      const band = (progress * 1.3) % 1;
      return (
        <div style={{ ...shared, opacity }}>
          <div
            style={{
              ...shared,
              opacity: 0.35,
              backgroundImage: `repeating-linear-gradient(
                to bottom,
                ${accent}26 0px,
                ${accent}26 1px,
                transparent 1px,
                transparent ${7 * scale}px)`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: `${band * 100}%`,
              height: 200 * scale,
              background: `linear-gradient(to bottom, transparent, ${accent}33, transparent)`,
            }}
          />
        </div>
      );
    }

    default:
      return null;
  }
};
