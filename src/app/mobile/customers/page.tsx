"use client";

import React, { useState, useMemo } from "react";
import { Search, X, UserPlus, Phone, MessageCircle, AlertCircle, Users, CheckCircle2, DollarSign, Calendar, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { useMobileCustomers } from "@/lib/mobile/hooks";
import { InlineCustomerModal } from "@/components/mobile/InlineCustomerModal";
import { RecordPaymentModal } from "@/components/mobile/RecordPaymentModal";
import {
  getDebtReminderWhatsAppUrl,
  getCustomerGreetingWhatsAppUrl,
  getInvoiceDebtReminderWhatsAppUrl,
} from "@/lib/mobile/whatsapp";
import { useSearchParams } from "next/navigation";
import { MobileCustomer } from "@/lib/mobile/types";

function getQuickDueDate(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function getDueDateStatus(dueDateStr?: string | null) {
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
}

function MobileCustomersContent() {
  const searchParams = useSearchParams();
  const initialDebtOnly = searchParams.get("filter") === "debt" || searchParams.get("tab") === "debt";

  const { customers, loading, refetch } = useMobileCustomers();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPaymentCustomer, setSelectedPaymentCustomer] = useState<MobileCustomer | null>(null);
  const [filterDebtOnly, setFilterDebtOnly] = useState(initialDebtOnly);
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);

  // Edit Due Date Modal
  const [editDueDateSale, setEditDueDateSale] = useState<{
    id: string;
    customerName: string;
    totalAmount: number;
    amountPaid: number;
    balanceDue: number;
    dueDate?: string | null;
  } | null>(null);
  const [newDueDate, setNewDueDate] = useState("");
  const [dueSubmitting, setDueSubmitting] = useState(false);
  const [dueError, setDueError] = useState<string | null>(null);

  const urlCustomerId = searchParams.get("id");

  React.useEffect(() => {
    const isDebt = searchParams.get("filter") === "debt" || searchParams.get("tab") === "debt" || Boolean(urlCustomerId);
    setFilterDebtOnly(isDebt);
  }, [searchParams, urlCustomerId]);

  React.useEffect(() => {
    if (urlCustomerId && customers.length > 0) {
      const match = customers.find((c) => c.id === urlCustomerId);
      if (match) {
        setSearch(match.name);
      }
    }
  }, [urlCustomerId, customers]);


  const filteredCustomers = useMemo(() => {
    let result = customers;

    if (filterDebtOnly) {
      result = result.filter((c) => (c.totalDebt || 0) > 0);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.phone && c.phone.includes(q))
      );
    }

    return result;
  }, [customers, search, filterDebtOnly]);

  const totalDebtSum = useMemo(() => {
    return customers.reduce((sum, c) => sum + (c.totalDebt || 0), 0);
  }, [customers]);

  const debtCustomersCount = customers.filter((c) => (c.totalDebt || 0) > 0).length;

  const handleUpdateDueDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDueDateSale) return;
    setDueSubmitting(true);
    setDueError(null);
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
      refetch();
    } catch (err: any) {
      setDueError(err.message || "Failed to update due date");
    } finally {
      setDueSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Header & Add Action */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground tracking-tight">Customers</h1>
          <p className="text-xs text-muted-foreground">{customers.length} registered clients</p>
        </div>

        <Button
          size="sm"
          variant="primary"
          onClick={() => setModalOpen(true)}
        >
          Add Customer
        </Button>
      </div>

      {/* 2. Outstanding Balance Metric Banner */}
      {debtCustomersCount > 0 && (
        <button
          type="button"
          onClick={() => setFilterDebtOnly(!filterDebtOnly)}
          className={`w-full p-3.5 rounded-2xl border text-left transition-all active:scale-[0.99] flex items-center justify-between ${
            filterDebtOnly
              ? "bg-destructive/15 border-destructive text-destructive-foreground shadow-sm"
              : "bg-destructive/10 border-destructive/20 text-destructive"
          }`}
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider">
              {filterDebtOnly ? "Showing Debtors Only" : "Total Customer Debt"}
            </p>
            <p className="text-xl font-black">GH₵{totalDebtSum.toFixed(2)}</p>
          </div>
          <span className="text-xs font-bold px-2 py-1 rounded-lg bg-destructive/20">
            {debtCustomersCount} {debtCustomersCount === 1 ? "Client" : "Clients"} Owes
          </span>
        </button>
      )}

      {/* 3. Segmented Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border/60">
        <button
          type="button"
          onClick={() => setFilterDebtOnly(false)}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
            !filterDebtOnly
              ? "bg-card text-foreground shadow-xs border border-border/80"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          All Clients ({customers.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterDebtOnly(true)}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            filterDebtOnly
              ? "bg-destructive text-destructive-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>Owing Debt</span>
          {debtCustomersCount > 0 && (
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                filterDebtOnly
                  ? "bg-white/20 text-white"
                  : "bg-destructive/15 text-destructive"
              }`}
            >
              {debtCustomersCount}
            </span>
          )}
        </button>
      </div>

      {/* 4. Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={filterDebtOnly ? "Search debtors by name or phone..." : "Search by customer name or phone..."}
          className="pl-9 pr-8 text-sm h-11 rounded-xl bg-card border-border"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 5. Customer Directory List */}
      {loading ? (
        <div className="p-8 text-center text-xs text-muted-foreground">
          Loading customer directory...
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-border text-center space-y-2">
          <Users className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-sm font-semibold text-foreground">
            {filterDebtOnly ? "No debtors found" : "No customers found"}
          </p>
          <p className="text-xs text-muted-foreground">
            {filterDebtOnly
              ? "All customer accounts are settled and up to date."
              : "Tap 'Add Customer' above to register a new client profile."}
          </p>
          {filterDebtOnly && (
            <div className="pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setFilterDebtOnly(false)}
              >
                View All Clients
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredCustomers.map((c) => {
            const hasDebt = (c.totalDebt || 0) > 0;
            const unpaidSales = (c.sales || []).filter((s: any) => (s.balanceDue ?? 0) > 0);
            const isExpanded = expandedCustomerId === c.id;

            return (
              <div
                key={c.id}
                className="p-3.5 rounded-2xl bg-card border border-border shadow-xs space-y-2.5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{c.name}</h3>
                    <p className="text-xs text-muted-foreground">{c.phone || "No phone number"}</p>
                    {c.notes && (
                      <p className="text-[11px] text-muted-foreground/80 italic mt-0.5">
                        &quot;{c.notes}&quot;
                      </p>
                    )}
                  </div>

                  {hasDebt ? (
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-destructive uppercase">Debt</span>
                      <p className="text-sm font-black text-destructive">
                        GH₵{c.totalDebt?.toFixed(2)}
                      </p>
                    </div>
                  ) : (
                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      No Debt
                    </span>
                  )}
                </div>

                {/* Outstanding Invoices Dropdown for Debtors */}
                {hasDebt && unpaidSales.length > 0 && (
                  <div className="pt-1 border-t border-border/40">
                    <button
                      type="button"
                      onClick={() => setExpandedCustomerId(isExpanded ? null : c.id)}
                      className="w-full flex items-center justify-between py-1 text-[11px] font-bold text-warning hover:text-warning/80 transition-colors"
                    >
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{unpaidSales.length} Unpaid {unpaidSales.length === 1 ? "Invoice" : "Invoices"}</span>
                      </span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {isExpanded && (
                      <div className="space-y-2 pt-1.5 pb-1">
                        {unpaidSales.map((s: any) => {
                          const statusInfo = getDueDateStatus(s.dueDate);
                          const singleWaUrl = getInvoiceDebtReminderWhatsAppUrl({
                            customerName: c.name,
                            customerPhone: c.phone,
                            saleId: s.id,
                            totalAmount: s.totalAmount,
                            amountPaid: s.amountPaid,
                            balanceDue: s.balanceDue,
                            dueDate: s.dueDate,
                          });

                          return (
                            <div
                              key={s.id}
                              className="p-2.5 rounded-xl bg-secondary/40 border border-border/80 text-xs space-y-2"
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                                    <span>#{s.id.slice(0, 8).toUpperCase()}</span>
                                    <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full border ${statusInfo.color}`}>
                                      {statusInfo.label}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-muted-foreground" />
                                    <span>
                                      {s.dueDate
                                        ? `Due ${new Date(s.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
                                        : "No agreed due date"}
                                    </span>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <span className="font-black text-warning">
                                    GH₵{Number(s.balanceDue).toFixed(2)}
                                  </span>
                                  <div className="text-[10px] text-muted-foreground">
                                    of GH₵{Number(s.totalAmount).toFixed(2)}
                                  </div>
                                </div>
                              </div>

                              <div className="flex gap-1.5 pt-1 border-t border-border/40">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  className="flex-1"
                                  onClick={() => {
                                    setEditDueDateSale({
                                      id: s.id,
                                      customerName: c.name,
                                      totalAmount: s.totalAmount,
                                      amountPaid: s.amountPaid,
                                      balanceDue: s.balanceDue,
                                      dueDate: s.dueDate,
                                    });
                                    setNewDueDate(s.dueDate ? s.dueDate.split("T")[0] : "");
                                    setDueError(null);
                                  }}
                                >
                                  Edit Due Date
                                </Button>

                                {c.phone && (
                                  <a
                                    href={singleWaUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center h-8 px-2.5 rounded-md bg-emerald-600/10 text-emerald-500 border border-emerald-600/20 text-xs font-semibold active:scale-[0.98] transition-all"
                                    title="WhatsApp Invoice Reminder"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5 mr-1" />
                                    Remind
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons: Add Payment & Contact */}
                <div className="flex gap-2 pt-1 border-t border-border/60 items-center">
                  {hasDebt ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      onClick={() => setSelectedPaymentCustomer(c)}
                    >
                      Add Payment
                    </Button>
                  ) : (
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-md">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>All Settled</span>
                    </div>
                  )}

                  {c.phone && (
                    <>
                      <a
                        href={
                          hasDebt
                            ? getDebtReminderWhatsAppUrl({
                                name: c.name,
                                phone: c.phone,
                                totalDebt: c.totalDebt,
                              })
                            : getCustomerGreetingWhatsAppUrl({
                                name: c.name,
                                phone: c.phone,
                              })
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold transition-all active:scale-[0.98]"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        WhatsApp
                      </a>

                      <a
                        href={`tel:${c.phone}`}
                        className="inline-flex items-center justify-center h-8 w-8 rounded-md bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold transition-all active:scale-[0.98]"
                        aria-label="Call customer"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Inline Customer Modal */}
      <InlineCustomerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCustomerCreated={() => {
          refetch();
        }}
      />

      {/* Record Debt Payment Modal */}
      <RecordPaymentModal
        isOpen={Boolean(selectedPaymentCustomer)}
        customer={selectedPaymentCustomer}
        onClose={() => setSelectedPaymentCustomer(null)}
        onPaymentRecorded={() => {
          refetch();
        }}
      />

      {/* Edit Due Date Sheet */}
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
          {dueError && (
            <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{dueError}</span>
            </div>
          )}

          <div className="p-3 rounded-xl bg-secondary/50 border border-border text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Order Ref:</span>
              <span className="font-mono font-bold text-foreground">
                #{editDueDateSale?.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount Paid:</span>
              <span className="font-medium text-foreground">
                GH₵{editDueDateSale ? editDueDateSale.amountPaid.toFixed(2) : "0.00"}
              </span>
            </div>
            <div className="flex justify-between border-t border-border/60 pt-1 text-sm font-bold">
              <span>Balance Due:</span>
              <span className="text-warning">
                GH₵{editDueDateSale ? editDueDateSale.balanceDue.toFixed(2) : "0.00"}
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
                { label: "In 3d", days: 3 },
                { label: "In 7d", days: 7 },
                { label: "In 14d", days: 14 },
                { label: "In 30d", days: 30 },
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
                Clear
              </Button>
            </div>

            <Input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="mt-2 text-sm h-11 rounded-xl"
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
              isLoading={dueSubmitting}
            >
              Save Due Date
            </Button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}

export default function MobileCustomersPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading customers...</div>}>
      <MobileCustomersContent />
    </React.Suspense>
  );
}
