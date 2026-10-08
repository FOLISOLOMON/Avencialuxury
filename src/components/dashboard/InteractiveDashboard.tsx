"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Package,
  Layers,
  Users,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Receipt,
  PiggyBank,
  Phone,
  MessageSquare,
  Plus,
  Clock,
  Sparkles,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Money } from "@/components/ui/Money";
import { TrendBarChart, MiniSparkline } from "@/components/ui/SvgCharts";
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
  const [isQuickSaleOpen, setIsQuickSaleOpen] = useState(false);
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
    // Low / Out of stock
    const lowStock = products.filter((p) => {
      const stock = p.remainingStock ?? 0;
      const threshold = p.lowStockThreshold ?? settings?.lowStockThreshold ?? 3;
      return stock <= threshold;
    });

    // Debtors
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
        toast.success(`Product "${newProdName}" added successfully!`);
        setIsQuickProductOpen(false);
        setNewProdName("");
        setNewProdPrice("");
        setNewProdCost("");
        // Reload page to refresh server data
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
      {/* 1. Header Pulse & Quick Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/60">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            Business Overview
            <span className="w-2 h-2 rounded-full bg-success animate-pulse-subtle" />
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 select-none">
          <Link href="/sales">
            <Button
              variant="primary"
              size="md"
              leftIcon={<ShoppingBag className="w-4 h-4" />}
              className="w-full sm:w-auto shadow-gold"
            >
              New Sale
            </Button>
          </Link>
          <Button
            variant="outline"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsQuickProductOpen(true)}
            className="hidden sm:inline-flex"
          >
            Add Product
          </Button>
        </div>
      </div>

      {/* 2. Hero Financials: Prioritized, readable, NOT 10 stacked cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Hero Card 1: Today's Sales */}
        <Card className="md:col-span-1 bg-gradient-to-br from-card to-card-elevated border-primary/30 relative overflow-hidden">
          <div className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Today's Sales
              </span>
              <Badge variant="gold">
                {todayStats.count} {todayStats.count === 1 ? "Sale" : "Sales"}
              </Badge>
            </div>

            <div>
              <Money amount={todayStats.revenue} currency={currency} size="hero" />
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 font-medium">
                <span className="text-success font-bold">
                  +{formatCurrency(todayStats.profit, currency)}
                </span>{" "}
                estimated gross margin today
              </p>
            </div>

            <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Total Revenue</span>
              <Money amount={summary?.totalRevenue || 0} currency={currency} size="sm" />
            </div>
          </div>
        </Card>

        {/* Hero Card 2: Net Profit & Expenses */}
        <Card className="md:col-span-1 bg-card">
          <div className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Net Profit
              </span>
              <Badge variant={Number(summary?.totalNetProfit || 0) >= 0 ? "success" : "destructive"}>
                All Time
              </Badge>
            </div>

            <div>
              <Money
                amount={summary?.totalNetProfit || 0}
                currency={currency}
                size="xl"
                colored
              />
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                Gross Profit: <span className="font-bold text-foreground">{formatCurrency(summary?.totalGrossProfit || 0, currency)}</span>
              </p>
            </div>

            <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Total Expenses</span>
              <Money amount={summary?.totalExpenses || 0} currency={currency} size="sm" colored />
            </div>
          </div>
        </Card>

        {/* Hero Card 3: Customer Debt & Active Batches */}
        <Card className="md:col-span-1 bg-card">
          <div className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Owed by Customers
              </span>
              <Badge variant={attentionItems.totalDebt > 0 ? "warning" : "secondary"}>
                {attentionItems.debtors.length} {attentionItems.debtors.length === 1 ? "Debtor" : "Debtors"}
              </Badge>
            </div>

            <div>
              <Money
                amount={attentionItems.totalDebt}
                currency={currency}
                size="xl"
                className={attentionItems.totalDebt > 0 ? "text-warning" : "text-foreground"}
              />
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                Active Batches: <span className="font-bold text-foreground">{activeBatches.length} in stock</span>
              </p>
            </div>

            <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Savings Bucket</span>
              <Money amount={summary?.allocations?.savings || 0} currency={currency} size="sm" />
            </div>
          </div>
        </Card>
      </div>

      {/* 3. Attention Required (Clean prioritized mobile list, NO massive tables) */}
      {(attentionItems.lowStock.length > 0 || attentionItems.debtors.length > 0) && (
        <Card className="border-warning/30 bg-card">
          <CardHeader className="px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-warning/15 text-warning">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <CardTitle>Attention Required</CardTitle>
            </div>
            <span className="text-xs text-muted-foreground font-semibold">
              {attentionItems.lowStock.length + attentionItems.debtors.length} items
            </span>
          </CardHeader>

          <div className="divide-y divide-border/60">
            {/* Low stock alerts */}
            {attentionItems.lowStock.slice(0, 3).map((item) => (
              <div key={item.id} className="p-3.5 sm:px-5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 rounded bg-destructive/15 text-destructive flex-shrink-0">
                    <Package className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-foreground truncate">{item.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      Only <span className="text-destructive font-black">{item.remainingStock}</span> left in stock
                    </div>
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
              <div key={debtor.id} className="p-3.5 sm:px-5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 rounded bg-warning/15 text-warning flex-shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-foreground truncate">{debtor.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      Owes <span className="font-bold text-warning">{formatCurrency(debtor.totalOutstandingDebt, currency)}</span>
                    </div>
                  </div>
                </div>

                <Link href="/customers" className="flex-shrink-0">
                  <Button variant="outline" size="sm">
                    View
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 4. Sales Activity & Trend (Side-by-side on desktop, stacked on mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 7-Day Sales Trend Bar Chart */}
        <Card>
          <CardHeader className="px-4 py-3 sm:px-5">
            <CardTitle>7-Day Sales Trend</CardTitle>
            <span className="text-xs text-muted-foreground font-semibold">Daily Volume</span>
          </CardHeader>
          <div className="p-4 sm:p-5">
            <TrendBarChart data={trendData} currency={currency} height={150} />
          </div>
        </Card>

        {/* Recent Transactions List */}
        <Card>
          <CardHeader className="px-4 py-3 sm:px-5">
            <CardTitle>Recent Sales</CardTitle>
            <Link href="/sales" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>

          <div className="divide-y divide-border/60">
            {sales.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No sales recorded yet. Process your first sale above!
              </div>
            ) : (
              sales.slice(0, 5).map((sale) => (
                <div key={sale.id} className="p-3.5 sm:px-5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <div className="font-bold text-foreground truncate">
                      {sale.customer?.name || "Walk-in Customer"}
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
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
                    <Money amount={sale.totalAmount} currency={currency} size="sm" />
                    <div className="text-[10px] text-success font-semibold mt-0.5">
                      +{formatCurrency(sale.grossProfit, currency)} profit
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
        title="Add New Product"
        description="Quickly create a product in the Avencia catalog"
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
              label="Selling Price (GH₵)"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={newProdPrice}
              onChange={(e) => setNewProdPrice(e.target.value)}
              required
            />
            <Input
              label="Cost Price (GH₵)"
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
