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
import { cn } from "@/lib/utils";

export function MobileBottomNav() {
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [pendingCancellations, setPendingCancellations] = useState(0);

  React.useEffect(() => {
    const fetchPending = async () => {
      try {
        const res = await fetch("/api/sales/cancellations?status=PENDING");
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setPendingCancellations(json.data.length);
        }
      } catch (e) {
        // ignore
      }
    };
    fetchPending();

    const handleSync = () => fetchPending();
    window.addEventListener("avencia:sync:cancellations", handleSync);
    window.addEventListener("avencia:sync:sales", handleSync);
    return () => {
      window.removeEventListener("avencia:sync:cancellations", handleSync);
      window.removeEventListener("avencia:sync:sales", handleSync);
    };
  }, []);

  const navItems = [
    { label: "Home", href: "/", icon: LayoutDashboard },
    { label: "Sell", href: "/sales", icon: ShoppingBag, hasBadge: pendingCancellations > 0 },
    { label: "Products", href: "/products", icon: Package },
    { label: "Customers", href: "/customers", icon: Users },
  ];

  return (
    <>
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border px-2 pt-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] select-none"
      >
        <div className="grid grid-cols-5 items-center max-w-md mx-auto h-14">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex flex-col items-center justify-center h-full min-h-[44px] rounded-md transition-colors",
                  isActive
                    ? "text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {item.hasBadge && (
                    <span className="absolute -top-1 -right-1.5 w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse border border-card" />
                  )}
                </div>
                <span className="text-[11px] tracking-tight mt-0.5 leading-none">
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
            className={cn(
              "flex flex-col items-center justify-center h-full min-h-[44px] rounded-md transition-colors",
              isMoreOpen
                ? "text-primary font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Grid className="w-5 h-5" />
            <span className="text-[11px] tracking-tight mt-0.5 leading-none">
              More
            </span>
          </button>
        </div>
      </nav>

      <MoreSheet isOpen={isMoreOpen} onClose={() => setIsMoreOpen(false)} />
    </>
  );
}
