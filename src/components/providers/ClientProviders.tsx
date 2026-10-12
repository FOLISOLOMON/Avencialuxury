"use client";

import React from "react";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { SessionMonitor } from "./SessionMonitor";
import { LiveSyncProvider } from "./LiveSyncProvider";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <SessionMonitor />
        <LiveSyncProvider />
        {children}
      </ToastProvider>
    </ThemeProvider>
  );
}

export default ClientProviders;
