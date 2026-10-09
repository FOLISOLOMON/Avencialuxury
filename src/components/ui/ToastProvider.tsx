"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toast: {
    success: (message: string, title?: string) => void;
    error: (message: string, title?: string) => void;
    warning: (message: string, title?: string) => void;
    info: (message: string, title?: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string, title?: string, customDuration?: number) => {
      const id = Math.random().toString(36).substring(2, 9);
      const defaultDuration =
        type === "success" ? 3000 : type === "info" ? 4000 : type === "warning" ? 5000 : 6000;
      const duration = customDuration || defaultDuration;

      setToasts((prev) => [...prev, { id, type, title, message, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const toast = {
    success: (message: string, title?: string) => addToast("success", message, title),
    error: (message: string, title?: string) => addToast("error", message, title),
    warning: (message: string, title?: string) => addToast("warning", message, title),
    info: (message: string, title?: string) => addToast("info", message, title),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Global Toast Container */}
      <div className="fixed bottom-20 md:bottom-6 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none font-sans px-2">
        {toasts.map((t) => {
          const Icon =
            t.type === "success"
              ? CheckCircle2
              : t.type === "warning"
              ? AlertTriangle
              : t.type === "error"
              ? AlertCircle
              : Info;

          const bgBorder =
            t.type === "success"
              ? "border-emerald-500/30 text-foreground"
              : t.type === "warning"
              ? "border-amber-500/30 text-foreground"
              : t.type === "error"
              ? "border-destructive/30 text-foreground"
              : "border-border text-foreground";

          const iconColor =
            t.type === "success"
              ? "text-success bg-success/10"
              : t.type === "warning"
              ? "text-warning bg-warning/10"
              : t.type === "error"
              ? "text-destructive bg-destructive/10"
              : "text-primary bg-primary/10";

          return (
            <div
              key={t.id}
              className={`pointer-events-auto rounded-md border bg-card p-3 shadow-md flex items-start gap-3 animate-in slide-in-from-bottom-3 fade-in duration-200 ${bgBorder}`}
            >
              <div className={`p-1.5 rounded flex-shrink-0 ${iconColor}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                {t.title && <h4 className="font-semibold text-xs text-foreground mb-0.5">{t.title}</h4>}
                <p className="text-xs text-muted-foreground leading-snug">{t.message}</p>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context.toast;
}

export default ToastProvider;
