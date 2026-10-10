"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export type IconButtonVariant = "ghost" | "outline" | "secondary" | "primary" | "destructive";
export type IconButtonSize = "sm" | "md" | "lg";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  "aria-label": string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  isLoading?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className,
      variant = "ghost",
      size = "md",
      isLoading = false,
      disabled,
      icon: Icon,
      children,
      type = "button",
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center rounded-md transition-all duration-150 select-none disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1 ring-offset-background shrink-0";

    const variantStyles: Record<IconButtonVariant, string> = {
      ghost: "text-muted-foreground hover:text-foreground hover:bg-secondary",
      outline: "border border-border bg-card text-foreground hover:bg-secondary hover:border-border",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border",
      primary: "bg-primary text-primary-foreground hover:bg-gold-600 active:bg-gold-700 shadow-xs",
      destructive: "text-destructive hover:bg-destructive/10 hover:text-destructive",
    };

    const sizeStyles: Record<IconButtonSize, string> = {
      sm: "w-8 h-8 p-1.5 text-xs",
      md: "w-10 h-10 p-2 text-sm",
      lg: "w-11 h-11 p-2.5 text-base",
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current" />
        ) : Icon ? (
          <Icon className={size === "sm" ? "w-3.5 h-3.5" : size === "lg" ? "w-5 h-5" : "w-4 h-4"} />
        ) : (
          children
        )}
      </button>
    );
  }
);

IconButton.displayName = "IconButton";
