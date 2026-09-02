"use client";

import React from "react";
import { TIER_CONFIG } from "@/lib/constants";

interface Props {
  score: number;
  maxScore?: number;
  minScore?: number;
  size?: number;
  showDetails?: boolean;
}

export const CreditScoreGauge: React.FC<Props> = ({
  score = 500,
  minScore = 300,
  maxScore = 850,
  size = 220,
  showDetails = true,
}) => {
  const safeScore = Math.max(minScore, Math.min(maxScore, score));
  const percentage = (safeScore - minScore) / (maxScore - minScore);

  let tierKey: keyof typeof TIER_CONFIG = "UNVERIFIED";
  if (safeScore >= 780) tierKey = "PLATINUM";
  else if (safeScore >= 720) tierKey = "GOLD";
  else if (safeScore >= 650) tierKey = "SILVER";
  else if (safeScore >= 550) tierKey = "BRONZE";

  const tier = TIER_CONFIG[tierKey];

  // SVG Gauge Math (240 degree arc)
  const strokeWidth = 14;
  const radius = (size - strokeWidth * 2) / 2;
  const center = size / 2;
  const arcDegrees = 240;
  const startAngle = 150; // Starting from bottom-left
  const totalArcLength = (arcDegrees / 360) * (2 * Math.PI * radius);
  const strokeDashoffset = totalArcLength - percentage * totalArcLength;

  const getTierGradient = () => {
    switch (tierKey) {
      case "PLATINUM":
        return { start: "#06b6d4", end: "#3b82f6" };
      case "GOLD":
        return { start: "#eab308", end: "#f59e0b" };
      case "SILVER":
        return { start: "#94a3b8", end: "#cbd5e1" };
      case "BRONZE":
        return { start: "#d97706", end: "#b45309" };
      default:
        return { start: "#64748b", end: "#475569" };
    }
  };

  const grad = getTierGradient();

  return (
    <div className="flex flex-col items-center justify-center relative">
      <div className="relative" style={{ width: size, height: size * 0.85 }}>
        <svg width={size} height={size} className="overflow-visible">
          <defs>
            <linearGradient id={`gaugeGradient-${tierKey}`} x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={grad.start} />
              <stop offset="100%" stopColor={grad.end} />
            </linearGradient>
          </defs>

          {/* Background Track Arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="#1e293b"
            strokeWidth={strokeWidth}
            strokeDasharray={`${totalArcLength} 9999`}
            strokeDashoffset={0}
            strokeLinecap="round"
            transform={`rotate(${startAngle} ${center} ${center})`}
          />

          {/* Active Score Arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke={`url(#gaugeGradient-${tierKey})`}
            strokeWidth={strokeWidth}
            strokeDasharray={`${totalArcLength} 9999`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(${startAngle} ${center} ${center})`}
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center Score Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
          <span className="text-4xl sm:text-5xl font-black tracking-tight text-white font-mono">
            {safeScore}
          </span>
          <span className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground mt-0.5">
            Creditcoin xCS
          </span>
          <span
            className={`mt-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${tier.bg} ${tier.color} border ${tier.border}`}
          >
            {tier.name}
          </span>
        </div>
      </div>

      {showDetails && (
        <div className="flex items-center justify-between w-full max-w-[200px] text-xs font-mono text-muted-foreground mt-1 px-2">
          <span>{minScore}</span>
          <span className="text-muted-foreground text-[10px]">VERIFIED SCALE</span>
          <span>{maxScore}</span>
        </div>
      )}
    </div>
  );
};
