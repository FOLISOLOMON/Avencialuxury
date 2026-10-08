"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, leftElement, rightElement, disabled, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-foreground tracking-tight select-none"
          >
            {label}
            {props.required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {leftElement && (
            <div className="absolute left-3 flex items-center pointer-events-none text-muted-foreground z-10">
              {leftElement}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={cn(
              // 16px on mobile (text-base) to prevent iOS auto-zoom, text-sm on md+
              "w-full h-11 min-h-[44px] px-3.5 text-base md:text-sm rounded-md bg-card text-foreground",
              "border border-border transition-colors duration-150",
              "placeholder:text-muted-foreground/70",
              "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
              "disabled:bg-muted/40 disabled:text-muted-foreground disabled:cursor-not-allowed",
              error && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
              leftElement && "pl-10",
              rightElement && "pr-10",
              className
            )}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-3 flex items-center text-muted-foreground">
              {rightElement}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-destructive font-medium mt-1">{error}</p>}
        {hint && !error && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
