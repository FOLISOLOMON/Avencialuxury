"use client";

import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Truck,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle2,
  X,
  Loader2,
  Phone,
  Mail,
  MapPin,
  PackageCheck,
  Calendar,
  Layers,
  Edit,
  Trash2,
} from "lucide-react";

interface BatchSummary {
  id: string;
  reference: string;
  totalInvestment: number;
  purchaseDate: string;
  status: string;
}

interface Supplier {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  totalBatches: number;
  totalInvestment: number;
  batches: BatchSummary[];
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

  // Detail Modal
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const fetchSuppliers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/suppliers?search=${encodeURIComponent(search)}`);
      const json = await res.json();
      if (json.success) setSuppliers(json.data);
      else setError(json.error || "Failed to load suppliers");
    } catch (err: any) {
      setError(err.message || "Network error fetching suppliers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [search]);

  useEffect(() => {
    const handler = () => openCreateModal();
    window.addEventListener("avencia:open-add-supplier", handler);
    return () => window.removeEventListener("avencia:open-add-supplier", handler);
  }, []);

  const openCreateModal = () => {
    setEditingSupplier(null);
    setName("");
    setContactPerson("");
    setPhone("");
    setEmail("");
    setAddress("");
    setNotes("");
    setFormError(null);
    setFormSuccess(false);
    setIsModalOpen(true);
  };

  const openEditModal = (s: Supplier) => {
    setEditingSupplier(s);
    setName(s.name);
    setContactPerson(s.contactPerson || "");
    setPhone(s.phone || "");
    setEmail(s.email || "");
    setAddress(s.address || "");
    setNotes(s.notes || "");
    setFormError(null);
    setFormSuccess(false);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(false);

    if (!name.trim()) {
      setFormError("Supplier name is required.");
      return;
    }

    setSubmitting(true);
    try {
      const url = editingSupplier ? `/api/suppliers/${editingSupplier.id}` : "/api/suppliers";
      const method = editingSupplier ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          contactPerson: contactPerson || undefined,
          phone: phone || undefined,
          email: email || undefined,
          address: address || undefined,
          notes: notes || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setFormSuccess(true);
        setTimeout(() => {
          setIsModalOpen(false);
          setFormSuccess(false);
          fetchSuppliers();
        }, 600);
      } else {
        setFormError(json.error || "Failed to save supplier");
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to connect to server");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this supplier profile?")) return;
    try {
      const res = await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        fetchSuppliers();
      } else {
        alert(json.error || "Failed to delete supplier");
      }
    } catch (err: any) {
      alert("Error deleting supplier");
    }
  };

  const totalSuppliers = suppliers.length;
  const grandTotalBatches = suppliers.reduce((sum, s) => sum + s.totalBatches, 0);
  const grandTotalSpend = suppliers.reduce((sum, s) => sum + s.totalInvestment, 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Supplier Directory"
        subtitle="Manage wholesale partners, contact information, and procurement batches"
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5 p-6 bg-white dark:bg-slate-900 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Active Suppliers</span>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{totalSuppliers}</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Wholesale partners</p>
        </div>

        <div className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5 p-6 bg-white dark:bg-slate-900 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Batches Supplied</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{grandTotalBatches}</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Restocking trips</p>
        </div>

        <div className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5 p-6 bg-white dark:bg-slate-900 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Total Procurement Spend</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <PackageCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{formatCurrency(grandTotalSpend)}</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Cumulative inventory investment</p>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5 p-4 bg-white dark:bg-slate-900 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search suppliers by name, contact person, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:focus:ring-indigo-500"
          />
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25 transition-all font-bold text-xs whitespace-nowrap active:scale-95"
        >
          <Plus className="w-4 h-4" /> Add Supplier
        </button>
      </div>

      {/* Supplier Directory Cards Grid */}
      <div className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5 p-6 bg-white dark:bg-slate-900">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <Loader2 className="w-8 h-8 text-slate-400 dark:text-slate-500 animate-spin" />
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Loading suppliers directory...</p>
          </div>
        ) : error ? (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-4 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 mx-auto flex items-center justify-center">
              <Truck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">No Suppliers Found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {search ? "No suppliers match your search query." : "Add your wholesale suppliers to link them to restocking batches."}
            </p>
          </div>
        ) : (
          <>
            {/* DESKTOP Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-800 pb-2">
                    <th className="font-semibold pb-2">Supplier Name</th>
                    <th className="font-semibold pb-2">Contact Details</th>
                    <th className="font-semibold pb-2">Batches Supplied</th>
                    <th className="font-semibold pb-2">Total Spend</th>
                    <th className="font-semibold pb-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {suppliers.map((s) => (
                    <tr key={s.id} className="text-slate-800 dark:text-slate-200">
                      <td className="py-3 font-bold text-slate-900 dark:text-slate-100">
                        {s.name}
                        {s.contactPerson && <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-normal">Contact: {s.contactPerson}</span>}
                      </td>
                      <td className="py-3 text-slate-600 dark:text-slate-300">
                        <div className="space-y-0.5">
                          {s.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400 dark:text-slate-500" /> {s.phone}</div>}
                          {s.email && <div className="flex items-center gap-1 text-[11px]"><Mail className="w-3 h-3 text-slate-400 dark:text-slate-500" /> {s.email}</div>}
                          {!s.phone && !s.email && "—"}
                        </div>
                      </td>
                      <td className="py-3 font-medium">{s.totalBatches} batches</td>
                      <td className="py-3 font-black text-slate-900 dark:text-slate-100">{formatCurrency(s.totalInvestment)}</td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => setSelectedSupplier(s)} className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-[11px]">Procurement Details</button>
                          <button onClick={() => openEditModal(s)} className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"><Edit className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE Cards */}
            <div className="md:hidden space-y-3">
              {suppliers.map((s) => (
                <div key={s.id} className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/60 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">{s.name}</h4>
                      {s.contactPerson && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Attn: {s.contactPerson}</p>}
                    </div>
                    <span className="font-black text-sm text-slate-900 dark:text-slate-100">{formatCurrency(s.totalInvestment)}</span>
                  </div>

                  <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1 pt-1 border-t border-slate-200 dark:border-slate-700">
                    {s.phone && <p className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-slate-400 dark:text-slate-500" /> {s.phone}</p>}
                    {s.email && <p className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-slate-400 dark:text-slate-500" /> {s.email}</p>}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{s.totalBatches} batches supplied</span>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setSelectedSupplier(s)} className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold">Details</button>
                      <button onClick={() => openEditModal(s)} className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"><Edit className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Supplier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  {editingSupplier ? "Edit Supplier" : "Add Wholesale Supplier"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Contact & procurement information</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-3 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Supplier saved successfully!</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Company / Supplier Name *</label>
                <input type="text" required placeholder="e.g. Fragrance World Wholesale" value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:focus:ring-indigo-500" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Contact Person</label>
                  <input type="text" placeholder="e.g. Mr. Ibrahim" value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                  <input type="text" placeholder="e.g. 0244123456" value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:focus:ring-indigo-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                <input type="email" placeholder="e.g. sales@fragranceworld.com" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:focus:ring-indigo-500" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Physical Address / Market Location</label>
                <input type="text" placeholder="e.g. Makola Market, Block C #14" value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:focus:ring-indigo-500" />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
                <button type="submit" disabled={submitting} className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25 transition-all text-xs font-bold disabled:opacity-50 flex items-center gap-2">
                  {submitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</> : "Save Supplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Procurement History Modal */}
      {selectedSupplier && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">{selectedSupplier.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Procurement & restocking history modal</p>
              </div>
              <button onClick={() => setSelectedSupplier(null)} className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/70 rounded-2xl p-4 space-y-2 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
              {selectedSupplier.contactPerson && <p className="font-medium"><strong className="text-slate-900 dark:text-slate-100">Contact Person:</strong> {selectedSupplier.contactPerson}</p>}
              {selectedSupplier.phone && <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" /> {selectedSupplier.phone}</p>}
              {selectedSupplier.email && <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" /> {selectedSupplier.email}</p>}
              {selectedSupplier.address && <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" /> {selectedSupplier.address}</p>}
            </div>

            <div className="space-y-3 pt-2">
              <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">Procurement Batches Purchased ({selectedSupplier.batches.length})</h4>
              {selectedSupplier.batches.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500">No batches linked to this supplier yet.</p>
              ) : (
                <div className="space-y-2">
                  {selectedSupplier.batches.map((b) => (
                    <div key={b.id} className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{b.reference}</span>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">{new Date(b.purchaseDate).toLocaleDateString()}</p>
                      </div>
                      <span className="font-black text-slate-900 dark:text-slate-100">{formatCurrency(b.totalInvestment)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
