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
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className,
      variant = "ghost",
      size = "md",
      isLoading = false,
      disabled,
      children,
      type = "button",
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center rounded-md transition-all duration-150 select-none disabled:opacity-50 disabled:pointer-events-none active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2";

    const variantStyles: Record<IconButtonVariant, string> = {
      ghost: "text-muted-foreground hover:text-foreground hover:bg-accent/60",
      outline: "border border-border bg-card text-foreground hover:bg-accent/60 hover:border-primary/40",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      primary: "bg-primary text-primary-foreground hover:bg-gold-600 shadow-sm shadow-gold-500/20",
      destructive: "text-destructive hover:bg-destructive/10 hover:text-destructive",
    };

    // Mobile touch target: ensure min 44px on md/lg, sm has 36px with padding
    const sizeStyles: Record<IconButtonSize, string> = {
      sm: "w-9 h-9 min-h-[36px] min-w-[36px] p-2 text-xs",
      md: "w-11 h-11 min-h-[44px] min-w-[44px] p-2.5 text-sm",
      lg: "w-12 h-12 min-h-[48px] min-w-[48px] p-3 text-base",
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-current" /> : children}
      </button>
    );
  }
);

IconButton.displayName = "IconButton";
