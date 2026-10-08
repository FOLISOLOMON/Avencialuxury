"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant =
  | "gold"
  | "success"
  | "warning"
  | "destructive"
  | "info"
  | "secondary"
  | "outline";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

export function Badge({
  className,
  variant = "secondary",
  dot = false,
  children,
  ...props
}: BadgeProps) {
  const variantStyles: Record<BadgeVariant, string> = {
    gold: "bg-gold-500/15 text-gold-ink border-gold-500/30",
    success: "bg-success/15 text-success border-success/30",
    warning: "bg-warning/15 text-warning border-warning/30",
    destructive: "bg-destructive/15 text-destructive border-destructive/30",
    info: "bg-info/15 text-info border-info/30",
    secondary: "bg-secondary text-secondary-foreground border-transparent",
    outline: "bg-transparent text-foreground border-border",
  };

  const dotColors: Record<BadgeVariant, string> = {
    gold: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    destructive: "bg-destructive",
    info: "bg-info",
    secondary: "bg-muted-foreground",
    outline: "bg-foreground",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border select-none leading-normal",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", dotColors[variant])} />}
      <span>{children}</span>
    </span>
  );
}
