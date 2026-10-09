"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface TabItem {
  id: string;
  label: string;
  count?: number | string;
  icon?: LucideIcon;
}

export interface FilterTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function FilterTabs({
  tabs,
  activeTab,
  onChange,
  className,
}: FilterTabsProps) {
  return (
    <div
      className={cn(
        "rounded-md bg-muted border border-border p-0.5 flex items-center gap-0.5 overflow-x-auto scrollbar-none max-w-full",
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap rounded px-3 py-1.5 text-xs transition-colors cursor-pointer",
              isActive
                ? "bg-card text-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground font-medium"
            )}
          >
            {Icon && (
              <Icon
                className={cn(
                  "w-3.5 h-3.5 flex-shrink-0",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              />
            )}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  "px-1.5 py-0.2 rounded text-[10px] font-semibold tabular-nums ml-0.5",
                  isActive
                    ? "bg-muted text-foreground"
                    : "bg-muted/80 text-muted-foreground"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
