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
  Sparkles,
} from "lucide-react";

export const navigationItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Products", href: "/products", icon: Package },
  { name: "Batches", href: "/batches", icon: Layers },
  { name: "Inventory", href: "/inventory", icon: Boxes },
  { name: "Sales", href: "/sales", icon: ShoppingBag },
  { name: "Expenses", href: "/expenses", icon: Receipt },
  { name: "Profit Allocation", href: "/profit", icon: PiggyBank },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Suppliers", href: "/suppliers", icon: Truck },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200/80 min-h-screen sticky top-0 h-screen z-30 font-sans">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-2xl bg-slate-900 p-1.5 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform overflow-hidden">
            <Image
              src="/logo/Avencia gold icon logo.png"
              alt="Avencia Logo"
              width={40}
              height={40}
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight leading-tight flex items-center gap-1.5">
              Avencia
            </h1>
            <p className="text-[11px] text-slate-500 font-semibold tracking-wide">Perfume Business OS</p>
          </div>
        </Link>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        <div className="px-3.5 py-2 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
          Core Operations
        </div>
        {navigationItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={(e) => {
                if (isActive) e.preventDefault();
              }}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-600 ${
                isActive
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 translate-x-0.5"
                  : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Business Card */}
      <div className="p-3 border-t border-slate-100">
        <Link
          href="/profile"
          className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all group ${
            pathname === "/profile"
              ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/25"
              : "bg-slate-50 hover:bg-slate-100 border-slate-200/80 text-slate-900"
          }`}
        >
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center p-1 flex-shrink-0 transition-transform group-hover:scale-105 overflow-hidden ${
              pathname === "/profile"
                ? "bg-slate-900 shadow-sm"
                : "bg-slate-900"
            }`}
          >
            <Image
              src="/logo/Avencia gold icon logo.png"
              alt="Avencia Profile"
              width={36}
              height={36}
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className={`text-xs font-bold truncate ${
                pathname === "/profile" ? "text-white" : "text-slate-900"
              }`}
            >
              Avencia Perfumes
            </p>
            <p
              className={`text-[11px] truncate font-medium ${
                pathname === "/profile" ? "text-indigo-100" : "text-slate-500"
              }`}
            >
              Business & Profile
            </p>
          </div>
        </Link>
      </div>
    </aside>
  );
}
