"use client";

import { useState, useMemo } from "react";
import {
  TrendingUp,
  DollarSign,
  Package,
  Layers,
  ShoppingBag,
  Plus,
  PiggyBank,
  Wallet,
  ArrowUpRight,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  Calendar,
  CreditCard,
  User,
  ArrowDownRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { createProductAction } from "@/lib/actions/product-actions";
import { createBatchAction } from "@/lib/actions/batch-actions";
import { createSaleAction } from "@/lib/actions/sale-actions";
import { AttentionRequired } from "./AttentionRequired";

interface InteractiveDashboardProps {
  summary: any;
  activeBatches: any[];
  products: any[];
  sales?: any[];
  customers?: any[];
  settings?: any;
}

type TimeFrame = "Today" | "7 Days" | "30 Days" | "12 Months";

export function InteractiveDashboard({
  summary,
  activeBatches,
  products,
  sales = [],
  customers = [],
  settings,
}: InteractiveDashboardProps) {
  // Modal Visibility States
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  // Timeframe selector state for Sales Performance Overview
  const [timeframe, setTimeframe] = useState<TimeFrame>("30 Days");

  // Form Loading States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Product Form State
  const [prodName, setProdName] = useState("");
  const [prodSku, setProdSku] = useState("");
  const [prodPrice, setProdPrice] = useState("");
  const [prodCost, setProdCost] = useState("");

  // Sale Form State
  const [selectedProductId, setSelectedProductId] = useState("");
  const [saleQty, setSaleQty] = useState("1");
  const [salePrice, setSalePrice] = useState("");

  // Batch Form State
  const [batchRef, setBatchRef] = useState(
    `BATCH-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`
  );
  const [batchProdId, setBatchProdId] = useState("");
  const [batchQty, setBatchQty] = useState("10");
  const [batchCost, setBatchCost] = useState("");
  const [batchTransport, setBatchTransport] = useState("0");

  const businessId = "biz_default_avencia";

  // Handle Product Submission
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError("");

    const res = await createProductAction({
      businessId,
      name: prodName,
      sku: prodSku || undefined,
      sellingPrice: parseFloat(prodPrice),
      defaultCostPrice: parseFloat(prodCost),
    });

    setIsSubmitting(false);
    if (res.success) {
      setIsProductModalOpen(false);
      setProdName("");
      setProdSku("");
      setProdPrice("");
      setProdCost("");
    } else {
      setFormError(res.error || "Failed to create product");
    }
  };

  // Handle Sale Submission
  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError("");

    const res = await createSaleAction({
      businessId,
      items: [
        {
          productId: selectedProductId,
          quantity: parseInt(saleQty, 10),
          unitPrice: parseFloat(salePrice),
        },
      ],
    });

    setIsSubmitting(false);
    if (res.success) {
      setIsSaleModalOpen(false);
      setSelectedProductId("");
      setSaleQty("1");
      setSalePrice("");
    } else {
      setFormError(res.error || "Failed to create sale");
    }
  };

  // Handle Batch Submission
  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError("");

    const res = await createBatchAction({
      businessId,
      reference: batchRef,
      purchaseDate: new Date(),
      additionalCosts: parseFloat(batchTransport) || 0,
      items: [
        {
          productId: batchProdId,
          quantityPurchased: parseInt(batchQty, 10),
          unitCost: parseFloat(batchCost),
        },
      ],
    });

    setIsSubmitting(false);
    if (res.success) {
      setIsBatchModalOpen(false);
      setBatchProdId("");
      setBatchQty("10");
      setBatchCost("");
      setBatchTransport("0");
    } else {
      setFormError(res.error || "Failed to create batch");
    }
  };

  // Calculate Product & Inventory Metrics
  const inventoryMetrics = useMemo(() => {
    let totalUnits = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    const lowStockList: any[] = [];

    products.forEach((p) => {
      const stockRemaining =
        p.remainingStock ??
        p.batchItems?.reduce((acc: number, bi: any) => acc + bi.quantityRemaining, 0) ??
        0;
      const threshold = p.lowStockThreshold || 3;

      totalUnits += stockRemaining;

      if (stockRemaining === 0) {
        outOfStockCount++;
        lowStockList.push({ ...p, currentStock: stockRemaining, threshold });
      } else if (stockRemaining <= threshold) {
        lowStockCount++;
        lowStockList.push({ ...p, currentStock: stockRemaining, threshold });
      }
    });

    return {
      totalProducts: products.length,
      totalUnits,
      lowStockCount,
      outOfStockCount,
      lowStockList,
    };
  }, [products]);

  // Gross profit margin calculation
  const totalRevenue = summary?.totalRevenue || 0;
  const totalGrossProfit = summary?.totalGrossProfit || 0;
  const totalExpenses = summary?.totalExpenses || 0;
  const totalNetProfit = summary?.totalNetProfit || 0;

  const grossMarginPct =
    totalRevenue > 0
      ? ((totalGrossProfit / totalRevenue) * 100).toFixed(1)
      : "0.0";

  const netMarginPct =
    totalRevenue > 0
      ? ((totalNetProfit / totalRevenue) * 100).toFixed(1)
      : "0.0";

  // Chart aggregation based on timeframe
  const chartData = useMemo(() => {
    const now = new Date();
    if (timeframe === "Today") {
      const hours = ["8 AM", "10 AM", "12 PM", "2 PM", "4 PM", "6 PM", "8 PM"];
      const buckets = hours.map((label) => ({ label, amount: 0, count: 0 }));
      sales.forEach((s) => {
        const d = new Date(s.saleDate);
        if (d.toDateString() === now.toDateString()) {
          const hr = d.getHours();
          let idx = 0;
          if (hr >= 20) idx = 6;
          else if (hr >= 18) idx = 5;
          else if (hr >= 16) idx = 4;
          else if (hr >= 14) idx = 3;
          else if (hr >= 12) idx = 2;
          else if (hr >= 10) idx = 1;
          else idx = 0;

          buckets[idx].amount += Number(s.totalAmount || 0);
          buckets[idx].count += 1;
        }
      });
      return buckets;
    }

    if (timeframe === "7 Days") {
      const buckets: Array<{ label: string; dateKey: string; amount: number; count: number }> = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dayLabel = d.toLocaleDateString("en-US", { weekday: "short" });
        const dateKey = d.toISOString().split("T")[0];
        buckets.push({ label: dayLabel, dateKey, amount: 0, count: 0 });
      }

      sales.forEach((s) => {
        const dateKey = new Date(s.saleDate).toISOString().split("T")[0];
        const match = buckets.find((b) => b.dateKey === dateKey);
        if (match) {
          match.amount += Number(s.totalAmount || 0);
          match.count += 1;
        }
      });
      return buckets;
    }

    if (timeframe === "30 Days") {
      const buckets = [
        { label: "Week 1", amount: 0, count: 0 },
        { label: "Week 2", amount: 0, count: 0 },
        { label: "Week 3", amount: 0, count: 0 },
        { label: "Week 4", amount: 0, count: 0 },
      ];

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      sales.forEach((s) => {
        const d = new Date(s.saleDate);
        if (d >= thirtyDaysAgo) {
          const diffDays = Math.floor(
            (now.getTime() - d.getTime()) / (1000 * 3600 * 24)
          );
          let idx = 3;
          if (diffDays >= 22) idx = 0;
          else if (diffDays >= 15) idx = 1;
          else if (diffDays >= 8) idx = 2;
          else idx = 3;

          buckets[idx].amount += Number(s.totalAmount || 0);
          buckets[idx].count += 1;
        }
      });
      return buckets;
    }

    // 12 Months
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    const buckets = months.map((label, idx) => ({ label, monthIdx: idx, amount: 0, count: 0 }));

    sales.forEach((s) => {
      const d = new Date(s.saleDate);
      if (d.getFullYear() === now.getFullYear()) {
        const m = d.getMonth();
        buckets[m].amount += Number(s.totalAmount || 0);
        buckets[m].count += 1;
      }
    });

    return buckets;
  }, [timeframe, sales]);

  const maxChartAmount = useMemo(() => {
    const max = Math.max(...chartData.map((d) => d.amount), 0);
    return max > 0 ? max : 1000;
  }, [chartData]);

  return (
    <div className="space-y-8 font-sans">
      {/* 1. COMPACT KPI STAT ROW (4-Column Grid Desktop / 2-Column Mobile) */}

      {/* 2. COMPACT KPI STAT ROW (4-Column Grid Desktop / 2-Column Mobile) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Revenue */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold tracking-wider text-slate-400 dark:text-slate-500 uppercase">Revenue</span>
            <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            {formatCurrency(totalRevenue)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            <span>{sales.length} total sales</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
              <ArrowUpRight className="w-3.5 h-3.5" /> +100%
            </span>
          </div>
        </div>

        {/* Gross Profit */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold tracking-wider text-slate-400 dark:text-slate-500 uppercase">Gross Profit</span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            {formatCurrency(totalGrossProfit)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            <span>Margin</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
              <ArrowUpRight className="w-3.5 h-3.5" /> {grossMarginPct}%
            </span>
          </div>
        </div>

        {/* Expenses */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold tracking-wider text-slate-400 dark:text-slate-500 uppercase">Expenses</span>
            <div className="w-9 h-9 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            {formatCurrency(totalExpenses)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            <span>Operational costs</span>
            <span className="text-slate-400 dark:text-slate-500 font-semibold">Period</span>
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold tracking-wider text-slate-400 dark:text-slate-500 uppercase">Net Profit</span>
            <div className="w-9 h-9 rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
            {formatCurrency(totalNetProfit)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            <span>Available profit</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-bold">{netMarginPct}% net</span>
          </div>
        </div>
      </div>

      {/* 3. 2-COLUMN MAIN ANALYTICS AREA (DESKTOP) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT / MAIN COLUMN (65% width => lg:col-span-8) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6 flex flex-col justify-between min-w-0 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4 min-w-0">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                <span>Sales Performance</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Revenue trends across selected period
              </p>
            </div>

            {/* Timeframe Selector */}
            <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-2xl self-start sm:self-auto border border-slate-200/60 dark:border-slate-700/60 max-w-full overflow-x-auto scrollbar-none">
              {(["Today", "7 Days", "30 Days", "12 Months"] as TimeFrame[]).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                    timeframe === tf
                      ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Chart Visualizer */}
          <div className="pt-2 space-y-4 min-w-0 w-full overflow-hidden">
            <div className="w-full overflow-x-auto scrollbar-none pb-1">
              <div className="h-52 w-full min-w-[260px] flex items-end justify-between gap-1 sm:gap-3 pt-6 px-1">
                {chartData.map((item, idx) => {
                  const heightPct = Math.max(
                    Math.round((item.amount / maxChartAmount) * 100),
                    item.amount > 0 ? 8 : 4
                  );
                  return (
                    <div
                      key={idx}
                      className="flex-1 min-w-0 flex flex-col items-center gap-1.5 h-full justify-end group"
                    >
                      <div className="text-[9px] sm:text-[10px] font-extrabold text-slate-600 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 dark:bg-slate-800 text-white dark:text-slate-100 px-1.5 py-0.5 rounded-md whitespace-nowrap shadow-md pointer-events-none z-10 border border-slate-700">
                        {formatCurrency(item.amount)}
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800/80 rounded-xl sm:rounded-2xl h-full flex items-end overflow-hidden p-0.5">
                        <div
                          style={{ height: `${heightPct}%` }}
                          className={`w-full rounded-lg sm:rounded-xl transition-all duration-500 group-hover:opacity-90 ${
                            item.amount > 0
                              ? "bg-gradient-to-t from-indigo-600 to-indigo-500 dark:from-indigo-500 dark:to-indigo-400 shadow-sm"
                              : "bg-slate-200/70 dark:bg-slate-700/70"
                          }`}
                        />
                      </div>
                      <span className="text-[9px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate max-w-full text-center tracking-tighter sm:tracking-normal">
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800 font-medium gap-1">
              <span>Timeframe: <strong className="text-slate-900 dark:text-slate-100 font-bold">{timeframe}</strong></span>
              <span>Total Volume: <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{formatCurrency(chartData.reduce((acc, c) => acc + c.amount, 0))}</strong></span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (35% width => lg:col-span-4) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Inventory Snapshot
              </h2>
              <a
                href="/inventory"
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline flex items-center gap-1"
              >
                View Inventory →
              </a>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Products</span>
                <div className="text-xl font-black text-slate-900 dark:text-slate-100">{inventoryMetrics.totalProducts}</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 space-y-1">
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Units in Stock</span>
                <div className="text-xl font-black text-indigo-950 dark:text-indigo-200">{inventoryMetrics.totalUnits}</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 space-y-1">
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Low Stock</span>
                <div className="text-xl font-black text-amber-900 dark:text-amber-200">{inventoryMetrics.lowStockCount}</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/50 space-y-1">
                <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">Out of Stock</span>
                <div className="text-xl font-black text-rose-900 dark:text-rose-200">{inventoryMetrics.outOfStockCount}</div>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 font-bold">
              <span>Stock Status Distribution</span>
              <span className="text-emerald-600 dark:text-emerald-400">
                {inventoryMetrics.totalProducts > 0
                  ? `${Math.round(
                      ((inventoryMetrics.totalProducts -
                        inventoryMetrics.lowStockCount -
                        inventoryMetrics.outOfStockCount) /
                        inventoryMetrics.totalProducts) *
                        100
                    )}% Healthy`
                  : "0%"}
              </span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 flex overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-700/50">
              <div
                style={{
                  width: `${
                    inventoryMetrics.totalProducts > 0
                      ? ((inventoryMetrics.totalProducts -
                          inventoryMetrics.lowStockCount -
                          inventoryMetrics.outOfStockCount) /
                          inventoryMetrics.totalProducts) *
                        100
                      : 100
                  }%`,
                }}
                className="bg-emerald-500 rounded-full h-full"
              />
              <div
                style={{
                  width: `${
                    inventoryMetrics.totalProducts > 0
                      ? (inventoryMetrics.lowStockCount / inventoryMetrics.totalProducts) * 100
                      : 0
                  }%`,
                }}
                className="bg-amber-400 rounded-full h-full ml-0.5"
              />
              <div
                style={{
                  width: `${
                    inventoryMetrics.totalProducts > 0
                      ? (inventoryMetrics.outOfStockCount / inventoryMetrics.totalProducts) * 100
                      : 0
                  }%`,
                }}
                className="bg-rose-500 rounded-full h-full ml-0.5"
              />
            </div>
            <a
              href="/inventory"
              className="block text-center w-full py-2.5 rounded-2xl bg-slate-900 dark:bg-indigo-600 text-white font-bold text-xs hover:bg-slate-800 dark:hover:bg-indigo-500 transition-colors shadow-sm"
            >
              Manage Inventory
            </a>
          </div>
        </div>
      </div>

      {/* 4. AUTOMATION ENGINE: ATTENTION REQUIRED WIDGET */}
      <AttentionRequired
        products={products}
        customers={customers}
        batches={activeBatches}
        settings={settings}
      />

      {/* 5. RECENT SALES ACTIVITY */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Recent Sales Activity
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Latest transactions recorded across POS and manual sales
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
            {sales.length} Total Records
          </span>
        </div>

        {sales.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">No sales transactions recorded yet.</p>
            <button
              onClick={() => {
                if (products.length > 0) {
                  setSelectedProductId(products[0].id);
                  const price = products[0].sellingPriceNum ?? products[0].sellingPrice;
                  setSalePrice(price ? price.toString() : "0");
                }
                setIsSaleModalOpen(true);
              }}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all inline-flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Record First Sale
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Items</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Payment Method</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                  {sales.slice(0, 10).map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                        {new Date(sale.saleDate).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                          <span>{sale.customer?.name || "Walk-in Customer"}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-600 dark:text-slate-400">
                        {sale.saleItems?.length || 1} item(s)
                      </td>
                      <td className="py-3.5 px-4 font-black text-slate-900 dark:text-slate-100">
                        {formatCurrency(sale.totalAmount)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {sale.paymentMethod || "CASH"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            sale.status === "VOIDED"
                              ? "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900"
                              : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900"
                          }`}
                        >
                          {sale.status || "COMPLETED"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden space-y-3">
              {sales.slice(0, 5).map((sale) => (
                <div
                  key={sale.id}
                  className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                      {sale.customer?.name || "Walk-in Customer"}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                      {new Date(sale.saleDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <div className="font-black text-sm text-slate-900 dark:text-slate-100">
                        {formatCurrency(sale.totalAmount)}
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                        {sale.saleItems?.length || 1} item(s)
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                        {sale.paymentMethod || "CASH"}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          sale.status === "VOIDED"
                            ? "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300"
                            : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                        }`}
                      >
                        {sale.status || "COMPLETED"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 6. PROFIT ALLOCATIONS & BATCHES / CATALOG SECONDARY SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profit Allocations */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <PiggyBank className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Profit Allocations (Savings / Needs / Wants)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Safe profit distribution ensuring total allocations never exceed net profit.
              </p>
            </div>
            <div className="text-xs font-extrabold px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 w-fit">
              Remaining: {formatCurrency(summary?.allocations?.remainingAllocatableProfit)}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/70 space-y-1">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Savings</span>
              <div className="text-lg font-black text-slate-900 dark:text-slate-100">
                {formatCurrency(summary?.allocations?.savings)}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/70 space-y-1">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Needs</span>
              <div className="text-lg font-black text-slate-900 dark:text-slate-100">
                {formatCurrency(summary?.allocations?.needs)}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/70 space-y-1">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Wants</span>
              <div className="text-lg font-black text-slate-900 dark:text-slate-100">
                {formatCurrency(summary?.allocations?.wants)}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 space-y-1">
              <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">Total Allocated</span>
              <div className="text-lg font-black text-indigo-950 dark:text-indigo-200">
                {formatCurrency(summary?.allocations?.totalAllocated)}
              </div>
            </div>
          </div>
        </div>

        {/* Promo Feature Card */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 dark:from-indigo-900 dark:to-indigo-950 rounded-3xl p-6 text-white shadow-md flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-amber-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-black tracking-tight">Need Detailed Reports?</h3>
            <p className="text-xs text-indigo-100 font-medium leading-relaxed">
              Export custom sales analytics, batch profit margins & tax reports with 1-click.
            </p>
          </div>
          <a
            href="/reports"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 text-slate-950 font-black text-xs hover:bg-emerald-400 transition-all shadow-md active:scale-95 w-full"
          >
            <span>View Full Reports</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* 7. BATCHES & PRODUCTS QUICK CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Stock Batches */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Active Stock Batches
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Purchased stock batches available for FIFO sale</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (products.length > 0) {
                    setBatchProdId(products[0].id);
                    const cost = products[0].defaultCostPriceNum ?? products[0].defaultCostPrice;
                    setBatchCost(cost ? cost.toString() : "0");
                  }
                  setIsBatchModalOpen(true);
                }}
                className="text-xs font-bold px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 rounded-full transition-colors"
              >
                + Add Batch
              </button>
              <span className="text-xs font-bold px-3 py-1 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800 rounded-full">
                {activeBatches.length} Active
              </span>
            </div>
          </div>

          {activeBatches.length === 0 ? (
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 py-8 text-center">No active batches found.</p>
          ) : (
            <div className="space-y-3">
              {activeBatches.slice(0, 4).map((batch) => (
                <div key={batch.id} className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 space-y-2 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{batch.reference}</span>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {new Date(batch.purchaseDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-semibold">Investment</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(batch.totalInvestment)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-semibold">Items</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{batch.batchItems?.length || 0} Products</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-semibold">Status</span>
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{batch.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Product Catalog Overview */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Product Catalog
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Active products in catalog</p>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 rounded-full">
              {products.length} Products
            </span>
          </div>

          {products.length === 0 ? (
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 py-8 text-center">No products found.</p>
          ) : (
            <div className="space-y-3">
              {products.slice(0, 4).map((p) => {
                const stockRemaining =
                  p.remainingStock ??
                  p.batchItems?.reduce((acc: number, bi: any) => acc + bi.quantityRemaining, 0) ??
                  0;
                const price = p.sellingPriceNum ?? p.sellingPrice;
                const isLowStock = stockRemaining <= (p.lowStockThreshold || 3);

                return (
                  <div key={p.id} className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">{p.name}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">SKU: {p.sku || "N/A"} • Size: {p.size || "N/A"}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-sm text-slate-900 dark:text-slate-100">{formatCurrency(price)}</div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isLowStock ? "bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800" : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"}`}>
                        Stock: {stockRemaining} units
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: NEW SALE MODAL */}
      {isSaleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">New POS Sale</h3>
            {formError && (
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900">
                {formError}
              </p>
            )}

            <form onSubmit={handleCreateSale} className="space-y-4 text-xs font-bold text-slate-700 dark:text-slate-300">
              <div>
                <label className="block mb-1">Select Product</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => {
                    setSelectedProductId(e.target.value);
                    const p = products.find((x) => x.id === e.target.value);
                    if (p) {
                      const price = p.sellingPriceNum ?? p.sellingPrice;
                      setSalePrice(price ? price.toString() : "0");
                    }
                  }}
                  className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  required
                >
                  {products.map((p) => {
                    const price = p.sellingPriceNum ?? p.sellingPrice;
                    return (
                      <option key={p.id} value={p.id}>
                        {p.name} ({formatCurrency(price)})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={saleQty}
                    onChange={(e) => setSaleQty(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1">Selling Price (GH₵)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSaleModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-50 shadow-md shadow-indigo-500/20"
                >
                  {isSubmitting ? "Processing..." : "Complete Sale"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD PRODUCT MODAL */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">Add New Product</h3>
            {formError && (
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900">
                {formError}
              </p>
            )}

            <form onSubmit={handleCreateProduct} className="space-y-3 text-xs font-bold text-slate-700 dark:text-slate-300">
              <div>
                <label className="block mb-1">Product Name</label>
                <input
                  type="text"
                  placeholder="e.g. Creed Aventus 100ml"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  required
                />
              </div>

              <div>
                <label className="block mb-1">SKU (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. AV-CREED100"
                  value={prodSku}
                  onChange={(e) => setProdSku(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">Selling Price (GH₵)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="150.00"
                    value={prodPrice}
                    onChange={(e) => setProdPrice(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1">Default Cost (GH₵)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="80.00"
                    value={prodCost}
                    onChange={(e) => setProdCost(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-50 shadow-md shadow-indigo-500/20"
                >
                  {isSubmitting ? "Saving..." : "Save Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD BATCH MODAL */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">Add Stock Batch</h3>
            {formError && (
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900">
                {formError}
              </p>
            )}

            <form onSubmit={handleCreateBatch} className="space-y-3 text-xs font-bold text-slate-700 dark:text-slate-300">
              <div>
                <label className="block mb-1">Batch Reference</label>
                <input
                  type="text"
                  value={batchRef}
                  onChange={(e) => setBatchRef(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  required
                />
              </div>

              <div>
                <label className="block mb-1">Select Product</label>
                <select
                  value={batchProdId}
                  onChange={(e) => {
                    setBatchProdId(e.target.value);
                    const p = products.find((x) => x.id === e.target.value);
                    if (p) {
                      const cost = p.defaultCostPriceNum ?? p.defaultCostPrice;
                      setBatchCost(cost ? cost.toString() : "0");
                    }
                  }}
                  className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  required
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">Quantity Purchased</label>
                  <input
                    type="number"
                    min="1"
                    value={batchQty}
                    onChange={(e) => setBatchQty(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1">Unit Cost (GH₵)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={batchCost}
                    onChange={(e) => setBatchCost(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1">Transport / Extra Costs (GH₵)</label>
                <input
                  type="number"
                  step="0.01"
                  value={batchTransport}
                  onChange={(e) => setBatchTransport(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-50 shadow-md shadow-indigo-500/20"
                >
                  {isSubmitting ? "Creating..." : "Create Batch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
