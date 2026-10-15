"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ProfileDropdown } from "./ProfileDropdown";
import { useOptionalSettings } from "@/components/settings/SettingsContext";

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
  "/settings": { title: "Settings", subtitle: "Preferences & configuration" },
  "/profile": { title: "Business Profile", subtitle: "Company credentials & entity details" },
  "/ai": { title: "Avencia AI Assistant", subtitle: "Ledger-grounded query assistant" },
};

export function AppHeader() {
  const pathname = usePathname();
  const settings = useOptionalSettings();
  const isSettingsMode = pathname === "/settings" || pathname.startsWith("/settings/");

  const current = isSettingsMode && settings
    ? {
        title: settings.activeCategoryMeta.name,
        subtitle: settings.activeCategoryMeta.shortDesc,
      }
    : PAGE_META[pathname] || {
        title: "Avencia",
        subtitle: "Fragrance Business Management",
      };

  return (
    <header className="flex-shrink-0 z-20 h-16 bg-card border-b border-border px-4 sm:px-6 flex items-center justify-between select-none w-full">
      <div className="max-w-7xl w-full mx-auto flex items-center justify-between gap-3">
        {/* Left Side: Mobile Logo / Back control + Title / Subtitle */}
        <div className="flex items-center gap-3 min-w-0">
          {/* In settings mode on mobile with category open, show Back to Categories button */}
          {isSettingsMode && settings && settings.mobileView === "content" ? (
            <button
              type="button"
              onClick={() => settings.setMobileView("list")}
              className="md:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-secondary/80 border border-border text-foreground hover:bg-secondary text-xs font-semibold shrink-0 cursor-pointer"
              aria-label="Back to categories"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-primary" />
              <span>Categories</span>
            </button>
          ) : (
            /* Standard Mobile Logo Mark */
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
          )}

          {/* Title & Subtitle */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-sm sm:text-base text-foreground tracking-tight leading-tight truncate">
                {current.title}
              </h1>
              {isSettingsMode && settings && settings.activeCategoryMeta.ownerOnly && (
                <span className="hidden sm:inline-block text-[9px] uppercase tracking-wide font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  Owner Protected
                </span>
              )}
            </div>
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
