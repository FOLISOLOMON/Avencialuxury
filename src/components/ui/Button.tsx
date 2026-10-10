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
      "inline-flex items-center justify-center font-medium transition-all duration-150 select-none disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1 ring-offset-background";

    const variantStyles: Record<ButtonVariant, string> = {
      primary:
        "bg-primary text-primary-foreground hover:bg-gold-600 active:bg-gold-700 shadow-xs font-semibold",
      gold:
        "bg-primary text-primary-foreground hover:bg-gold-600 active:bg-gold-700 shadow-xs font-semibold",
      secondary:
        "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border font-medium",
      outline:
        "border border-border bg-card hover:bg-secondary text-foreground hover:border-border font-medium",
      ghost:
        "text-foreground hover:bg-secondary hover:text-foreground font-medium",
      destructive:
        "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-xs font-semibold",
    };

    // Standardized dimensions across desktop & mobile
    // sm: ~32px height, 12px padding, 12px text
    // md: ~40px height, 16px padding, 14px text
    // lg: ~44-48px height, 20px padding, 15px text (mobile hero/primary checkout)
    // icon: 40px square
    const sizeStyles: Record<ButtonSize, string> = {
      sm: "h-8 px-3 text-xs rounded-md gap-1.5",
      md: "h-10 px-4 text-sm rounded-md gap-2",
      lg: "h-11 sm:h-12 px-5 text-sm sm:text-base rounded-md gap-2.5 font-semibold",
      icon: "h-10 w-10 p-0 rounded-md shrink-0",
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
          <Loader2 className="w-4 h-4 animate-spin text-current shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0 flex items-center">{leftIcon}</span>
        )}
        {children}
        {!isLoading && rightIcon && (
          <span className="shrink-0 flex items-center">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
