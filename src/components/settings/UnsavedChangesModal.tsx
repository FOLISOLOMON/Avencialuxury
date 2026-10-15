"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface UnsavedChangesModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  categoryName?: string;
}

export function UnsavedChangesModal({
  isOpen,
  onConfirm,
  onCancel,
  categoryName,
}: UnsavedChangesModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="unsaved-modal-title"
    >
      <div className="bg-card w-full max-w-md rounded-xl border border-border shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-500">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-1 min-w-0">
            <h3
              id="unsaved-modal-title"
              className="text-base font-bold text-foreground leading-tight"
            >
              Unsaved Settings
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              You have unsaved modifications in{" "}
              <span className="font-semibold text-foreground">
                {categoryName || "Settings"}
              </span>
              . If you return to Avencia now, these changes will not be saved.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/80">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="text-xs"
          >
            Keep Editing
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onConfirm}
            className="text-xs font-semibold"
          >
            Discard & Return to Avencia
          </Button>
        </div>
      </div>
    </div>
  );
}
