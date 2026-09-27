"use client";

import { useState } from "react";
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
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { createProductAction } from "@/lib/actions/product-actions";
import { createBatchAction } from "@/lib/actions/batch-actions";
import { createSaleAction } from "@/lib/actions/sale-actions";

interface InteractiveDashboardProps {
  summary: any;
  activeBatches: any[];
  products: any[];
}

export function InteractiveDashboard({
  summary,
  activeBatches,
  products,
}: InteractiveDashboardProps) {
  // Modal Visibility States
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

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
  const [batchRef, setBatchRef] = useState(`BATCH-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
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

  const lowStockProducts = products.filter((p) => {
    const stockRemaining = p.remainingStock ?? p.batchItems?.reduce((acc: number, bi: any) => acc + bi.quantityRemaining, 0) ?? 0;
    return stockRemaining <= (p.lowStockThreshold || 3);
  });

  return (
    <div className="space-y-8 font-sans">
      {/* Welcome & Quick Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-7 rounded-3xl border border-slate-100 shadow-xl shadow-indigo-500/5">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Avencia Dashboard</h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Real-time sales tracking, FIFO stock allocation & financial analytics.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => {
              if (products.length > 0) {
                setSelectedProductId(products[0].id);
                const price = products[0].sellingPriceNum ?? products[0].sellingPrice;
                setSalePrice(price ? price.toString() : "0");
              }
              setIsSaleModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-3 text-xs font-bold rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/25 active:scale-95 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
          >
            <Plus className="w-4 h-4 text-amber-300" /> New POS Sale
          </button>
          <button
            onClick={() => {
              if (products.length > 0) {
                setBatchProdId(products[0].id);
                const cost = products[0].defaultCostPriceNum ?? products[0].defaultCostPrice;
                setBatchCost(cost ? cost.toString() : "0");
              }
              setIsBatchModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-3 text-xs font-bold rounded-2xl bg-slate-100 border border-slate-200/80 text-slate-800 hover:bg-slate-200/80 transition-all shadow-sm active:scale-95 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            <Layers className="w-4 h-4 text-indigo-600" /> Add Batch
          </button>
          <button
            onClick={() => setIsProductModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-3 text-xs font-bold rounded-2xl bg-slate-100 border border-slate-200/80 text-slate-800 hover:bg-slate-200/80 transition-all shadow-sm active:scale-95 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            <Package className="w-4 h-4 text-indigo-600" /> Add Product
          </button>
        </div>
      </div>

      {/* Stock Alert Banner (when low stock items exist) */}
      {lowStockProducts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-amber-950 flex items-center gap-2">
                Stock Alert: {lowStockProducts.length} Product(s) Low or Out of Stock
              </h3>
              <p className="text-xs text-amber-800 font-medium mt-0.5">
                {lowStockProducts.slice(0, 3).map((p) => p.name).join(", ")}
                {lowStockProducts.length > 3 ? ` and ${lowStockProducts.length - 3} more` : ""} require restocking.
              </p>
            </div>
          </div>
          <a
            href="/inventory"
            className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition-all shadow-sm whitespace-nowrap self-start sm:self-auto focus:outline-none focus:ring-2 focus:ring-amber-600"
          >
            View Inventory Ledger →
          </a>
        </div>
      )}

      {/* Financial KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xl shadow-indigo-500/5 space-y-3 hover:translate-y-[-2px] transition-transform">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold tracking-wider text-slate-400 uppercase">Total Revenue</span>
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shadow-sm">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {formatCurrency(summary?.totalRevenue)}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Gross sales collected</span>
            <span className="text-emerald-600 font-bold flex items-center gap-0.5">
              <ArrowUpRight className="w-3.5 h-3.5" /> 100%
            </span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xl shadow-indigo-500/5 space-y-3 hover:translate-y-[-2px] transition-transform">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold tracking-wider text-slate-400 uppercase">Gross Profit</span>
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shadow-sm">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {formatCurrency(summary?.totalGrossProfit)}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Revenue minus COGS</span>
            <span className="text-emerald-600 font-bold flex items-center gap-0.5">
              <ArrowUpRight className="w-3.5 h-3.5" /> Margin
            </span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xl shadow-indigo-500/5 space-y-3 hover:translate-y-[-2px] transition-transform">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold tracking-wider text-slate-400 uppercase">Expenses</span>
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold shadow-sm">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {formatCurrency(summary?.totalExpenses)}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Operational spending</span>
            <span className="text-rose-600 font-bold">Ledger</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xl shadow-indigo-500/5 space-y-3 hover:translate-y-[-2px] transition-transform">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold tracking-wider text-slate-400 uppercase">Net Profit</span>
            <div className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shadow-sm">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-indigo-600 tracking-tight">
            {formatCurrency(summary?.totalNetProfit)}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Allocatable net profit</span>
            <span className="text-indigo-600 font-bold">Available</span>
          </div>
        </div>
      </div>

      {/* Middle Section: Profit Allocation Card & Quick Promo Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profit Allocations (2 Columns) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-7 border border-slate-100 shadow-xl shadow-indigo-500/5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <PiggyBank className="w-5 h-5 text-indigo-600" />
                Profit Allocations (Savings / Needs / Wants)
              </h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                Safe profit distribution ensuring total allocations never exceed net profit.
              </p>
            </div>
            <div className="text-xs font-extrabold px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 w-fit">
              Remaining: {formatCurrency(summary?.allocations?.remainingAllocatableProfit)}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
              <span className="text-xs font-bold text-slate-500">Savings</span>
              <div className="text-lg font-black text-slate-900">{formatCurrency(summary?.allocations?.savings)}</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
              <span className="text-xs font-bold text-slate-500">Needs</span>
              <div className="text-lg font-black text-slate-900">{formatCurrency(summary?.allocations?.needs)}</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
              <span className="text-xs font-bold text-slate-500">Wants</span>
              <div className="text-lg font-black text-slate-900">{formatCurrency(summary?.allocations?.wants)}</div>
            </div>
            <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 space-y-1">
              <span className="text-xs font-bold text-indigo-700">Total Allocated</span>
              <div className="text-lg font-black text-indigo-950">{formatCurrency(summary?.allocations?.totalAllocated)}</div>
            </div>
          </div>
        </div>

        {/* Promo Feature Card (Inspired by reference mockup "Need More Stats? / Go Pro Now") */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl p-6 sm:p-7 text-white shadow-xl shadow-indigo-500/20 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-amber-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-black tracking-tight">Need Detailed Financial Reports?</h3>
            <p className="text-xs text-indigo-100 font-medium leading-relaxed">
              Export custom sales analytics, batch profit margins & tax reports with 1-click.
            </p>
          </div>
          <a
            href="/reports"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 text-slate-950 font-black text-xs hover:bg-emerald-400 transition-all shadow-lg active:scale-95 w-full"
          >
            <span>View Full Reports</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Batches & Products Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Stock Batches */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-100 shadow-xl shadow-indigo-500/5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                Active Stock Batches
              </h3>
              <p className="text-xs text-slate-500 font-medium">Purchased stock batches available for FIFO sale</p>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200/80 rounded-full">
              {activeBatches.length} Active
            </span>
          </div>

          {activeBatches.length === 0 ? (
            <p className="text-xs font-medium text-slate-500 py-8 text-center">No active batches found.</p>
          ) : (
            <div className="space-y-3">
              {activeBatches.map((batch) => (
                <div key={batch.id} className="p-4 rounded-2xl border border-slate-200/80 hover:border-slate-300 bg-slate-50/50 space-y-2 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">{batch.reference}</span>
                    <span className="text-xs font-semibold text-slate-500">
                      {new Date(batch.purchaseDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-slate-600 pt-1 border-t border-slate-200/60">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Investment</span>
                      <span className="font-bold text-slate-900">{formatCurrency(batch.totalInvestment)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Items</span>
                      <span className="font-bold text-slate-800">{batch.batchItems?.length || 0} Products</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Status</span>
                      <span className="font-extrabold text-emerald-600">{batch.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Product Catalog */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-100 shadow-xl shadow-indigo-500/5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-600" />
                Product Catalog
              </h3>
              <p className="text-xs text-slate-500 font-medium">Active perfume products in catalog</p>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-indigo-50 text-indigo-800 border border-indigo-200/80 rounded-full">
              {products.length} Products
            </span>
          </div>

          {products.length === 0 ? (
            <p className="text-xs font-medium text-slate-500 py-8 text-center">No products found.</p>
          ) : (
            <div className="space-y-3">
              {products.map((p) => {
                const stockRemaining = p.remainingStock ?? p.batchItems?.reduce((acc: number, bi: any) => acc + bi.quantityRemaining, 0) ?? 0;
                const price = p.sellingPriceNum ?? p.sellingPrice;
                const isLowStock = stockRemaining <= (p.lowStockThreshold || 3);

                return (
                  <div key={p.id} className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{p.name}</h4>
                      <p className="text-xs text-slate-500">SKU: {p.sku || "N/A"} • Size: {p.size || "N/A"}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-sm text-slate-900">{formatCurrency(price)}</div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isLowStock ? "bg-amber-100 text-amber-900 border border-amber-300" : "bg-emerald-100 text-emerald-800 border border-emerald-200"}`}>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-black text-slate-900">New POS Sale</h3>
            {formError && <p className="text-xs font-semibold text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">{formError}</p>}

            <form onSubmit={handleCreateSale} className="space-y-4 text-xs font-bold text-slate-700">
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
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600"
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
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600"
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
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSaleModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-black text-slate-900">Add New Product</h3>
            {formError && <p className="text-xs font-semibold text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">{formError}</p>}

            <form onSubmit={handleCreateProduct} className="space-y-3 text-xs font-bold text-slate-700">
              <div>
                <label className="block mb-1">Product Name</label>
                <input
                  type="text"
                  placeholder="e.g. Creed Aventus 100ml"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300"
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
                  className="w-full p-2.5 rounded-xl border border-slate-300"
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
                    className="w-full p-2.5 rounded-xl border border-slate-300"
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
                    className="w-full p-2.5 rounded-xl border border-slate-300"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-black text-slate-900">Add Stock Batch</h3>
            {formError && <p className="text-xs font-semibold text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">{formError}</p>}

            <form onSubmit={handleCreateBatch} className="space-y-3 text-xs font-bold text-slate-700">
              <div>
                <label className="block mb-1">Batch Reference</label>
                <input
                  type="text"
                  value={batchRef}
                  onChange={(e) => setBatchRef(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300"
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
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                  required
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
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
                    className="w-full p-2.5 rounded-xl border border-slate-300"
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
                    className="w-full p-2.5 rounded-xl border border-slate-300"
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
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100"
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
