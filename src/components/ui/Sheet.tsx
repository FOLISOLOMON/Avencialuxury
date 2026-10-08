"use client";

import React, { useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "default" | "sm" | "lg" | "full";
  className?: string;
  hideCloseButton?: boolean;
}

export function Sheet({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = "default",
  className,
  hideCloseButton = false,
}: SheetProps) {
  // ESC key handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const sizeClasses: Record<string, string> = {
    sm: "md:max-w-md",
    default: "md:max-w-xl",
    lg: "md:max-w-2xl",
    full: "md:max-w-4xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-xs transition-opacity animate-fade-in"
        aria-hidden="true"
      />

      {/* Sheet Content Container */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          // Mobile: slide up bottom sheet
          "relative w-full max-h-[92vh] max-h-[92dvh] bg-card text-foreground",
          "rounded-t-2xl md:rounded-2xl border-t md:border border-border shadow-floating",
          "flex flex-col overflow-hidden animate-slide-up z-10",
          // Desktop: centered floating dialog
          sizeClasses[size],
          className
        )}
      >
        {/* Mobile drag pill handle */}
        <div className="flex md:hidden justify-center pt-3 pb-1 w-full cursor-grab">
          <div className="w-10 h-1.5 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        {(title || !hideCloseButton) && (
          <div className="flex items-start justify-between px-5 pt-3 pb-3 border-b border-border/60 flex-shrink-0">
            <div className="space-y-0.5 pr-6">
              {typeof title === "string" ? (
                <h3 className="font-display text-lg font-bold tracking-tight text-foreground">
                  {title}
                </h3>
              ) : (
                title
              )}
              {description && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {description}
                </p>
              )}
            </div>
            {!hideCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 -mr-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/60 transition-colors flex-shrink-0 min-h-[40px] min-w-[40px] flex items-center justify-center"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 custom-scrollbar">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-5 py-3.5 border-t border-border/60 bg-card/60 backdrop-blur-xs flex-shrink-0 pb-safe">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
