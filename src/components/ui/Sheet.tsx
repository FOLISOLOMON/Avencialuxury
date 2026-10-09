"use client";

import React, { useEffect, useCallback, useState } from "react";
import { createPortal } from "react-dom";
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!isOpen || !mounted) return null;

  const sizeClasses: Record<string, string> = {
    sm: "max-w-md",
    default: "max-w-md md:max-w-xl",
    lg: "max-w-lg md:max-w-2xl",
    full: "max-w-4xl",
  };

  const sheetContent = (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center pointer-events-auto">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-xs transition-opacity animate-fade-in cursor-pointer"
        aria-hidden="true"
      />

      {/* Sheet Content Container */}
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          // Mobile: slide up bottom sheet
          "relative w-full max-h-[92vh] max-h-[92dvh] bg-card text-foreground",
          "rounded-t-lg md:rounded-lg border-t md:border border-border shadow-lg",
          "flex flex-col overflow-hidden animate-slide-up z-10",
          // Desktop: centered floating dialog
          sizeClasses[size],
          className
        )}
      >
        {/* Mobile drag pill handle - tapping it also closes the sheet */}
        <button
          type="button"
          onClick={onClose}
          className="flex md:hidden justify-center items-center pt-3 pb-2 w-full cursor-pointer touch-none bg-transparent border-0 focus:outline-hidden"
          aria-label="Close sheet"
        >
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30 hover:bg-muted-foreground/50 transition-colors" />
        </button>

        {/* Header */}
        {(title || !hideCloseButton) && (
          <div className="flex items-start justify-between px-5 pt-3 pb-3 border-b border-border flex-shrink-0">
            <div className="space-y-0.5 pr-6">
              {typeof title === "string" ? (
                <h3 className="font-semibold text-base tracking-tight text-foreground">
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
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="p-1.5 -mr-1 text-muted-foreground hover:text-foreground active:text-foreground rounded hover:bg-muted transition-colors flex-shrink-0 flex items-center justify-center cursor-pointer z-20"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
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
          <div className="px-5 py-3.5 border-t border-border/60 bg-card/60 backdrop-blur-xs flex-shrink-0 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(sheetContent, document.body);
}
