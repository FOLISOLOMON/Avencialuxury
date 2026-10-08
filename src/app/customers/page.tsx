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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase">Total Clients</span>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground">{totalClientsCount}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Registered accounts</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase">Active Debtors</span>
            <AlertTriangle className="w-4 h-4 text-warning" />
          </div>
          <div className="text-2xl font-black text-warning">{debtorsCount}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Clients with credit due</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase">Total Debt Due</span>
            <DollarSign className="w-4 h-4 text-warning" />
          </div>
          <div className="text-2xl font-black text-warning">
            <Money amount={totalDebt} />
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Accounts receivable</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase">Lifetime Revenue</span>
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground">
            <Money amount={totalSpendLifetime} />
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">From client base</div>
        </Card>
      </div>

      {/* Search & Filter Toolbar */}
      <Card className="p-3.5 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder="Search customers by name, phone or email..."
            />
          </div>

          <div className="inline-flex p-1 bg-muted rounded-xl border border-border self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "ALL"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Clients ({customers.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("DEBTORS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "DEBTORS"
                  ? "bg-card text-warning shadow-sm font-black"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Debtors ({debtorsCount})
            </button>
          </div>
        </div>
      </Card>

      {/* Customer Directory List */}
      {filteredCustomers.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-semibold">No customer records found</p>
          <p className="text-xs mt-1">Try another search term or create a new client record</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredCustomers.map((c) => {
            const debt = c.totalOutstandingDebt || 0;
            const hasDebt = debt > 0;
            const whatsappUrl = getWhatsAppDebtReminderUrl(c);

            return (
              <Card
                key={c.id}
                className={`p-4 flex flex-col justify-between hover:border-primary/40 transition-all ${
                  hasDebt ? "border-warning/40 bg-warning/[0.02]" : ""
                }`}
              >
                <div>
                  {/* Top Header: Avatar + Name + Debt Badge */}
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary font-black text-sm flex items-center justify-center shrink-0">
                        {c.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground leading-snug line-clamp-1">
                          {c.name}
                        </h3>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                          {c.phone ? (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {c.phone}
                            </span>
                          ) : (
                            <span className="italic">No phone</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {hasDebt ? (
                      <Badge variant="warning" className="shrink-0 font-black">
                        Due: {formatCurrency(debt)}
                      </Badge>
                    ) : (
                      <Badge variant="success" className="shrink-0">
                        Paid in Full
                      </Badge>
                    )}
                  </div>

                  {/* Analytics Stats */}
                  <div className="grid grid-cols-3 gap-2 py-2.5 px-3 rounded-xl bg-muted/40 border border-border/60 text-center my-2">
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-semibold">Orders</div>
                      <div className="text-xs font-black text-foreground mt-0.5">{c.totalOrders}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-semibold">Total Spend</div>
                      <div className="text-xs font-black text-foreground mt-0.5">
                        <Money amount={c.totalSpend} />
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-semibold">Profit</div>
                      <div className="text-xs font-black text-success mt-0.5">
                        <Money amount={c.totalProfit} />
                      </div>
                    </div>
                  </div>

                  {c.notes && (
                    <p className="text-[11px] text-muted-foreground line-clamp-1 italic px-1">
                      "{c.notes}"
                    </p>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="pt-3 mt-2 border-t border-border/60 flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedCustomer(c)}
                    className="text-xs"
                  >
                    View Details
                  </Button>

                  <div className="flex items-center gap-1.5">
                    {hasDebt && whatsappUrl && (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-success/15 hover:bg-success/25 text-success font-bold text-xs transition-colors"
                        title="Send WhatsApp payment reminder"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </a>
                    )}

                    {hasDebt && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => openDebtModal(c)}
                        className="text-xs gap-1"
                      >
                        <Banknote className="w-3.5 h-3.5" />
                        <span>Pay Debt</span>
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
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
            <div className="p-3 rounded-2xl bg-muted/40 border border-border space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Outstanding Debt</span>
                <span className="font-black text-warning">
                  {formatCurrency(selectedCustomer.totalOutstandingDebt || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Lifetime Orders</span>
                <span className="font-bold text-foreground">{selectedCustomer.totalOrders}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Lifetime Spend</span>
                <span className="font-bold text-foreground">
                  {formatCurrency(selectedCustomer.totalSpend)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Average Order Value</span>
                <span className="font-bold text-foreground">
                  {formatCurrency(selectedCustomer.avgOrderValue)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Gross Profit Generated</span>
                <span className="font-bold text-success">
                  {formatCurrency(selectedCustomer.totalProfit)}
                </span>
              </div>
            </div>

            {selectedCustomer.email && (
              <div className="p-2.5 rounded-xl bg-card border border-border flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                <span className="text-foreground">{selectedCustomer.email}</span>
              </div>
            )}

            {selectedCustomer.notes && (
              <div className="p-3 rounded-xl bg-card border border-border">
                <div className="font-bold text-foreground mb-1">Notes:</div>
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
