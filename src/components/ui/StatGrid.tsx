"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface StatGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

const columnClasses = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};

export function StatGrid({
  children,
  columns = 4,
  className,
}: StatGridProps) {
  return (
    <div
      className={cn(
        "grid gap-4 sm:gap-5 mb-6 sm:mb-8 font-sans",
        columnClasses[columns],
        className
      )}
    >
      {children}
    </div>
  );
}
