"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  variant?: "primary" | "secondary";
}

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon | React.ReactNode;
  action?: EmptyStateAction | React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon: IconComponent = Inbox,
  action,
  className,
}: EmptyStateProps) {
  const isLucideIcon = (
    icon: any
  ): icon is LucideIcon => typeof icon === "function" || (typeof icon === "object" && icon !== null && "$$typeof" in icon);

  return (
    <div
      className={cn(
        "text-center py-12 px-6 rounded-2xl border border-dashed border-[#E5E2D8] dark:border-[#2A2A2A] bg-[#F8F7F3]/60 dark:bg-[#151515]/60 flex flex-col items-center justify-center font-sans",
        className
      )}
    >
      <div className="w-12 h-12 rounded-2xl bg-gold-500/10 border border-gold-500/20 text-gold-600 dark:text-gold-400 flex items-center justify-center mb-3 shadow-xs">
        {React.isValidElement(IconComponent) ? (
          IconComponent
        ) : isLucideIcon(IconComponent) ? (
          <IconComponent className="w-6 h-6 text-gold-600 dark:text-gold-400" />
        ) : (
          <Inbox className="w-6 h-6 text-gold-600 dark:text-gold-400" />
        )}
      </div>

      <h3 className="text-base font-bold text-[#171717] dark:text-[#F5F5F5] tracking-tight">
        {title}
      </h3>

      {description && (
        <p className="text-xs text-[#737373] dark:text-[#A3A3A3] max-w-sm mx-auto mt-1 leading-relaxed">
          {description}
        </p>
      )}

      {action && (
        <div className="mt-5">
          {React.isValidElement(action) ? (
            action
          ) : typeof action === "object" && "label" in action ? (
            <button
              onClick={(action as EmptyStateAction).onClick}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500",
                (action as EmptyStateAction).variant === "secondary"
                  ? "bg-white dark:bg-[#181818] border border-[#E5E2D8] dark:border-[#2A2A2A] text-[#171717] dark:text-[#F5F5F5] hover:bg-gold-500/10"
                  : "bg-gold-500 text-white hover:bg-gold-600 shadow-lg shadow-gold-500/25"
              )}
            >
              {(action as EmptyStateAction).icon && (
                <span className="w-4 h-4">
                  {React.createElement((action as EmptyStateAction).icon!, {
                    className: "w-4 h-4",
                  })}
                </span>
              )}
              <span>{(action as EmptyStateAction).label}</span>
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
