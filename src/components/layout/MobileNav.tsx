"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingBag, Package, Boxes } from "lucide-react";

export function MobileNav() {
  const pathname = usePathname();

  const primaryItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Sales", href: "/sales", icon: ShoppingBag },
    { name: "Products", href: "/products", icon: Package },
    { name: "Inventory", href: "/inventory", icon: Boxes },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-2 font-sans">
      <div className="grid grid-cols-4 gap-1 max-w-md mx-auto">
        {primaryItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={(e) => {
                if (isActive) e.preventDefault();
              }}
              className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-2xl text-[11px] font-bold transition-all ${
                isActive
                  ? "text-indigo-600 bg-indigo-50 font-black shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
