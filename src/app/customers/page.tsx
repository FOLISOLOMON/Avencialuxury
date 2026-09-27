"use client";

import { useState, useEffect } from "react";
import { formatCurrency, formatGhanaPhoneNumber } from "@/lib/utils";
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  DollarSign,
  TrendingUp,
  ShoppingBag,
  AlertTriangle,
  CheckCircle2,
  X,
  Loader2,
  Calendar,
  Share2,
} from "lucide-react";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  totalOrders: number;
  totalSpend: number;
  totalProfit: number;
  totalOutstandingDebt?: number;
  avgOrderValue: number;
  lastPurchaseDate: string | null;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "DEBTORS">("ALL");

  // Add Customer Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

  // Record Debt Payment Modal
  const [debtModalCustomer, setDebtModalCustomer] = useState<Customer | null>(null);
  const [debtAmount, setDebtAmount] = useState("");
  const [debtPaymentMethod, setDebtPaymentMethod] = useState("CASH");
  const [debtNotes, setDebtNotes] = useState("");
  const [debtSubmitting, setDebtSubmitting] = useState(false);
  const [debtError, setDebtError] = useState<string | null>(null);
  const [debtSuccess, setDebtSuccess] = useState(false);

  // Form Fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers?search=${encodeURIComponent(search)}`);
      const json = await res.json();
      if (json.success) {
        setCustomers(json.data);
      } else {
        setError(json.error || "Failed to load customer directory");
      }
    } catch (err: any) {
      setError(err.message || "Network error fetching customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search]);

  useEffect(() => {
    const handler = () => {
      setFormError(null);
      setIsModalOpen(true);
    };
    window.addEventListener("avencia:open-add-customer", handler);
    return () => window.removeEventListener("avencia:open-add-customer", handler);
  }, []);


  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(false);

    if (!name.trim()) {
      setFormError("Customer name is required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone: phone ? formatGhanaPhoneNumber(phone) : undefined,
          email: email || undefined,
          notes: notes || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setFormSuccess(true);
        setName("");
        setPhone("");
        setEmail("");
        setNotes("");
        setTimeout(() => {
          setIsModalOpen(false);
          setFormSuccess(false);
          fetchData();
        }, 800);
      } else {
        setFormError(json.error || "Could not add customer");
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to save customer");
    } finally {
      setSubmitting(false);
    }
  };

  const openDebtModal = (c: Customer) => {
    setDebtModalCustomer(c);
    setDebtAmount(c.totalOutstandingDebt ? c.totalOutstandingDebt.toString() : "");
    setDebtPaymentMethod("CASH");
    setDebtNotes("");
    setDebtError(null);
    setDebtSuccess(false);
  };

  const handleRecordDebtPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!debtModalCustomer) return;
    setDebtError(null);
    setDebtSuccess(false);

    const amt = parseFloat(debtAmount);
    if (isNaN(amt) || amt <= 0) {
      setDebtError("Please enter a valid payment amount greater than 0.");
      return;
    }

    setDebtSubmitting(true);
    try {
      const res = await fetch("/api/debt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: debtModalCustomer.id,
          amount: amt,
          paymentMethod: debtPaymentMethod,
          notes: debtNotes || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setDebtSuccess(true);
        setTimeout(() => {
          setDebtModalCustomer(null);
          setDebtSuccess(false);
          setDebtAmount("");
          setDebtNotes("");
          fetchData();
        }, 800);
      } else {
        setDebtError(json.error || "Failed to process debt payment");
      }
    } catch (err: any) {
      setDebtError(err.message || "Network error submitting payment");
    } finally {
      setDebtSubmitting(false);
    }
  };

  // Metrics
  const totalCustomersCount = customers.length;
  const totalLifetimeSpend = customers.reduce((acc, c) => acc + c.totalSpend, 0);
  const totalProfitFromClients = customers.reduce((acc, c) => acc + c.totalProfit, 0);
  const totalOutstandingDebt = customers.reduce((acc, c) => acc + (c.totalOutstandingDebt || 0), 0);
  const debtorsCount = customers.filter((c) => (c.totalOutstandingDebt || 0) > 0).length;

  const getWhatsAppDebtReminderUrl = (c: Customer) => {
    const debt = c.totalOutstandingDebt ? c.totalOutstandingDebt : 0;
    const msg = `Hello ${c.name}! 👋\n\nThis is a gentle payment reminder from *Avencia Perfumes* regarding your account balance.\n\n📌 *Account Summary*:\n• Customer: ${c.name}\n• Total Lifetime Orders: ${c.totalOrders}\n• Outstanding Balance: GH₵ ${debt.toFixed(2)}\n\nPlease contact us or reply to this message to arrange payment or make a partial settlement. Thank you for your continued business! 🙏✨`;

    const formattedPhone = formatGhanaPhoneNumber(c.phone);
    const cleanPhone = formattedPhone ? formattedPhone.replace(/[^0-9]/g, "") : "";
    if (cleanPhone) {
      return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    }
    return `https://wa.me/?text=${encodeURIComponent(msg)}`;
  };

  const filteredCustomers = customers.filter((c) => {
    if (activeTab === "DEBTORS") return (c.totalOutstandingDebt || 0) > 0;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Customer Directory</h2>
          <p className="text-xs text-slate-500">
            Track client relationships, lifetime order spend & profit contribution metrics.
          </p>
        </div>

        <button
          onClick={() => {
            setFormError(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 transition-all touch-manipulation"
        >
          <Plus className="w-4 h-4" /> Add Customer
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-3xl border border-slate-100 shadow-xl shadow-indigo-500/5 p-5 bg-white space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Total Clients</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{totalCustomersCount}</div>
          <p className="text-[11px] text-slate-500">Registered active customers</p>
        </div>

        <div className="rounded-3xl border border-slate-100 shadow-xl shadow-indigo-500/5 p-5 bg-white space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Lifetime Spend</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{formatCurrency(totalLifetimeSpend)}</div>
          <p className="text-[11px] text-slate-500">Total customer order value</p>
        </div>

        <div className="rounded-3xl border border-slate-100 shadow-xl shadow-indigo-500/5 p-5 bg-white space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Gross Profit</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{formatCurrency(totalProfitFromClients)}</div>
          <p className="text-[11px] text-slate-500">Margin earned from client orders</p>
        </div>

        <div className="rounded-3xl border border-slate-100 shadow-xl shadow-indigo-500/5 p-5 bg-white space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Outstanding Debt</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600">{formatCurrency(totalOutstandingDebt)}</div>
          <p className="text-[11px] text-slate-500">{debtorsCount} debtor{debtorsCount !== 1 ? "s" : ""} with balance due</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="rounded-3xl border border-slate-100 shadow-xl shadow-indigo-500/5 p-4 bg-white flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search customers by name, phone, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-full w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-full text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-indigo-600 ${
              activeTab === "ALL" ? "rounded-full bg-indigo-600 text-white shadow-md shadow-indigo-500/20" : "rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Clients ({customers.length})
          </button>
          <button
            onClick={() => setActiveTab("DEBTORS")}
            className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-full text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-rose-600 ${
              activeTab === "DEBTORS" ? "rounded-full bg-rose-600 text-white shadow-md shadow-rose-500/20" : "rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Debtors ({debtorsCount})
          </button>
        </div>
      </div>

      {/* Customers List */}
      <div className="rounded-3xl border border-slate-100 shadow-xl shadow-indigo-500/5 p-6 bg-white space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            {activeTab === "DEBTORS" ? "Debtors & Outstanding Accounts" : "Client Directory"}
          </h3>
          <span className="text-xs font-bold text-slate-500">{filteredCustomers.length} Clients</span>
        </div>

        {loading ? (
          <div className="p-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-slate-400 animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Loading directory...</p>
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl text-rose-700 text-xs flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">No Customers Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {search ? "No customers match your search query." : "No customers added yet. Click 'Add Customer' to start building your client base."}
            </p>
          </div>
        ) : (
          <>
            {/* DESKTOP table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-200 pb-2">
                    <th className="font-semibold pb-2">Customer Name</th>
                    <th className="font-semibold pb-2">Phone / Email</th>
                    <th className="font-semibold pb-2">Orders</th>
                    <th className="font-semibold pb-2">Lifetime Spend</th>
                    <th className="font-semibold pb-2">Gross Profit</th>
                    <th className="font-semibold pb-2">Debt Balance</th>
                    <th className="font-semibold pb-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.map((c) => {
                    const hasDebt = (c.totalOutstandingDebt || 0) > 0;
                    return (
                      <tr key={c.id} className="text-slate-800">
                        <td className="py-3 font-bold text-slate-900">
                          {c.name}
                          {hasDebt && (
                            <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                              DEBTOR
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-slate-500">
                          <div className="space-y-0.5">
                            {c.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400" /> {c.phone}
                              </div>
                            )}
                            {c.email && (
                              <div className="flex items-center gap-1 text-[11px]">
                                <Mail className="w-3 h-3 text-slate-400" /> {c.email}
                              </div>
                            )}
                            {!c.phone && !c.email && "—"}
                          </div>
                        </td>
                        <td className="py-3 font-medium">{c.totalOrders} orders</td>
                        <td className="py-3 font-black text-slate-900">{formatCurrency(c.totalSpend)}</td>
                        <td className="py-3 font-extrabold text-emerald-600">{formatCurrency(c.totalProfit)}</td>
                        <td className="py-3 font-black">
                          {hasDebt ? (
                            <span className="text-rose-600">{formatCurrency(c.totalOutstandingDebt!)}</span>
                          ) : (
                            <span className="text-slate-400 font-normal">GH₵ 0.00</span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          {hasDebt ? (
                            <div className="flex items-center justify-end gap-2">
                              <a
                                href={getWhatsAppDebtReminderUrl(c)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-all shadow-sm inline-flex items-center gap-1.5"
                                title="Send WhatsApp Debt Reminder"
                              >
                                <Share2 className="w-3.5 h-3.5" /> Reminder
                              </a>
                              <button
                                onClick={() => openDebtModal(c)}
                                className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-all shadow-sm"
                              >
                                Settle Debt 💳
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">Clear</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE cards */}
            <div className="md:hidden space-y-4 mb-4">
              {filteredCustomers.map((c) => {
                const hasDebt = (c.totalOutstandingDebt || 0) > 0;
                return (
                  <div key={c.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-slate-900">{c.name}</p>
                          {hasDebt && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                              DEBTOR
                            </span>
                          )}
                        </div>
                        {c.phone && <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3 text-slate-400" /> {c.phone}</p>}
                        {c.email && <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Mail className="w-3 h-3 text-slate-400" /> {c.email}</p>}
                      </div>
                      <span className="text-[11px] text-slate-400 whitespace-nowrap">
                        {c.lastPurchaseDate ? new Date(c.lastPurchaseDate).toLocaleDateString() : "No orders"}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Orders</span>
                        <span className="font-bold text-slate-800">{c.totalOrders}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Spent</span>
                        <span className="font-bold text-slate-900">{formatCurrency(c.totalSpend)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Debt Balance</span>
                        <span className={`font-black ${hasDebt ? "text-rose-600" : "text-slate-400"}`}>
                          {hasDebt ? formatCurrency(c.totalOutstandingDebt!) : "GH₵ 0.00"}
                        </span>
                      </div>
                    </div>

                    {hasDebt && (
                      <div className="pt-2 border-t border-slate-200 space-y-2">
                        <a
                          href={getWhatsAppDebtReminderUrl(c)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2.5 rounded-2xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20"
                        >
                          <Share2 className="w-4 h-4" /> Send WhatsApp Debt Reminder
                        </a>
                        <button
                          onClick={() => openDebtModal(c)}
                          className="w-full py-2.5 rounded-2xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-colors"
                        >
                          Settle Debt Payment ({formatCurrency(c.totalOutstandingDebt!)})
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

      </div>

      {/* Add Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-100 max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Add New Customer</h3>
                <p className="text-xs text-slate-500">Create a client record in your directory</p>
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
                <span>Customer created successfully!</span>
              </div>
            )}

            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ama Serwaa"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. 0554663443 or +233554663443"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onBlur={(e) => {
                      if (e.target.value.trim()) {
                        setPhone(formatGhanaPhoneNumber(e.target.value));
                      }
                    }}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                  <p className="text-[10px] text-indigo-600 font-semibold mt-1">
                    Auto-formats to +233 (e.g. 0554663443 → +233554663443)
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. ama@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  placeholder="Preferred fragrances, delivery notes..."
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
                    "Save Customer"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Debt Payment Modal */}
      {debtModalCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-100 max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Settle Customer Debt</h3>
                <p className="text-xs text-slate-500">Record debt repayment for {debtModalCustomer.name}</p>
              </div>
              <button
                onClick={() => setDebtModalCustomer(null)}
                className="p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl flex items-center justify-between text-xs">
              <span className="font-bold text-rose-900">Current Outstanding Debt:</span>
              <span className="font-black text-sm text-rose-700">
                {formatCurrency(debtModalCustomer.totalOutstandingDebt || 0)}
              </span>
            </div>

            {debtError && (
              <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{debtError}</span>
              </div>
            )}

            {debtSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Payment recorded! Debt updated.</span>
              </div>
            )}

            <form onSubmit={handleRecordDebtPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Repayment Amount (GH₵) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  max={debtModalCustomer.totalOutstandingDebt || undefined}
                  placeholder="0.00"
                  value={debtAmount}
                  onChange={(e) => setDebtAmount(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={debtPaymentMethod}
                  onChange={(e) => setDebtPaymentMethod(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="CASH">Cash</option>
                  <option value="MOBILE_MONEY">Mobile Money (MoMo)</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CARD">Card Payment</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Paid via MoMo reference #12345..."
                  value={debtNotes}
                  onChange={(e) => setDebtNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDebtModalCustomer(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={debtSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {debtSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    "Record Debt Payment ✓"
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
