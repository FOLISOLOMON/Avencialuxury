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
  variant?: "default" | "indigo" | "emerald" | "amber" | "rose";
  className?: string;
  onClick?: () => void;
}

const variantStyles = {
  default: "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700",
  indigo: "bg-gradient-to-br from-white to-indigo-50/40 dark:from-slate-900 dark:to-indigo-950/30 border-indigo-100 dark:border-indigo-900/50 hover:border-indigo-200 dark:hover:border-indigo-800",
  emerald: "bg-gradient-to-br from-white to-emerald-50/40 dark:from-slate-900 dark:to-emerald-950/30 border-emerald-100 dark:border-emerald-900/50 hover:border-emerald-200 dark:hover:border-emerald-800",
  amber: "bg-gradient-to-br from-white to-amber-50/40 dark:from-slate-900 dark:to-amber-950/30 border-amber-100 dark:border-amber-900/50 hover:border-amber-200 dark:hover:border-amber-800",
  rose: "bg-gradient-to-br from-white to-rose-50/40 dark:from-slate-900 dark:to-rose-950/30 border-rose-100 dark:border-rose-900/50 hover:border-rose-200 dark:hover:border-rose-800",
};

const iconStyles = {
  default: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/60 dark:border-slate-700",
  indigo: "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/60",
  emerald: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/60",
  amber: "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/60",
  rose: "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/60",
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
        "rounded-2xl border bg-white dark:bg-slate-900 shadow-xs p-5 transition-all duration-200 font-sans flex flex-col justify-between",
        variantStyles[variant],
        onClick && "cursor-pointer hover:shadow-md active:scale-[0.99]",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
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
        <div className="text-[26px] sm:text-[32px] font-black text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
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
                    "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                )}
              >
                {trend.isPositive === true && <TrendingUp className="w-3 h-3" />}
                {trend.isPositive === false && <TrendingDown className="w-3 h-3" />}
                {trend.isPositive === null && <Minus className="w-3 h-3" />}
                <span>{trend.value}</span>
              </span>
            )}

            {trend?.label && (
              <span className="text-slate-400 dark:text-slate-500 font-medium text-[11px]">
                {trend.label}
              </span>
            )}

            {!trend && description && (
              <span className="text-slate-500 dark:text-slate-400 font-medium text-xs">
                {description}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
