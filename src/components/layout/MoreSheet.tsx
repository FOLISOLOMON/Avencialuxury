"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sheet } from "@/components/ui/Sheet";
import {
  Layers,
  Receipt,
  BarChart3,
  Boxes,
  Truck,
  PiggyBank,
  Settings,
  User,
  Sparkles,
  Lock,
  ChevronRight,
} from "lucide-react";

export interface MoreSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const MORE_LINKS = [
  {
    category: "Operations & Logistics",
    items: [
      { name: "Batches & Supply", href: "/batches", icon: Layers, desc: "Purchase shipments & batch profits" },
      { name: "Inventory Ledger", href: "/inventory", icon: Boxes, desc: "Stock transactions & adjustments" },
      { name: "Suppliers", href: "/suppliers", icon: Truck, desc: "Wholesale vendors & contacts" },
    ],
  },
  {
    category: "Financials & Insights",
    items: [
      { name: "Expenses", href: "/expenses", icon: Receipt, desc: "Transport, operations & delivery" },
      { name: "Profit Allocation", href: "/profit", icon: PiggyBank, desc: "Savings, Needs & Wants buckets" },
      { name: "Reports & Analytics", href: "/reports", icon: BarChart3, desc: "Detailed sales & margin charts" },
    ],
  },
  {
    category: "Intelligence & Settings",
    items: [
      { name: "Ask Avencia AI", href: "/ai", icon: Sparkles, desc: "Natural-language business insights" },
      { name: "Business Settings", href: "/settings", icon: Settings, desc: "Currency, alerts & automation" },
      { name: "Owner Profile", href: "/profile", icon: User, desc: "Business identity & credentials" },
    ],
  },
];

export function MoreSheet({ isOpen, onClose }: MoreSheetProps) {
  const pathname = usePathname();

  const handleLockPin = () => {
    sessionStorage.removeItem("avencia_pin_unlocked");
    window.dispatchEvent(new CustomEvent("avencia:lock-pin"));
    onClose();
  };

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title="All Sections"
      description="Quick navigation across all Avencia OS tools"
      size="default"
    >
      <div className="space-y-5 pb-6">
        {MORE_LINKS.map((group) => (
          <div key={group.category} className="space-y-1.5">
            <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2">
              {group.category}
            </h4>
            <div className="grid grid-cols-1 gap-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-150 active:scale-[0.99] ${
                      isActive
                        ? "bg-primary/10 border-primary/40 text-foreground font-bold shadow-xs"
                        : "bg-card border-border/60 hover:border-primary/30 text-foreground hover:bg-accent/40"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-2 rounded-md flex-shrink-0 ${
                          isActive
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold truncate leading-tight">{item.name}</div>
                        <div className="text-xs text-muted-foreground truncate leading-normal mt-0.5">
                          {item.desc}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-2" />
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* Lock PIN Action */}
        <div className="pt-2 border-t border-border/60">
          <button
            type="button"
            onClick={handleLockPin}
            className="w-full flex items-center justify-between p-3 rounded-lg border border-border/60 bg-card hover:bg-destructive/10 hover:border-destructive/30 text-muted-foreground hover:text-destructive transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-secondary text-muted-foreground">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-bold text-foreground">Lock Session</div>
                <div className="text-xs text-muted-foreground">Require Quick PIN to re-enter</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Sheet>
  );
}
