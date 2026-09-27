"use client";

import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import {
  PiggyBank,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Loader2,
  PieChart,
  History,
  DollarSign,
  Wallet,
} from "lucide-react";

interface ProfitSummary {
  totalRevenue: number;
  totalCostOfGoods: number;
  totalGrossProfit: number;
  totalExpenses: number;
  totalNetProfit: number;
  allocations: {
    savings: number;
    needs: number;
    wants: number;
    totalAllocated: number;
    remainingAllocatableProfit: number;
  };
}

interface Allocation {
  id: string;
  amount: number;
  type: "SAVINGS" | "NEEDS" | "WANTS";
  source: string | null;
  allocationDate: string;
  notes: string | null;
}

export default function ProfitPage() {
  const [summary, setSummary] = useState<ProfitSummary | null>(null);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [allocationType, setAllocationType] = useState<"SAVINGS" | "NEEDS" | "WANTS">("SAVINGS");
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/profit");
      const json = await res.json();
      if (json.success) {
        setSummary(json.data.summary);
        setAllocations(json.data.allocations);
      } else {
        setError(json.error || "Failed to load profit summary");
      }
    } catch (err: any) {
      setError(err.message || "Network error fetching profit summary");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(false);

    const val = parseFloat(amount);
    if (!amount || isNaN(val) || val <= 0) {
      setFormError("Allocation amount must be greater than GH₵0.");
      return;
    }

    if (summary && val > summary.allocations.remainingAllocatableProfit) {
      setFormError(
        `Requested allocation (${formatCurrency(val)}) exceeds remaining allocatable profit (${formatCurrency(
          summary.allocations.remainingAllocatableProfit
        )}).`
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/profit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: allocationType,
          amount: val,
          source: source || undefined,
          notes: notes || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setFormSuccess(true);
        setAmount("");
        setSource("");
        setNotes("");
        setTimeout(() => {
          setFormSuccess(false);
          fetchData();
        }, 800);
      } else {
        setFormError(json.error || "Failed to submit profit allocation");
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to save allocation");
    } finally {
      setSubmitting(false);
    }
  };

  // Quick preset calculation (50/30/20 rule on remaining allocatable profit)
  const applyPresetPercentage = (pct: number) => {
    if (!summary) return;
    const calc = Math.round((summary.allocations.remainingAllocatableProfit * (pct / 100)) * 100) / 100;
    setAmount(calc.toString());
  };

  const getBadgeClass = (type: string) => {
    switch (type) {
      case "SAVINGS":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 rounded-full font-bold";
      case "NEEDS":
        return "bg-blue-100 text-blue-800 border-blue-200 rounded-full font-bold";
      case "WANTS":
        return "bg-purple-100 text-purple-800 border-purple-200 rounded-full font-bold";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200 rounded-full font-bold";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Profit Allocation Calculator</h2>
        <p className="text-xs text-slate-500">
          Distribute net profit safely into Savings, Needs & Wants without over-allocating.
        </p>
      </div>

      {loading && !summary ? (
        <div className="rounded-3xl border border-slate-100 shadow-xl shadow-indigo-500/5 p-12 bg-white flex flex-col items-center justify-center text-center space-y-3">
          <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
          <p className="text-xs font-medium text-slate-500">Calculating financial allocations...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-3xl text-rose-700 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-3xl border border-slate-100 shadow-xl shadow-indigo-500/5 p-5 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase">Total Net Profit</span>
                <div className="p-2 rounded-xl bg-violet-50 text-violet-600">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900">
                {formatCurrency(summary?.totalNetProfit || 0)}
              </div>
              <p className="text-[11px] text-slate-500">Gross profit minus expenses</p>
            </div>

            <div className="rounded-3xl border border-slate-100 shadow-xl shadow-indigo-500/5 p-5 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase">Total Allocated</span>
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <PieChart className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900">
                {formatCurrency(summary?.allocations.totalAllocated || 0)}
              </div>
              <p className="text-[11px] text-slate-500">Savings + Needs + Wants sum</p>
            </div>

            {/* Remaining Allocatable Profit Card */}
            <div className="rounded-3xl border border-slate-100 shadow-xl shadow-indigo-500/5 p-5 bg-white space-y-2 col-span-1 sm:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase">
                  Remaining Allocatable Available
                </span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-600">
                {formatCurrency(summary?.allocations.remainingAllocatableProfit || 0)}
              </div>
              <p className="text-[11px] text-slate-500">
                {summary && summary.allocations.remainingAllocatableProfit > 0
                  ? "Safe for allocation into business reserves or personal accounts."
                  : "No unallocated net profit remaining. Record new sales to generate profit."}
              </p>
            </div>
          </div>

          {/* Allocation Breakdown Progress Visualizers */}
          <div className="rounded-3xl border border-slate-100 shadow-xl shadow-indigo-500/5 p-6 bg-white space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <PiggyBank className="w-4 h-4 text-indigo-600" />
              Allocation Breakdown (Savings / Needs / Wants)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Savings */}
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                  <span>Savings Allocation</span>
                  <span>{formatCurrency(summary?.allocations.savings || 0)}</span>
                </div>
                <div className="w-full h-2 bg-emerald-200/80 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        ((summary?.allocations.savings || 0) / (summary?.totalNetProfit || 1)) * 100
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-emerald-700">Business reinvestment & rainy-day reserve.</p>
              </div>

              {/* Needs */}
              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                  <span>Needs Allocation</span>
                  <span>{formatCurrency(summary?.allocations.needs || 0)}</span>
                </div>
                <div className="w-full h-2 bg-blue-200/80 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        ((summary?.allocations.needs || 0) / (summary?.totalNetProfit || 1)) * 100
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-blue-700">Essential salary & business operational needs.</p>
              </div>

              {/* Wants */}
              <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-purple-900">
                  <span>Wants Allocation</span>
                  <span>{formatCurrency(summary?.allocations.wants || 0)}</span>
                </div>
                <div className="w-full h-2 bg-purple-200/80 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-600 rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        ((summary?.allocations.wants || 0) / (summary?.totalNetProfit || 1)) * 100
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-purple-700">Owner payout, bonuses & personal discretionary.</p>
              </div>
            </div>
          </div>

          {/* New Allocation Form */}
          <div className="rounded-3xl border border-slate-100 shadow-xl shadow-indigo-500/5 p-6 bg-white space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-600" />
              New Profit Allocation Entry
            </h3>

            {formError && (
              <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Profit allocated successfully!</span>
              </div>
            )}

            <form onSubmit={handleAllocate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Allocation Type *</label>
                  <select
                    value={allocationType}
                    onChange={(e) => setAllocationType(e.target.value as any)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="SAVINGS">SAVINGS (Reserve / Business Expansion)</option>
                    <option value="NEEDS">NEEDS (Essential Operational Needs)</option>
                    <option value="WANTS">WANTS (Owner Payout / Bonuses)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Amount (GH₵) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Source / Tag</label>
                  <input
                    type="text"
                    placeholder="e.g. Q3 Profit Share"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <span className="text-[11px] font-bold text-slate-500">Quick Presets of Remaining:</span>
                <button
                  type="button"
                  onClick={() => applyPresetPercentage(50)}
                  className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  50%
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetPercentage(30)}
                  className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  30%
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetPercentage(20)}
                  className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  20%
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  placeholder="Optional allocation note..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting || (summary?.allocations.remainingAllocatableProfit || 0) <= 0}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 flex items-center gap-2 touch-manipulation"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Allocating...
                    </>
                  ) : (
                    "Submit Profit Allocation"
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Allocation History Ledger */}
          <div className="rounded-3xl border border-slate-100 shadow-xl shadow-indigo-500/5 p-6 bg-white space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                Allocation Ledger History
              </h3>
              <span className="text-xs font-bold text-slate-500">{allocations.length} Entries</span>
            </div>

            {allocations.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">No profit allocations recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-200 pb-2">
                      <th className="font-semibold pb-2">Date</th>
                      <th className="font-semibold pb-2">Allocation Type</th>
                      <th className="font-semibold pb-2">Source / Tag</th>
                      <th className="font-semibold pb-2">Notes</th>
                      <th className="font-semibold pb-2 text-right">Amount Allocated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allocations.map((a) => (
                      <tr key={a.id} className="text-slate-800">
                        <td className="py-3 text-slate-500">
                          {new Date(a.allocationDate).toLocaleDateString()}
                        </td>
                        <td className="py-3">
                          <span
                            className={`px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase ${getBadgeClass(
                              a.type
                            )}`}
                          >
                            {a.type}
                          </span>
                        </td>
                        <td className="py-3 font-medium text-slate-700">{a.source || "—"}</td>
                        <td className="py-3 text-slate-500">{a.notes || "—"}</td>
                        <td className="py-3 font-black text-slate-900 text-right">
                          {formatCurrency(a.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
