"use client";

import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import {
  Receipt,
  Plus,
  Truck,
  Package,
  ShoppingBag,
  Layers,
  AlertTriangle,
  CheckCircle2,
  X,
  Loader2,
  DollarSign,
  Tag,
  Calendar,
} from "lucide-react";

interface Batch {
  id: string;
  reference: string;
}

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  expenseDate: string;
  notes: string | null;
  batch: { reference: string } | null;
}

const expenseCategories = [
  { value: "TRANSPORT", label: "Transport & Travel", icon: Truck },
  { value: "DELIVERY", label: "Delivery & Shipping", icon: ShoppingBag },
  { value: "PACKAGING", label: "Packaging & Boxes", icon: Package },
  { value: "MARKETING", label: "Marketing & Ads", icon: Tag },
  { value: "RESTOCKING", label: "Restocking Overhead", icon: Layers },
  { value: "OPERATIONS", label: "Operations & Rent", icon: Receipt },
  { value: "OTHER", label: "Other Expense", icon: DollarSign },
];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Category Filter
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Expense Logger Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

  // Form Fields
  const [category, setCategory] = useState("TRANSPORT");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);
  const [batchId, setBatchId] = useState("");
  const [notes, setNotes] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const catParam = selectedCategory !== "ALL" ? `?category=${selectedCategory}` : "";
      const [expRes, batchRes] = await Promise.all([
        fetch(`/api/expenses${catParam}`),
        fetch("/api/batches"),
      ]);

      const expJson = await expRes.json();
      const batchJson = await batchRes.json();

      if (expJson.success) setExpenses(expJson.data);
      else setError(expJson.error || "Failed to load expenses");

      if (batchJson.success) setBatches(batchJson.data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch expenses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCategory]);

  useEffect(() => {
    const handler = () => {
      setFormError(null);
      setIsModalOpen(true);
    };
    window.addEventListener("avencia:open-add-expense", handler);
    return () => window.removeEventListener("avencia:open-add-expense", handler);
  }, []);


  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(false);

    if (!description.trim()) {
      setFormError("Expense description is required.");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setFormError("Expense amount must be greater than GH₵0.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          description,
          amount: parseFloat(amount),
          expenseDate,
          batchId: batchId || undefined,
          notes: notes || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setFormSuccess(true);
        setDescription("");
        setAmount("");
        setNotes("");
        setBatchId("");
        setTimeout(() => {
          setIsModalOpen(false);
          setFormSuccess(false);
          fetchData();
        }, 800);
      } else {
        setFormError(json.error || "Could not save expense");
      }
    } catch (err: any) {
      setFormError(err.message || "Server error while saving expense");
    } finally {
      setSubmitting(false);
    }
  };

  // Aggregations
  const totalExpensesAmount = expenses.reduce((acc, e) => acc + Number(e.amount), 0);

  // Group by category for breakdown summary
  const categoryTotals: Record<string, number> = {};
  expenses.forEach((e) => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + Number(e.amount);
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Operational Expenses</h2>
          <p className="text-xs text-slate-500">
            Log transport, packaging, delivery & overhead costs to calculate accurate net profit.
          </p>
        </div>

        <button
          onClick={() => {
            setFormError(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 transition-all touch-manipulation"
        >
          <Plus className="w-4 h-4" /> Log Expense
        </button>
      </div>

      {/* KPI Cards & Category Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-3xl border border-slate-100 shadow-xl shadow-indigo-500/5 p-5 bg-white space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Total Expenses</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{formatCurrency(totalExpensesAmount)}</div>
          <p className="text-[11px] text-slate-500">Total operational spend recorded</p>
        </div>

        <div className="rounded-3xl border border-slate-100 shadow-xl shadow-indigo-500/5 p-5 bg-white space-y-2 col-span-2">
          <span className="text-xs font-semibold text-slate-500 uppercase block">Category Spend Breakdown</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {expenseCategories.slice(0, 4).map((cat) => {
              const spent = categoryTotals[cat.value] || 0;
              return (
                <div key={cat.value} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 text-xs">
                  <span className="text-[10px] text-slate-400 font-medium block truncate">{cat.label}</span>
                  <span className="font-bold text-slate-900 text-xs">{formatCurrency(spent)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Category Pills Filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedCategory("ALL")}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all focus:outline-none focus:ring-2 focus:ring-indigo-600 ${
            selectedCategory === "ALL"
              ? "rounded-full bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
              : "rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          All Categories
        </button>
        {expenseCategories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all focus:outline-none focus:ring-2 focus:ring-indigo-600 ${
              selectedCategory === cat.value
                ? "rounded-full bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                : "rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Expenses Table */}
      <div className="rounded-3xl border border-slate-100 shadow-xl shadow-indigo-500/5 p-6 bg-white space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-rose-600" />
            Expense Records
          </h3>
          <span className="text-xs font-bold text-slate-500">{expenses.length} Records</span>
        </div>

        {loading ? (
          <div className="p-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-slate-400 animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Loading expenses...</p>
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl text-rose-700 text-xs flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
              <Receipt className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">No Expenses Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {selectedCategory !== "ALL"
                ? `No expenses found in category "${selectedCategory}".`
                : "No operational expenses logged yet. Click 'Log Expense' to add one."}
            </p>
          </div>
        ) : (
          <>
            {/* DESKTOP table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-200 pb-2">
                    <th className="font-semibold pb-2">Date</th>
                    <th className="font-semibold pb-2">Category</th>
                    <th className="font-semibold pb-2">Description</th>
                    <th className="font-semibold pb-2">Associated Batch</th>
                    <th className="font-semibold pb-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expenses.map((e) => (
                    <tr key={e.id} className="text-slate-800">
                      <td className="py-3 text-slate-500">
                        {new Date(e.expenseDate).toLocaleDateString()}
                      </td>
                      <td className="py-3">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          {e.category}
                        </span>
                      </td>
                      <td className="py-3 font-bold text-slate-900">{e.description}</td>
                      <td className="py-3 font-medium text-slate-600">
                        {e.batch ? e.batch.reference : "—"}
                      </td>
                      <td className="py-3 font-black text-rose-600 text-right">
                        {formatCurrency(e.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE cards */}
            <div className="md:hidden space-y-3">
              {expenses.map((e) => (
                <div key={e.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-slate-900 truncate">{e.description}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        {e.category}
                      </span>
                    </div>
                    <span className="font-black text-rose-600 text-sm flex-shrink-0">{formatCurrency(e.amount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200">
                    <span>{new Date(e.expenseDate).toLocaleDateString()}</span>
                    <span>{e.batch ? e.batch.reference : "General Overhead"}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

      </div>

      {/* Expense Logger Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-100 max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Log Operational Expense</h3>
                <p className="text-xs text-slate-500">Record a cost incurred for transport, rent or materials</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Expense logged successfully!</span>
              </div>
            )}

            <form onSubmit={handleCreateExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Expense Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  {expenseCategories.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Courier transport fee to Kumasi"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Expense Date *</label>
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Associated Batch (Optional)</label>
                <select
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="">-- None (General Operations) --</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.reference}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  placeholder="Optional expense details..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    "Save Expense"
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
