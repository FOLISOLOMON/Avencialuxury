"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Calendar } from "lucide-react";

export type QuickDateRange = "TODAY" | "YESTERDAY" | "LAST_7_DAYS" | "THIS_MONTH" | "LAST_MONTH" | "THIS_YEAR" | "CUSTOM";

export interface DateRangeBarProps {
  value: QuickDateRange;
  onChange: (val: QuickDateRange) => void;
  startDate?: string;
  endDate?: string;
  onCustomDateChange?: (start: string, end: string) => void;
  className?: string;
}

const PRESETS: Array<{ id: QuickDateRange; label: string }> = [
  { id: "TODAY", label: "Today" },
  { id: "YESTERDAY", label: "Yesterday" },
  { id: "LAST_7_DAYS", label: "7 Days" },
  { id: "THIS_MONTH", label: "This Month" },
  { id: "LAST_MONTH", label: "Last Month" },
  { id: "THIS_YEAR", label: "Year" },
];

export function DateRangeBar({
  value,
  onChange,
  startDate,
  endDate,
  onCustomDateChange,
  className,
}: DateRangeBarProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar select-none">
        <div className="flex items-center p-1 rounded-lg bg-card border border-border shadow-xs gap-1">
          {PRESETS.map((p) => {
            const isActive = value === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onChange(p.id)}
                className={cn(
                  "px-3 py-1.5 min-h-[34px] rounded-md text-xs font-semibold whitespace-nowrap transition-all duration-150 flex-shrink-0",
                  isActive
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {value === "CUSTOM" && onCustomDateChange && (
        <div className="flex items-center gap-2 pt-1">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <input
            type="date"
            value={startDate || ""}
            onChange={(e) => onCustomDateChange(e.target.value, endDate || "")}
            className="h-9 px-2 text-xs rounded-md bg-card border border-border text-foreground"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <input
            type="date"
            value={endDate || ""}
            onChange={(e) => onCustomDateChange(startDate || "", e.target.value)}
            className="h-9 px-2 text-xs rounded-md bg-card border border-border text-foreground"
          />
        </div>
      )}
    </div>
  );
}
