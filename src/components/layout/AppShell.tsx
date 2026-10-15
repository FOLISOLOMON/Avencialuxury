"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import { DesktopSidebar } from "./DesktopSidebar";
import { AppHeader } from "./AppHeader";
import { MobileBottomNav } from "./MobileBottomNav";
import { AiFloatingOrb } from "./AiFloatingOrb";
import { SettingsSidebar } from "@/components/settings/SettingsSidebar";
import { SettingsProvider } from "@/components/settings/SettingsContext";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSettingsMode =
    pathname === "/settings" || pathname.startsWith("/settings/");

  // Record safe non-settings routes for reliable "Go to Avencia" navigation
  useEffect(() => {
    if (!pathname.startsWith("/settings") && pathname !== "/settings") {
      try {
        sessionStorage.setItem("avencia:lastSafeRoute", pathname);
      } catch (e) {
        // sessionStorage restricted
      }
    }
  }, [pathname]);

  const shellContent = (
    <div className="h-screen h-[100dvh] flex w-full bg-background text-foreground antialiased font-sans overflow-hidden">
      {/* 1. Desktop Fixed Sidebar: Normal app navigation OR dedicated Settings navigation */}
      {isSettingsMode ? (
        <SettingsSidebar />
      ) : (
        <DesktopSidebar />
      )}

      {/* 2. Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Fixed Top Bar */}
        <AppHeader />

        {/* Scrollable Page Viewport */}
        <main className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
          <div
            className={cn(
              "w-full mx-auto",
              isSettingsMode
                ? "max-w-5xl px-3.5 sm:px-6 md:px-8 py-4 sm:py-6 pb-28 md:pb-12"
                : "max-w-7xl px-3.5 sm:px-6 md:px-8 py-5 pb-24 md:pb-12"
            )}
          >
            {children}
          </div>
        </main>
      </div>

      {/* 3. Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* 4. Floating AI Orb Button */}
      <AiFloatingOrb />
    </div>
  );

  if (isSettingsMode) {
    return <SettingsProvider>{shellContent}</SettingsProvider>;
  }

  return shellContent;
}
