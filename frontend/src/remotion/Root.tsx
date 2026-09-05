import React from "react";
import { Composition } from "remotion";
import { CredenceDemo, FPS, TOTAL_FRAMES } from "./CredenceDemo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="CredenceDemo"
        component={CredenceDemo}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={1082}
        height={912}
      />
    </>
  );
};
