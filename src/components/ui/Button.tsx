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
        "bg-primary text-primary-foreground hover:bg-gold-600 active:bg-gold-700 font-semibold",
      gold:
        "bg-primary text-primary-foreground hover:bg-gold-600 active:bg-gold-700 font-semibold",
      secondary:
        "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border",
      outline:
        "border border-border bg-card hover:bg-secondary text-foreground hover:border-border",
      ghost:
        "text-foreground hover:bg-secondary hover:text-foreground",
      destructive:
        "bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold",
    };

    // Disciplined commercial control heights
    const sizeStyles: Record<ButtonSize, string> = {
      sm: "h-8 px-2.5 text-xs rounded-md gap-1.5",
      md: "h-9.5 px-3.5 text-xs sm:text-sm rounded-md gap-2",
      lg: "h-11 px-5 text-sm rounded-md gap-2.5",
      icon: "h-9 w-9 p-0 rounded-md",
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
