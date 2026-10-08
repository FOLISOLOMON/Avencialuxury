"use client";

import React, { useState } from "react";
import { cn, formatCurrency } from "@/lib/utils";

// 1. MINI SPARKLINE
export interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
  className?: string;
}

export function MiniSparkline({
  data,
  color = "hsl(var(--primary))",
  height = 32,
  width = 90,
  className,
}: SparklineProps) {
  if (!data || data.length < 2) {
    return <div style={{ height, width }} className={cn("opacity-20 bg-muted/40 rounded", className)} />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2;
  const effectiveHeight = height - padding * 2;
  const step = width / (data.length - 1);

  const points = data
    .map((val, idx) => {
      const x = idx * step;
      const y = height - padding - ((val - min) / range) * effectiveHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className={cn("overflow-visible", className)}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

// 2. TREND BAR CHART
export interface BarDataPoint {
  label: string;
  value: number;
  subValue?: number;
}

export interface TrendBarChartProps {
  data: BarDataPoint[];
  height?: number;
  currency?: string;
  barColor?: string;
  className?: string;
}

export function TrendBarChart({
  data,
  height = 140,
  currency = "GHS",
  barColor = "hsl(var(--primary))",
  className,
}: TrendBarChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-xs text-muted-foreground border border-dashed border-border rounded-lg">
        No sales data in this period
      </div>
    );
  }

  const values = data.map((d) => d.value);
  const max = Math.max(...values, 1);

  return (
    <div className={cn("w-full space-y-2 select-none", className)}>
      <div className="relative flex items-end justify-between gap-1 sm:gap-2 pt-6" style={{ height }}>
        {data.map((item, idx) => {
          const pct = Math.max(4, Math.round((item.value / max) * 100));
          const isHovered = hoveredIdx === idx;

          return (
            <div
              key={idx}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="relative flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
            >
              {/* Tooltip */}
              {isHovered && (
                <div className="absolute -top-7 z-20 px-2 py-1 text-[11px] font-bold rounded bg-foreground text-background whitespace-nowrap shadow-md pointer-events-none animate-fade-in">
                  {formatCurrency(item.value, currency)}
                </div>
              )}

              {/* Bar */}
              <div
                style={{ height: `${pct}%`, backgroundColor: barColor }}
                className={cn(
                  "w-full max-w-[28px] rounded-t-sm transition-all duration-150",
                  isHovered ? "brightness-110 scale-x-105" : "opacity-90 hover:opacity-100"
                )}
              />

              {/* X label */}
              <span className="text-[10px] text-muted-foreground font-medium mt-1 truncate max-w-full text-center">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 3. DONUT / BREAKDOWN CHART
export interface DonutItem {
  label: string;
  value: number;
  color: string;
}

export interface DonutChartProps {
  data: DonutItem[];
  totalLabel?: string;
  currency?: string;
  size?: number;
}

export function DonutChart({
  data,
  totalLabel = "Total",
  currency = "GHS",
  size = 140,
}: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    return <div className="text-xs text-muted-foreground py-4">No breakdown data</div>;
  }

  const radius = 42;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          {data.map((item, idx) => {
            const pct = item.value / total;
            const strokeDasharray = `${pct * circumference} ${circumference}`;
            const strokeDashoffset = -accumulatedPercent * circumference;
            accumulatedPercent += pct;

            return (
              <circle
                key={idx}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-300"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{totalLabel}</span>
          <span className="text-xs font-black font-display text-foreground tabular-nums">
            {formatCurrency(total, currency)}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex-1 w-full space-y-1.5 text-xs">
        {data.map((item, idx) => {
          const pct = Math.round((item.value / total) * 100);
          return (
            <div key={idx} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 truncate">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <span className="truncate text-foreground font-medium">{item.label}</span>
              </div>
              <div className="flex items-center gap-2 font-bold tabular-nums">
                <span className="text-muted-foreground text-[11px]">{pct}%</span>
                <span className="text-foreground">{formatCurrency(item.value, currency)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
