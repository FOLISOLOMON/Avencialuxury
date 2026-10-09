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
  emerald: "bg-success/10 text-success border-success/25",
  amber: "bg-warning/10 text-warning border-warning/25",
  rose: "bg-destructive/10 text-destructive border-destructive/25",
  slate: "bg-secondary text-muted-foreground border-border/80",
};

const dotStyles = {
  emerald: "bg-success",
  amber: "bg-warning",
  rose: "bg-destructive",
  slate: "bg-muted-foreground",
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
        "inline-flex items-center gap-1.5 rounded text-xs font-medium px-2 py-0.5 border font-sans capitalize select-none",
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
