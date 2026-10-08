"use client";

import React from "react";
import { cn, formatCurrency } from "@/lib/utils";

export interface MoneyProps extends React.HTMLAttributes<HTMLSpanElement> {
  amount: number | string | null | undefined;
  currency?: string;
  showSign?: boolean;
  colored?: boolean;
  size?: "sm" | "md" | "lg" | "xl" | "hero";
}

export function Money({
  amount,
  currency = "GHS",
  showSign = false,
  colored = false,
  size = "md",
  className,
  ...props
}: MoneyProps) {
  const num = typeof amount === "number" ? amount : parseFloat(String(amount || 0));
  const isPositive = num > 0;
  const isNegative = num < 0;

  const sizeClasses = {
    sm: "text-xs font-semibold",
    md: "text-sm font-bold",
    lg: "text-base font-extrabold font-display tracking-tight",
    xl: "text-xl sm:text-2xl font-black font-display tracking-tight",
    hero: "text-2xl sm:text-4xl font-black font-display tracking-tight",
  };

  const colorClass = colored
    ? isPositive
      ? "text-success"
      : isNegative
      ? "text-destructive"
      : "text-foreground"
    : "text-foreground";

  const formatted = formatCurrency(Math.abs(num), currency);
  const sign = showSign ? (isPositive ? "+" : isNegative ? "-" : "") : isNegative ? "-" : "";

  return (
    <span
      className={cn("tabular-nums inline-block select-all", sizeClasses[size], colorClass, className)}
      {...props}
    >
      {sign}
      {formatted}
    </span>
  );
}
