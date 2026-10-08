"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "outline" | "interactive";
  padding?: "none" | "sm" | "md" | "lg";
}

export function Card({
  className,
  variant = "default",
  padding = "md",
  children,
  ...props
}: CardProps) {
  const variantStyles = {
    default: "bg-card border border-border shadow-subtle",
    elevated: "bg-card-elevated border border-border shadow-card",
    outline: "bg-transparent border border-border",
    interactive:
      "bg-card border border-border shadow-subtle hover:border-primary/50 hover:shadow-card cursor-pointer transition-all duration-150 active:scale-[0.99]",
  };

  const paddingStyles = {
    none: "p-0",
    sm: "p-3",
    md: "p-4 sm:p-5",
    lg: "p-5 sm:p-6",
  };

  return (
    <div
      className={cn("rounded-lg text-foreground", variantStyles[variant], paddingStyles[padding], className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center justify-between gap-3 pb-3 border-b border-border/50", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("font-display text-sm font-bold tracking-tight text-foreground", className)}
      {...props}
    >
      {children}
    </h3>
  );
}
