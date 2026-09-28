"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, Lock } from "lucide-react";
import { SideDrawer } from "./SideDrawer";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ProfileDropdown } from "./ProfileDropdown";

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Dashboard", subtitle: "Real-time performance, FIFO stock allocation & financials" },
  "/products": { title: "Product Catalog", subtitle: "Manage items, pricing & low-stock alerts" },
  "/batches": { title: "Stock Batches", subtitle: "Track batch purchases, FIFO stock & transport costs" },
  "/inventory": { title: "Inventory & Ledger", subtitle: "Real-time stock balances & audit trail" },
  "/sales": { title: "Sales & POS Entry", subtitle: "Process rapid sales with live margin calculation" },
  "/expenses": { title: "Operational Expenses", subtitle: "Track transport, packaging & operational spending" },
  "/profit": { title: "Profit Allocation", subtitle: "Distribute net profit into Savings, Needs & Wants" },
  "/customers": { title: "Customer Directory", subtitle: "Client metrics & purchasing history" },
  "/suppliers": { title: "Supplier Directory", subtitle: "Manage wholesale vendors & restocking history" },
  "/reports": { title: "Reports & Analytics", subtitle: "Comprehensive performance metrics & export" },
  "/settings": { title: "Business Settings", subtitle: "Low-stock threshold & currency preferences" },
  "/profile": { title: "Business & Owner Profile", subtitle: "Manage business identity, account credentials & PIN security" },
};

export function Header() {
  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const current = pageTitles[pathname] || { title: "Avencia", subtitle: "Business Operating System" };

  const handleLockPin = () => {
    sessionStorage.removeItem("avencia_pin_unlocked");
    window.dispatchEvent(new CustomEvent("avencia:lock-pin"));
  };

  return (
    <>
      <header className="sticky top-0 z-20 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-8 font-sans flex items-center justify-between text-slate-900 dark:text-slate-100">
        <div className="max-w-7xl w-full mx-auto flex items-center justify-between gap-4">
          {/* Left: Mobile Drawer Toggle & Active Page Title / Breadcrumb context */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="md:hidden p-2 -ml-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
              aria-label="Toggle navigation drawer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight leading-snug truncate">
                {current.title}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:block truncate">
                {current.subtitle}
              </p>
            </div>
          </div>

          {/* Right: Notification Bell, Quick PIN Lock, Profile Dropdown */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
            {/* Notification Bell */}
            <NotificationBell />

            {/* Quick PIN Lock Trigger */}
            <button
              onClick={handleLockPin}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
              title="Lock Session PIN"
              aria-label="Lock Session PIN"
            >
              <Lock className="w-4 h-4" />
            </button>

            {/* Profile & Settings Dropdown */}
            <ProfileDropdown />
          </div>
        </div>
      </header>

      {/* Side Slide-Over Drawer */}
      <SideDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </>
  );
}
