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
import { getPendingSales } from "@/lib/mobile/db";

export default function MobileHomePage() {
  const { products, loading: productsLoading } = useMobileProducts();
  const { state: syncState, lastSyncedAt } = useSyncStatus();

  const [todayRevenue, setTodayRevenue] = useState(0);
  const [todayCollected, setTodayCollected] = useState(0);
  const [todaySalesCount, setTodaySalesCount] = useState(0);
  const [recentSales, setRecentSales] = useState<MobileSaleSummary[]>([]);
  const [loadingSales, setLoadingSales] = useState(true);
  const [debtSummary, setDebtSummary] = useState<{
    totalOutstandingDebt: number;
    totalDebtorsCount: number;
    dueToday: { amount: number; count: number };
    upcoming: { amount: number; count: number };
    overdue: { amount: number; count: number };
  } | null>(null);

  // Fetch today's sales summary from shared backend API & local pending queue
  useEffect(() => {
    let isMounted = true;

    async function loadSalesSummary() {
      try {
        let pendingToday: MobileSaleSummary[] = [];
        let pendingRev = 0;
        let pendingPaid = 0;

        try {
          const pending = await getPendingSales();
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);

          const filteredPending = pending.filter((p) => {
            const d = new Date(p.saleDate);
            return !isNaN(d.getTime()) && d >= startOfToday;
          });

          pendingRev = filteredPending.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);
          pendingPaid = filteredPending.reduce((sum, p) => sum + (Number(p.amountPaid) || 0), 0);

          pendingToday = filteredPending.map((p) => ({
            id: p.offlineId,
            receiptNumber: "PENDING",
            saleDate: p.saleDate,
            totalAmount: p.totalAmount,
            amountPaid: p.amountPaid,
            paymentStatus: p.paymentStatus,
            paymentMethod: p.paymentMethod,
            customer: p.customerId ? { id: p.customerId, name: p.customerName || "Customer" } : null,
            items: p.items.map((it) => ({
              id: it.productId,
              product: { name: it.productName },
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              subtotal: it.quantity * it.unitPrice,
            })),
          }));
        } catch (dbErr) {
          console.warn("Could not inspect local pending sales:", dbErr);
        }

        // Fetch sales and debt summary in parallel
        const [salesRes, debtRes] = await Promise.all([
          fetch("/api/sales?quickRange=today"),
          fetch("/api/debt?view=summary"),
        ]);

        if (debtRes.ok) {
          const debtJson = await debtRes.json();
          if (debtJson.success && isMounted) {
            setDebtSummary(debtJson.data);
          }
        }

        if (salesRes.ok) {
          const json = await salesRes.json();
          if (json.success && isMounted) {
            const serverRevenue = Number(json.summary?.totalSalesRevenue ?? json.summary?.totalRevenue ?? 0);
            const serverCollected = Number(json.summary?.totalAmountCollected ?? serverRevenue);
            const serverCount = Number(json.summary?.totalTransactions ?? json.summary?.totalSalesCount ?? 0);

            setTodayRevenue(serverRevenue + pendingRev);
            setTodayCollected(serverCollected + pendingPaid);
            setTodaySalesCount(serverCount + pendingToday.length);

            const serverSales: MobileSaleSummary[] = Array.isArray(json.data) ? json.data : [];
            const combinedSales = [...pendingToday, ...serverSales];
            setRecentSales(combinedSales.slice(0, 3));
            return;
          }
        }

        // Fallback to local pending if offline
        if (isMounted && pendingToday.length > 0) {
          setTodayRevenue(pendingRev);
          setTodayCollected(pendingPaid);
          setTodaySalesCount(pendingToday.length);
          setRecentSales(pendingToday.slice(0, 3));
        }
      } catch (err) {
        console.warn("Could not fetch today sales summary:", err);
      } finally {
        if (isMounted) setLoadingSales(false);
      }
    }

    loadSalesSummary();

    const handleFocus = () => loadSalesSummary();
    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleFocus);

    return () => {
      isMounted = false;
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleFocus);
    };
  }, [lastSyncedAt, syncState]);

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
        className="block w-full p-4 rounded-md bg-primary text-primary-foreground transition-opacity hover:opacity-95"
      >
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider block opacity-90">
              Point of Sale
            </span>
            <h2 className="text-xl font-bold tracking-tight">
              + New Sale
            </h2>
            <p className="text-xs opacity-80">
              Record customer checkout
            </p>
          </div>
          <div className="w-10 h-10 rounded border border-primary-foreground/20 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 stroke-[2]" />
          </div>
        </div>
      </Link>

      {/* Today's Metrics Card */}
      <div className="p-4 rounded-md bg-card border border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">
            Today&apos;s Revenue
          </span>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-muted text-foreground">
            {todaySalesCount} {todaySalesCount === 1 ? "Sale" : "Sales"}
          </span>
        </div>

        <div className="flex items-baseline gap-1">
          <span className="text-xs font-semibold text-muted-foreground">GH₵</span>
          <span className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
            {todayRevenue.toLocaleString("en-GH", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
        {todayRevenue > todayCollected && (
          <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1.5">
            <span>GH₵{todayCollected.toFixed(2)} collected</span>
            <span>•</span>
            <span className="text-warning font-medium">GH₵{(todayRevenue - todayCollected).toFixed(2)} pending debt</span>
          </p>
        )}
      </div>

      {/* Due Date & Debt Reminder Banner */}
      {debtSummary && (debtSummary.overdue.count > 0 || debtSummary.dueToday.count > 0 || debtSummary.totalOutstandingDebt > 0) && (
        <Link
          href="/mobile/customers?filter=debt"
          className={`flex items-center justify-between p-3.5 rounded-md border transition-all ${
            debtSummary.overdue.count > 0
              ? "bg-red-500/10 border-red-500/25 text-red-500"
              : debtSummary.dueToday.count > 0
              ? "bg-amber-500/10 border-amber-500/25 text-amber-500"
              : "bg-warning/10 border-warning/20 text-warning"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 shrink-0" />
            <div>
              <p className="text-xs font-bold">
                {debtSummary.overdue.count > 0
                  ? `${debtSummary.overdue.count} overdue payment${debtSummary.overdue.count === 1 ? "" : "s"} (GH₵${debtSummary.overdue.amount.toFixed(2)})`
                  : debtSummary.dueToday.count > 0
                  ? `${debtSummary.dueToday.count} payment${debtSummary.dueToday.count === 1 ? "" : "s"} due today (GH₵${debtSummary.dueToday.amount.toFixed(2)})`
                  : `GH₵${debtSummary.totalOutstandingDebt.toFixed(2)} outstanding customer credit`}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {debtSummary.upcoming.count > 0
                  ? `${debtSummary.upcoming.count} upcoming in 7d • Tap to view debtors`
                  : "Tap to inspect accounts & send reminders"}
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 shrink-0" />
        </Link>
      )}

      {/* Low Stock Warning Banner */}
      {(lowStockCount > 0 || outOfStockCount > 0) && (
        <Link
          href="/mobile/products?filter=low"
          className="flex items-center justify-between p-3.5 rounded-md bg-warning/10 border border-warning/20 text-warning"
        >
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <div>
              <p className="text-xs font-medium">
                {outOfStockCount > 0
                  ? `${outOfStockCount} out of stock, ${lowStockCount} low`
                  : `${lowStockCount} perfumes running low on stock`}
              </p>
              <p className="text-[11px] text-muted-foreground">Tap to inspect inventory</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 shrink-0" />
        </Link>
      )}

      {/* Quick Access Tiles */}
      <div className="grid grid-cols-2 gap-2.5">
        <Link
          href="/mobile/products"
          className="p-3.5 rounded-md bg-card border border-border hover:border-border/80 transition-colors space-y-1.5"
        >
          <div className="w-7 h-7 rounded bg-muted text-foreground flex items-center justify-center">
            <Package className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">Check Stock</p>
            <p className="text-[11px] text-muted-foreground">
              {products.length} perfumes available
            </p>
          </div>
        </Link>

        <Link
          href="/mobile/customers"
          className="p-3.5 rounded-md bg-card border border-border hover:border-border/80 transition-colors space-y-1.5"
        >
          <div className="w-7 h-7 rounded bg-muted text-foreground flex items-center justify-center">
            <Users className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">Customers</p>
            <p className="text-[11px] text-muted-foreground">
              View debts & directory
            </p>
          </div>
        </Link>
      </div>

      {/* Recent Sales List */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
          <div className="p-4 rounded-md bg-card border border-border text-center text-xs text-muted-foreground">
            Loading recent sales...
          </div>
        ) : recentSales.length === 0 ? (
          <div className="p-5 rounded-md border border-dashed border-border text-center space-y-2">
            <p className="text-xs font-medium text-foreground">No sales recorded yet today</p>
            <p className="text-[11px] text-muted-foreground">
              Tap &apos;+ New Sale&apos; to record your first perfume sale.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {recentSales.map((sale) => (
              <div
                key={sale.id}
                className="p-3 rounded-md bg-card border border-border flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-medium text-foreground">
                    {sale.customer?.name || "Walk-in Customer"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {sale.items?.length || 1} item(s) • {new Date(sale.saleDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-foreground tabular-nums">
                    GH₵{sale.totalAmount.toFixed(2)}
                  </p>
                  <span
                    className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      sale.paymentStatus === "PAID"
                        ? "bg-emerald-500/10 text-success"
                        : sale.paymentStatus === "PARTIAL"
                        ? "bg-amber-500/10 text-warning"
                        : "bg-red-500/10 text-destructive"
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
