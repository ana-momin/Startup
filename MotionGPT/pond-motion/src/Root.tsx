import "./index.css";
import { Composition } from "remotion";
import { PondKinetic } from "./PondKinetic";
import { DURATION, FPS } from "./pond/theme";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="PondKinetic"
        component={PondKinetic}
        durationInFrames={DURATION}
        fps={FPS}
        width={1920}
        height={1080}
      />
    </>
  );
};
