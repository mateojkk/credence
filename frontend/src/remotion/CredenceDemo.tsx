import React from "react";
import { AbsoluteFill, OffthreadVideo, Sequence, staticFile } from "remotion";

export const FPS = 60;

// Segment timings (seconds and frames at 60 fps)
export const TIMINGS = {
  // Part 1: Landing, Visualizer, Credit Check, Faucet, Live Borrow & Repay from shot1
  seg1: {
    startFrame: 0,
    durationInFrames: Math.round(278.0 * FPS), // 16680 frames (0:00 - 4:38)
    videoStartFrame: 0,
  },
  // Part 2: Replacement clean Supply demonstration from shot2
  seg2: {
    startFrame: Math.round(278.0 * FPS), // 16680
    durationInFrames: Math.round(73.4 * FPS), // 4404 frames (~1:13.4)
    videoStartFrame: 0,
  },
  // Part 3: Live Risk Sentinel tab walkthrough from shot1
  seg3: {
    startFrame: Math.round((278.0 + 73.4) * FPS), // 21084
    durationInFrames: Math.round((381.2 - 369.4) * FPS), // 708 frames (11.8s)
    videoStartFrame: Math.round(369.4 * FPS), // 22164
  },
  // Part 4: Overview / Dashboard live portfolio & balances outro from shot2
  seg4: {
    startFrame: Math.round((278.0 + 73.4 + (381.2 - 369.4)) * FPS), // 21792
    durationInFrames: Math.round((101.858 - 73.4) * FPS), // 1707 frames (~28.46s)
    videoStartFrame: Math.round(73.4 * FPS), // 4404
  },
};

export const TOTAL_FRAMES =
  TIMINGS.seg1.durationInFrames +
  TIMINGS.seg2.durationInFrames +
  TIMINGS.seg3.durationInFrames +
  TIMINGS.seg4.durationInFrames; // 23499 frames (391.65s / 6m 31s)

export const CredenceDemo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      {/* 1. Intro, Visualizer, Check, Borrow & Repay (shot1) */}
      <Sequence
        from={TIMINGS.seg1.startFrame}
        durationInFrames={TIMINGS.seg1.durationInFrames}
        name="Part 1: Intro, Visualizer, Check, Borrow & Repay (shot1)"
      >
        <OffthreadVideo
          src={staticFile("shot1.webm")}
          startFrom={TIMINGS.seg1.videoStartFrame}
          endAt={TIMINGS.seg1.videoStartFrame + TIMINGS.seg1.durationInFrames}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </Sequence>

      {/* 2. Replacement Supply Demo (shot2) */}
      <Sequence
        from={TIMINGS.seg2.startFrame}
        durationInFrames={TIMINGS.seg2.durationInFrames}
        name="Part 2: Clean Supply Liquidity Demo (shot2)"
      >
        <OffthreadVideo
          src={staticFile("shot2.webm")}
          startFrom={TIMINGS.seg2.videoStartFrame}
          endAt={TIMINGS.seg2.videoStartFrame + TIMINGS.seg2.durationInFrames}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </Sequence>

      {/* 3. Risk Sentinel (shot1) */}
      <Sequence
        from={TIMINGS.seg3.startFrame}
        durationInFrames={TIMINGS.seg3.durationInFrames}
        name="Part 3: Risk Sentinel Walkthrough (shot1)"
      >
        <OffthreadVideo
          src={staticFile("shot1.webm")}
          startFrom={TIMINGS.seg3.videoStartFrame}
          endAt={TIMINGS.seg3.videoStartFrame + TIMINGS.seg3.durationInFrames}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </Sequence>

      {/* 4. Dashboard Outro with updated 3,000 CTC supply (shot2) */}
      <Sequence
        from={TIMINGS.seg4.startFrame}
        durationInFrames={TIMINGS.seg4.durationInFrames}
        name="Part 4: Dashboard Outro & On-Chain Balances (shot2)"
      >
        <OffthreadVideo
          src={staticFile("shot2.webm")}
          startFrom={TIMINGS.seg4.videoStartFrame}
          endAt={TIMINGS.seg4.videoStartFrame + TIMINGS.seg4.durationInFrames}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </Sequence>
    </AbsoluteFill>
  );
};
