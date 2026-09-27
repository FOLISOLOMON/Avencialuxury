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
    color: "bg-indigo-600 text-white shadow-indigo-500/40",
  },
  "/batches": {
    label: "New Batch",
    icon: Layers,
    eventKey: "avencia:open-add-batch",
    color: "bg-indigo-600 text-white shadow-indigo-500/40",
  },
  "/sales": {
    label: "New Sale",
    icon: ShoppingBag,
    eventKey: "avencia:open-add-sale",
    color: "bg-indigo-600 text-white shadow-indigo-500/40",
  },
  "/customers": {
    label: "Add Customer",
    icon: Users,
    eventKey: "avencia:open-add-customer",
    color: "bg-indigo-600 text-white shadow-indigo-500/40",
  },
  "/suppliers": {
    label: "Add Supplier",
    icon: Truck,
    eventKey: "avencia:open-add-supplier",
    color: "bg-indigo-600 text-white shadow-indigo-500/40",
  },
  "/expenses": {
    label: "Log Expense",
    icon: Receipt,
    eventKey: "avencia:open-add-expense",
    color: "bg-rose-600 text-white shadow-rose-500/40",
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
        className={`w-14 h-14 rounded-full ${config.color} shadow-2xl flex items-center justify-center border-2 border-white hover:scale-105 active:scale-95 transition-all`}
        aria-label={config.label}
      >
        <Plus className="w-7 h-7" />
      </button>
    </div>
  );
}
