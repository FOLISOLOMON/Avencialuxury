"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ProfileDropdown } from "./ProfileDropdown";

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Dashboard", subtitle: "Real-time revenue, low stock & today's pulse" },
  "/sales": { title: "Sales & POS", subtitle: "Instant checkout, product lookup & receipts" },
  "/products": { title: "Products", subtitle: "Active perfume inventory, pricing & threshold tracking" },
  "/customers": { title: "Customers & Debt", subtitle: "Client purchase history, balances & WhatsApp reminders" },
  "/batches": { title: "Batches & Supply", subtitle: "Shipment investments, transport costs & sell-through" },
  "/inventory": { title: "Inventory Ledger", subtitle: "FIFO stock balances & audited adjustments" },
  "/expenses": { title: "Expenses", subtitle: "Operational outflows, transport & delivery logging" },
  "/profit": { title: "Profit Allocation", subtitle: "50/30/20 Savings, Needs & Wants allocations" },
  "/suppliers": { title: "Suppliers", subtitle: "Wholesale vendor directory & restocking records" },
  "/reports": { title: "Reports & Analytics", subtitle: "Executive performance, trends & export" },
  "/settings": { title: "Settings", subtitle: "Business preferences, currency & automation thresholds" },
  "/profile": { title: "Business Profile", subtitle: "Company credentials & owner details" },
  "/ai": { title: "Ask Avencia AI", subtitle: "Dedicated AI assistant grounded in your live database" },
};

export function AppHeader() {
  const pathname = usePathname();
  const current = PAGE_META[pathname] || {
    title: "Avencia",
    subtitle: "Perfume Business Operating System",
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-card/90 dark:bg-[#151515]/90 backdrop-blur-md border-b border-border/80 px-4 sm:px-6 flex items-center justify-between select-none">
      <div className="max-w-7xl w-full mx-auto flex items-center justify-between gap-3">
        {/* Left Side: Mobile Logo + Title / Desktop Breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile Logo Mark */}
          <Link href="/" className="md:hidden flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-black border border-primary/40 p-1 flex items-center justify-center overflow-hidden">
              <Image
                src="/logo/Avencia gold icon logo.png"
                alt="Avencia"
                width={28}
                height={28}
                className="w-full h-full object-contain"
                priority
              />
            </div>
          </Link>

          {/* Title & Subtitle */}
          <div className="min-w-0">
            <h1 className="font-display font-extrabold text-base sm:text-lg text-foreground tracking-tight leading-tight truncate">
              {current.title}
            </h1>
            <p className="text-[11px] text-muted-foreground hidden sm:block truncate leading-tight">
              {current.subtitle}
            </p>
          </div>
        </div>

        {/* Right Side: Quick Action Notifications & Profile Menu */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <NotificationBell />
          <ProfileDropdown />
        </div>
      </div>
    </header>
  );
}
