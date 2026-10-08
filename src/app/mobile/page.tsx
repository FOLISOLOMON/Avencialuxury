"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  ShoppingBag,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Receipt,
  Users,
  Package,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useMobileProducts, useSyncStatus } from "@/lib/mobile/hooks";
import { MobileSaleSummary } from "@/lib/mobile/types";

export default function MobileHomePage() {
  const { products, loading: productsLoading } = useMobileProducts();
  const { state: syncState } = useSyncStatus();

  const [todayRevenue, setTodayRevenue] = useState(0);
  const [todaySalesCount, setTodaySalesCount] = useState(0);
  const [recentSales, setRecentSales] = useState<MobileSaleSummary[]>([]);
  const [loadingSales, setLoadingSales] = useState(true);

  // Fetch today's sales summary from shared backend API
  useEffect(() => {
    async function loadSalesSummary() {
      try {
        const res = await fetch("/api/sales?quickRange=today");
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            setTodayRevenue(json.summary?.totalRevenue || 0);
            setTodaySalesCount(json.summary?.totalSalesCount || 0);
            if (Array.isArray(json.data)) {
              setRecentSales(json.data.slice(0, 3));
            }
          }
        }
      } catch (err) {
        console.warn("Could not fetch today sales summary:", err);
      } finally {
        setLoadingSales(false);
      }
    }

    loadSalesSummary();
  }, []);

  // Calculate low stock items count from cached products
  const lowStockCount = products.filter(
    (p) => p.stockLevel <= (p.lowStockAlert || 5) && p.stockLevel > 0
  ).length;

  const outOfStockCount = products.filter((p) => p.stockLevel <= 0).length;

  const currentDateFormatted = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  return (
    <div className="space-y-4">
      {/* Date & Greeting */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Today
          </p>
          <h1 className="text-lg font-bold text-foreground tracking-tight">
            {currentDateFormatted}
          </h1>
        </div>
        <div className="text-right">
          <span className="text-xs text-muted-foreground">Store Open</span>
        </div>
      </div>

      {/* PRIMARY HERO ACTION: + NEW SALE */}
      <Link
        href="/mobile/sell"
        className="group relative block w-full p-4 rounded-2xl bg-gradient-to-r from-primary via-primary to-amber-500 text-zinc-950 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] transition-all overflow-hidden"
      >
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider bg-zinc-950/15 px-2 py-0.5 rounded-full">
              ⚡ Rapid Checkout
            </span>
            <h2 className="text-2xl font-black tracking-tight text-zinc-950">
              + NEW SALE
            </h2>
            <p className="text-xs text-zinc-900 font-medium">
              Record a sale in seconds
            </p>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-zinc-950/10 border border-zinc-950/10 flex items-center justify-center group-hover:scale-105 transition-transform">
            <ShoppingBag className="w-7 h-7 text-zinc-950 stroke-[2.2]" />
          </div>
        </div>
      </Link>

      {/* Today's Metrics Card */}
      <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-primary" />
            Today&apos;s Revenue
          </span>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            {todaySalesCount} {todaySalesCount === 1 ? "Sale" : "Sales"}
          </span>
        </div>

        <div className="flex items-baseline gap-1">
          <span className="text-xs font-semibold text-muted-foreground">GH₵</span>
          <span className="text-3xl font-black tracking-tight text-foreground">
            {todayRevenue.toLocaleString("en-GH", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
      </div>

      {/* Low Stock Warning Banner */}
      {(lowStockCount > 0 || outOfStockCount > 0) && (
        <Link
          href="/mobile/products?filter=low"
          className="flex items-center justify-between p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 active:scale-[0.99] transition-transform"
        >
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-amber-200">
                {outOfStockCount > 0
                  ? `${outOfStockCount} out of stock, ${lowStockCount} low`
                  : `${lowStockCount} perfumes running low on stock`}
              </p>
              <p className="text-[11px] text-amber-400/80">Tap to inspect inventory</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-amber-400 shrink-0" />
        </Link>
      )}

      {/* Quick Access Tiles */}
      <div className="grid grid-cols-2 gap-2.5">
        <Link
          href="/mobile/products"
          className="p-3.5 rounded-xl bg-card border border-border hover:border-primary/40 active:scale-95 transition-all space-y-2"
        >
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-foreground">Check Stock</p>
            <p className="text-[11px] text-muted-foreground">
              {products.length} perfumes available
            </p>
          </div>
        </Link>

        <Link
          href="/mobile/customers"
          className="p-3.5 rounded-xl bg-card border border-border hover:border-primary/40 active:scale-95 transition-all space-y-2"
        >
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-foreground">Customers</p>
            <p className="text-[11px] text-muted-foreground">
              View debts & directory
            </p>
          </div>
        </Link>
      </div>

      {/* Recent Sales List */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Recent Sales
          </h3>
          <Link
            href="/mobile/sales"
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5"
          >
            See All <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {loadingSales ? (
          <div className="p-4 rounded-xl bg-card border border-border text-center text-xs text-muted-foreground">
            Loading recent sales...
          </div>
        ) : recentSales.length === 0 ? (
          <div className="p-5 rounded-xl border border-dashed border-border text-center space-y-2">
            <Receipt className="w-7 h-7 text-muted-foreground mx-auto" />
            <p className="text-xs font-semibold text-foreground">No sales recorded yet today</p>
            <p className="text-[11px] text-muted-foreground">
              Tap &apos;+ NEW SALE&apos; to record your first perfume sale.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentSales.map((sale) => (
              <div
                key={sale.id}
                className="p-3 rounded-xl bg-card border border-border flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-bold text-foreground">
                    {sale.customer?.name || "Walk-in Customer"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {sale.items?.length || 1} item(s) • {new Date(sale.saleDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-foreground">
                    GH₵{sale.totalAmount.toFixed(2)}
                  </p>
                  <span
                    className={`inline-block text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                      sale.paymentStatus === "PAID"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : sale.paymentStatus === "PARTIAL"
                        ? "bg-amber-500/10 text-amber-400"
                        : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    {sale.paymentStatus}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
