"use client";

import React, { useState, useMemo } from "react";
import { Search, X, UserPlus, Phone, MessageCircle, AlertCircle, Users, CheckCircle2, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useMobileCustomers } from "@/lib/mobile/hooks";
import { InlineCustomerModal } from "@/components/mobile/InlineCustomerModal";
import { RecordPaymentModal } from "@/components/mobile/RecordPaymentModal";
import {
  getDebtReminderWhatsAppUrl,
  getCustomerGreetingWhatsAppUrl,
} from "@/lib/mobile/whatsapp";
import { useSearchParams } from "next/navigation";
import { MobileCustomer } from "@/lib/mobile/types";

function MobileCustomersContent() {
  const searchParams = useSearchParams();
  const initialDebtOnly = searchParams.get("filter") === "debt" || searchParams.get("tab") === "debt";

  const { customers, loading, refetch } = useMobileCustomers();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPaymentCustomer, setSelectedPaymentCustomer] = useState<MobileCustomer | null>(null);
  const [filterDebtOnly, setFilterDebtOnly] = useState(initialDebtOnly);

  const urlCustomerId = searchParams.get("id");

  React.useEffect(() => {
    if (searchParams.get("filter") === "debt" || searchParams.get("tab") === "debt" || urlCustomerId) {
      setFilterDebtOnly(true);
    }
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

  return (
    <div className="space-y-4">
      {/* 1. Header & Add Action */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground tracking-tight">Customers</h1>
          <p className="text-xs text-muted-foreground">{customers.length} registered clients</p>
        </div>

        <Button
          onClick={() => setModalOpen(true)}
          className="h-9 px-3 bg-primary text-primary-foreground text-xs font-bold rounded-xl active:scale-95"
        >
          <UserPlus className="w-3.5 h-3.5 mr-1" />
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

      {/* 3. Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by customer name or phone..."
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

      {/* 4. Customer Directory List */}
      {loading ? (
        <div className="p-8 text-center text-xs text-muted-foreground">
          Loading customer directory...
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-border text-center space-y-2">
          <Users className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-sm font-semibold text-foreground">No customers found</p>
          <p className="text-xs text-muted-foreground">
            Tap &apos;Add Customer&apos; above to register a new client profile.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredCustomers.map((c) => {
            const hasDebt = (c.totalDebt || 0) > 0;
            // Clean phone for whatsapp link
            const rawPhone = c.phone ? c.phone.replace(/[^0-9]/g, "") : "";
            const waPhone = rawPhone.startsWith("0") ? "233" + rawPhone.substring(1) : rawPhone;

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

                {/* Action Buttons: Add Payment & Contact */}
                <div className="flex gap-2 pt-1 border-t border-border/60 items-center">
                  {hasDebt ? (
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentCustomer(c)}
                      className="flex-1 py-1.5 px-2.5 bg-destructive/15 hover:bg-destructive/25 text-destructive border border-destructive/30 text-xs font-bold rounded-lg flex items-center justify-center gap-1 active:scale-95 transition-all"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      Add Payment
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
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
                        className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors active:scale-95"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        WhatsApp
                      </a>

                      <a
                        href={`tel:${c.phone}`}
                        className="py-1.5 px-2.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors active:scale-95"
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
