"use client";

import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Boxes,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Filter,
  Loader2,
  DollarSign,
  TrendingUp,
  PackageCheck,
  History,
  Plus,
  Share2,
  CheckCircle2,
  X,
} from "lucide-react";

interface InventorySummary {
  totalUnitsInStock: number;
  totalStockCostValue: number;
  totalStockPotentialRevenue: number;
  lowStockCount: number;
  products: Array<{
    id: string;
    name: string;
    sku: string | null;
    category: string | null;
    lowStockThreshold: number;
    stockUnits: number;
    stockCostValue: number;
    potentialRevenue: number;
    isLowStock: boolean;
    activeBatchesCount: number;
  }>;
}

interface InventoryTxn {
  id: string;
  type: string;
  quantity: number;
  note: string | null;
  referenceId: string | null;
  createdAt: string;
  product: {
    name: string;
    sku: string | null;
  };
  batch: {
    reference: string;
  } | null;
}

export default function InventoryPage() {
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [ledger, setLedger] = useState<InventoryTxn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stock Adjustment Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustProductId, setAdjustProductId] = useState("");
  const [adjustType, setAdjustType] = useState<"DAMAGE" | "TESTER" | "LOSS" | "ADJUSTMENT_IN" | "ADJUSTMENT_OUT">("DAMAGE");
  const [adjustQuantity, setAdjustQuantity] = useState("1");
  const [adjustNote, setAdjustNote] = useState("");
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [adjustSuccess, setAdjustSuccess] = useState(false);

  // Operational Filter Tabs
  const [activeTab, setActiveTab] = useState<"ALL" | "LOW_STOCK" | "OUT_OF_STOCK" | "ADJUSTMENTS">("ALL");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const typeParam = typeFilter !== "ALL" ? `&type=${typeFilter}` : "";
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : "";
      const res = await fetch(`/api/inventory?${typeParam}${searchParam}`);
      const json = await res.json();

      if (json.success) {
        setSummary(json.data.summary);
        setLedger(json.data.ledger);
      } else {
        setError(json.error || "Failed to load inventory data");
      }
    } catch (err: any) {
      setError(err.message || "Network error fetching inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [typeFilter, search]);

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdjustError(null);
    setAdjustSuccess(false);

    if (!adjustProductId) {
      setAdjustError("Please select a product to adjust.");
      return;
    }
    const qty = parseInt(adjustQuantity);
    if (isNaN(qty) || qty <= 0) {
      setAdjustError("Please enter a valid quantity greater than 0.");
      return;
    }

    setAdjustSubmitting(true);
    try {
      const res = await fetch("/api/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: adjustProductId,
          type: adjustType,
          quantity: qty,
          note: adjustNote || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setAdjustSuccess(true);
        setTimeout(() => {
          setIsAdjustModalOpen(false);
          setAdjustSuccess(false);
          setAdjustProductId("");
          setAdjustQuantity("1");
          setAdjustNote("");
          fetchData();
        }, 800);
      } else {
        setAdjustError(json.error || "Failed to adjust stock");
      }
    } catch (err: any) {
      setAdjustError(err.message || "Network error adjusting stock");
    } finally {
      setAdjustSubmitting(false);
    }
  };

  const getWhatsAppReorderLink = (productName: string, currentStock: number) => {
    const msg = `Hello! We would like to reorder "${productName}". Current stock: ${currentStock} unit(s). Please confirm availability and wholesale pricing.`;
    return `https://wa.me/?text=${encodeURIComponent(msg)}`;
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case "PURCHASE":
      case "ADJUSTMENT_IN":
      case "RETURN":
        return "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      case "SALE":
      case "ADJUSTMENT_OUT":
        return "bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      case "DAMAGE":
      case "LOSS":
      case "TESTER":
        return "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800";
      default:
        return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    }
  };

  const outOfStockCount = summary?.products.filter((p) => p.stockUnits === 0).length || 0;

  const filteredInventoryProducts = (summary?.products || []).filter((p) => {
    if (activeTab === "LOW_STOCK") return p.isLowStock;
    if (activeTab === "OUT_OF_STOCK") return p.stockUnits === 0;
    return true;
  });

  return (
    <div className="space-y-6 font-sans">
      {loading && !summary ? (
        <div className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5 p-12 bg-white dark:bg-slate-900 flex flex-col items-center justify-center text-center space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Calculating inventory metrics...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-4 rounded-3xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : (
        <>
          {/* Real-time KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5 p-5 bg-white dark:bg-slate-900 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Total Units</span>
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                  <Boxes className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{summary?.totalUnitsInStock || 0}</div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Active units remaining in stock</p>
            </div>

            <div className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5 p-5 bg-white dark:bg-slate-900 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Inventory Value</span>
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
                {formatCurrency(summary?.totalStockCostValue || 0)}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Total acquisition cost value</p>
            </div>

            <div className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5 p-5 bg-white dark:bg-slate-900 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Low Stock</span>
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{summary?.lowStockCount || 0}</div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Products at or below threshold</p>
            </div>

            <div className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5 p-5 bg-white dark:bg-slate-900 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Out of Stock</span>
                <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
                  <X className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400">{outOfStockCount}</div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Products with 0 units remaining</p>
            </div>
          </div>

          {/* Operational Filter Tabs & Stock Adjustment Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setActiveTab("ALL")}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all focus:outline-none ${
                  activeTab === "ALL"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                All Stock ({summary?.products.length || 0})
              </button>
              <button
                onClick={() => setActiveTab("LOW_STOCK")}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all focus:outline-none ${
                  activeTab === "LOW_STOCK"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                Low Stock ({summary?.lowStockCount || 0})
              </button>
              <button
                onClick={() => setActiveTab("OUT_OF_STOCK")}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all focus:outline-none ${
                  activeTab === "OUT_OF_STOCK"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                Out of Stock ({outOfStockCount})
              </button>
              <button
                onClick={() => setActiveTab("ADJUSTMENTS")}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all focus:outline-none ${
                  activeTab === "ADJUSTMENTS"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                Adjustments & Audit Log ({ledger.length})
              </button>
            </div>
            <button
              onClick={() => {
                setAdjustError(null);
                setIsAdjustModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 transition-all whitespace-nowrap active:scale-95"
            >
              <Plus className="w-4 h-4 text-amber-300" />
              <span>Stock Adjustment</span>
            </button>
          </div>

          {activeTab !== "ADJUSTMENTS" ? (
            /* Product Stock Table & Cards */
            <div className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5 p-6 bg-white dark:bg-slate-900 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <PackageCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  {activeTab === "LOW_STOCK"
                    ? "Low Stock Alert Items"
                    : activeTab === "OUT_OF_STOCK"
                    ? "Out of Stock Items"
                    : "Current Stock Levels by Product"}
                </h3>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {filteredInventoryProducts.length} Product{filteredInventoryProducts.length !== 1 ? "s" : ""}
                </span>
              </div>

              {filteredInventoryProducts.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">No products match this operational filter.</p>
                </div>
              ) : (
                <>
                  {/* DESKTOP table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-slate-400 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
                          <th className="font-semibold pb-2">Product Name</th>
                          <th className="font-semibold pb-2">Category</th>
                          <th className="font-semibold pb-2">Active Batches</th>
                          <th className="font-semibold pb-2">Units in Stock</th>
                          <th className="font-semibold pb-2">Stock Cost</th>
                          <th className="font-semibold pb-2">Potential Revenue</th>
                          <th className="font-semibold pb-2 text-right">Status / Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredInventoryProducts.map((p) => (
                          <tr key={p.id} className="text-slate-800 dark:text-slate-200 hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                            <td className="py-3 font-bold text-slate-900 dark:text-slate-100">
                              {p.name}
                              {p.sku && <span className="text-slate-400 dark:text-slate-500 font-normal ml-1">({p.sku})</span>}
                            </td>
                            <td className="py-3 text-slate-600 dark:text-slate-400">{p.category || "—"}</td>
                            <td className="py-3 text-slate-600 dark:text-slate-400">{p.activeBatchesCount} batches</td>
                            <td className={`py-3 font-extrabold ${p.isLowStock ? "text-amber-700 dark:text-amber-400" : p.stockUnits === 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-slate-100"}`}>
                              {p.stockUnits} units
                            </td>
                            <td className="py-3 font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(p.stockCostValue)}</td>
                            <td className="py-3 font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(p.potentialRevenue)}</td>
                            <td className="py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {p.isLowStock ? (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                    Low Stock
                                  </span>
                                ) : p.stockUnits === 0 ? (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                    Out of Stock
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                    In Stock
                                  </span>
                                )}

                                {(p.isLowStock || p.stockUnits === 0) && (
                                  <a
                                    href={getWhatsAppReorderLink(p.name, p.stockUnits)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1 rounded-xl bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700 transition-colors inline-flex items-center gap-1 shadow-sm"
                                    title="Reorder via WhatsApp"
                                  >
                                    <Share2 className="w-3 h-3" /> Reorder
                                  </a>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* MOBILE cards */}
                  <div className="md:hidden space-y-4 mb-4">
                    {filteredInventoryProducts.map((p) => (
                      <div key={p.id} className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-bold text-sm text-slate-900 dark:text-slate-100">{p.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {p.category || "General"} • {p.activeBatchesCount} batch(es)
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {p.isLowStock ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                Low Stock
                              </span>
                            ) : p.stockUnits === 0 ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                Out of Stock
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                In Stock
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 block">In Stock</span>
                            <span className={`font-bold ${p.isLowStock ? "text-amber-700 dark:text-amber-400" : "text-slate-900 dark:text-slate-100"}`}>
                              {p.stockUnits} units
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Stock Cost</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(p.stockCostValue)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Potential</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(p.potentialRevenue)}</span>
                          </div>
                        </div>

                        {(p.isLowStock || p.stockUnits === 0) && (
                          <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                            <a
                              href={getWhatsAppReorderLink(p.name, p.stockUnits)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5"
                            >
                              <Share2 className="w-3.5 h-3.5" /> Reorder via WhatsApp
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Inventory Audit Ledger view */
            <div className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5 p-6 bg-white dark:bg-slate-900 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <History className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    Inventory Audit Ledger
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">History of stock movement & adjustments</p>
                </div>

                {/* Type Filter */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {["ALL", "PURCHASE", "SALE", "ADJUSTMENT_IN", "ADJUSTMENT_OUT", "DAMAGE"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setTypeFilter(t)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all focus:outline-none ${
                        typeFilter === t
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {ledger.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-8">No inventory transaction logs found.</p>
              ) : (
                <>
                  {/* DESKTOP table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-slate-400 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
                          <th className="font-semibold pb-2">Timestamp</th>
                          <th className="font-semibold pb-2">Product</th>
                          <th className="font-semibold pb-2">Transaction Type</th>
                          <th className="font-semibold pb-2">Qty Change</th>
                          <th className="font-semibold pb-2">Batch / Ref</th>
                          <th className="font-semibold pb-2 text-right">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {ledger.map((txn) => {
                          const isAddition = ["PURCHASE", "ADJUSTMENT_IN", "RETURN"].includes(txn.type);

                          return (
                            <tr key={txn.id} className="text-slate-800 dark:text-slate-200 hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                              <td className="py-2.5 text-slate-500 dark:text-slate-400">
                                {new Date(txn.createdAt).toLocaleString()}
                              </td>
                              <td className="py-2.5 font-bold text-slate-900 dark:text-slate-100">
                                {txn.product.name}
                                {txn.product.sku && (
                                  <span className="text-slate-400 dark:text-slate-500 font-normal ml-1">({txn.product.sku})</span>
                                )}
                              </td>
                              <td className="py-2.5">
                                <span
                                  className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${getTypeBadgeClass(
                                    txn.type
                                  )}`}
                                >
                                  {txn.type}
                                </span>
                              </td>
                              <td
                                className={`py-2.5 font-extrabold ${
                                  isAddition ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                                }`}
                              >
                                {isAddition ? `+${txn.quantity}` : `-${txn.quantity}`} units
                              </td>
                              <td className="py-2.5 font-medium text-slate-600 dark:text-slate-400">
                                {txn.batch?.reference || txn.referenceId || "—"}
                              </td>
                              <td className="py-2.5 text-right text-slate-500 dark:text-slate-400 font-medium">
                                {txn.note || "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* MOBILE cards */}
                  <div className="md:hidden space-y-3">
                    {ledger.map((txn) => {
                      const isAddition = ["PURCHASE", "ADJUSTMENT_IN", "RETURN"].includes(txn.type);

                      return (
                        <div key={txn.id} className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-bold text-sm text-slate-900 dark:text-slate-100">{txn.product.name}</p>
                              <span
                                className={`inline-block mt-1 px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${getTypeBadgeClass(
                                  txn.type
                                )}`}
                              >
                                {txn.type}
                              </span>
                            </div>
                            <span
                              className={`font-black text-sm flex-shrink-0 ${
                                isAddition ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                              }`}
                            >
                              {isAddition ? `+${txn.quantity}` : `-${txn.quantity}`} units
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700">
                            <span>{new Date(txn.createdAt).toLocaleDateString()}</span>
                            <span>Ref: {txn.batch?.reference || txn.referenceId || "Direct"}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Stock Adjustment / Damage Logger Modal */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Adjust Stock / Log Damage</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Record bottle damages, store display testers, or audit fixes</p>
              </div>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {adjustError && (
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-3 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{adjustError}</span>
              </div>
            )}

            {adjustSuccess && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Stock adjusted successfully!</span>
              </div>
            )}

            <form onSubmit={handleAdjustStock} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Select Product *</label>
                <select
                  required
                  value={adjustProductId}
                  onChange={(e) => setAdjustProductId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="">-- Choose Product to Adjust --</option>
                  {summary?.products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.stockUnits} in stock)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Adjustment Reason / Type *</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value as any)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="DAMAGE">💔 DAMAGE (Broken/Cracked Bottle - Auto-logs Operational Expense)</option>
                  <option value="TESTER">🧪 TESTER (Store Display Sample - Auto-logs Operational Expense)</option>
                  <option value="LOSS">⚠️ LOSS (Stolen or Missing Item)</option>
                  <option value="ADJUSTMENT_IN">📦 ADJUSTMENT_IN (Audit Addition)</option>
                  <option value="ADJUSTMENT_OUT">📉 ADJUSTMENT_OUT (Audit Deduction)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Quantity (Units) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={adjustQuantity}
                  onChange={(e) => setAdjustQuantity(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Explanation / Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Bottle cracked during shelf arrangement..."
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              {(adjustType === "DAMAGE" || adjustType === "TESTER") && (
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 rounded-xl text-amber-900 dark:text-amber-300 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <span>
                    Logging as <strong>{adjustType}</strong> will deduct stock and automatically log an operational expense equal to the bottle acquisition cost price.
                  </span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustSubmitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {adjustSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    "Apply Adjustment ✓"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
