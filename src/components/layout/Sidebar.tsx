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
      <div className="p-4 border-b border-[#E5E2D8] dark:border-[#2A2A2A] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-2xl bg-[#0D0D0D] border border-gold-500/30 p-1.5 flex items-center justify-center shadow-md shadow-gold-500/10 group-hover:scale-105 transition-transform overflow-hidden flex-shrink-0">
            <Image
              src="/logo/Avencia gold icon logo.png"
              alt="Avencia Logo"
              width={36}
              height={36}
              className="w-full h-full object-contain"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-black text-[#171717] dark:text-[#F5F5F5] tracking-tight leading-none truncate">
                Avencia
              </h1>
              <span className="px-1.5 py-0.5 rounded-full bg-gold-500/15 text-gold-600 dark:text-gold-400 text-[10px] font-extrabold border border-gold-500/30">
                v2.0
              </span>
            </div>
            <p className="text-[11px] text-[#737373] dark:text-[#A3A3A3] font-medium tracking-wide mt-0.5 truncate">
              Perfume Business OS
            </p>
          </div>
        </Link>
      </div>

      {/* Grouped Navigation Sections */}
      <nav className="flex-1 p-3 space-y-5 overflow-y-auto scrollbar-thin">
        {navigationSections.map((section) => (
          <div key={section.title} className="space-y-1">
            <div className="px-3 text-[10px] font-extrabold text-[#737373] dark:text-[#A3A3A3] uppercase tracking-wider">
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
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-150 ${
                      isActive
                        ? "bg-gold-500 text-white shadow-lg shadow-gold-500/25 font-black"
                        : "text-[#525252] dark:text-[#D4D4D4] hover:bg-gold-500/10 dark:hover:bg-gold-500/15 hover:text-[#171717] dark:hover:text-[#F5F5F5] font-semibold"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 ${
                        isActive ? "text-white" : "text-[#737373] dark:text-[#A3A3A3]"
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
      <div className="p-3 border-t border-[#E5E2D8] dark:border-[#2A2A2A]">
        <Link
          href="/profile"
          className={`p-3 rounded-2xl border flex items-center gap-3 transition-all group ${
            pathname === "/profile"
              ? "bg-gold-500 text-white border-gold-500 shadow-lg shadow-gold-500/25"
              : "bg-[#F8F7F3] dark:bg-[#181818] hover:bg-gold-500/10 dark:hover:bg-gold-500/15 border-[#E5E2D8] dark:border-[#2A2A2A] text-[#171717] dark:text-[#F5F5F5]"
          }`}
        >
          <div className="w-8 h-8 rounded-xl bg-[#0D0D0D] border border-gold-500/30 flex items-center justify-center p-1 flex-shrink-0 transition-transform group-hover:scale-105 overflow-hidden">
            <Image
              src="/logo/Avencia gold icon logo.png"
              alt="Avencia Profile"
              width={32}
              height={32}
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className={`text-xs font-bold truncate ${
                pathname === "/profile" ? "text-white" : "text-[#171717] dark:text-[#F5F5F5]"
              }`}
            >
              Avencia Perfumes
            </p>
            <p
              className={`text-[11px] truncate font-medium ${
                pathname === "/profile" ? "text-gold-100" : "text-[#737373] dark:text-[#A3A3A3]"
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
