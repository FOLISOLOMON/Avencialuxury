"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse bg-slate-200/80 dark:bg-slate-800/80 rounded-xl", className)}
    />
  );
}

export function MetricCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-4 space-y-3 font-sans shadow-xs",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-3 w-24 rounded-sm" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
      <Skeleton className="h-6 w-32 rounded-md" />
      <div className="flex items-center gap-2 pt-1">
        <Skeleton className="h-4 w-16 rounded" />
        <Skeleton className="h-3 w-20 rounded-sm" />
      </div>
    </div>
  );
}

export function StatGridSkeleton({
  count = 4,
  columns = 4,
  className,
}: {
  count?: number;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}) {
  const columnClasses = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-4 mb-6", columnClasses[columns], className)}>
      {Array.from({ length: count }).map((_, i) => (
        <MetricCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function TableSkeleton({
  rows = 5,
  cols = 4,
  className,
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card overflow-hidden p-4 space-y-3 font-sans",
        className
      )}
    >
      <div className="flex items-center justify-between gap-4 pb-2 border-b border-border">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3.5 flex-1 rounded-sm" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center justify-between gap-4 py-1.5">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={c}
              className={cn(
                "h-3.5 rounded-sm",
                c === 0 ? "w-1/3" : "flex-1"
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-5 space-y-3 font-sans",
        className
      )}
    >
      <Skeleton className="h-4 w-1/3 rounded-sm" />
      <Skeleton className="h-3 w-2/3 rounded-sm" />
      <div className="space-y-2 pt-2">
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    </div>
  );
}
