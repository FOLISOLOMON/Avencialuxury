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
        "text-center py-12 px-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col items-center justify-center font-sans",
        className
      )}
    >
      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 text-slate-400 dark:text-slate-500 flex items-center justify-center mb-3 shadow-2xs">
        {React.isValidElement(IconComponent) ? (
          IconComponent
        ) : isLucideIcon(IconComponent) ? (
          <IconComponent className="w-6 h-6 text-slate-400 dark:text-slate-500" />
        ) : (
          <Inbox className="w-6 h-6 text-slate-400 dark:text-slate-500" />
        )}
      </div>

      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
        {title}
      </h3>

      {description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
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
                "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:focus:ring-indigo-500 focus:ring-offset-2",
                (action as EmptyStateAction).variant === "secondary"
                  ? "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                  : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/20"
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
