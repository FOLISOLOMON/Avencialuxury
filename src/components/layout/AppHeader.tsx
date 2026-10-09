"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ProfileDropdown } from "./ProfileDropdown";

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Dashboard", subtitle: "Operations & financial summary" },
  "/sales": { title: "Sales & POS", subtitle: "Transactions, point of sale & receipts" },
  "/products": { title: "Products", subtitle: "Fragrance catalog, inventory & pricing" },
  "/customers": { title: "Customers & Debt", subtitle: "Client ledgers, receivables & history" },
  "/batches": { title: "Batches & Supply", subtitle: "Inventory shipments & cost allocations" },
  "/inventory": { title: "Inventory Ledger", subtitle: "Stock balance adjustments & audit logs" },
  "/expenses": { title: "Expenses", subtitle: "Operating outflows & expenditure tracking" },
  "/profit": { title: "Profit Allocation", subtitle: "Capital reserve, operating needs & distributions" },
  "/suppliers": { title: "Suppliers", subtitle: "Vendor directory & purchase records" },
  "/reports": { title: "Reports & Analytics", subtitle: "Business performance & exports" },
  "/settings": { title: "Settings", subtitle: "Preferences, currency & thresholds" },
  "/profile": { title: "Business Profile", subtitle: "Company credentials & entity details" },
  "/ai": { title: "Avencia AI Assistant", subtitle: "Ledger-grounded query assistant" },
};

export function AppHeader() {
  const pathname = usePathname();
  const current = PAGE_META[pathname] || {
    title: "Avencia",
    subtitle: "Fragrance Business Management",
  };

  return (
    <header className="flex-shrink-0 z-20 h-16 bg-card border-b border-border px-4 sm:px-6 flex items-center justify-between select-none w-full">
      <div className="max-w-7xl w-full mx-auto flex items-center justify-between gap-3">
        {/* Left Side: Mobile Logo + Title / Subtitle */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile Logo Mark */}
          <Link href="/" className="md:hidden flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-md bg-black border border-border p-1 flex items-center justify-center overflow-hidden">
              <Image
                src="/logo/Avencia gold icon logo.png"
                alt="Avencia"
                width={24}
                height={24}
                className="w-full h-full object-contain"
                priority
              />
            </div>
          </Link>

          {/* Title & Subtitle */}
          <div className="min-w-0">
            <h1 className="font-semibold text-sm sm:text-base text-foreground tracking-tight leading-tight truncate">
              {current.title}
            </h1>
            <p className="text-xs text-muted-foreground hidden sm:block truncate leading-tight mt-0.5">
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
