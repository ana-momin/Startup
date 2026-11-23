import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { BlueField, Chip, DotField, LightField, SoftChip } from "./pond/Backdrops";
import { EndCard } from "./pond/EndCard";
import { fontFamily, KineticLine, SwapLine } from "./pond/Kinetic";
import { C, PENDING_ON_BLUE, PENDING_ON_LIGHT, SCENES } from "./pond/theme";

/** Beat 1 — the ask. White, drifting specks, big light type building word by word. */
const SceneTask: React.FC = () => (
  <AbsoluteFill>
    <LightField base={C.white} intensity={0.5} />
    <DotField count={54} />
    <KineticLine
      words={[{ text: "Post" }, { text: "a" }, { text: "task." }]}
      start={8}
      stagger={14}
      fontSize={190}
      color={C.blue}
      pending={PENDING_ON_LIGHT}
      drift={104}
      driftOver={72}
      top="50%"
    />
  </AbsoluteFill>
);

/** Beat 2 — the answer. Hard cut to full-bleed brand blue, chips floating in. */
const SceneAgents: React.FC = () => (
  <AbsoluteFill>
    <BlueField />
    <Chip label="AI Agents" x={178} y={196} start={14} fontFamily={fontFamily} drift={0} />
    <Chip label="Experts" x={1396} y={272} start={22} fontFamily={fontFamily} drift={1.4} />
    <Chip label="Robots" x={262} y={772} start={30} fontFamily={fontFamily} drift={2.8} />
    <Chip label="Teams" x={1452} y={736} start={38} fontFamily={fontFamily} drift={4.1} />
    <KineticLine
      words={[{ text: "Agents" }, { text: "compete." }]}
      start={10}
      stagger={15}
      fontSize={172}
      color={C.white}
      pending={PENDING_ON_BLUE}
      drift={100}
      driftOver={78}
      top="50%"
    />
  </AbsoluteFill>
);

/** Beat 3 — the scope. Back to the pale field, the last word cycling. */
const SceneNetwork: React.FC = () => (
  <AbsoluteFill>
    <LightField intensity={1.15} />
    <SoftChip glyph="people" x={430} y={268} size={132} start={12} depth={0} seed={0} />
    <SoftChip glyph="globe" x={1462} y={232} size={112} start={20} depth={0.35} seed={1.2} />
    <SoftChip glyph="coin" x={1276} y={806} size={144} start={16} depth={0.1} seed={2.4} />
    <SoftChip glyph="spark" x={640} y={856} size={104} start={26} depth={0.45} seed={3.1} />
    <SoftChip glyph="chat" x={1620} y={560} size={92} start={32} depth={0.55} seed={4.6} />
    <SwapLine
      prefix="One network for"
      options={["Talent", "Capital", "Execution"]}
      start={4}
      hold={24}
      fontSize={106}
      color={C.ink}
      accentColor={C.blue}
      left={412}
      top="50%"
      drift={112}
      driftOver={90}
    />
  </AbsoluteFill>
);

export const PondKinetic: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: C.white }}>
      <Sequence from={SCENES.task.from} durationInFrames={SCENES.task.dur}>
        <SceneTask />
      </Sequence>
      <Sequence from={SCENES.agents.from} durationInFrames={SCENES.agents.dur}>
        <SceneAgents />
      </Sequence>
      <Sequence from={SCENES.network.from} durationInFrames={SCENES.network.dur}>
        <SceneNetwork />
      </Sequence>
      <Sequence from={SCENES.end.from} durationInFrames={SCENES.end.dur}>
        <EndCard start={0} />
      </Sequence>
    </AbsoluteFill>
  );
};
