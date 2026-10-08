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
              ? "bg-white dark:bg-[#151515] border-emerald-200 dark:border-emerald-900/60 text-[#171717] dark:text-[#F5F5F5] shadow-emerald-500/10"
              : t.type === "warning"
              ? "bg-white dark:bg-[#151515] border-amber-200 dark:border-amber-900/60 text-[#171717] dark:text-[#F5F5F5] shadow-amber-500/10"
              : t.type === "error"
              ? "bg-white dark:bg-[#151515] border-rose-200 dark:border-rose-900/60 text-[#171717] dark:text-[#F5F5F5] shadow-rose-500/10"
              : "bg-white dark:bg-[#151515] border-gold-500/30 text-[#171717] dark:text-[#F5F5F5] shadow-gold-500/10";

          const iconColor =
            t.type === "success"
              ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60"
              : t.type === "warning"
              ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60"
              : t.type === "error"
              ? "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60"
              : "text-gold-600 dark:text-gold-400 bg-gold-500/15";

          return (
            <div
              key={t.id}
              className={`pointer-events-auto rounded-2xl border p-3.5 shadow-xl flex items-start gap-3 animate-in slide-in-from-bottom-3 fade-in duration-200 ${bgBorder}`}
            >
              <div className={`p-2 rounded-xl flex-shrink-0 ${iconColor}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                {t.title && <h4 className="font-extrabold text-xs text-[#171717] dark:text-[#F5F5F5] mb-0.5">{t.title}</h4>}
                <p className="text-xs font-semibold text-[#525252] dark:text-[#D4D4D4] leading-snug">{t.message}</p>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="p-1 rounded-lg text-[#737373] dark:text-[#A3A3A3] hover:text-[#171717] dark:hover:text-[#F5F5F5] hover:bg-[#F8F7F3] dark:hover:bg-[#181818] transition-colors flex-shrink-0"
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
