"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant =
  | "default"
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
    default: "bg-secondary text-secondary-foreground border-border/80",
    gold: "bg-primary/10 text-gold-ink border-primary/20",
    success: "bg-success/10 text-success border-success/20",
    warning: "bg-warning/10 text-warning border-warning/20",
    destructive: "bg-destructive/10 text-destructive border-destructive/20",
    info: "bg-info/10 text-info border-info/20",
    secondary: "bg-secondary text-muted-foreground border-border/80",
    outline: "bg-transparent text-muted-foreground border-border",
  };

  const dotColors: Record<BadgeVariant, string> = {
    default: "bg-primary",
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
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border select-none leading-normal",
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
