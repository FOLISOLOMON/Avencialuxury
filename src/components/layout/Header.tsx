"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, ShoppingBag, Search, User } from "lucide-react";
import { SideDrawer } from "./SideDrawer";

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

  return (
    <>
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 sm:px-8 font-sans">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Mobile Menu Toggle & Brand */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="md:hidden p-2 -ml-1 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-600"
              aria-label="Toggle navigation drawer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <h1 className="text-lg font-black text-slate-900 tracking-tight leading-snug truncate">
                {current.title}
              </h1>
              <p className="text-xs text-slate-500 font-semibold hidden sm:block truncate">
                {current.subtitle}
              </p>
            </div>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-3">
            <Link
              href="/sales"
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-500/20 active:scale-95 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
            >
              <ShoppingBag className="w-4 h-4 text-amber-300" />
              <span>POS Sale</span>
            </Link>

            <Link
              href="/profile"
              className="w-9 h-9 rounded-full bg-slate-900 border border-slate-700/60 p-1 flex items-center justify-center hover:scale-105 transition-all overflow-hidden shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
              title="Profile & Settings"
              aria-label="Profile & Settings"
            >
              <Image
                src="/logo/Avencia gold icon logo.png"
                alt="Profile"
                width={32}
                height={32}
                className="w-full h-full object-contain"
              />
            </Link>
          </div>
        </div>
      </header>

      {/* Side Slide-Over Drawer */}
      <SideDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </>
  );
}
