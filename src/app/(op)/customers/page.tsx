"use client";

import { useState, useEffect, useMemo } from "react";
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
  const [debtSubmitting, setDebtSubmitting] = useState(false);
  const [debtError, setDebtError] = useState<string | null>(null);

  // Customer Detail Sheet
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

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

  const openDebtModal = (c: Customer) => {
    setDebtCustomer(c);
    setDebtAmount(c.totalOutstandingDebt ? c.totalOutstandingDebt.toString() : "");
    setDebtPaymentMethod("CASH");
    setDebtNotes(`Debt settlement for ${c.name}`);
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
          amount: amt,
          paymentMethod: debtPaymentMethod,
          notes: debtNotes.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setDebtCustomer(null);
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
          className="gap-2 font-bold self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Customer</span>
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
          <p className="text-xs mt-1 text-muted-foreground/80">Try another search term or click "Add Customer" above</p>
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
              className="flex-1"
              onClick={() => setIsAddOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1 font-black"
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
              className="flex-1"
              onClick={() => setDebtCustomer(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1 font-black"
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

            <div className="pt-2 flex gap-3">
              {(selectedCustomer.totalOutstandingDebt || 0) > 0 && (
                <Button
                  variant="primary"
                  className="flex-1 font-black"
                  onClick={() => {
                    const c = selectedCustomer;
                    setSelectedCustomer(null);
                    openDebtModal(c);
                  }}
                >
                  <Banknote className="w-4 h-4 mr-2" />
                  Record Payment
                </Button>
              )}
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
