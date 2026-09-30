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

const variantStyles = {
  default: "bg-white dark:bg-[#151515] border-[#E5E2D8] dark:border-[#2A2A2A] hover:border-gold-500/40",
  gold: "bg-gradient-to-br from-white to-gold-500/10 dark:from-[#151515] dark:to-gold-500/15 border-gold-500/30 hover:border-gold-500/60 shadow-lg shadow-gold-500/5",
  indigo: "bg-gradient-to-br from-white to-gold-500/10 dark:from-[#151515] dark:to-gold-500/15 border-gold-500/30 hover:border-gold-500/60 shadow-lg shadow-gold-500/5",
  emerald: "bg-gradient-to-br from-white to-emerald-50/40 dark:from-[#151515] dark:to-emerald-950/30 border-emerald-200/60 dark:border-emerald-900/50 hover:border-emerald-300",
  amber: "bg-gradient-to-br from-white to-amber-50/40 dark:from-[#151515] dark:to-amber-950/30 border-amber-200/60 dark:border-amber-900/50 hover:border-amber-300",
  rose: "bg-gradient-to-br from-white to-rose-50/40 dark:from-[#151515] dark:to-rose-950/30 border-rose-200/60 dark:border-rose-900/50 hover:border-rose-300",
};

const iconStyles = {
  default: "bg-[#F8F7F3] dark:bg-[#181818] text-[#525252] dark:text-[#D4D4D4] border-[#E5E2D8] dark:border-[#2A2A2A]",
  gold: "bg-gold-500/15 text-gold-600 dark:text-gold-400 border-gold-500/30",
  indigo: "bg-gold-500/15 text-gold-600 dark:text-gold-400 border-gold-500/30",
  emerald: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/60",
  amber: "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/60",
  rose: "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60",
};

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
        "rounded-2xl border bg-white dark:bg-[#151515] shadow-xs p-5 transition-all duration-200 font-sans flex flex-col justify-between",
        variantStyles[variant],
        onClick && "cursor-pointer hover:shadow-md active:scale-[0.99]",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <span className="text-xs font-bold text-[#737373] dark:text-[#A3A3A3] uppercase tracking-wider truncate">
          {label}
        </span>
        {Icon && (
          <div
            className={cn(
              "w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 shadow-2xs",
              iconStyles[variant]
            )}
          >
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="space-y-1 mt-1">
        <div className="text-[26px] sm:text-[32px] font-black text-[#171717] dark:text-[#F5F5F5] tracking-tight leading-tight">
          {value}
        </div>

        {(trend || description) && (
          <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
            {trend && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 font-extrabold px-2 py-0.5 rounded-full text-[11px] border",
                  trend.isPositive === true &&
                    "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800",
                  trend.isPositive === false &&
                    "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-800",
                  trend.isPositive === null &&
                    "bg-[#F8F7F3] dark:bg-[#181818] text-[#525252] dark:text-[#D4D4D4] border-[#E5E2D8] dark:border-[#2A2A2A]"
                )}
              >
                {trend.isPositive === true && <TrendingUp className="w-3 h-3" />}
                {trend.isPositive === false && <TrendingDown className="w-3 h-3" />}
                {trend.isPositive === null && <Minus className="w-3 h-3" />}
                <span>{trend.value}</span>
              </span>
            )}

            {trend?.label && (
              <span className="text-[#737373] dark:text-[#A3A3A3] font-medium text-[11px]">
                {trend.label}
              </span>
            )}

            {!trend && description && (
              <span className="text-[#737373] dark:text-[#A3A3A3] font-medium text-xs">
                {description}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
