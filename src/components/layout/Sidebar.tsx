"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Layers,
  Boxes,
  ShoppingBag,
  Receipt,
  PiggyBank,
  Users,
  Truck,
  BarChart3,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const navigationSections: NavSection[] = [
  {
    title: "OVERVIEW",
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
      { name: "Ask Avencia AI", href: "/ai", icon: Sparkles },
    ],
  },
  {
    title: "OPERATIONS",
    items: [
      { name: "Products", href: "/products", icon: Package },
      { name: "Batches", href: "/batches", icon: Layers },
      { name: "Inventory", href: "/inventory", icon: Boxes },
      { name: "Sales & POS", href: "/sales", icon: ShoppingBag },
    ],
  },
  {
    title: "FINANCE",
    items: [
      { name: "Expenses", href: "/expenses", icon: Receipt },
      { name: "Profit Allocation", href: "/profit", icon: PiggyBank },
    ],
  },
  {
    title: "CUSTOMERS",
    items: [
      { name: "Customers", href: "/customers", icon: Users },
      { name: "Suppliers", href: "/suppliers", icon: Truck },
    ],
  },
  {
    title: "SYSTEM",
    items: [
      { name: "Reports", href: "/reports", icon: BarChart3 },
    ],
  },
];

export const navigationItems: NavItem[] = navigationSections.flatMap(
  (section) => section.items
);

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-[250px] bg-white dark:bg-[#151515] border-r border-[#E5E2D8] dark:border-[#2A2A2A] min-h-screen sticky top-0 h-screen z-30 font-sans flex-shrink-0 text-[#171717] dark:text-[#F5F5F5]">
      {/* Header: Avencia Gold Logo + Business Name + v2.0.0 */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-[#0D0D0D] border border-border p-1.5 flex items-center justify-center overflow-hidden flex-shrink-0">
            <Image
              src="/logo/Avencia gold icon logo.png"
              alt="Avencia Logo"
              width={32}
              height={32}
              className="w-full h-full object-contain"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-semibold text-foreground tracking-tight leading-none truncate">
                Avencia
              </h1>
              <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium border border-primary/20">
                v2.0
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground font-normal tracking-wide mt-0.5 truncate">
              Perfume Business OS
            </p>
          </div>
        </Link>
      </div>

      {/* Grouped Navigation Sections */}
      <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
        {navigationSections.map((section) => (
          <div key={section.title} className="space-y-1">
            <div className="px-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              {section.title}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={(e) => {
                      if (isActive) e.preventDefault();
                    }}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 ${
                        isActive ? "text-primary-foreground" : "text-muted-foreground"
                      }`}
                    />
                    <span className="truncate">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Business Profile Footer */}
      <div className="p-3 border-t border-border">
        <Link
          href="/profile"
          className={`p-2.5 rounded-md border flex items-center gap-2.5 transition-colors ${
            pathname === "/profile"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-muted/40 hover:bg-muted border-border text-foreground"
          }`}
        >
          <div className="w-7 h-7 rounded-sm bg-[#0D0D0D] border border-border flex items-center justify-center p-0.5 flex-shrink-0 overflow-hidden">
            <Image
              src="/logo/Avencia gold icon logo.png"
              alt="Avencia Profile"
              width={24}
              height={24}
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className={`text-xs font-semibold truncate ${
                pathname === "/profile" ? "text-primary-foreground" : "text-foreground"
              }`}
            >
              Avencia Perfumes
            </p>
            <p
              className={`text-[10px] truncate ${
                pathname === "/profile" ? "text-primary-foreground/80" : "text-muted-foreground"
              }`}
            >
              Business Profile
            </p>
          </div>
        </Link>
      </div>
    </aside>
  );
}
