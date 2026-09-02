"use client";

import React from "react";
import { LucideIcon } from "lucide-react";

interface Props {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  highlight?: boolean;
}

export const StatsCard: React.FC<Props> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendUp = true,
  highlight = false,
}) => {
  return (
    <div
      className={`relative rounded-2xl p-5 border transition-all duration-200 ${
        highlight
          ? "bg-surface/60 border-accent/30 shadow-lg shadow-accent/10"
          : "bg-surface/80 border-border hover:border-muted-foreground/40"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center ${
            highlight
              ? "bg-accent/15 text-accent border border-accent/30"
              : "bg-surface-2 text-foreground/85"
          }`}
        >
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-black tracking-tight text-white font-mono">
          {value}
        </span>
        {trend && (
          <span
            className={`text-xs font-semibold ${
              trendUp ? "text-emerald-400" : "text-amber-400"
            }`}
          >
            {trend}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mt-1 text-xs text-muted-foreground font-medium">
          {subtitle}
        </p>
      )}
    </div>
  );
};
