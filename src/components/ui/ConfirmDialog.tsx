"use client";

import React from "react";
import { Sheet } from "./Sheet";
import { Button } from "./Button";
import { AlertTriangle } from "lucide-react";

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  variant?: "destructive" | "warning" | "primary";
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isLoading = false,
  variant = "destructive",
}: ConfirmDialogProps) {
  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      title={
        <div className="flex items-center gap-2 text-foreground">
          <div
            className={`p-2 rounded-lg ${
              variant === "destructive"
                ? "bg-destructive/15 text-destructive"
                : variant === "warning"
                ? "bg-warning/15 text-warning"
                : "bg-primary/15 text-gold-ink"
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <span className="font-display font-bold text-base">{title}</span>
        </div>
      }
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button variant="outline" onClick={onClose} disabled={isLoading} className="flex-1 sm:flex-initial">
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "destructive" ? "destructive" : "primary"}
            onClick={onConfirm}
            isLoading={isLoading}
            className="flex-1 sm:flex-initial"
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="text-sm text-muted-foreground leading-relaxed py-2">{message}</p>
    </Sheet>
  );
}
