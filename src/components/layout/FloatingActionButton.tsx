"use client";

import { usePathname } from "next/navigation";
import { Plus, Package, Layers, ShoppingBag, Users, Receipt, Truck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface FabConfig {
  label: string;
  icon: LucideIcon;
  eventKey: string;
  color: string;
}

const FAB_CONFIG: Record<string, FabConfig> = {
  "/products": {
    label: "Add Product",
    icon: Package,
    eventKey: "avencia:open-add-product",
    color: "bg-indigo-600 text-white shadow-indigo-500/30",
  },
  "/batches": {
    label: "New Batch",
    icon: Layers,
    eventKey: "avencia:open-add-batch",
    color: "bg-indigo-600 text-white shadow-indigo-500/30",
  },
  "/sales": {
    label: "New Sale",
    icon: ShoppingBag,
    eventKey: "avencia:open-add-sale",
    color: "bg-indigo-600 text-white shadow-indigo-500/30",
  },
  "/customers": {
    label: "Add Customer",
    icon: Users,
    eventKey: "avencia:open-add-customer",
    color: "bg-indigo-600 text-white shadow-indigo-500/30",
  },
  "/suppliers": {
    label: "Add Supplier",
    icon: Truck,
    eventKey: "avencia:open-add-supplier",
    color: "bg-indigo-600 text-white shadow-indigo-500/30",
  },
  "/expenses": {
    label: "Log Expense",
    icon: Receipt,
    eventKey: "avencia:open-add-expense",
    color: "bg-rose-600 text-white shadow-rose-500/30",
  },
};

export function FloatingActionButton() {
  const pathname = usePathname();
  const config = FAB_CONFIG[pathname];

  if (!config) return null;

  const handleClick = () => {
    window.dispatchEvent(new CustomEvent(config.eventKey));
  };

  return (
    <div className="md:hidden fixed right-4 bottom-20 z-40 font-sans">
      <button
        onClick={handleClick}
        className={`w-12 h-12 rounded-full ${config.color} shadow-lg flex items-center justify-center border border-white/20 hover:scale-105 active:scale-95 transition-all focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2`}
        aria-label={config.label}
        title={config.label}
      >
        <Plus className="w-6 h-6 text-white" />
      </button>
    </div>
  );
}
