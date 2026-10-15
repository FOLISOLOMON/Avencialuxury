"use client";

import React from "react";

/**
 * QuickPinLock has been retired in favor of native authenticated sessions.
 * Preserved as a pass-through component for backwards compatibility.
 */
export function QuickPinLock({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
