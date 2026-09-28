"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type StatusVariant =
  | "COMPLETED"
  | "PAID"
  | "ACTIVE"
  | "IN_STOCK"
  | "PARTIAL"
  | "LOW_STOCK"
  | "PENDING"
  | "VOIDED"
  | "UNPAID"
  | "OUT_OF_STOCK"
  | "FAILED"
  | "CANCELLED"
  | "NEUTRAL"
  | "DRAFT"
  | string;

export interface StatusBadgeProps {
  status: StatusVariant;
  label?: string;
  showDot?: boolean;
  className?: string;
}

export function getStatusCategory(status: string): "emerald" | "amber" | "rose" | "slate" {
  const s = status.toUpperCase().replace(/\s+/g, "_");
  if (
    [
      "COMPLETED",
      "PAID",
      "ACTIVE",
      "IN_STOCK",
      "SUCCESS",
      "APPROVED",
      "DELIVERED",
    ].includes(s)
  ) {
    return "emerald";
  }
  if (
    [
      "PARTIAL",
      "LOW_STOCK",
      "PENDING",
      "WARNING",
      "IN_PROGRESS",
      "RESTOCKING",
    ].includes(s)
  ) {
    return "amber";
  }
  if (
    [
      "VOIDED",
      "UNPAID",
      "OUT_OF_STOCK",
      "FAILED",
      "CANCELLED",
      "ERROR",
      "OVERDUE",
    ].includes(s)
  ) {
    return "rose";
  }
  return "slate";
}

const badgeStyles = {
  emerald:
    "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800 shadow-2xs",
  amber:
    "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800 shadow-2xs",
  rose:
    "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-800 shadow-2xs",
  slate:
    "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 shadow-2xs",
};

const dotStyles = {
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  slate: "bg-slate-400 dark:bg-slate-500",
};

export function StatusBadge({
  status,
  label,
  showDot = true,
  className,
}: StatusBadgeProps) {
  const category = getStatusCategory(status);
  const displayLabel = label || status.replace(/_/g, " ");

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full text-xs font-semibold px-2.5 py-0.5 border font-sans tracking-wide capitalize",
        badgeStyles[category],
        className
      )}
    >
      {showDot && (
        <span
          className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", dotStyles[category])}
        />
      )}
      <span>{displayLabel}</span>
    </span>
  );
}
