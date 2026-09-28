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
        "rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 p-1 flex items-center gap-1 overflow-x-auto scrollbar-none font-sans max-w-full",
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
              "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs transition-all duration-150 focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 dark:focus-visible:ring-indigo-500 focus-visible:ring-offset-1",
              isActive
                ? "bg-indigo-600 dark:bg-indigo-600 text-white font-bold shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-semibold hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
            )}
          >
            {Icon && (
              <Icon
                className={cn(
                  "w-3.5 h-3.5 flex-shrink-0",
                  isActive ? "text-white" : "text-slate-500 dark:text-slate-400"
                )}
              />
            )}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ml-0.5",
                  isActive
                    ? "bg-indigo-500/80 text-white"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
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
