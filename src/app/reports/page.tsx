"use client";

import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  BarChart3,
  Calendar,
  Download,
  ShoppingBag,
  Package,
  Layers,
  Receipt,
  PiggyBank,
  TrendingUp,
  DollarSign,
  Loader2,
  AlertTriangle,
  User,
  CheckCircle2,
} from "lucide-react";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<"SALES" | "PRODUCTS" | "BATCHES" | "EXPENSES" | "PROFIT">("SALES");
  const [dateRange, setDateRange] = useState<"TODAY" | "7DAYS" | "MONTH" | "ALL">("ALL");

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchReportData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [salesRes, prodRes, batchRes, expRes, profitRes] = await Promise.all([
        fetch("/api/sales"),
        fetch("/api/products"),
        fetch("/api/batches"),
        fetch("/api/expenses"),
        fetch("/api/profit"),
      ]);

      const salesJson = await salesRes.json();
      const prodJson = await prodRes.json();
      const batchJson = await batchRes.json();
      const expJson = await expRes.json();
      const profitJson = await profitRes.json();

      setData({
        sales: salesJson.success ? salesJson.data : [],
        products: prodJson.success ? prodJson.data : [],
        batches: batchJson.success ? batchJson.data : [],
        expenses: expJson.success ? expJson.data : [],
        profit: profitJson.success ? profitJson.data.summary : null,
        allocations: profitJson.success ? profitJson.data.allocations : [],
      });
    } catch (err: any) {
      setError(err.message || "Failed to load report data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Reports Control Panel Card */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5 space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Date Range Selector Pills */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-full text-xs font-bold overflow-x-auto">
            <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 ml-2 flex-shrink-0" />
            {(["ALL", "MONTH", "7DAYS", "TODAY"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1 rounded-full transition-all whitespace-nowrap focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
                  dateRange === range
                    ? "bg-indigo-600 dark:bg-indigo-500 text-white shadow-md shadow-indigo-500/20"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                {range === "ALL" ? "All Time" : range === "MONTH" ? "This Month" : range === "7DAYS" ? "7 Days" : "Today"}
              </button>
            ))}
          </div>

          {/* Export Button */}
          <button
            onClick={handlePrint}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-2xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-500/25 transition-all active:scale-95 focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </button>
        </div>

        {/* Clean Report Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none border-t border-slate-100 dark:border-slate-800 pt-3">
          {[
            { id: "SALES", label: "Sales", icon: ShoppingBag },
            { id: "PRODUCTS", label: "Products", icon: Package },
            { id: "BATCHES", label: "Batches", icon: Layers },
            { id: "EXPENSES", label: "Expenses", icon: Receipt },
            { id: "PROFIT", label: "Profit", icon: PiggyBank },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
                  isActive
                    ? "bg-indigo-600 dark:bg-indigo-500 text-white shadow-md shadow-indigo-500/20"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-amber-300" : "text-slate-400 dark:text-slate-500"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Tab Content */}
      {loading ? (
        <div className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5 p-12 bg-white dark:bg-slate-900 flex flex-col items-center justify-center text-center space-y-3">
          <Loader2 className="w-8 h-8 text-slate-400 dark:text-slate-500 animate-spin" />
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Generating analytical report...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 p-4 rounded-2xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* TAB 1: SALES REPORT */}
          {activeTab === "SALES" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5 p-5 bg-white dark:bg-slate-900 space-y-2">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Sales Revenue</span>
                  <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
                    {formatCurrency(data?.sales.reduce((acc: number, s: any) => acc + Number(s.totalAmount), 0) || 0)}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5 p-5 bg-white dark:bg-slate-900 space-y-2">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Gross Profit</span>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(data?.sales.reduce((acc: number, s: any) => acc + Number(s.grossProfit), 0) || 0)}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5 p-5 bg-white dark:bg-slate-900 space-y-2">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Total Invoices</span>
                  <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{data?.sales.length || 0}</div>
                </div>
              </div>

              {/* Payment Methods Breakdown */}
              <div className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5 p-6 bg-white dark:bg-slate-900 space-y-4">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Payment Methods Breakdown</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {["CASH", "MOBILE_MONEY", "BANK_TRANSFER", "CARD"].map((pm) => {
                    const count = data?.sales.filter((s: any) => s.paymentMethod === pm).length || 0;
                    const sum = data?.sales
                      .filter((s: any) => s.paymentMethod === pm)
                      .reduce((acc: number, s: any) => acc + Number(s.totalAmount), 0) || 0;

                    return (
                      <div key={pm} className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block">{pm}</span>
                        <div className="font-extrabold text-sm text-slate-900 dark:text-slate-100">{formatCurrency(sum)}</div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">{count} sales</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sales Ledger Breakdown */}
              <div className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5 p-6 bg-white dark:bg-slate-900 space-y-4">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Detailed Sales Invoices</h3>
                
                {/* Desktop Sales Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-800 pb-2">
                        <th className="font-semibold py-2 px-3">Date</th>
                        <th className="font-semibold py-2 px-3">Customer</th>
                        <th className="font-semibold py-2 px-3">Payment</th>
                        <th className="font-semibold py-2 px-3">Status</th>
                        <th className="font-semibold py-2 px-3">Total Amount</th>
                        <th className="font-semibold py-2 px-3 text-right">Gross Profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {data?.sales.map((s: any) => (
                        <tr key={s.id} className="text-slate-800 dark:text-slate-200">
                          <td className="py-3 px-3 text-slate-500 dark:text-slate-400">{new Date(s.saleDate).toLocaleDateString()}</td>
                          <td className="py-3 px-3 font-bold text-slate-900 dark:text-slate-100">{s.customer?.name || "Walk-in Customer"}</td>
                          <td className="py-3 px-3 font-medium text-slate-600 dark:text-slate-400">{s.paymentMethod}</td>
                          <td className="py-3 px-3">
                            <span className={s.status === "COMPLETED" ? "px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800" : "px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"}>
                              {s.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-black text-slate-900 dark:text-slate-100">{formatCurrency(s.totalAmount)}</td>
                          <td className="py-3 px-3 font-bold text-emerald-600 dark:text-emerald-400 text-right">{formatCurrency(s.grossProfit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Sales Cards */}
                <div className="md:hidden space-y-3">
                  {data?.sales.map((s: any) => (
                    <div key={s.id} className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/60 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-sm text-slate-900 dark:text-slate-100">{formatCurrency(s.totalAmount)}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">{new Date(s.saleDate).toLocaleDateString()}</p>
                        </div>
                        <span className={s.status === "COMPLETED" ? "px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800" : "px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"}>
                          {s.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200 dark:border-slate-700/60">
                        <span className="text-slate-600 dark:text-slate-400 font-medium">👤 {s.customer?.name || "Walk-in"}</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">Profit: {formatCurrency(s.grossProfit)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRODUCTS REPORT */}
          {activeTab === "PRODUCTS" && (
            <div className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5 p-6 bg-white dark:bg-slate-900 space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Product Performance Catalog</h3>
              
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-800 pb-2">
                      <th className="font-semibold py-2 px-3">Product Name</th>
                      <th className="font-semibold py-2 px-3">Category</th>
                      <th className="font-semibold py-2 px-3">Selling Price</th>
                      <th className="font-semibold py-2 px-3">Cost Price</th>
                      <th className="font-semibold py-2 px-3">Remaining Stock</th>
                      <th className="font-semibold py-2 px-3 text-right">Potential Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data?.products.map((p: any) => {
                      const margin = p.sellingPriceNum - p.defaultCostPriceNum;
                      return (
                        <tr key={p.id} className="text-slate-800 dark:text-slate-200">
                          <td className="py-3 px-3 font-bold text-slate-900 dark:text-slate-100">{p.name}</td>
                          <td className="py-3 px-3 text-slate-500 dark:text-slate-400">{p.category || "—"}</td>
                          <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(p.sellingPriceNum)}</td>
                          <td className="py-3 px-3 text-slate-600 dark:text-slate-400">{formatCurrency(p.defaultCostPriceNum)}</td>
                          <td className="py-3 px-3 font-bold text-emerald-600 dark:text-emerald-400">{p.remainingStock} units</td>
                          <td className="py-3 px-3 font-bold text-right text-indigo-600 dark:text-indigo-400">{formatCurrency(margin)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Product Cards */}
              <div className="md:hidden space-y-3">
                {data?.products.map((p: any) => {
                  const margin = p.sellingPriceNum - p.defaultCostPriceNum;
                  return (
                    <div key={p.id} className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/60 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-sm text-slate-900 dark:text-slate-100">{p.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{p.category || "General"}</p>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          {p.remainingStock} in stock
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700/60 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Selling</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(p.sellingPriceNum)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Cost</span>
                          <span className="font-semibold text-slate-600 dark:text-slate-400">{formatCurrency(p.defaultCostPriceNum)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Margin</span>
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(margin)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: BATCHES REPORT */}
          {activeTab === "BATCHES" && (
            <div className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5 p-6 bg-white dark:bg-slate-900 space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Stock Batch Capital Investments</h3>
              
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-800 pb-2">
                      <th className="font-semibold py-2 px-3">Batch Ref</th>
                      <th className="font-semibold py-2 px-3">Purchase Date</th>
                      <th className="font-semibold py-2 px-3">Status</th>
                      <th className="font-semibold py-2 px-3">Purchase Cost</th>
                      <th className="font-semibold py-2 px-3">Transport Overhead</th>
                      <th className="font-semibold py-2 px-3 text-right">Total Investment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data?.batches.map((b: any) => (
                      <tr key={b.id} className="text-slate-800 dark:text-slate-200">
                        <td className="py-3 px-3 font-bold text-slate-900 dark:text-slate-100">{b.reference}</td>
                        <td className="py-3 px-3 text-slate-500 dark:text-slate-400">{new Date(b.purchaseDate).toLocaleDateString()}</td>
                        <td className="py-3 px-3 font-bold">
                          <span className={b.status === "ACTIVE" ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-full font-bold px-2.5 py-0.5" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full px-2.5 py-0.5 font-bold"}>
                            {b.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(b.purchaseCost)}</td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-400">{formatCurrency(b.additionalCosts)}</td>
                        <td className="py-3 px-3 font-black text-right text-slate-900 dark:text-slate-100">{formatCurrency(b.totalInvestment)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Batch Cards */}
              <div className="md:hidden space-y-3">
                {data?.batches.map((b: any) => (
                  <div key={b.id} className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/60 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-sm text-slate-900 dark:text-slate-100">{b.reference}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{new Date(b.purchaseDate).toLocaleDateString()}</p>
                      </div>
                      <span className={b.status === "ACTIVE" ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-full font-bold text-[10px] px-2 py-0.5" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-[10px] px-2 py-0.5 font-bold"}>
                        {b.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700/60 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Purchase Cost</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(b.purchaseCost)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Overhead</span>
                        <span className="font-medium text-slate-600 dark:text-slate-400">{formatCurrency(b.additionalCosts)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Total</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(b.totalInvestment)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: EXPENSES REPORT */}
          {activeTab === "EXPENSES" && (
            <div className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5 p-6 bg-white dark:bg-slate-900 space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Operational Expense Ledger</h3>
              
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-800 pb-2">
                      <th className="font-semibold py-2 px-3">Date</th>
                      <th className="font-semibold py-2 px-3">Category</th>
                      <th className="font-semibold py-2 px-3">Description</th>
                      <th className="font-semibold py-2 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data?.expenses.map((e: any) => (
                      <tr key={e.id} className="text-slate-800 dark:text-slate-200">
                        <td className="py-3 px-3 text-slate-500 dark:text-slate-400">{new Date(e.expenseDate).toLocaleDateString()}</td>
                        <td className="py-3 px-3 font-bold text-rose-700 dark:text-rose-400">{e.category}</td>
                        <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200">{e.description}</td>
                        <td className="py-3 px-3 font-black text-right text-rose-600 dark:text-rose-400">{formatCurrency(e.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Expense Cards */}
              <div className="md:hidden space-y-3">
                {data?.expenses.map((e: any) => (
                  <div key={e.id} className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/60 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-sm text-slate-900 dark:text-slate-100">{e.description}</p>
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                          {e.category}
                        </span>
                      </div>
                      <span className="font-black text-rose-600 dark:text-rose-400 text-sm">{formatCurrency(e.amount)}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700/60">
                      Logged on {new Date(e.expenseDate).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: PROFIT REPORT */}
          {activeTab === "PROFIT" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5 p-6 bg-white dark:bg-slate-900 space-y-2">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Gross Profit</span>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(data?.profit?.totalGrossProfit || 0)}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5 p-6 bg-white dark:bg-slate-900 space-y-2">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Operational Expenses</span>
                  <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
                    {formatCurrency(data?.profit?.totalExpenses || 0)}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5 p-6 bg-white dark:bg-slate-900 space-y-2">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Net Profit</span>
                  <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                    {formatCurrency(data?.profit?.totalNetProfit || 0)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
