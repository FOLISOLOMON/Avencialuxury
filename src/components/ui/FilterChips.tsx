"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface FilterChipOption<T extends string = string> {
  id: T;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface FilterChipsProps<T extends string = string> {
  options: FilterChipOption<T>[];
  selected: T;
  onChange: (id: T) => void;
  className?: string;
}

export function FilterChips<T extends string = string>({
  options,
  selected,
  onChange,
  className,
}: FilterChipsProps<T>) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar scroll-smooth select-none",
        className
      )}
    >
      {options.map((opt) => {
        const isActive = selected === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 flex-shrink-0 border",
              isActive
                ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-accent/40"
            )}
          >
            {opt.icon}
            <span>{opt.label}</span>
            {opt.count !== undefined && (
              <span
                className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px] font-bold tabular-nums",
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
