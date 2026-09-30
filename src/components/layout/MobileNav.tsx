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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#151515]/95 backdrop-blur-md border-t border-[#E5E2D8] dark:border-[#2A2A2A] px-2 py-1.5 font-sans">
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
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-[11px] font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 ${
                isActive
                  ? "text-gold-600 dark:text-gold-400 bg-gold-500/15 font-extrabold shadow-xs"
                  : "text-[#737373] dark:text-[#A3A3A3] hover:text-[#171717] dark:hover:text-[#F5F5F5]"
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? "text-gold-600 dark:text-gold-400" : "text-[#737373] dark:text-[#A3A3A3]"}`} />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
