"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, Plus, Package, Layers, ShoppingBag, Users, Receipt, Truck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface ActionFabConfig {
  label: string;
  icon: LucideIcon;
  eventKey: string;
}

const ACTION_FABS: Record<string, ActionFabConfig> = {
  "/products": { label: "Add Product", icon: Package, eventKey: "avencia:open-add-product" },
  "/batches": { label: "New Batch", icon: Layers, eventKey: "avencia:open-add-batch" },
  "/sales": { label: "New Sale", icon: ShoppingBag, eventKey: "avencia:open-add-sale" },
  "/customers": { label: "Add Customer", icon: Users, eventKey: "avencia:open-add-customer" },
  "/suppliers": { label: "Add Supplier", icon: Truck, eventKey: "avencia:open-add-supplier" },
  "/expenses": { label: "Log Expense", icon: Receipt, eventKey: "avencia:open-add-expense" },
};

export function FloatingActionButton() {
  const pathname = usePathname();
  const isAIPage = pathname === "/ai";
  const actionConfig = ACTION_FABS[pathname];

  const handleActionClick = () => {
    if (actionConfig) {
      window.dispatchEvent(new CustomEvent(actionConfig.eventKey));
    }
  };

  return (
    <div
      className={`fixed right-4 sm:right-6 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:bottom-6 z-40 flex flex-col items-center gap-2.5 transition-all duration-200 ease-in-out ${
        isAIPage ? "translate-x-[calc(100%+3rem)] opacity-30 pointer-events-none" : "translate-x-0 opacity-100"
      }`}
    >
      {/* 1. TOP: Icon-only Ask Avencia AI FAB (WhatsApp-style top position) */}
      <Link
        href="/ai"
        className="w-11 h-11 rounded-2xl bg-slate-900/95 dark:bg-slate-800/95 border border-gold-500/40 shadow-lg shadow-gold-500/15 flex items-center justify-center hover:scale-105 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
        aria-label="Ask Avencia AI Assistant"
        title="Ask Avencia AI Assistant"
      >
        <Sparkles className="w-5 h-5 text-gold-400 animate-pulse" />
      </Link>

      {/* 2. BOTTOM: Page Quick Action FAB (+) (WhatsApp-style bottom position) */}
      {actionConfig && !isAIPage && (
        <button
          onClick={handleActionClick}
          className="w-12 h-12 rounded-2xl bg-gold-500 hover:bg-gold-600 text-slate-950 shadow-xl shadow-gold-500/25 border border-gold-400/40 flex items-center justify-center hover:scale-105 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
          aria-label={actionConfig.label}
          title={actionConfig.label}
        >
          <Plus className="w-6 h-6 text-slate-950" />
        </button>
      )}
    </div>
  );
}
