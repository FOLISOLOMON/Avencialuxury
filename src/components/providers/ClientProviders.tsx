"use client";

import React from "react";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { SessionMonitor } from "./SessionMonitor";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <SessionMonitor />
        {children}
      </ToastProvider>
    </ThemeProvider>
  );
}

export default ClientProviders;
