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
      { name: "Ask Avencia AI", href: "/ai", icon: Sparkles, badge: "AI" },
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
      className="hidden md:flex flex-col w-[260px] bg-card border-r border-border min-h-screen sticky top-0 h-screen z-30 select-none flex-shrink-0"
    >
      {/* Brand Header */}
      <div className="h-16 px-5 border-b border-border/80 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-black border border-primary/40 p-1.5 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform overflow-hidden flex-shrink-0">
            <Image
              src="/logo/Avencia gold icon logo.png"
              alt="Avencia"
              width={32}
              height={32}
              className="w-full h-full object-contain"
              priority
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-display font-black text-base tracking-tight text-foreground leading-none">
                Avencia
              </span>
              <span className="px-1.5 py-0.2 rounded-full bg-primary/15 text-gold-ink text-[10px] font-bold border border-primary/30">
                2.0
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground font-medium truncate mt-0.5">
              Perfume Business OS
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto custom-scrollbar">
        {SIDEBAR_GROUPS.map((group) => (
          <div key={group.label} className="space-y-1">
            <div className="px-3 text-[11px] font-bold text-muted-foreground tracking-wider uppercase">
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
                      "relative flex items-center justify-between px-3 py-2 rounded-md text-xs font-semibold transition-all duration-150 group",
                      isActive
                        ? "bg-primary text-primary-foreground font-bold shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={cn(
                          "w-4 h-4 flex-shrink-0 transition-colors",
                          isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                        )}
                      />
                      <span className="truncate">{item.name}</span>
                    </div>

                    {/* Logo-inspired geometric 60-degree slanted active wedge indicator */}
                    {isActive ? (
                      <span className="w-1.5 h-3.5 bg-primary-foreground/90 rounded-full skew-x-[-15deg]" />
                    ) : (
                      item.badge && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-primary/15 text-gold-ink border border-primary/30">
                          {item.badge}
                        </span>
                      )
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer Profile Link */}
      <div className="p-3 border-t border-border/80">
        <Link
          href="/profile"
          className={cn(
            "flex items-center gap-3 p-2.5 rounded-lg border transition-all duration-150 group",
            pathname === "/profile"
              ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
              : "bg-secondary/40 border-border/60 hover:border-primary/30 hover:bg-secondary text-foreground"
          )}
        >
          <div className="w-8 h-8 rounded-lg bg-black border border-primary/30 p-1 flex items-center justify-center flex-shrink-0 overflow-hidden">
            <Image
              src="/logo/Avencia gold icon logo.png"
              alt="Avencia Profile"
              width={28}
              height={28}
              className="w-full h-full object-contain"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold truncate leading-tight">Avencia Perfumes</div>
            <div
              className={cn(
                "text-[10px] truncate mt-0.5",
                pathname === "/profile" ? "text-primary-foreground/80 font-medium" : "text-muted-foreground"
              )}
            >
              Business Profile
            </div>
          </div>
        </Link>
      </div>
    </aside>
  );
}
