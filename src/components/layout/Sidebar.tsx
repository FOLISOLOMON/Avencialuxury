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
  Settings,
  User,
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
    items: [{ name: "Dashboard", href: "/", icon: LayoutDashboard }],
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

// Flat export for backwards compatibility
export const navigationItems: NavItem[] = navigationSections.flatMap(
  (section) => section.items
);

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-[250px] bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 min-h-screen sticky top-0 h-screen z-30 font-sans flex-shrink-0 text-slate-900 dark:text-slate-100">
      {/* Header: Avencia Gold Logo + Business Name + v2.0.0 */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-2xl bg-slate-900 dark:bg-slate-950 p-1.5 flex items-center justify-center shadow-md shadow-indigo-500/10 group-hover:scale-105 transition-transform overflow-hidden flex-shrink-0">
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
              <h1 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none truncate">
                Avencia
              </h1>
              <span className="px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold border border-amber-200/80 dark:border-amber-800/60">
                v2.0.0
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium tracking-wide mt-0.5 truncate">
              Perfume Business OS
            </p>
          </div>
        </Link>
      </div>

      {/* Grouped Navigation Sections */}
      <nav className="flex-1 p-3 space-y-5 overflow-y-auto scrollbar-thin">
        {navigationSections.map((section) => (
          <div key={section.title} className="space-y-1">
            <div className="px-3 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
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
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-150 focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-100 font-semibold"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 ${
                        isActive ? "text-white" : "text-slate-400 dark:text-slate-400"
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
      <div className="p-3 border-t border-slate-100 dark:border-slate-800">
        <Link
          href="/profile"
          className={`p-3 rounded-2xl border flex items-center gap-3 transition-all group ${
            pathname === "/profile"
              ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20"
              : "bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200/80 dark:border-slate-700/60 text-slate-900 dark:text-slate-100"
          }`}
        >
          <div className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-slate-950 flex items-center justify-center p-1 flex-shrink-0 transition-transform group-hover:scale-105 overflow-hidden">
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
                pathname === "/profile" ? "text-white" : "text-slate-900 dark:text-slate-100"
              }`}
            >
              Avencia Perfumes
            </p>
            <p
              className={`text-[11px] truncate font-medium ${
                pathname === "/profile" ? "text-indigo-100" : "text-slate-500 dark:text-slate-400"
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
