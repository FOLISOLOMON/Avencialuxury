"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";

export interface SearchFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  rightAction?: React.ReactNode;
}

export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(
  ({ className, value, onChange, onClear, placeholder = "Search...", rightAction, ...props }, ref) => {
    return (
      <div className={cn("relative flex items-center w-full", className)}>
        <Search className="w-4 h-4 absolute left-3.5 text-muted-foreground pointer-events-none" />
        <input
          ref={ref}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "w-full h-11 min-h-[44px] pl-10 pr-10 text-base md:text-sm rounded-md bg-card text-foreground",
            "border border-border transition-colors duration-150",
            "placeholder:text-muted-foreground/70",
            "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
            rightAction && "pr-20"
          )}
          {...props}
        />
        <div className="absolute right-2.5 flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                onClear?.();
              }}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/60 transition-colors"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {rightAction}
        </div>
      </div>
    );
  }
);

SearchField.displayName = "SearchField";
