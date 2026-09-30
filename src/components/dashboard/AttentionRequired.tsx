"use client";

import { useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Package,
  Users,
  Layers,
  ArrowRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export interface AttentionRequiredProps {
  products?: any[];
  customers?: any[];
  batches?: any[];
  settings?: any;
}

export function AttentionRequired({
  products = [],
  customers = [],
  batches = [],
  settings,
}: AttentionRequiredProps) {
  // 1. Low Stock & Out of Stock products
  const lowOrOutOfStockProducts = useMemo(() => {
    if (!products || !Array.isArray(products)) return [];
    return products
      .filter((p) => {
        const stock =
          p.remainingStock ??
          p.batchItems?.reduce((acc: number, bi: any) => acc + (bi.quantityRemaining || 0), 0) ??
          0;
        const threshold = p.lowStockThreshold ?? settings?.lowStockThreshold ?? 3;
        return stock <= threshold;
      })
      .map((p) => {
        const stock =
          p.remainingStock ??
          p.batchItems?.reduce((acc: number, bi: any) => acc + (bi.quantityRemaining || 0), 0) ??
          0;
        return {
          id: p.id,
          name: p.name,
          sku: p.sku || "N/A",
          stock,
          isOutOfStock: stock === 0,
        };
      });
  }, [products, settings]);

  // 2. Customer credit balances / outstanding debts
  const indebtedCustomers = useMemo(() => {
    if (!customers || !Array.isArray(customers)) return [];
    return customers
      .filter((c) => {
        const debt = c.totalOutstandingDebt ?? 0;
        return debt > 0;
      })
      .map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone || "N/A",
        debt: c.totalOutstandingDebt,
      }));
  }, [customers]);

  const totalOutstandingDebtSum = useMemo(() => {
    return indebtedCustomers.reduce((sum, c) => sum + c.debt, 0);
  }, [indebtedCustomers]);

  // 3. Batches near completion (<= 10% stock remaining by default)
  const nearCompletionBatches = useMemo(() => {
    if (!batches || !Array.isArray(batches)) return [];
    const thresholdPct = settings?.batchNearCompletionThreshold ?? 10;

    return batches
      .filter((b) => {
        if (b.status && b.status !== "ACTIVE") return false;
        const totalPurchased =
          b.totalPurchased ??
          b.batchItems?.reduce((acc: number, item: any) => acc + (item.quantityPurchased || 0), 0) ??
          0;
        const totalRemaining =
          b.totalRemaining ??
          b.batchItems?.reduce((acc: number, item: any) => acc + (item.quantityRemaining || 0), 0) ??
          0;
        if (totalPurchased <= 0) return false;
        const remainingPct = (totalRemaining / totalPurchased) * 100;
        return remainingPct <= thresholdPct;
      })
      .map((b) => {
        const totalPurchased =
          b.totalPurchased ??
          b.batchItems?.reduce((acc: number, item: any) => acc + (item.quantityPurchased || 0), 0) ??
          0;
        const totalRemaining =
          b.totalRemaining ??
          b.batchItems?.reduce((acc: number, item: any) => acc + (item.quantityRemaining || 0), 0) ??
          0;
        const remainingPct = Math.round((totalRemaining / totalPurchased) * 100);

        return {
          id: b.id,
          reference: b.reference || b.id.slice(-6),
          totalPurchased,
          totalRemaining,
          remainingPct,
        };
      });
  }, [batches, settings]);

  const totalAttentionCount =
    lowOrOutOfStockProducts.length + indebtedCustomers.length + nearCompletionBatches.length;

  if (totalAttentionCount === 0) {
    return (
      <div className="rounded-3xl border border-[#E5E2D8] dark:border-[#2A2A2A] shadow-xl shadow-gold-500/5 bg-white dark:bg-[#151515] p-5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0 border border-emerald-200/60 dark:border-emerald-800/60">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm font-black text-[#171717] dark:text-[#F5F5F5] tracking-tight">
            SYSTEM ALL CLEAR
          </h2>
          <p className="text-xs text-[#737373] dark:text-[#A3A3A3] font-medium">
            No critical low-stock, debtor, or batch completion alerts requiring immediate action.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-[#E5E2D8] dark:border-[#2A2A2A] shadow-xl shadow-gold-500/5 bg-white dark:bg-[#151515] p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E2D8] dark:border-[#2A2A2A] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shrink-0 border border-amber-200/60 dark:border-amber-800/60">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-[#171717] dark:text-[#F5F5F5] tracking-tight">
                ATTENTION REQUIRED
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
                {totalAttentionCount} {totalAttentionCount === 1 ? "Item" : "Items"}
              </span>
            </div>
            <p className="text-xs text-[#737373] dark:text-[#A3A3A3] font-medium mt-0.5">
              Actionable business alerts generated by the Avencia Automation Engine
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Alert Categories */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Category 1: Low / Out of Stock */}
        <div
          className={`p-4 rounded-2xl border ${
            lowOrOutOfStockProducts.length > 0
              ? "bg-amber-50/60 dark:bg-amber-950/30 border-amber-200/80 dark:border-amber-900/50"
              : "bg-[#F8F7F3] dark:bg-[#181818] border-[#E5E2D8] dark:border-[#2A2A2A]"
          } space-y-3 flex flex-col justify-between`}
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package
                  className={`w-4 h-4 ${
                    lowOrOutOfStockProducts.length > 0 ? "text-amber-600 dark:text-amber-400" : "text-[#737373] dark:text-[#A3A3A3]"
                  }`}
                />
                <h3 className="font-extrabold text-xs text-[#171717] dark:text-[#F5F5F5] uppercase tracking-wider">
                  Low & Out of Stock
                </h3>
              </div>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  lowOrOutOfStockProducts.length > 0
                    ? "bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200"
                    : "bg-[#E5E2D8] dark:bg-[#2A2A2A] text-[#171717] dark:text-[#F5F5F5]"
                }`}
              >
                {lowOrOutOfStockProducts.length}
              </span>
            </div>

            {lowOrOutOfStockProducts.length === 0 ? (
              <p className="text-xs text-[#737373] dark:text-[#A3A3A3] font-medium mt-3">All inventory stock levels are healthy.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {lowOrOutOfStockProducts.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-[#151515] p-2.5 rounded-xl border border-amber-200/70 dark:border-amber-900/60 flex items-center justify-between text-xs shadow-xs"
                  >
                    <span className="font-bold text-[#171717] dark:text-[#F5F5F5] truncate max-w-[130px]" title={item.name}>
                      {item.name}
                    </span>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                        item.isOutOfStock ? "bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200" : "bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200"
                      }`}
                    >
                      {item.isOutOfStock ? "Out of Stock" : `${item.stock} left`}
                    </span>
                  </div>
                ))}
                {lowOrOutOfStockProducts.length > 3 && (
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 font-bold">
                    +{lowOrOutOfStockProducts.length - 3} more product(s) low
                  </p>
                )}
              </div>
            )}
          </div>

          <a
            href="/inventory"
            className="inline-flex items-center justify-between text-xs font-bold text-gold-600 dark:text-gold-400 hover:text-gold-700 pt-2 border-t border-amber-200/60 dark:border-amber-900/50"
          >
            <span>Restock Inventory</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Category 2: Customer Debts */}
        <div
          className={`p-4 rounded-2xl border ${
            indebtedCustomers.length > 0
              ? "bg-gold-500/10 dark:bg-gold-500/15 border-gold-500/30"
              : "bg-[#F8F7F3] dark:bg-[#181818] border-[#E5E2D8] dark:border-[#2A2A2A]"
          } space-y-3 flex flex-col justify-between`}
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users
                  className={`w-4 h-4 ${
                    indebtedCustomers.length > 0 ? "text-gold-600 dark:text-gold-400" : "text-[#737373] dark:text-[#A3A3A3]"
                  }`}
                />
                <h3 className="font-extrabold text-xs text-[#171717] dark:text-[#F5F5F5] uppercase tracking-wider">
                  Outstanding Debts
                </h3>
              </div>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  indebtedCustomers.length > 0
                    ? "bg-gold-500/20 text-gold-700 dark:text-gold-300"
                    : "bg-[#E5E2D8] dark:bg-[#2A2A2A] text-[#171717] dark:text-[#F5F5F5]"
                }`}
              >
                {indebtedCustomers.length}
              </span>
            </div>

            {indebtedCustomers.length === 0 ? (
              <p className="text-xs text-[#737373] dark:text-[#A3A3A3] font-medium mt-3">No active customer credit balances.</p>
            ) : (
              <div className="mt-3 space-y-2">
                <div className="text-xs font-extrabold text-[#171717] dark:text-[#F5F5F5] bg-white dark:bg-[#151515] p-2 rounded-xl border border-gold-500/30 flex justify-between">
                  <span>Total Due:</span>
                  <span className="text-gold-600 dark:text-gold-400 font-black">{formatCurrency(totalOutstandingDebtSum)}</span>
                </div>
                {indebtedCustomers.slice(0, 2).map((cust) => (
                  <div
                    key={cust.id}
                    className="bg-white dark:bg-[#151515] p-2.5 rounded-xl border border-gold-500/30 flex items-center justify-between text-xs shadow-xs"
                  >
                    <span className="font-bold text-[#171717] dark:text-[#F5F5F5] truncate max-w-[130px]" title={cust.name}>
                      {cust.name}
                    </span>
                    <span className="text-[10px] font-black text-rose-700 dark:text-rose-400">
                      {formatCurrency(cust.debt)}
                    </span>
                  </div>
                ))}
                {indebtedCustomers.length > 2 && (
                  <p className="text-[11px] text-gold-600 dark:text-gold-400 font-bold">
                    +{indebtedCustomers.length - 2} more customer debt(s)
                  </p>
                )}
              </div>
            )}
          </div>

          <a
            href="/customers"
            className="inline-flex items-center justify-between text-xs font-bold text-gold-600 dark:text-gold-400 hover:text-gold-700 pt-2 border-t border-gold-500/30"
          >
            <span>Manage Debts & Customers</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Category 3: Batches Near Completion */}
        <div
          className={`p-4 rounded-2xl border ${
            nearCompletionBatches.length > 0
              ? "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-900/50"
              : "bg-[#F8F7F3] dark:bg-[#181818] border-[#E5E2D8] dark:border-[#2A2A2A]"
          } space-y-3 flex flex-col justify-between`}
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers
                  className={`w-4 h-4 ${
                    nearCompletionBatches.length > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-[#737373] dark:text-[#A3A3A3]"
                  }`}
                />
                <h3 className="font-extrabold text-xs text-[#171717] dark:text-[#F5F5F5] uppercase tracking-wider">
                  Batches Near Completion
                </h3>
              </div>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  nearCompletionBatches.length > 0
                    ? "bg-emerald-200/80 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200"
                    : "bg-[#E5E2D8] dark:bg-[#2A2A2A] text-[#171717] dark:text-[#F5F5F5]"
                }`}
              >
                {nearCompletionBatches.length}
              </span>
            </div>

            {nearCompletionBatches.length === 0 ? (
              <p className="text-xs text-[#737373] dark:text-[#A3A3A3] font-medium mt-3">
                No active batches near completion (≤10% stock).
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {nearCompletionBatches.slice(0, 3).map((b) => (
                  <div
                    key={b.id}
                    className="bg-white dark:bg-[#151515] p-2.5 rounded-xl border border-emerald-200/70 dark:border-emerald-900/60 flex items-center justify-between text-xs shadow-xs"
                  >
                    <span className="font-bold text-[#171717] dark:text-[#F5F5F5] truncate max-w-[130px]" title={b.reference}>
                      Batch #{b.reference}
                    </span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200">
                      {b.remainingPct}% stock ({b.totalRemaining}/{b.totalPurchased})
                    </span>
                  </div>
                ))}
                {nearCompletionBatches.length > 3 && (
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-bold">
                    +{nearCompletionBatches.length - 3} more batch(es) near completion
                  </p>
                )}
              </div>
            )}
          </div>

          <a
            href="/batches"
            className="inline-flex items-center justify-between text-xs font-bold text-gold-600 dark:text-gold-400 hover:text-gold-700 pt-2 border-t border-emerald-200/60 dark:border-emerald-900/50"
          >
            <span>View Active Batches</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
