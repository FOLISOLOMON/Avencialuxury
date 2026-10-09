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
      <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
          <CheckCircle2 className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">
            System All Clear
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            No critical low-stock, debtor, or batch completion alerts requiring immediate action.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Attention Required
              </h2>
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                {totalAttentionCount} {totalAttentionCount === 1 ? "Item" : "Items"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Actionable business alerts generated by the Avencia Automation Engine
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Alert Categories */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Category 1: Low / Out of Stock */}
        <div
          className={`p-4 rounded-md border ${
            lowOrOutOfStockProducts.length > 0
              ? "bg-amber-500/5 border-amber-500/20"
              : "bg-muted/30 border-border"
          } space-y-3 flex flex-col justify-between`}
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package
                  className={`w-4 h-4 ${
                    lowOrOutOfStockProducts.length > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                  }`}
                />
                <h3 className="font-semibold text-xs text-foreground uppercase tracking-wider">
                  Low & Out of Stock
                </h3>
              </div>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                  lowOrOutOfStockProducts.length > 0
                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {lowOrOutOfStockProducts.length}
              </span>
            </div>

            {lowOrOutOfStockProducts.length === 0 ? (
              <p className="text-xs text-muted-foreground font-medium mt-3">All inventory stock levels are healthy.</p>
            ) : (
              <div className="mt-3 space-y-1.5">
                {lowOrOutOfStockProducts.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="bg-card p-2 rounded-md border border-border flex items-center justify-between text-xs"
                  >
                    <span className="font-medium text-foreground truncate max-w-[130px]" title={item.name}>
                      {item.name}
                    </span>
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                        item.isOutOfStock ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                      }`}
                    >
                      {item.isOutOfStock ? "Out of Stock" : `${item.stock} left`}
                    </span>
                  </div>
                ))}
                {lowOrOutOfStockProducts.length > 3 && (
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                    +{lowOrOutOfStockProducts.length - 3} more product(s) low
                  </p>
                )}
              </div>
            )}
          </div>

          <a
            href="/inventory"
            className="inline-flex items-center justify-between text-xs font-medium text-primary hover:underline pt-2 border-t border-border"
          >
            <span>Restock Inventory</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Category 2: Customer Debts */}
        <div
          className={`p-4 rounded-md border ${
            indebtedCustomers.length > 0
              ? "bg-primary/5 border-primary/20"
              : "bg-muted/30 border-border"
          } space-y-3 flex flex-col justify-between`}
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users
                  className={`w-4 h-4 ${
                    indebtedCustomers.length > 0 ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                <h3 className="font-semibold text-xs text-foreground uppercase tracking-wider">
                  Outstanding Debts
                </h3>
              </div>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                  indebtedCustomers.length > 0
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {indebtedCustomers.length}
              </span>
            </div>

            {indebtedCustomers.length === 0 ? (
              <p className="text-xs text-muted-foreground font-medium mt-3">No active customer credit balances.</p>
            ) : (
              <div className="mt-3 space-y-1.5">
                <div className="text-xs font-semibold text-foreground bg-card p-2 rounded-md border border-border flex justify-between">
                  <span>Total Due:</span>
                  <span className="text-primary font-bold">{formatCurrency(totalOutstandingDebtSum)}</span>
                </div>
                {indebtedCustomers.slice(0, 2).map((cust) => (
                  <div
                    key={cust.id}
                    className="bg-card p-2 rounded-md border border-border flex items-center justify-between text-xs"
                  >
                    <span className="font-medium text-foreground truncate max-w-[130px]" title={cust.name}>
                      {cust.name}
                    </span>
                    <span className="text-[10px] font-semibold text-destructive">
                      {formatCurrency(cust.debt)}
                    </span>
                  </div>
                ))}
                {indebtedCustomers.length > 2 && (
                  <p className="text-[11px] text-primary font-medium">
                    +{indebtedCustomers.length - 2} more customer debt(s)
                  </p>
                )}
              </div>
            )}
          </div>

          <a
            href="/customers"
            className="inline-flex items-center justify-between text-xs font-medium text-primary hover:underline pt-2 border-t border-border"
          >
            <span>Manage Debts & Customers</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Category 3: Batches Near Completion */}
        <div
          className={`p-4 rounded-md border ${
            nearCompletionBatches.length > 0
              ? "bg-emerald-500/5 border-emerald-500/20"
              : "bg-muted/30 border-border"
          } space-y-3 flex flex-col justify-between`}
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers
                  className={`w-4 h-4 ${
                    nearCompletionBatches.length > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                  }`}
                />
                <h3 className="font-semibold text-xs text-foreground uppercase tracking-wider">
                  Batches Near Completion
                </h3>
              </div>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                  nearCompletionBatches.length > 0
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {nearCompletionBatches.length}
              </span>
            </div>

            {nearCompletionBatches.length === 0 ? (
              <p className="text-xs text-muted-foreground font-medium mt-3">
                No active batches near completion (≤10% stock).
              </p>
            ) : (
              <div className="mt-3 space-y-1.5">
                {nearCompletionBatches.slice(0, 3).map((b) => (
                  <div
                    key={b.id}
                    className="bg-card p-2 rounded-md border border-border flex items-center justify-between text-xs"
                  >
                    <span className="font-medium text-foreground truncate max-w-[130px]" title={b.reference}>
                      Batch #{b.reference}
                    </span>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                      {b.remainingPct}% stock ({b.totalRemaining}/{b.totalPurchased})
                    </span>
                  </div>
                ))}
                {nearCompletionBatches.length > 3 && (
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                    +{nearCompletionBatches.length - 3} more batch(es) near completion
                  </p>
                )}
              </div>
            )}
          </div>

          <a
            href="/batches"
            className="inline-flex items-center justify-between text-xs font-medium text-primary hover:underline pt-2 border-t border-border"
          >
            <span>View Active Batches</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
