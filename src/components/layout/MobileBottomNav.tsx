"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Users,
  Grid,
} from "lucide-react";
import { MoreSheet } from "./MoreSheet";

export function MobileBottomNav() {
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const navItems = [
    { label: "Home", href: "/", icon: LayoutDashboard },
    { label: "Sell", href: "/sales", icon: ShoppingBag },
    { label: "Products", href: "/products", icon: Package },
    { label: "Customers", href: "/customers", icon: Users },
  ];

  return (
    <>
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 dark:bg-[#151515]/95 backdrop-blur-md border-t border-border px-2 pt-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] shadow-lg select-none"
      >
        <div className="grid grid-cols-5 items-center max-w-md mx-auto h-14">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-col items-center justify-center h-full min-h-[44px] rounded-lg transition-all duration-150 active:scale-95 ${
                  isActive
                    ? "text-primary font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {/* Logo-inspired geometric 60-degree wedge marker */}
                {isActive && (
                  <span className="absolute top-0.5 w-6 h-1 rounded-full bg-primary shadow-xs" />
                )}
                <Icon className={`w-5 h-5 transition-transform ${isActive ? "scale-110" : ""}`} />
                <span className="text-[10px] tracking-tight mt-0.5 font-medium leading-none">
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* 5th item: More */}
          <button
            type="button"
            onClick={() => setIsMoreOpen(true)}
            aria-label="More navigation options"
            className={`relative flex flex-col items-center justify-center h-full min-h-[44px] rounded-lg transition-all duration-150 active:scale-95 ${
              isMoreOpen
                ? "text-primary font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {isMoreOpen && (
              <span className="absolute top-0.5 w-6 h-1 rounded-full bg-primary shadow-xs" />
            )}
            <Grid className="w-5 h-5" />
            <span className="text-[10px] tracking-tight mt-0.5 font-medium leading-none">
              More
            </span>
          </button>
        </div>
      </nav>

      <MoreSheet isOpen={isMoreOpen} onClose={() => setIsMoreOpen(false)} />
    </>
  );
}
