"use client";

import { useState, useEffect } from "react";
import { formatCurrency, formatGhanaPhoneNumber } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
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
  MessageSquare,
  CreditCard,
  UserCheck,
  Building2,
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
  const totalOutstandingDebt = customers.reduce((acc, c) => acc + (c.totalOutstandingDebt || 0), 0);
  const debtorsCount = customers.filter((c) => (c.totalOutstandingDebt || 0) > 0).length;

  const getWhatsAppDebtReminderUrl = (c: Customer) => {
    const debt = c.totalOutstandingDebt ? c.totalOutstandingDebt : 0;
    const msg = `Hello ${c.name}! 👋\n\nThis is a gentle payment reminder from *Avencia Perfumes* regarding your account balance.\n\n📌 *Account Summary*:\n• Customer: ${c.name}\n• Total Orders: ${c.totalOrders}\n• Outstanding Balance: GH₵ ${debt.toFixed(2)}\n\nPlease contact us or reply to this message to arrange payment or make a partial settlement. Thank you for your continued business! 🙏✨`;

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
      {/* Page Header */}
      <PageHeader
        title="Customer Directory"
        subtitle="Manage client accounts, lifetime analytics, and credit balances"
      />

      {/* Summary KPI Cards: Total Clients, Active Debtors, Total Debt */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5 p-5 bg-white dark:bg-slate-900 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Total Clients</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{totalCustomersCount}</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Registered client accounts</p>
        </div>

        <div className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5 p-5 bg-white dark:bg-slate-900 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Active Debtors</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{debtorsCount}</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Clients with pending credit</p>
        </div>

        <div className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5 p-5 bg-white dark:bg-slate-900 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Total Debt Balance</span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">{formatCurrency(totalOutstandingDebt)}</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Total outstanding receivables</p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5 p-4 bg-white dark:bg-slate-900 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full text-xs font-bold w-full sm:w-auto">
            <button
              onClick={() => setActiveTab("ALL")}
              className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-full transition-all ${
                activeTab === "ALL"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              All Clients ({totalCustomersCount})
            </button>
            <button
              onClick={() => setActiveTab("DEBTORS")}
              className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-full transition-all ${
                activeTab === "DEBTORS"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-extrabold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              Debtors Only ({debtorsCount})
            </button>
          </div>

          {/* Search Box & Add Customer Button */}
          <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search by name, phone (+233)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:focus:ring-indigo-500"
              />
            </div>
            <button
              onClick={() => {
                setFormError(null);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 transition-all whitespace-nowrap active:scale-95"
            >
              <Plus className="w-4 h-4" /> Add Customer
            </button>
          </div>
        </div>
      </div>

      {/* Customer Grid / Cards */}
      {loading ? (
        <div className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5 p-12 bg-white dark:bg-slate-900 flex flex-col items-center justify-center text-center space-y-3">
          <Loader2 className="w-8 h-8 text-slate-400 dark:text-slate-500 animate-spin" />
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Loading customer directory...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-4 rounded-2xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5 p-12 bg-white dark:bg-slate-900 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 mx-auto flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">No Customers Found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {activeTab === "DEBTORS"
              ? "Great news! There are currently no active debtors with outstanding balances."
              : "No customer profiles match your search criteria."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((c) => {
            const debt = c.totalOutstandingDebt || 0;
            const hasDebt = debt > 0;
            const formattedPhone = c.phone ? formatGhanaPhoneNumber(c.phone) : null;

            return (
              <div
                key={c.id}
                className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5 p-5 bg-white dark:bg-slate-900 flex flex-col justify-between space-y-4 hover:border-indigo-100 dark:hover:border-indigo-900 transition-all"
              >
                {/* Top Row: Name & Badges */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 font-black text-sm flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900">
                        {c.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{c.name}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium truncate">
                          <Phone className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                          {formattedPhone || "No phone linked"}
                        </p>
                      </div>
                    </div>

                    {hasDebt && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 shrink-0">
                        Debtor
                      </span>
                    )}
                  </div>

                  {c.email && (
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5 pl-1 truncate">
                      <Mail className="w-3 h-3" /> {c.email}
                    </p>
                  )}
                </div>

                {/* Middle Grid: Key Metrics */}
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50/80 dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase block">Lifetime Spend</span>
                    <span className="font-black text-slate-900 dark:text-slate-100">{formatCurrency(c.totalSpend)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase block">Debt Balance</span>
                    <span className={`font-black ${hasDebt ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                      {formatCurrency(debt)}
                    </span>
                  </div>
                </div>

                {/* Bottom Actions Row */}
                <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                  {hasDebt ? (
                    <>
                      <a
                        href={getWhatsAppDebtReminderUrl(c)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all touch-manipulation"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>WhatsApp Reminder</span>
                      </a>
                      <button
                        onClick={() => openDebtModal(c)}
                        className="py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition-all touch-manipulation"
                        title="Record Payment"
                      >
                        Pay Debt
                      </button>
                    </>
                  ) : (
                    <a
                      href={getWhatsAppDebtReminderUrl(c)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>WhatsApp Message</span>
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Add New Customer</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Create client profile for quick checkout & debt tracking</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
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
                <span>Customer added successfully!</span>
              </div>
            )}

            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Abena Serwaa"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Phone Number (+233)</label>
                <input
                  type="text"
                  placeholder="024XXXXXXX or +233..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="client@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Notes</label>
                <textarea
                  rows={2}
                  placeholder="Optional customer preferences or address details..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
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
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Record Debt Settlement</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Client: <span className="font-bold text-slate-900 dark:text-slate-100">{debtModalCustomer.name}</span>
                </p>
              </div>
              <button
                onClick={() => setDebtModalCustomer(null)}
                className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-3 rounded-xl text-xs space-y-1">
              <span className="text-[10px] font-bold text-rose-500 dark:text-rose-400 uppercase block">Current Outstanding Debt</span>
              <span className="font-black text-rose-700 dark:text-rose-300 text-base">
                {formatCurrency(debtModalCustomer.totalOutstandingDebt || 0)}
              </span>
            </div>

            {debtError && (
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-3 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{debtError}</span>
              </div>
            )}

            {debtSuccess && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Debt payment recorded successfully!</span>
              </div>
            )}

            <form onSubmit={handleRecordDebtPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Amount Paid (GH₵) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={debtAmount}
                  onChange={(e) => setDebtAmount(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Payment Method *</label>
                <select
                  value={debtPaymentMethod}
                  onChange={(e) => setDebtPaymentMethod(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:focus:ring-indigo-500"
                >
                  <option value="CASH">Cash</option>
                  <option value="MOBILE_MONEY">Mobile Money (MoMo)</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CARD">Card</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Payment Notes</label>
                <textarea
                  rows={2}
                  placeholder="Optional reference or transaction note..."
                  value={debtNotes}
                  onChange={(e) => setDebtNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setDebtModalCustomer(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={debtSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {debtSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Recording...
                    </>
                  ) : (
                    "Record Payment"
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
