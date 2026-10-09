"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Home,
  Receipt,
  Plus,
  CircleDollarSign,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

function MobileNavBarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isCurrent = (path: string) => {
    if (path === "/mobile") {
      return pathname === "/mobile";
    }
    return pathname.startsWith(path);
  };

  const isPaymentActive =
    pathname === "/mobile/customers" &&
    (searchParams.get("filter") === "debt" || searchParams.get("tab") === "debt");

  const isCustomerActive =
    pathname === "/mobile/customers" && !isPaymentActive;

  // On the dedicated checkout screen (/mobile/sell), hide the navigation bar
  // so the Complete Sale action bar is 100% visible and unobstructed
  if (pathname === "/mobile/sell") {
    return null;
  }

  const isSellActive = pathname === "/mobile/sell";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none pb-[max(0.5rem,env(safe-area-inset-bottom))] px-3 flex justify-center">
      <div className="w-full max-w-md relative pointer-events-auto">
        
        {/* Center Hero: Elevated Floating Circular (+) Action Button */}
        <Link
          href="/mobile/sell"
          aria-label="New Sale"
          className={cn(
            "absolute -top-6 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full",
            "bg-[#0a1e3b] dark:bg-primary text-white dark:text-primary-foreground",
            "shadow-[0_10px_25px_-3px_rgba(10,30,59,0.55)] dark:shadow-[0_10px_25px_-3px_rgba(0,0,0,0.85)]",
            "border-[3.5px] border-card flex items-center justify-center",
            "active:scale-90 hover:scale-105 transition-all z-20 group",
            isSellActive && "ring-4 ring-primary/30"
          )}
        >
          <Plus className="w-6 h-6 stroke-[3] transition-transform group-hover:rotate-90 duration-300" />
        </Link>

        {/* Notched Container with SVG Sculpted Scoop */}
        <div className="relative w-full h-[68px]">
          {/* SVG Background Path defining the smooth curved cutout notch */}
          <svg
            viewBox="0 0 400 68"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full fill-card/95 backdrop-blur-xl stroke-border/80 stroke-1 drop-shadow-md transition-colors"
          >
            <path d="M 0,22 A 22,22 0 0,1 22,0 L 152,0 C 166,0 172,28 200,28 C 228,28 234,0 248,0 L 378,0 A 22,22 0 0,1 400,22 L 400,68 L 0,68 Z" />
          </svg>

          {/* Grid of 5 columns */}
          <div className="relative z-10 grid grid-cols-5 h-full items-center px-1">
            {/* 1. Home */}
            <Link
              href="/mobile"
              className={cn(
                "flex flex-col items-center justify-center py-1 rounded-xl text-center transition-colors active:scale-95 group",
                isCurrent("/mobile") && !isSellActive && !pathname.startsWith("/mobile/sales") && !pathname.startsWith("/mobile/customers")
                  ? "text-primary font-bold"
                  : "text-muted-foreground/75 hover:text-foreground font-medium"
              )}
            >
              <Home className={cn("w-5 h-5 transition-transform group-hover:scale-105", isCurrent("/mobile") && !isSellActive && !pathname.startsWith("/mobile/sales") && !pathname.startsWith("/mobile/customers") && "stroke-[2.5]")} />
              <span className="text-[10px] mt-0.5 tracking-tight">Home</span>
            </Link>

            {/* 2. Sales */}
            <Link
              href="/mobile/sales"
              className={cn(
                "flex flex-col items-center justify-center py-1 rounded-xl text-center transition-colors active:scale-95 group",
                isCurrent("/mobile/sales")
                  ? "text-primary font-bold"
                  : "text-muted-foreground/75 hover:text-foreground font-medium"
              )}
            >
              <Receipt className={cn("w-5 h-5 transition-transform group-hover:scale-105", isCurrent("/mobile/sales") && "stroke-[2.5]")} />
              <span className="text-[10px] mt-0.5 tracking-tight">Sales</span>
            </Link>

            {/* 3. Center Spacer (Under the floating (+) button) */}
            <div className="pointer-events-none flex items-center justify-center h-full" aria-hidden="true" />

            {/* 4. Payment */}
            <Link
              href="/mobile/customers?filter=debt"
              className={cn(
                "flex flex-col items-center justify-center py-1 rounded-xl text-center transition-colors active:scale-95 group",
                isPaymentActive
                  ? "text-primary font-bold"
                  : "text-muted-foreground/75 hover:text-foreground font-medium"
              )}
            >
              <CircleDollarSign className={cn("w-5 h-5 transition-transform group-hover:scale-105", isPaymentActive && "stroke-[2.5]")} />
              <span className="text-[10px] mt-0.5 tracking-tight">Payment</span>
            </Link>

            {/* 5. Customer (Changed back from Profile) */}
            <Link
              href="/mobile/customers"
              className={cn(
                "flex flex-col items-center justify-center py-1 rounded-xl text-center transition-colors active:scale-95 group",
                isCustomerActive
                  ? "text-primary font-bold"
                  : "text-muted-foreground/75 hover:text-foreground font-medium"
              )}
            >
              <Users className={cn("w-5 h-5 transition-transform group-hover:scale-105", isCustomerActive && "stroke-[2.5]")} />
              <span className="text-[10px] mt-0.5 tracking-tight">Customer</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

export function MobileNavBar() {
  return (
    <React.Suspense fallback={null}>
      <MobileNavBarContent />
    </React.Suspense>
  );
}
