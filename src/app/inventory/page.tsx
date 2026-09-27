"use client";

import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
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

  // Filters
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
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "SALE":
      case "ADJUSTMENT_OUT":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "DAMAGE":
      case "LOSS":
      case "TESTER":
        return "bg-rose-100 text-rose-800 border-rose-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Inventory & Stock Ledger</h2>
          <p className="text-xs text-slate-500">
            Real-time stock valuation, low-stock notifications & full audit log of stock movements.
          </p>
        </div>
        <button
          onClick={() => {
            setAdjustError(null);
            setIsAdjustModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 transition-all touch-manipulation"
        >
          <Plus className="w-4 h-4 text-amber-400" /> Adjust Stock / Log Damage
        </button>
      </div>

      {loading && !summary ? (
        <div className="rounded-3xl border border-slate-100 shadow-xl shadow-indigo-500/5 p-12 bg-white flex flex-col items-center justify-center text-center space-y-3">
          <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
          <p className="text-xs font-medium text-slate-500">Calculating inventory metrics...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-3xl text-rose-700 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : (
        <>
          {/* Real-time KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-3xl border border-slate-100 shadow-xl shadow-indigo-500/5 p-5 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase">Total Stock Units</span>
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Boxes className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900">{summary?.totalUnitsInStock || 0}</div>
              <p className="text-[11px] text-slate-500">Active units remaining</p>
            </div>

            <div className="rounded-3xl border border-slate-100 shadow-xl shadow-indigo-500/5 p-5 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase">Total Cost Value</span>
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900">
                {formatCurrency(summary?.totalStockCostValue || 0)}
              </div>
              <p className="text-[11px] text-slate-500">Acquisition investment cost</p>
            </div>

            <div className="rounded-3xl border border-slate-100 shadow-xl shadow-indigo-500/5 p-5 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase">Potential Revenue</span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900">
                {formatCurrency(summary?.totalStockPotentialRevenue || 0)}
              </div>
              <p className="text-[11px] text-slate-500">Retail sales value at catalog price</p>
            </div>

            <div className="rounded-3xl border border-slate-100 shadow-xl shadow-indigo-500/5 p-5 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase">Low Stock Alerts</span>
                <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-amber-600">{summary?.lowStockCount || 0}</div>
              <p className="text-[11px] text-slate-500">Products at or below threshold</p>
            </div>
          </div>

          {/* Low Stock Urgent Section */}
          {summary && summary.lowStockCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-3xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-amber-900">Low Stock Warning</h4>
                  <p className="text-xs text-amber-700">
                    {summary.lowStockCount} product(s) require batch restocking to avoid running out.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Product Stock Table */}
          <div className="rounded-3xl border border-slate-100 shadow-xl shadow-indigo-500/5 p-6 bg-white space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-emerald-600" />
                Current Stock Levels by Product
              </h3>
              <span className="text-xs font-bold text-slate-500">
                {summary?.products.length || 0} Products
              </span>
            </div>

            {/* DESKTOP table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-200 pb-2">
                    <th className="font-semibold pb-2">Product Name</th>
                    <th className="font-semibold pb-2">Category</th>
                    <th className="font-semibold pb-2">Active Batches</th>
                    <th className="font-semibold pb-2">Units in Stock</th>
                    <th className="font-semibold pb-2">Stock Cost</th>
                    <th className="font-semibold pb-2">Potential Revenue</th>
                    <th className="font-semibold pb-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summary?.products.map((p) => (
                    <tr key={p.id} className="text-slate-800">
                      <td className="py-3 font-bold">
                        {p.name}
                        {p.sku && <span className="text-slate-400 font-normal ml-1">({p.sku})</span>}
                      </td>
                      <td className="py-3 text-slate-600">{p.category || "—"}</td>
                      <td className="py-3 text-slate-600">{p.activeBatchesCount} batches</td>
                      <td className={`py-3 font-extrabold ${p.isLowStock ? "text-amber-700" : "text-slate-900"}`}>
                        {p.stockUnits} units
                      </td>
                      <td className="py-3 font-semibold text-slate-700">{formatCurrency(p.stockCostValue)}</td>
                      <td className="py-3 font-semibold text-emerald-600">{formatCurrency(p.potentialRevenue)}</td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {p.isLowStock ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              Low Stock
                            </span>
                          ) : p.stockUnits === 0 ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              Out of Stock
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
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
              {summary?.products.map((p) => (
                <div key={p.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-sm text-slate-900">{p.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {p.category || "General"} • {p.activeBatchesCount} batch(es)
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {p.isLowStock ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          Low Stock
                        </span>
                      ) : p.stockUnits === 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          Out of Stock
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          In Stock
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">In Stock</span>
                      <span className={`font-bold ${p.isLowStock ? "text-amber-700" : "text-slate-900"}`}>
                        {p.stockUnits} units
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Stock Cost</span>
                      <span className="font-bold text-slate-800">{formatCurrency(p.stockCostValue)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Potential</span>
                      <span className="font-bold text-emerald-600">{formatCurrency(p.potentialRevenue)}</span>
                    </div>
                  </div>

                  {(p.isLowStock || p.stockUnits === 0) && (
                    <div className="pt-2 border-t border-slate-200">
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

          </div>

          {/* Inventory Audit Ledger */}
          <div className="rounded-3xl border border-slate-100 shadow-xl shadow-indigo-500/5 p-6 bg-white space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-600" />
                  Inventory Audit Ledger
                </h3>
                <p className="text-xs text-slate-500">History of stock movement & adjustments</p>
              </div>

              {/* Type Filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {["ALL", "PURCHASE", "SALE", "ADJUSTMENT_IN", "ADJUSTMENT_OUT", "DAMAGE"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all focus:outline-none focus:ring-2 focus:ring-indigo-600 ${
                      typeFilter === t
                        ? "rounded-full bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                        : "rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {ledger.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">No inventory transaction logs found.</p>
            ) : (
              <>
                {/* DESKTOP table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-200 pb-2">
                        <th className="font-semibold pb-2">Timestamp</th>
                        <th className="font-semibold pb-2">Product</th>
                        <th className="font-semibold pb-2">Transaction Type</th>
                        <th className="font-semibold pb-2">Qty Change</th>
                        <th className="font-semibold pb-2">Batch / Ref</th>
                        <th className="font-semibold pb-2 text-right">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ledger.map((txn) => {
                        const isAddition = ["PURCHASE", "ADJUSTMENT_IN", "RETURN"].includes(txn.type);

                        return (
                          <tr key={txn.id} className="text-slate-800">
                            <td className="py-2.5 text-slate-500">
                              {new Date(txn.createdAt).toLocaleString()}
                            </td>
                            <td className="py-2.5 font-bold">
                              {txn.product.name}
                              {txn.product.sku && (
                                <span className="text-slate-400 font-normal ml-1">({txn.product.sku})</span>
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
                                isAddition ? "text-emerald-600" : "text-rose-600"
                              }`}
                            >
                              {isAddition ? `+${txn.quantity}` : `-${txn.quantity}`} units
                            </td>
                            <td className="py-2.5 font-medium text-slate-600">
                              {txn.batch?.reference || txn.referenceId || "—"}
                            </td>
                            <td className="py-2.5 text-right text-slate-500 font-medium">
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
                      <div key={txn.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-bold text-sm text-slate-900">{txn.product.name}</p>
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
                              isAddition ? "text-emerald-600" : "text-rose-600"
                            }`}
                          >
                            {isAddition ? `+${txn.quantity}` : `-${txn.quantity}`} units
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200">
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
        </>
      )}
      {/* Stock Adjustment / Damage Logger Modal */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-100 max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Adjust Stock / Log Damage</h3>
                <p className="text-xs text-slate-500">Record bottle damages, store display testers, or audit fixes</p>
              </div>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {adjustError && (
              <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{adjustError}</span>
              </div>
            )}

            {adjustSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Stock adjusted successfully!</span>
              </div>
            )}

            <form onSubmit={handleAdjustStock} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Product *</label>
                <select
                  required
                  value={adjustProductId}
                  onChange={(e) => setAdjustProductId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Adjustment Reason / Type *</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value as any)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="DAMAGE">💔 DAMAGE (Broken/Cracked Bottle - Auto-logs Operational Expense)</option>
                  <option value="TESTER">🧪 TESTER (Store Display Sample - Auto-logs Operational Expense)</option>
                  <option value="LOSS">⚠️ LOSS (Stolen or Missing Item)</option>
                  <option value="ADJUSTMENT_IN">📦 ADJUSTMENT_IN (Audit Addition)</option>
                  <option value="ADJUSTMENT_OUT">📉 ADJUSTMENT_OUT (Audit Deduction)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Quantity (Units) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={adjustQuantity}
                  onChange={(e) => setAdjustQuantity(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Explanation / Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Bottle cracked during shelf arrangement..."
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              {(adjustType === "DAMAGE" || adjustType === "TESTER") && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-amber-900 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
                  <span>
                    Logging as <strong>{adjustType}</strong> will deduct stock and automatically log an operational expense equal to the bottle acquisition cost price.
                  </span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
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
