"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Sparkles,
  ShoppingBag,
  Package,
  Layers,
  Boxes,
  Receipt,
  PiggyBank,
  Users,
  Truck,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarGroup {
  label: string;
  items: Array<{
    name: string;
    href: string;
    icon: LucideIcon;
    badge?: string;
  }>;
}

const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    label: "Overview",
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
      { name: "Ask Avencia AI", href: "/ai", icon: Sparkles },
    ],
  },
  {
    label: "Operations",
    items: [
      { name: "Sales & POS", href: "/sales", icon: ShoppingBag },
      { name: "Products", href: "/products", icon: Package },
      { name: "Batches", href: "/batches", icon: Layers },
      { name: "Inventory Ledger", href: "/inventory", icon: Boxes },
    ],
  },
  {
    label: "Finance",
    items: [
      { name: "Expenses", href: "/expenses", icon: Receipt },
      { name: "Profit Allocation", href: "/profit", icon: PiggyBank },
    ],
  },
  {
    label: "Relationships",
    items: [
      { name: "Customers", href: "/customers", icon: Users },
      { name: "Suppliers", href: "/suppliers", icon: Truck },
    ],
  },
  {
    label: "System",
    items: [
      { name: "Reports & Analytics", href: "/reports", icon: BarChart3 },
      { name: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

export function DesktopSidebar() {
  const pathname = usePathname();

  return (
    <aside
      aria-label="Sidebar navigation"
      className="hidden md:flex flex-col w-60 bg-card border-r border-border h-full z-30 select-none flex-shrink-0"
    >
      {/* Brand Header */}
      <div className="h-16 px-4 border-b border-border flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-md bg-black border border-border p-1 flex items-center justify-center overflow-hidden flex-shrink-0">
            <Image
              src="/logo/Avencia gold icon logo.png"
              alt="Avencia"
              width={26}
              height={26}
              className="w-full h-full object-contain"
              priority
            />
          </div>
          <div className="min-w-0">
            <span className="font-semibold text-sm tracking-tight text-foreground block leading-none">
              Avencia
            </span>
            <span className="text-[11px] text-muted-foreground block leading-tight mt-0.5">
              Fragrance Retail OS
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto custom-scrollbar">
        {SIDEBAR_GROUPS.map((group) => (
          <div key={group.label} className="space-y-1">
            <div className="px-2.5 text-[11px] font-medium text-muted-foreground/80">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors",
                      isActive
                        ? "bg-secondary text-foreground font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/60 font-normal"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={cn(
                          "w-4 h-4 flex-shrink-0",
                          isActive ? "text-foreground" : "text-muted-foreground"
                        )}
                      />
                      <span className="truncate">{item.name}</span>
                    </div>

                    {item.badge && (
                      <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-secondary text-muted-foreground border border-border">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer Profile Link */}
      <div className="p-3 border-t border-border">
        <Link
          href="/profile"
          className={cn(
            "flex items-center gap-2.5 p-2 rounded-md transition-colors",
            pathname === "/profile"
              ? "bg-secondary text-foreground font-semibold"
              : "hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
          )}
        >
          <div className="w-7 h-7 rounded-md bg-secondary border border-border flex items-center justify-center flex-shrink-0 text-xs font-semibold text-foreground">
            A
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-foreground truncate leading-tight">
              Avencia Perfumes
            </div>
            <div className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
              Business Account
            </div>
          </div>
        </Link>
      </div>
    </aside>
  );
}
