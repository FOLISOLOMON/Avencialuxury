"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { formatCurrency, formatGhanaPhoneNumber } from "@/lib/utils";
import {
  Button,
  IconButton,
  Input,
  Select,
  Textarea,
  SearchField,
  Sheet,
  Card,
  Badge,
  Money,
  FilterChips,
} from "@/components/ui";
import {
  Users,
  Plus,
  Phone,
  Mail,
  DollarSign,
  TrendingUp,
  ShoppingBag,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  MessageSquare,
  CreditCard,
  Banknote,
  Search,
  ExternalLink,
  Clock,
  Send,
} from "lucide-react";

interface CustomerSale {
  id: string;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  grossProfit: number;
  paymentStatus: string;
  paymentMethod: string;
  saleDate: string;
  dueDate?: string | null;
  notes?: string | null;
  saleItems?: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    product: { name: string };
  }>;
}

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
  sales?: CustomerSale[];
}

function CustomersContent() {
  const searchParams = useSearchParams();
  const urlCustomerId = searchParams.get("id");
  const urlSaleId = searchParams.get("saleId");

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "DEBTORS">(urlCustomerId ? "DEBTORS" : "ALL");
  const [highlightSaleId, setHighlightSaleId] = useState<string | null>(urlSaleId);

  // Add Customer Sheet
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  // Record Debt Payment Sheet
  const [debtCustomer, setDebtCustomer] = useState<Customer | null>(null);
  const [debtAmount, setDebtAmount] = useState("");
  const [debtPaymentMethod, setDebtPaymentMethod] = useState("CASH");
  const [debtNotes, setDebtNotes] = useState("");
  const [targetSaleId, setTargetSaleId] = useState<string | null>(null);
  const [debtSubmitting, setDebtSubmitting] = useState(false);
  const [debtError, setDebtError] = useState<string | null>(null);

  // Edit Due Date Modal State
  const [editDueDateSale, setEditDueDateSale] = useState<{
    id: string;
    customerName: string;
    totalAmount: number;
    amountPaid: number;
    balanceDue: number;
    dueDate?: string | null;
  } | null>(null);
  const [newDueDate, setNewDueDate] = useState("");
  const [editDueDateSubmitting, setEditDueDateSubmitting] = useState(false);
  const [editDueDateError, setEditDueDateError] = useState<string | null>(null);

  // Customer Detail Sheet
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const getQuickDueDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  };

  const getDueDateStatus = (dueDateStr?: string | null) => {
    if (!dueDateStr) return { label: "No Due Date", status: "none", color: "text-muted-foreground bg-muted border-border" };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDateStr);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        label: `Overdue by ${Math.abs(diffDays)}d`,
        status: "overdue",
        color: "text-red-500 bg-red-500/10 border-red-500/30",
      };
    }
    if (diffDays === 0) {
      return {
        label: "Due Today",
        status: "today",
        color: "text-amber-500 bg-amber-500/10 border-amber-500/30",
      };
    }
    return {
      label: `Due in ${diffDays}d`,
      status: "upcoming",
      color: "text-sky-500 bg-sky-500/10 border-sky-500/30",
    };
  };

  const fetchCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers?search=${encodeURIComponent(search)}`);
      const json = await res.json();
      if (json.success) {
        setCustomers(json.data || []);
      } else {
        setError(json.error || "Failed to load customers");
      }
    } catch (err: any) {
      setError(err.message || "Network error fetching customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  // Handle URL deep-link from notification clicks (?id=...&saleId=...)
  useEffect(() => {
    if (urlCustomerId && customers.length > 0) {
      const match = customers.find((c) => c.id === urlCustomerId);
      if (match) {
        setSelectedCustomer(match);
        if ((match.totalOutstandingDebt || 0) > 0) {
          setActiveTab("DEBTORS");
        }
      }
    }
  }, [urlCustomerId, customers]);

  // Global Add Customer Header Trigger
  useEffect(() => {
    const handler = () => openAddModal();
    window.addEventListener("avencia:open-add-customer", handler);
    return () => window.removeEventListener("avencia:open-add-customer", handler);
  }, []);

  const openAddModal = () => {
    setName("");
    setPhone("");
    setEmail("");
    setNotes("");
    setAddError(null);
    setIsAddOpen(true);
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    if (!name.trim()) {
      setAddError("Customer name is required.");
      return;
    }

    setAddSubmitting(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone ? formatGhanaPhoneNumber(phone) : undefined,
          email: email.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setIsAddOpen(false);
        fetchCustomers();
      } else {
        setAddError(json.error || "Could not add customer");
      }
    } catch (err: any) {
      setAddError(err.message || "Failed to save customer");
    } finally {
      setAddSubmitting(false);
    }
  };

  const openDebtModal = (c: Customer, saleId?: string, initialAmount?: number) => {
    setDebtCustomer(c);
    setTargetSaleId(saleId || null);
    setDebtAmount(initialAmount ? initialAmount.toString() : (c.totalOutstandingDebt ? c.totalOutstandingDebt.toString() : ""));
    setDebtPaymentMethod("CASH");
    setDebtNotes(saleId ? `Payment for order #${saleId.slice(0, 8).toUpperCase()}` : `Debt settlement for ${c.name}`);
    setDebtError(null);
  };

  const handleRecordDebtPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!debtCustomer) return;
    setDebtError(null);

    const amt = parseFloat(debtAmount);
    if (isNaN(amt) || amt <= 0) {
      setDebtError("Payment amount must be greater than GH₵0.");
      return;
    }

    setDebtSubmitting(true);
    try {
      const res = await fetch("/api/debt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: debtCustomer.id,
          saleId: targetSaleId || undefined,
          amount: amt,
          paymentMethod: debtPaymentMethod,
          notes: debtNotes.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setDebtCustomer(null);
        setTargetSaleId(null);
        fetchCustomers();
      } else {
        setDebtError(json.error || "Failed to record payment");
      }
    } catch (err: any) {
      setDebtError(err.message || "Error submitting payment");
    } finally {
      setDebtSubmitting(false);
    }
  };

  const handleUpdateDueDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDueDateSale) return;
    setEditDueDateSubmitting(true);
    setEditDueDateError(null);
    try {
      const res = await fetch("/api/debt", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saleId: editDueDateSale.id,
          dueDate: newDueDate || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update due date");
      }
      setEditDueDateSale(null);
      await fetchCustomers();
    } catch (err: any) {
      setEditDueDateError(err.message || "Failed to update due date");
    } finally {
      setEditDueDateSubmitting(false);
    }
  };

  const getWhatsAppDebtReminderUrl = (c: Customer) => {
    const debt = c.totalOutstandingDebt || 0;
    if (debt <= 0) return null;

    const msg = `Hello ${c.name}! 👋\n\nThis is a gentle payment reminder from *Avencia Perfumes* regarding your account balance.\n\n📌 *Account Summary*:\n• Customer: ${c.name}\n• Total Orders: ${c.totalOrders}\n• Outstanding Balance: GH₵ ${debt.toFixed(2)}\n\nPlease reply to this message or contact us to arrange payment or make a partial settlement. Thank you for your continued business! 🙏✨`;

    const formattedPhone = formatGhanaPhoneNumber(c.phone);
    const cleanPhone = formattedPhone ? formattedPhone.replace(/[^0-9]/g, "") : "";
    if (cleanPhone) {
      return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    }
    return `https://wa.me/?text=${encodeURIComponent(msg)}`;
  };

  const getWhatsAppSingleSaleReminderUrl = (c: Customer, s: CustomerSale) => {
    const itemsStr = (s.saleItems || []).map(i => `${i.product.name} (x${i.quantity})`).join(", ") || "perfume order";
    const dueStr = s.dueDate ? new Date(s.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "as soon as possible";
    const msg = `Hello ${c.name}! 👋\n\nThis is a gentle payment reminder from *Avencia Perfumes* regarding your purchase on ${new Date(s.saleDate).toLocaleDateString()}.\n\n📌 *Order Details*:\n• Order Ref: #${s.id.slice(0, 8).toUpperCase()}\n• Items: ${itemsStr}\n• Total Amount: GH₵ ${s.totalAmount.toFixed(2)}\n• Amount Paid: GH₵ ${s.amountPaid.toFixed(2)}\n• *Remaining Balance*: *GH₵ ${s.balanceDue.toFixed(2)}*\n• *Payment Due Date*: *${dueStr}*\n\nPlease let us know if you need our MoMo or bank details to complete payment. Thank you for choosing Avencia! 🙏✨`;

    const formattedPhone = formatGhanaPhoneNumber(c.phone);
    const cleanPhone = formattedPhone ? formattedPhone.replace(/[^0-9]/g, "") : "";
    if (cleanPhone) {
      return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    }
    return `https://wa.me/?text=${encodeURIComponent(msg)}`;
  };

  // Metrics
  const totalClientsCount = customers.length;
  const debtorsCount = useMemo(
    () => customers.filter((c) => (c.totalOutstandingDebt || 0) > 0).length,
    [customers]
  );
  const totalDebt = useMemo(
    () => customers.reduce((sum, c) => sum + (c.totalOutstandingDebt || 0), 0),
    [customers]
  );
  const totalSpendLifetime = useMemo(
    () => customers.reduce((sum, c) => sum + (c.totalSpend || 0), 0),
    [customers]
  );

  const filteredCustomers = useMemo(() => {
    if (activeTab === "DEBTORS") {
      return customers.filter((c) => (c.totalOutstandingDebt || 0) > 0);
    }
    return customers;
  }, [customers, activeTab]);

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      {/* Page Title & Add Customer Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            Customer Directory & Credit
          </h1>
          <p className="text-sm text-muted-foreground">
            Client profiles, lifetime order history & accounts receivable ledger
          </p>
        </div>

        <Button
          onClick={openAddModal}
          size="md"
          variant="primary"
        >
          Add Customer
        </Button>
      </div>

      {/* KPI Cards */}
      {/* KPI Metrics Bar */}
      <div className="rounded-lg border border-border bg-card grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border">
        <div className="p-4">
          <div className="text-xs font-medium text-muted-foreground mb-1">Total Clients</div>
          <div className="text-2xl font-bold text-foreground tabular-nums">{totalClientsCount}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Registered accounts</div>
        </div>

        <div className="p-4">
          <div className="text-xs font-medium text-muted-foreground mb-1">Active Debtors</div>
          <div className="text-2xl font-bold text-warning tabular-nums">{debtorsCount}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Clients with credit due</div>
        </div>

        <div className="p-4">
          <div className="text-xs font-medium text-muted-foreground mb-1">Total Receivables</div>
          <div className="text-2xl font-bold text-warning tabular-nums">
            <Money amount={totalDebt} />
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Outstanding credit balance</div>
        </div>

        <div className="p-4">
          <div className="text-xs font-medium text-muted-foreground mb-1">Lifetime Revenue</div>
          <div className="text-2xl font-bold text-foreground tabular-nums">
            <Money amount={totalSpendLifetime} />
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Cumulative client spend</div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="rounded-lg border border-border bg-card p-3.5 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder="Search customers by name, phone or email..."
            />
          </div>

          <div className="inline-flex p-0.5 bg-secondary rounded-md border border-border self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab("ALL")}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                activeTab === "ALL"
                  ? "bg-card text-foreground font-semibold shadow-subtle"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Clients ({customers.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("DEBTORS")}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                activeTab === "DEBTORS"
                  ? "bg-card text-warning font-semibold shadow-subtle"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Debtors ({debtorsCount})
            </button>
          </div>
        </div>
      </div>

      {/* Customer Directory Table */}
      {filteredCustomers.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground">
          <p className="text-sm font-medium">No customer records found</p>
          <p className="text-xs mt-1 text-muted-foreground/80">Try another search term or click &quot;Add Customer&quot; above</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/60 text-muted-foreground border-b border-border select-none">
                <tr>
                  <th className="py-3 px-4 font-medium">Client Name</th>
                  <th className="py-3 px-4 font-medium">Contact</th>
                  <th className="py-3 px-4 font-medium text-right">Orders</th>
                  <th className="py-3 px-4 font-medium text-right">Lifetime Spend</th>
                  <th className="py-3 px-4 font-medium">Outstanding Balance</th>
                  <th className="py-3 px-4 font-medium">Last Purchase</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCustomers.map((c) => {
                  const debt = c.totalOutstandingDebt || 0;
                  const hasDebt = debt > 0;
                  const whatsappUrl = getWhatsAppDebtReminderUrl(c);

                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-secondary/40 transition-colors ${
                        hasDebt ? "bg-warning/[0.02]" : ""
                      }`}
                    >
                      <td className="py-3 px-4">
                        <span className="font-semibold text-foreground block">{c.name}</span>
                        {c.email && (
                          <span className="text-[11px] text-muted-foreground block">{c.email}</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-muted-foreground">
                        {c.phone ? (
                          <span className="tabular-nums">{c.phone}</span>
                        ) : (
                          <span className="italic text-muted-foreground/60">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right tabular-nums text-foreground font-medium">
                        {c.totalOrders}
                      </td>

                      <td className="py-3 px-4 text-right tabular-nums font-semibold text-foreground">
                        <Money amount={c.totalSpend} />
                      </td>

                      <td className="py-3 px-4">
                        {hasDebt ? (
                          <span className="text-warning font-semibold tabular-nums text-xs">
                            {formatCurrency(debt)} due
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">Settled</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-muted-foreground">
                        {c.lastPurchaseDate ? (
                          <span>
                            {new Date(c.lastPurchaseDate).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        ) : (
                          <span className="italic text-muted-foreground/60">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {hasDebt && (
                            <>
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => openDebtModal(c)}
                              >
                                Settle Debt
                              </Button>
                              {whatsappUrl && (
                                <a
                                  href={whatsappUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-center h-8 px-2.5 rounded-md border border-border text-xs text-foreground hover:bg-secondary transition-colors"
                                  title="Send WhatsApp payment reminder"
                                >
                                  WhatsApp
                                </a>
                              )}
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedCustomer(c)}
                          >
                            Details
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Customer Ledger Rows */}
          <div className="md:hidden divide-y divide-border">
            {filteredCustomers.map((c) => {
              const debt = c.totalOutstandingDebt || 0;
              const hasDebt = debt > 0;
              const whatsappUrl = getWhatsAppDebtReminderUrl(c);

              return (
                <div
                  key={c.id}
                  className={`p-3.5 space-y-2.5 ${
                    hasDebt ? "bg-warning/[0.02]" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-foreground text-xs">{c.name}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {c.phone || "No phone"} • {c.totalOrders} {c.totalOrders === 1 ? "order" : "orders"}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-semibold text-foreground text-xs tabular-nums">
                        <Money amount={c.totalSpend} />
                      </div>
                      {hasDebt && (
                        <div className="text-[11px] text-warning font-semibold tabular-nums mt-0.5">
                          {formatCurrency(debt)} due
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-border/60 text-xs">
                    <span className="text-[11px] text-muted-foreground">
                      {c.lastPurchaseDate ? (
                        new Date(c.lastPurchaseDate).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })
                      ) : (
                        "No purchases yet"
                      )}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {hasDebt && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => openDebtModal(c)}
                        >
                          Settle Debt
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedCustomer(c)}
                      >
                        Details
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* ADD CUSTOMER SHEET */}
      <Sheet
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add New Customer"
        description="Register a client for orders, invoicing & credit management"
      >
        <form onSubmit={handleAddCustomer} className="space-y-4 pt-2">
          {addError && (
            <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{addError}</span>
            </div>
          )}

          <Input
            label="Customer Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Kwame Mensah"
            required
          />

          <Input
            label="Phone Number (Ghana format)"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 0244123456"
          />

          <Input
            label="Email Address (Optional)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. kwame@example.com"
          />

          <Textarea
            label="Notes / Delivery Address"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Preferred scents, office address in East Legon..."
          />

          <div className="pt-2 flex gap-3">
            <Button
              type="button"
              variant="outline"
              size="md"
              className="flex-1"
              onClick={() => setIsAddOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="flex-1"
              isLoading={addSubmitting}
            >
              Save Customer
            </Button>
          </div>
        </form>
      </Sheet>

      {/* RECORD DEBT PAYMENT SHEET */}
      <Sheet
        isOpen={!!debtCustomer}
        onClose={() => setDebtCustomer(null)}
        title="Record Debt Settlement"
        description={debtCustomer ? `Client: ${debtCustomer.name}` : ""}
      >
        <form onSubmit={handleRecordDebtPayment} className="space-y-4 pt-2">
          {debtError && (
            <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{debtError}</span>
            </div>
          )}

          <div className="p-3 rounded-2xl bg-muted/40 border border-border text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Client Name:</span>
              <span className="font-bold">{debtCustomer?.name}</span>
            </div>
            <div className="flex justify-between text-sm font-black pt-1 border-t border-border">
              <span>Total Outstanding Debt:</span>
              <span className="text-warning">
                {debtCustomer && formatCurrency(debtCustomer.totalOutstandingDebt || 0)}
              </span>
            </div>
          </div>

          <Input
            label="Settlement Amount (GH₵)"
            type="number"
            step="any"
            min="0.01"
            value={debtAmount}
            onChange={(e) => setDebtAmount(e.target.value)}
            required
          />

          <Select
            label="Payment Method"
            value={debtPaymentMethod}
            onChange={(e) => setDebtPaymentMethod(e.target.value)}
            options={[
              { value: "CASH", label: "Cash" },
              { value: "BANK_TRANSFER", label: "Bank Transfer" },
              { value: "MOMO", label: "Mobile Money (MoMo)" },
              { value: "CARD", label: "POS Card Payment" },
            ]}
          />

          <Input
            label="Settlement Notes / Transaction ID"
            value={debtNotes}
            onChange={(e) => setDebtNotes(e.target.value)}
            placeholder="e.g. MTN MoMo Ref #..."
          />

          <div className="pt-2 flex gap-3">
            <Button
              type="button"
              variant="outline"
              size="md"
              className="flex-1"
              onClick={() => setDebtCustomer(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="flex-1"
              isLoading={debtSubmitting}
            >
              Apply Payment
            </Button>
          </div>
        </form>
      </Sheet>

      {/* CUSTOMER DETAIL SHEET */}
      <Sheet
        isOpen={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        title={selectedCustomer?.name || "Customer Details"}
        description={selectedCustomer?.phone || "No phone registered"}
      >
        {selectedCustomer && (
          <div className="space-y-4 pt-2 text-xs">
            <div className="p-3 rounded-md bg-muted/40 border border-border space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Outstanding Debt</span>
                <span className="font-bold text-warning">
                  {formatCurrency(selectedCustomer.totalOutstandingDebt || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Lifetime Orders</span>
                <span className="font-semibold text-foreground">{selectedCustomer.totalOrders}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Lifetime Spend</span>
                <span className="font-semibold text-foreground">
                  {formatCurrency(selectedCustomer.totalSpend)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Average Order Value</span>
                <span className="font-semibold text-foreground">
                  {formatCurrency(selectedCustomer.avgOrderValue)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Gross Profit Generated</span>
                <span className="font-semibold text-success">
                  {formatCurrency(selectedCustomer.totalProfit)}
                </span>
              </div>
            </div>

            {selectedCustomer.email && (
              <div className="p-2.5 rounded-md bg-card border border-border flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                <span className="text-foreground">{selectedCustomer.email}</span>
              </div>
            )}

            {selectedCustomer.notes && (
              <div className="p-3 rounded-md bg-card border border-border">
                <div className="font-semibold text-foreground mb-1">Notes:</div>
                <p className="text-muted-foreground">{selectedCustomer.notes}</p>
              </div>
            )}

            {/* Individual Outstanding Sales Breakdown */}
            {selectedCustomer.sales && selectedCustomer.sales.some((s) => s.balanceDue > 0) && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-border pb-1.5">
                  <h3 className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-warning" />
                    <span>Outstanding Invoices ({selectedCustomer.sales.filter((s) => s.balanceDue > 0).length})</span>
                  </h3>
                  <span className="text-[11px] font-semibold text-warning">
                    Total: {formatCurrency(selectedCustomer.totalOutstandingDebt || 0)}
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {selectedCustomer.sales
                    .filter((s) => s.balanceDue > 0)
                    .map((s) => {
                      const statusInfo = getDueDateStatus(s.dueDate);
                      const isHighlighted = highlightSaleId === s.id;
                      const itemsText =
                        (s.saleItems || []).map((i) => `${i.product.name} (x${i.quantity})`).join(", ") || "Perfume order";
                      const singleWhatsAppUrl = getWhatsAppSingleSaleReminderUrl(selectedCustomer, s);

                      return (
                        <div
                          key={s.id}
                          className={`p-3 rounded-lg border text-xs space-y-2 transition-all ${
                            isHighlighted
                              ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/30"
                              : "border-border bg-card/60 hover:bg-card"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-bold text-foreground flex items-center gap-1.5">
                                <span>#{s.id.slice(0, 8).toUpperCase()}</span>
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${statusInfo.color}`}>
                                  {statusInfo.label}
                                </span>
                              </div>
                              <div className="text-[11px] text-muted-foreground mt-0.5">
                                {new Date(s.saleDate).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })} • {itemsText}
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="font-bold text-warning tabular-nums">
                                {formatCurrency(s.balanceDue)} due
                              </div>
                              <div className="text-[10px] text-muted-foreground tabular-nums">
                                of {formatCurrency(s.totalAmount)}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50 text-[11px]">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Calendar className="w-3 h-3 text-muted-foreground" />
                              <span>Due: </span>
                              <span className="font-medium text-foreground">
                                {s.dueDate
                                  ? new Date(s.dueDate).toLocaleDateString(undefined, {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })
                                  : "No agreed date"}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setEditDueDateSale({
                                    id: s.id,
                                    customerName: selectedCustomer.name,
                                    totalAmount: s.totalAmount,
                                    amountPaid: s.amountPaid,
                                    balanceDue: s.balanceDue,
                                    dueDate: s.dueDate,
                                  });
                                  setNewDueDate(s.dueDate ? s.dueDate.split("T")[0] : "");
                                  setEditDueDateError(null);
                                }}
                              >
                                Edit Date
                              </Button>

                              <Button
                                type="button"
                                size="sm"
                                variant="primary"
                                onClick={() => {
                                  const c = selectedCustomer;
                                  setSelectedCustomer(null);
                                  openDebtModal(c, s.id, s.balanceDue);
                                }}
                              >
                                Pay
                              </Button>

                              {singleWhatsAppUrl && (
                                <a
                                  href={singleWhatsAppUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-1 rounded bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold border border-emerald-600/20 transition-colors flex items-center gap-1"
                                  title="Send invoice reminder via WhatsApp"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                  WhatsApp
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              {(selectedCustomer.totalOutstandingDebt || 0) > 0 ? (
                <>
                  <Button
                    variant="primary"
                    size="md"
                    className="flex-1"
                    onClick={() => {
                      const c = selectedCustomer;
                      setSelectedCustomer(null);
                      openDebtModal(c);
                    }}
                  >
                    Settle Total Debt
                  </Button>

                  {selectedCustomer.phone && (
                    <a
                      href={getWhatsAppDebtReminderUrl(selectedCustomer) || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Remind on WhatsApp
                    </a>
                  )}
                </>
              ) : (
                <div className="w-full p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center gap-1.5 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Account in good standing — no outstanding debt</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Sheet>

      {/* EDIT DUE DATE SHEET */}
      <Sheet
        isOpen={!!editDueDateSale}
        onClose={() => setEditDueDateSale(null)}
        title="Update Payment Due Date"
        description={
          editDueDateSale
            ? `Order #${editDueDateSale.id.slice(0, 8).toUpperCase()} • ${editDueDateSale.customerName}`
            : ""
        }
      >
        <form onSubmit={handleUpdateDueDate} className="space-y-4 pt-2">
          {editDueDateError && (
            <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{editDueDateError}</span>
            </div>
          )}

          <div className="p-3 rounded-lg bg-secondary/50 border border-border text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Order Ref:</span>
              <span className="font-mono font-bold text-foreground">
                #{editDueDateSale?.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Sale:</span>
              <span className="font-medium text-foreground">
                {editDueDateSale && formatCurrency(editDueDateSale.totalAmount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount Paid:</span>
              <span className="font-medium text-foreground">
                {editDueDateSale && formatCurrency(editDueDateSale.amountPaid)}
              </span>
            </div>
            <div className="flex justify-between border-t border-border/60 pt-1 text-sm font-bold">
              <span>Balance Due:</span>
              <span className="text-warning">
                {editDueDateSale && formatCurrency(editDueDateSale.balanceDue)}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground block">
              Payment Due Date
            </label>
            <p className="text-[11px] text-muted-foreground">
              When is the customer expected to pay the remaining balance?
            </p>

            {/* Quick preset buttons */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                { label: "In 3 days", days: 3 },
                { label: "In 7 days", days: 7 },
                { label: "In 14 days", days: 14 },
                { label: "In 30 days", days: 30 },
              ].map((preset) => (
                <Button
                  key={preset.days}
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setNewDueDate(getQuickDueDate(preset.days))}
                >
                  {preset.label}
                </Button>
              ))}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setNewDueDate("")}
              >
                Clear Date
              </Button>
            </div>

            <Input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="mt-2"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <Button
              type="button"
              variant="outline"
              size="md"
              className="flex-1"
              onClick={() => setEditDueDateSale(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="flex-1"
              isLoading={editDueDateSubmitting}
            >
              Save Due Date
            </Button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}

export default function CustomersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading customers...</div>}>
      <CustomersContent />
    </Suspense>
  );
}
