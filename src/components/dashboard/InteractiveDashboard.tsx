"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Plus,
  ArrowRight,
  Package,
  Users,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { TrendBarChart } from "@/components/ui/SvgCharts";
import { Sheet } from "@/components/ui/Sheet";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/ToastProvider";

interface InteractiveDashboardProps {
  summary: any;
  activeBatches: any[];
  products: any[];
  sales?: any[];
  customers?: any[];
  settings?: any;
}

export function InteractiveDashboard({
  summary,
  activeBatches = [],
  products = [],
  sales = [],
  customers = [],
  settings,
}: InteractiveDashboardProps) {
  const toast = useToast();
  const currency = settings?.currency || "GHS";

  // Quick Action Modal states
  const [isQuickProductOpen, setIsQuickProductOpen] = useState(false);

  // Quick Product Form
  const [newProdName, setNewProdName] = useState("");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdCost, setNewProdCost] = useState("");
  const [isSavingProd, setIsSavingProd] = useState(false);

  // 1. Calculate Today's Sales
  const todayStats = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    const todaySales = sales.filter((s) => {
      if (s.status === "VOIDED" || s.status === "REFUNDED") return false;
      const sDate = s.saleDate ? new Date(s.saleDate).toISOString().split("T")[0] : "";
      return sDate === todayStr;
    });

    const revenue = todaySales.reduce((sum, s) => sum + Number(s.totalAmount || 0), 0);
    const count = todaySales.length;
    const profit = todaySales.reduce((sum, s) => sum + Number(s.grossProfit || 0), 0);

    return { revenue, count, profit };
  }, [sales]);

  // 2. Critical Needs Attention Items (Low stock + Outstanding customer debt)
  const attentionItems = useMemo(() => {
    const lowStock = products.filter((p) => {
      const stock = p.remainingStock ?? 0;
      const threshold = p.lowStockThreshold ?? settings?.lowStockThreshold ?? 3;
      return stock <= threshold;
    });

    const debtors = customers.filter((c) => {
      const debt = Number(c.totalOutstandingDebt || 0);
      return debt > 0;
    });

    const totalDebt = debtors.reduce((sum, c) => sum + Number(c.totalOutstandingDebt || 0), 0);

    return {
      lowStock,
      debtors,
      totalDebt,
    };
  }, [products, customers, settings]);

  // 3. 7-Day Sales Trend Bar Chart Data
  const trendData = useMemo(() => {
    const days: { [dateStr: string]: { label: string; value: number } } = {};
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("en-US", { weekday: "short" });
      days[key] = { label, value: 0 };
    }

    sales.forEach((s) => {
      if (s.status === "VOIDED" || s.status === "REFUNDED") return;
      const key = s.saleDate ? new Date(s.saleDate).toISOString().split("T")[0] : "";
      if (days[key]) {
        days[key].value += Number(s.totalAmount || 0);
      }
    });

    return Object.values(days);
  }, [sales]);

  // 4. Quick Product Save Handler
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim() || !newProdPrice) return;
    setIsSavingProd(true);

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProdName.trim(),
          sellingPrice: parseFloat(newProdPrice),
          defaultCostPrice: parseFloat(newProdCost || "0"),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Product "${newProdName}" added successfully.`);
        setIsQuickProductOpen(false);
        setNewProdName("");
        setNewProdPrice("");
        setNewProdCost("");
        window.location.reload();
      } else {
        toast.error(data.error || "Failed to add product");
      }
    } catch {
      toast.error("Network error saving product");
    } finally {
      setIsSavingProd(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
            Financial & Operations Pulse
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>

        <div className="flex items-center gap-2 select-none">
          <Link href="/sales">
            <Button
              variant="primary"
              size="md"
              leftIcon={<ShoppingBag className="w-4 h-4" />}
            >
              New Transaction
            </Button>
          </Link>
          <Button
            variant="outline"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsQuickProductOpen(true)}
          >
            Add Product
          </Button>
        </div>
      </div>

      {/* 2. Unified Financial Ledger Bar (Architecture over fragmented floating cards) */}
      <div className="rounded-lg border border-border bg-card grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
        {/* Metric 1: Today's Revenue */}
        <div className="p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span className="font-medium">Today's Sales</span>
            <span className="tabular-nums">
              {todayStats.count} {todayStats.count === 1 ? "transaction" : "transactions"}
            </span>
          </div>

          <div>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground tabular-nums">
              <Money amount={todayStats.revenue} currency={currency} size="xl" />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
              <span className="text-success font-semibold tabular-nums">
                +{formatCurrency(todayStats.profit, currency)}
              </span>
              <span>estimated gross margin</span>
            </p>
          </div>

          <div className="pt-3 mt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>Cumulative Revenue</span>
            <span className="font-medium text-foreground tabular-nums">
              {formatCurrency(summary?.totalRevenue || 0, currency)}
            </span>
          </div>
        </div>

        {/* Metric 2: Net Profit & Expenses */}
        <div className="p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span className="font-medium">Net Profit</span>
            <span className="text-muted-foreground">All time</span>
          </div>

          <div>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums">
              <Money
                amount={summary?.totalNetProfit || 0}
                currency={currency}
                size="xl"
                colored
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Gross profit:{" "}
              <span className="font-medium text-foreground tabular-nums">
                {formatCurrency(summary?.totalGrossProfit || 0, currency)}
              </span>
            </p>
          </div>

          <div className="pt-3 mt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>Operating Expenses</span>
            <span className="font-medium text-foreground tabular-nums">
              {formatCurrency(summary?.totalExpenses || 0, currency)}
            </span>
          </div>
        </div>

        {/* Metric 3: Receivables & Active Inventory */}
        <div className="p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span className="font-medium">Customer Receivables</span>
            <span className="tabular-nums">
              {attentionItems.debtors.length}{" "}
              {attentionItems.debtors.length === 1 ? "debtor" : "debtors"}
            </span>
          </div>

          <div>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums">
              <Money
                amount={attentionItems.totalDebt}
                currency={currency}
                size="xl"
                className={attentionItems.totalDebt > 0 ? "text-warning" : "text-foreground"}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Active stock batches:{" "}
              <span className="font-medium text-foreground tabular-nums">
                {activeBatches.length} in warehouse
              </span>
            </p>
          </div>

          <div className="pt-3 mt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>Capital Reserve</span>
            <span className="font-medium text-foreground tabular-nums">
              {formatCurrency(summary?.allocations?.savings || 0, currency)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Operational Attention Ledger (Restrained, high-clarity table) */}
      {(attentionItems.lowStock.length > 0 || attentionItems.debtors.length > 0) && (
        <Card>
          <CardHeader className="px-4 py-3 sm:px-5">
            <div>
              <CardTitle>Operational Priorities</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Items requiring restock or debt follow-up
              </p>
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">
              {attentionItems.lowStock.length + attentionItems.debtors.length} items
            </span>
          </CardHeader>

          <div className="divide-y divide-border">
            {/* Low stock alerts */}
            {attentionItems.lowStock.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="p-3 sm:px-5 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Package className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="font-medium text-foreground truncate block">
                      {item.name}
                    </span>
                    <span className="text-[11px] text-destructive font-medium tabular-nums">
                      {item.remainingStock} units remaining (below threshold)
                    </span>
                  </div>
                </div>

                <Link href="/products" className="flex-shrink-0">
                  <Button variant="outline" size="sm">
                    Restock
                  </Button>
                </Link>
              </div>
            ))}

            {/* Debtor alerts */}
            {attentionItems.debtors.slice(0, 3).map((debtor) => (
              <div
                key={debtor.id}
                className="p-3 sm:px-5 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="font-medium text-foreground truncate block">
                      {debtor.name}
                    </span>
                    <span className="text-[11px] text-warning font-medium tabular-nums">
                      Outstanding balance: {formatCurrency(debtor.totalOutstandingDebt, currency)}
                    </span>
                  </div>
                </div>

                <Link href="/customers" className="flex-shrink-0">
                  <Button variant="outline" size="sm">
                    View Ledger
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 4. Sales Activity & Trend (Disciplined layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 7-Day Sales Trend Bar Chart */}
        <Card>
          <CardHeader className="px-4 py-3 sm:px-5">
            <div>
              <CardTitle>Sales Trend</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Past 7 days volume</p>
            </div>
            <span className="text-xs text-muted-foreground">Daily Revenue</span>
          </CardHeader>
          <div className="p-4 sm:p-5">
            <TrendBarChart data={trendData} currency={currency} height={140} />
          </div>
        </Card>

        {/* Recent Transactions List */}
        <Card>
          <CardHeader className="px-4 py-3 sm:px-5">
            <div>
              <CardTitle>Recent Transactions</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Latest recorded retail sales</p>
            </div>
            <Link
              href="/sales"
              className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
            >
              Full Ledger <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>

          <div className="divide-y divide-border">
            {sales.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No transactions recorded yet.
              </div>
            ) : (
              sales.slice(0, 5).map((sale) => (
                <div
                  key={sale.id}
                  className="p-3 sm:px-5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <span className="font-medium text-foreground truncate block">
                      {sale.customer?.name || "Walk-in Client"}
                    </span>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                      <span>{sale.saleItems?.length || 1} items</span>
                      <span>•</span>
                      <span>{sale.paymentMethod}</span>
                      <span>•</span>
                      <span>
                        {new Date(sale.saleDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="font-semibold text-foreground tabular-nums">
                      <Money amount={sale.totalAmount} currency={currency} size="sm" />
                    </div>
                    <div className="text-[11px] text-success font-medium tabular-nums mt-0.5">
                      +{formatCurrency(sale.grossProfit, currency)} margin
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Quick Add Product Sheet */}
      <Sheet
        isOpen={isQuickProductOpen}
        onClose={() => setIsQuickProductOpen(false)}
        title="New Fragrance SKU"
        description="Quickly record a new product into Avencia catalog"
        size="sm"
      >
        <form onSubmit={handleSaveProduct} className="space-y-4 pt-2">
          <Input
            label="Product Name"
            placeholder="e.g. Dior Sauvage Parfum"
            value={newProdName}
            onChange={(e) => setNewProdName(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={`Selling Price (${currency})`}
              type="number"
              step="0.01"
              placeholder="0.00"
              value={newProdPrice}
              onChange={(e) => setNewProdPrice(e.target.value)}
              required
            />
            <Input
              label={`Wholesale Cost (${currency})`}
              type="number"
              step="0.01"
              placeholder="0.00"
              value={newProdCost}
              onChange={(e) => setNewProdCost(e.target.value)}
            />
          </div>
          <div className="pt-3 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsQuickProductOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSavingProd}
              className="flex-1"
            >
              Save Product
            </Button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}
