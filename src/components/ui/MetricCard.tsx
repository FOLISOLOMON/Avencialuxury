"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface MetricTrend {
  value: string | number;
  label?: string;
  isPositive?: boolean | null;
}

export interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: MetricTrend;
  icon?: LucideIcon;
  description?: string;
  variant?: "default" | "gold" | "indigo" | "emerald" | "amber" | "rose";
  className?: string;
  onClick?: () => void;
}

export function MetricCard({
  label,
  value,
  trend,
  icon: Icon,
  description,
  variant = "default",
  className,
  onClick,
}: MetricCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-lg border border-border bg-card p-4 transition-colors font-sans flex flex-col justify-between",
        onClick && "cursor-pointer hover:border-primary/40 active:bg-secondary/40",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-medium text-muted-foreground truncate">
          {label}
        </span>
        {Icon && <Icon className="w-4 h-4 text-muted-foreground/70 flex-shrink-0" />}
      </div>

      <div className="space-y-1">
        <div className="text-2xl sm:text-[26px] font-bold text-foreground tracking-tight tabular-nums leading-tight">
          {value}
        </div>

        {(trend || description) && (
          <div className="flex items-center gap-2 flex-wrap text-xs pt-0.5">
            {trend && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 font-medium text-xs",
                  trend.isPositive === true && "text-success",
                  trend.isPositive === false && "text-destructive",
                  trend.isPositive === null && "text-muted-foreground"
                )}
              >
                {trend.isPositive === true && <TrendingUp className="w-3.5 h-3.5" />}
                {trend.isPositive === false && <TrendingDown className="w-3.5 h-3.5" />}
                {trend.isPositive === null && <Minus className="w-3.5 h-3.5" />}
                <span>{trend.value}</span>
              </span>
            )}

            {trend?.label && (
              <span className="text-muted-foreground text-xs font-normal">
                {trend.label}
              </span>
            )}

            {!trend && description && (
              <span className="text-muted-foreground text-xs font-normal">
                {description}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
