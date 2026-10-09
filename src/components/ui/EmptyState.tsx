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
        "text-center py-12 px-6 rounded-md border border-dashed border-border bg-card/50 flex flex-col items-center justify-center",
        className
      )}
    >
      <div className="w-10 h-10 rounded-md bg-muted text-muted-foreground flex items-center justify-center mb-3">
        {React.isValidElement(IconComponent) ? (
          IconComponent
        ) : isLucideIcon(IconComponent) ? (
          <IconComponent className="w-5 h-5" />
        ) : (
          <Inbox className="w-5 h-5" />
        )}
      </div>

      <h3 className="text-sm font-semibold text-foreground tracking-tight">
        {title}
      </h3>

      {description && (
        <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 leading-relaxed">
          {description}
        </p>
      )}

      {action && (
        <div className="mt-4">
          {React.isValidElement(action) ? (
            action
          ) : typeof action === "object" && "label" in action ? (
            <button
              onClick={(action as EmptyStateAction).onClick}
              className={cn(
                "inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer",
                (action as EmptyStateAction).variant === "secondary"
                  ? "bg-card border border-border text-foreground hover:bg-muted"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
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
