"use client";

import { useState, useEffect, useRef } from "react";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
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
  Percent,
  Sparkles,
  ArrowRight,
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

  const formRef = useRef<HTMLDivElement>(null);

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

  const scrollToForm = () => {
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

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

  // Quick preset calculation
  const applyPresetPercentage = (pct: number) => {
    if (!summary) return;
    const calc = Math.round((summary.allocations.remainingAllocatableProfit * (pct / 100)) * 100) / 100;
    setAmount(calc.toString());
  };

  // Apply full 50/30/20 preset rule directly into state or helper
  const apply503020Rule = () => {
    if (!summary) return;
    scrollToForm();
    // Default to 50% Savings preset
    applyPresetPercentage(50);
  };

  const getBadgeClass = (type: string) => {
    switch (type) {
      case "SAVINGS":
        return "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 rounded-full font-bold";
      case "NEEDS":
        return "bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800 rounded-full font-bold";
      case "WANTS":
        return "bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800 rounded-full font-bold";
      default:
        return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 rounded-full font-bold";
    }
  };

  return (
    <div className="space-y-6">

      {loading && !summary ? (
        <div className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5 p-12 bg-white dark:bg-slate-900 flex flex-col items-center justify-center text-center space-y-3">
          <Loader2 className="w-8 h-8 text-slate-400 dark:text-slate-500 animate-spin" />
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Calculating financial allocations...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 p-4 rounded-3xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : (
        <>
          {/* Realized Available Profit Hero Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 dark:from-slate-950 dark:via-indigo-950 dark:to-slate-950 p-6 sm:p-8 text-white shadow-2xl border border-indigo-900/50">
            <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                  <ShieldCheck className="w-3.5 h-3.5" /> Realized Available Profit
                </div>
                <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                  {formatCurrency(summary?.allocations.remainingAllocatableProfit || 0)}
                </h2>
                <p className="text-xs text-slate-300 max-w-xl">
                  {summary && summary.allocations.remainingAllocatableProfit > 0
                    ? "Safe, unallocated net earnings ready to be set aside into business savings, essential needs, or owner distributions."
                    : "All realized net profit has been allocated into designated business accounts."}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={apply503020Rule}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-all backdrop-blur-sm active:scale-95"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" /> Apply 50/30/20 Preset
                </button>
                <button
                  onClick={scrollToForm}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/25 transition-all active:scale-95"
                >
                  <span>Allocate Now</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Financial Overview Mini Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Total Net Profit</span>
                <span className="font-extrabold text-white text-sm">{formatCurrency(summary?.totalNetProfit || 0)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Total Allocated</span>
                <span className="font-extrabold text-indigo-300 text-sm">{formatCurrency(summary?.allocations.totalAllocated || 0)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Gross Revenue</span>
                <span className="font-semibold text-slate-300">{formatCurrency(summary?.totalRevenue || 0)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Op. Expenses</span>
                <span className="font-semibold text-rose-300">{formatCurrency(summary?.totalExpenses || 0)}</span>
              </div>
            </div>
          </div>

          {/* Visual Allocation Cards (Savings 50%, Needs 30%, Wants 20%) */}
          <div className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5 p-6 bg-white dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <PiggyBank className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                50/30/20 Profit Allocation Breakdown
              </h3>
              <button
                type="button"
                onClick={apply503020Rule}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1"
              >
                <Percent className="w-3.5 h-3.5" /> 50/30/20 Rule Info
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Savings 50% */}
              <div className="p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-600 text-white uppercase">
                    Savings 50%
                  </span>
                  <span className="text-sm font-black text-emerald-900 dark:text-emerald-200">
                    {formatCurrency(summary?.allocations.savings || 0)}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-emerald-200/80 dark:bg-emerald-900/60 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        ((summary?.allocations.savings || 0) / (summary?.totalNetProfit || 1)) * 100
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-snug">
                  Business reinvestment, restocking capital & emergency reserve fund.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setAllocationType("SAVINGS");
                    applyPresetPercentage(50);
                    scrollToForm();
                  }}
                  className="w-full py-1.5 rounded-xl bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-bold transition-all"
                >
                  Allocate 50% to Savings
                </button>
              </div>

              {/* Needs 30% */}
              <div className="p-5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-600 text-white uppercase">
                    Needs 30%
                  </span>
                  <span className="text-sm font-black text-blue-900 dark:text-blue-200">
                    {formatCurrency(summary?.allocations.needs || 0)}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-blue-200/80 dark:bg-blue-900/60 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        ((summary?.allocations.needs || 0) / (summary?.totalNetProfit || 1)) * 100
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-blue-800 dark:text-blue-300 leading-snug">
                  Essential staff salary, rent, utilities & core operational needs.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setAllocationType("NEEDS");
                    applyPresetPercentage(30);
                    scrollToForm();
                  }}
                  className="w-full py-1.5 rounded-xl bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white text-xs font-bold transition-all"
                >
                  Allocate 30% to Needs
                </button>
              </div>

              {/* Wants 20% */}
              <div className="p-5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-900/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-purple-600 text-white uppercase">
                    Wants 20%
                  </span>
                  <span className="text-sm font-black text-purple-900 dark:text-purple-200">
                    {formatCurrency(summary?.allocations.wants || 0)}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-purple-200/80 dark:bg-purple-900/60 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-600 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        ((summary?.allocations.wants || 0) / (summary?.totalNetProfit || 1)) * 100
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-purple-800 dark:text-purple-300 leading-snug">
                  Owner payouts, personal bonuses & discretionary profit draw.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setAllocationType("WANTS");
                    applyPresetPercentage(20);
                    scrollToForm();
                  }}
                  className="w-full py-1.5 rounded-xl bg-purple-600 dark:bg-purple-500 hover:bg-purple-700 dark:hover:bg-purple-600 text-white text-xs font-bold transition-all"
                >
                  Allocate 20% to Wants
                </button>
              </div>
            </div>
          </div>

          {/* New Allocation Form */}
          <div ref={formRef} className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5 p-6 bg-white dark:bg-slate-900 space-y-4 scroll-mt-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              New Profit Allocation Entry
            </h3>

            {formError && (
              <div className="bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 p-3 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 p-3 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Profit allocated successfully!</span>
              </div>
            )}

            <form onSubmit={handleAllocate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Allocation Type *</label>
                  <select
                    value={allocationType}
                    onChange={(e) => setAllocationType(e.target.value as any)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="SAVINGS">SAVINGS (Reserve / Business Expansion - 50%)</option>
                    <option value="NEEDS">NEEDS (Essential Operational Needs - 30%)</option>
                    <option value="WANTS">WANTS (Owner Payout / Bonuses - 20%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Amount (GH₵) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Source / Tag</label>
                  <input
                    type="text"
                    placeholder="e.g. Q3 Profit Share"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Quick Presets of Remaining:</span>
                <button
                  type="button"
                  onClick={() => applyPresetPercentage(50)}
                  className="px-3.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold transition-all focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                >
                  50% Savings
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetPercentage(30)}
                  className="px-3.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold transition-all focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                >
                  30% Needs
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetPercentage(20)}
                  className="px-3.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold transition-all focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                >
                  20% Wants
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Notes</label>
                <textarea
                  rows={2}
                  placeholder="Optional allocation note..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting || (summary?.allocations.remainingAllocatableProfit || 0) <= 0}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 flex items-center gap-2 touch-manipulation active:scale-95"
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

          {/* Allocation History & Savings Ledger */}
          <div className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5 p-6 bg-white dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Allocation History & Savings Ledger
              </h3>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{allocations.length} Entries</span>
            </div>

            {allocations.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-8">No profit allocations recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-800 pb-2">
                      <th className="font-semibold pb-2">Date</th>
                      <th className="font-semibold pb-2">Allocation Type</th>
                      <th className="font-semibold pb-2">Source / Tag</th>
                      <th className="font-semibold pb-2">Notes</th>
                      <th className="font-semibold pb-2 text-right">Amount Allocated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {allocations.map((a) => (
                      <tr key={a.id} className="text-slate-800 dark:text-slate-200">
                        <td className="py-3 text-slate-500 dark:text-slate-400">
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
                        <td className="py-3 font-medium text-slate-700 dark:text-slate-300">{a.source || "—"}</td>
                        <td className="py-3 text-slate-500 dark:text-slate-400">{a.notes || "—"}</td>
                        <td className="py-3 font-black text-slate-900 dark:text-slate-100 text-right">
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
