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
        "rounded-full bg-[#F8F7F3] dark:bg-[#181818] border border-[#E5E2D8] dark:border-[#2A2A2A] p-1 flex items-center gap-1 overflow-x-auto scrollbar-none font-sans max-w-full",
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
              "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500",
              isActive
                ? "bg-gold-500 text-white font-black shadow-md shadow-gold-500/20"
                : "text-[#525252] dark:text-[#D4D4D4] hover:text-[#171717] dark:hover:text-[#F5F5F5] font-semibold hover:bg-gold-500/10 dark:hover:bg-gold-500/15"
            )}
          >
            {Icon && (
              <Icon
                className={cn(
                  "w-3.5 h-3.5 flex-shrink-0",
                  isActive ? "text-white" : "text-[#737373] dark:text-[#A3A3A3]"
                )}
              />
            )}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ml-0.5",
                  isActive
                    ? "bg-gold-600/80 text-white"
                    : "bg-[#E5E2D8] dark:bg-[#2A2A2A] text-[#171717] dark:text-[#F5F5F5]"
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
