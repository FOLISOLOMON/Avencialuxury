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
      {/* 1. TOP: Icon-only Ask Avencia AI FAB */}
      <Link
        href="/ai"
        className="w-10 h-10 rounded-md bg-card border border-border shadow-md flex items-center justify-center text-primary hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label="Ask Avencia AI Assistant"
        title="Ask Avencia AI Assistant"
      >
        <Sparkles className="w-4 h-4" />
      </Link>

      {/* 2. BOTTOM: Page Quick Action FAB (+) */}
      {actionConfig && !isAIPage && (
        <button
          onClick={handleActionClick}
          className="w-10 h-10 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground shadow-md border border-primary flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={actionConfig.label}
          title={actionConfig.label}
        >
          <Plus className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
