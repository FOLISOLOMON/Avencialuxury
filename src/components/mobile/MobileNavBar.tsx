"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Receipt,
  Plus,
  Package,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileNavBar() {
  const pathname = usePathname();

  const isCurrent = (path: string) => {
    if (path === "/mobile") {
      return pathname === "/mobile";
    }
    return pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-lg border-t border-border/80 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 transition-colors">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* 1. Home */}
        <Link
          href="/mobile"
          className={cn(
            "flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-center transition-colors active:scale-95",
            isCurrent("/mobile")
              ? "text-primary font-semibold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Home</span>
        </Link>

        {/* 2. Sales History */}
        <Link
          href="/mobile/sales"
          className={cn(
            "flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-center transition-colors active:scale-95",
            isCurrent("/mobile/sales")
              ? "text-primary font-semibold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Receipt className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Sales</span>
        </Link>

        {/* 3. Center Hero: + NEW SALE */}
        <div className="flex-1 flex flex-col items-center justify-center -mt-5">
          <Link
            href="/mobile/sell"
            className="w-13 h-13 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center border-2 border-background active:scale-90 hover:brightness-105 transition-transform"
            aria-label="Record New Sale"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </Link>
          <span className="text-[10px] font-bold text-primary mt-1 tracking-tight">New Sale</span>
        </div>

        {/* 4. Products */}
        <Link
          href="/mobile/products"
          className={cn(
            "flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-center transition-colors active:scale-95",
            isCurrent("/mobile/products")
              ? "text-primary font-semibold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Package className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Products</span>
        </Link>

        {/* 5. Customers */}
        <Link
          href="/mobile/customers"
          className={cn(
            "flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-center transition-colors active:scale-95",
            isCurrent("/mobile/customers")
              ? "text-primary font-semibold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Customers</span>
        </Link>
      </div>
    </nav>
  );
}
