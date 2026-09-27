"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import {
  Layers,
  Plus,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  X,
  Loader2,
  Package,
  CheckCheck,
  ArrowRight,
  Truck,
  Clock,
} from "lucide-react";

interface BatchItem {
  id: string;
  quantityPurchased: number;
  quantityRemaining: number;
  unitCost: number;
  totalCost: number;
  product: { id: string; name: string; sku: string | null };
}

interface Batch {
  id: string;
  reference: string;
  purchaseDate: string;
  status: "ACTIVE" | "COMPLETED" | "ARCHIVED";
  purchaseCost: number;
  additionalCosts: number;
  totalInvestment: number;
  notes: string | null;
  batchItems: BatchItem[];
}

export default function BatchesPage() {
  const router = useRouter();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "COMPLETED">("ACTIVE");

  // Create Batch Header Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);

  // Form fields — header only
  const [reference, setReference] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [additionalCosts, setAdditionalCosts] = useState("0");
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");

  const fetchBatches = async (isInitial = false) => {
    if (isInitial || batches.length === 0) {
      setLoading(true);
    }
    setError(null);
    try {
      const res = await fetch(`/api/batches?status=${statusFilter}`);
      const json = await res.json();
      if (json.success) setBatches(json.data);
      else setError(json.error || "Failed to load batches");
    } catch (err: any) {
      setError(err.message || "Failed to fetch batches");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches(true);
  }, [statusFilter]);


  useEffect(() => {
    const handler = () => openCreateModal();
    window.addEventListener("avencia:open-add-batch", handler);
    return () => window.removeEventListener("avencia:open-add-batch", handler);
  }, []);


  const openCreateModal = async () => {
    const today = new Date().toISOString().split("T")[0];
    const autoRef = `BATCH-${today.replace(/-/g, "")}-${Math.floor(100 + Math.random() * 900)}`;
    setReference(autoRef);
    setPurchaseDate(today);
    setAdditionalCosts("0");
    setSupplierId("");
    setNotes("");
    setFormError(null);
    setFormSuccess(false);
    setIsModalOpen(true);

    try {
      const res = await fetch("/api/suppliers");
      const json = await res.json();
      if (json.success) setSuppliers(json.data);
    } catch (e) {}
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!reference.trim()) {
      setFormError("Batch reference is required.");
      return;
    }

    setSubmitting(true);
    try {
      // Create batch with zero items — items are added in the detail page
      const res = await fetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: reference.trim(),
          purchaseDate,
          additionalCosts: parseFloat(additionalCosts || "0"),
          supplierId: supplierId || undefined,
          notes: notes.trim() || undefined,
          items: [], // empty — we add items on the detail page
        }),
      });

      const json = await res.json();
      if (json.success) {
        setFormSuccess(true);
        setTimeout(() => {
          setIsModalOpen(false);
          // Navigate straight to the new batch detail page
          router.push(`/batches/${json.data.id}`);
        }, 600);
      } else {
        setFormError(json.error || "Could not create batch");
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to connect to server");
    } finally {
      setSubmitting(false);
    }
  };

  const getBatchStats = (batch: Batch) => {
    const totalPurchased = batch.batchItems.reduce((a, b) => a + b.quantityPurchased, 0);
    const totalRemaining = batch.batchItems.reduce((a, b) => a + b.quantityRemaining, 0);
    const totalSold = Math.max(0, totalPurchased - totalRemaining);
    const sellThrough = totalPurchased > 0 ? Math.round((totalSold / totalPurchased) * 100) : 0;
    return { totalPurchased, totalRemaining, totalSold, sellThrough, isHighSellThrough: sellThrough >= 80 };
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Stock Batches</h2>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Each batch represents one restocking trip. Open a batch to add products bought on that trip.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/25 active:scale-95 touch-manipulation"
        >
          <Plus className="w-4 h-4 text-amber-300" /> New Batch
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 pb-1 overflow-x-auto">
        {(["ACTIVE", "COMPLETED", "ALL"] as const).map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-indigo-600 ${
              statusFilter === st
                ? "rounded-full bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                : "rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {st === "ACTIVE" ? "Active Batches" : st === "COMPLETED" ? "Completed" : "All Batches"}
          </button>
        ))}
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-100 flex flex-col items-center justify-center text-center space-y-3 shadow-xl shadow-indigo-500/5">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Loading batches...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl text-rose-700 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : batches.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center space-y-3 shadow-xl shadow-indigo-500/5">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-slate-800 text-sm">No Batches Found</h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto font-medium">
            {statusFilter === "ACTIVE"
              ? "No active batches. Click 'New Batch' to record a restocking trip."
              : "No batches in this view."}
          </p>
          {statusFilter === "ACTIVE" && (
            <button
              onClick={openCreateModal}
              className="mx-auto inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 shadow-md shadow-indigo-500/20"
            >
              <Plus className="w-3.5 h-3.5" /> Create First Batch
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {batches.map((batch) => {
            const { totalPurchased, totalRemaining, totalSold, sellThrough, isHighSellThrough } =
              getBatchStats(batch);

            return (
              <div
                key={batch.id}
                className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-indigo-500/5 hover:border-indigo-100 transition-all"
              >
                <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left — batch info */}
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black text-sm text-slate-900 truncate">{batch.reference}</h3>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase flex-shrink-0 ${
                            batch.status === "ACTIVE"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {batch.status}
                        </span>
                        {batch.status === "ACTIVE" && isHighSellThrough && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 flex-shrink-0">
                            🔥 {sellThrough}% Sold — Ready to Close
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 font-medium flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(batch.purchaseDate).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Package className="w-3.5 h-3.5 text-slate-400" />
                          {batch.batchItems.length} product line{batch.batchItems.length !== 1 ? "s" : ""}
                        </span>
                        {batch.additionalCosts > 0 && (
                          <span className="flex items-center gap-1">
                            <Truck className="w-3.5 h-3.5 text-slate-400" />
                            Transport: {formatCurrency(batch.additionalCosts)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle — stats */}
                  <div className="grid grid-cols-3 gap-4 text-xs bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block">Investment</span>
                      <span className="font-black text-slate-900">{formatCurrency(batch.totalInvestment)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block">Sell-Through</span>
                      <span className="font-bold text-slate-800">
                        {sellThrough}%
                        <span className="font-medium text-slate-400 ml-1">({totalSold}/{totalPurchased})</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block">Remaining</span>
                      <span className="font-extrabold text-emerald-600">{totalRemaining} units</span>
                    </div>
                  </div>

                  {/* Right — Open button */}
                  <button
                    onClick={() => router.push(`/batches/${batch.id}`)}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-all shadow-md shadow-indigo-500/20 flex-shrink-0"
                  >
                    Open <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Batch Header Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">New Restocking Batch</h3>
                <p className="text-xs text-slate-500">
                  Create the batch header first — then add products inside it
                </p>
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
                <span>Batch created! Opening it now...</span>
              </div>
            )}

            <form onSubmit={handleCreateBatch} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Batch Name / Reference *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Market Run – Sept 26 or BATCH-20260926"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Purchase Date *</label>
                  <input
                    type="date"
                    required
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Transport Cost (GH₵)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={additionalCosts}
                    onChange={(e) => setAdditionalCosts(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Wholesale Supplier (Optional)
                </label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="">-- No Supplier Selected --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Supplier name, market location..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="bg-sky-50 border border-sky-100 p-3 rounded-xl text-sky-800 text-xs flex items-start gap-2">
                <Clock className="w-4 h-4 flex-shrink-0 mt-0.5 text-sky-600" />
                <span>
                  After creating the batch, you'll be taken to its detail page where you can scan or add
                  each product you purchased one by one.
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
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
                  className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating...
                    </>
                  ) : (
                    <>
                      Create Batch <ArrowRight className="w-3.5 h-3.5" />
                    </>
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
