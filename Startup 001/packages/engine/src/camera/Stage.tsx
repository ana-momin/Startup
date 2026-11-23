import { createContext, useContext } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useCurrentFrame, useVideoConfig } from '../core/context';
import { NEUTRAL, resolveCamera } from './camera';
import type { CameraKeyframe, CameraState } from './camera';

/**
 * A space with a camera in it, and layers at different distances.
 *
 * <Stage> owns the camera. <Layer> reads it and obeys as much of it as its distance
 * says it should. Nothing else changes: the content inside a Layer is written exactly
 * as it was when it sat on a flat plane.
 *
 *   <Stage camera={push({ duration })}>
 *     <Layer depth={0.2} bleed={20}><Backdrop /></Layer>
 *     <Layer depth={1}><Headline /></Layer>
 *     <Layer depth={1.7} blur={14}><DustInFront /></Layer>
 *   </Stage>
 *
 * Parallax is the cheapest convincing depth cue there is. Two layers moving at
 * different rates is enough for the eye to build a space out of flat shapes — it is how
 * 2D animation has faked depth for a century, and it costs one multiply per layer.
 */

const CameraContext = createContext<CameraState>(NEUTRAL);

/** Where the camera is right now. Layers use it; scenes rarely need it directly. */
export const useCamera = (): CameraState => useContext(CameraContext);

type StageProps = {
  /** The move, as keyframes. Omit for a locked frame. */
  camera?: CameraKeyframe[];
  children: ReactNode;
  style?: CSSProperties;
};

export const Stage = ({ camera, children, style }: StageProps) => {
  const frame = useCurrentFrame();
  const state = camera ? resolveCamera(frame, camera) : NEUTRAL;

  return (
    <CameraContext.Provider value={state}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          // Layers are allowed to grow past the frame, so the clip belongs here — on the
          // one box that is exactly the size of the picture.
          overflow: 'hidden',
          ...style,
        }}
      >
        {children}
      </div>
    </CameraContext.Provider>
  );
};

type LayerProps = {
  /**
   * How much of the camera's movement this layer obeys.
   *
   *   0     locked to the frame — a vignette, or anything that must never move
   *   0.25  far background
   *   1     the focal plane, where the words live
   *   1.6   in front of the subject, so it sweeps past faster than the subject moves
   *
   * Think of it as distance: near things move more. Anything above 1 sits between the
   * camera and the subject.
   */
  depth?: number;
  /** Out-of-focus blur, in pixels. Depth of field, for layers off the focal plane. */
  blur?: number;
  /**
   * Grow the layer past the frame by this percentage on every side.
   *
   * Only backgrounds need it. A layer that fills its own box exactly will show a hard
   * edge the moment the camera pans, or whenever the zoom drops below 1 — which a
   * pull-back does by design. Content layers leave it at 0, because growing the box
   * would move what "centred" means and every scene would compose differently.
   */
  bleed?: number;
  children: ReactNode;
  style?: CSSProperties;
};

export const Layer = ({ depth = 1, blur = 0, bleed = 0, children, style }: LayerProps) => {
  const camera = useCamera();
  const { width, height } = useVideoConfig();

  const translateX = -camera.x * width * depth;
  const translateY = -camera.y * height * depth;
  // Zoom is a distance too: a far layer barely changes size as the camera closes in,
  // which is what makes a push feel like it has depth instead of being a scale applied
  // to the whole picture.
  const scale = 1 + (camera.zoom - 1) * depth;
  const rotate = camera.rotate * depth;

  return (
    <div
      style={{
        position: 'absolute',
        inset: bleed === 0 ? 0 : `${-bleed}%`,
        display: 'flex',
        flexDirection: 'column',
        transform: `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale}) rotate(${rotate}deg)`,
        transformOrigin: 'center center',
        filter: blur > 0.05 ? `blur(${blur}px)` : undefined,
        /*
          No willChange here.

          It promotes the layer to its own compositing surface, which is a real win for
          a preview that is compositing between frames — and worthless for the renderer,
          which rasterises every frame from scratch and pays the promotion cost on all of
          them. On full-frame layers that cost is measurable.
        */
        ...style,
      }}
    >
      {children}
    </div>
  );
};
