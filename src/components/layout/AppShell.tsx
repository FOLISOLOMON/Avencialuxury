"use client";

import React from "react";
import { DesktopSidebar } from "./DesktopSidebar";
import { AppHeader } from "./AppHeader";
import { MobileBottomNav } from "./MobileBottomNav";
import { AiFloatingOrb } from "./AiFloatingOrb";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex w-full bg-background text-foreground antialiased font-sans">
      {/* 1. Desktop Fixed Sidebar */}
      <DesktopSidebar />

      {/* 2. Main Content Container */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <AppHeader />

        {/* Page Main Viewport */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 md:px-8 py-5 pb-24 md:pb-12">
          {children}
        </main>
      </div>

      {/* 3. Mobile Bottom Navigation (5 destinations) */}
      <MobileBottomNav />

      {/* 4. Floating AI Orb Button (Positioned above bottom nav) */}
      <AiFloatingOrb />
    </div>
  );
}
