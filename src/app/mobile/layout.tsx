"use client";

import React, { useEffect } from "react";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { MobileNavBar } from "@/components/mobile/MobileNavBar";
import { MobileAiOrb } from "@/components/mobile/MobileAiOrb";
import { syncManager } from "@/lib/mobile/sync";

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Register PWA service worker in production or local browser
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("Avencia PWA Service Worker registered:", reg.scope))
        .catch((err) => console.warn("PWA Service Worker registration failed:", err));
    }

    // Trigger initial background cache refresh & sync
    syncManager.syncNow("app_launch");
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground antialiased flex flex-col max-w-md mx-auto shadow-2xl relative border-x border-border/40">
      {/* 1. Mobile Top Header with Live Sync Pill */}
      <MobileHeader />

      {/* 2. Main Mobile Page Viewport */}
      <main className="flex-1 pb-28 px-3.5 pt-3 w-full">
        {children}
      </main>

      {/* 3. Floating AI Orb Button */}
      <MobileAiOrb />

      {/* 4. Bottom Thumb-Friendly Navigation Bar */}
      <MobileNavBar />
    </div>
  );
}
