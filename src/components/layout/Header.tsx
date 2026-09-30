"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
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
  "/profile": { title: "Business & Owner Profile", subtitle: "Manage business identity & account credentials" },
  "/ai": { title: "Ask Avencia AI", subtitle: "Natural-language AI assistant for sales, debts & inventory" },
};

export function Header() {
  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const current = pageTitles[pathname] || { title: "Avencia", subtitle: "Business Operating System" };

  return (
    <>
      <header className="sticky top-0 z-20 h-16 bg-white/95 dark:bg-[#151515]/95 backdrop-blur-md border-b border-[#E5E2D8] dark:border-[#2A2A2A] px-4 sm:px-8 font-sans flex items-center justify-between text-[#171717] dark:text-[#F5F5F5]">
        <div className="max-w-7xl w-full mx-auto flex items-center justify-between gap-4">
          {/* Left: Mobile Drawer Toggle & Active Page Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="md:hidden p-2 -ml-1.5 rounded-xl bg-[#F8F7F3] dark:bg-[#181818] text-[#171717] dark:text-[#F5F5F5] hover:bg-gold-500/15 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
              aria-label="Toggle navigation drawer"
            >
              <Menu className="w-5 h-5 text-gold-600 dark:text-gold-400" />
            </button>

            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-black text-[#171717] dark:text-[#F5F5F5] tracking-tight leading-snug truncate">
                {current.title}
              </h1>
              <p className="text-xs text-[#737373] dark:text-[#A3A3A3] font-medium hidden sm:block truncate">
                {current.subtitle}
              </p>
            </div>
          </div>

          {/* Right: Notification Bell & Profile Dropdown */}
          <div className="flex items-center gap-3 shrink-0">
            <NotificationBell />
            <ProfileDropdown />
          </div>
        </div>
      </header>

      <SideDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </>
  );
}
