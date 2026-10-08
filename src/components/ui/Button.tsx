"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive" | "gold";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      type = "button",
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-semibold transition-all duration-150 select-none disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2";

    const variantStyles: Record<ButtonVariant, string> = {
      primary:
        "bg-primary text-primary-foreground hover:bg-gold-600 active:bg-gold-700 shadow-sm shadow-gold-500/20 font-bold",
      gold:
        "bg-primary text-primary-foreground hover:bg-gold-600 active:bg-gold-700 shadow-sm shadow-gold-500/20 font-bold",
      secondary:
        "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/60",
      outline:
        "border border-border bg-card hover:bg-accent/60 text-foreground hover:border-primary/40",
      ghost:
        "text-foreground hover:bg-accent/60 hover:text-foreground",
      destructive:
        "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm shadow-destructive/20 font-bold",
    };

    // Mobile first: min-h-[44px] for touch targets on standard sizes
    const sizeStyles: Record<ButtonSize, string> = {
      sm: "h-9 min-h-[36px] px-3 text-xs rounded-md gap-1.5",
      md: "h-11 min-h-[44px] px-4 text-sm rounded-md gap-2",
      lg: "h-12 min-h-[48px] px-5 text-base rounded-md gap-2.5",
      icon: "h-11 w-11 min-h-[44px] min-w-[44px] p-0 rounded-md",
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
        ) : (
          leftIcon
        )}
        {children && <span>{children}</span>}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = "Button";
