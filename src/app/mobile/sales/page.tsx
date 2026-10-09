"use client";

import React, { useState, useEffect } from "react";
import { Receipt, Search, Filter, Calendar, Clock, CheckCircle2, ChevronRight, AlertCircle, RefreshCw, MessageCircle } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { MobileSaleSummary } from "@/lib/mobile/types";
import { getPendingSales } from "@/lib/mobile/db";
import { getSaleReceiptWhatsAppUrl } from "@/lib/mobile/whatsapp";

export default function MobileSalesPage() {
  const [sales, setSales] = useState<MobileSaleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSale, setSelectedSale] = useState<MobileSaleSummary | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  useEffect(() => {
    async function loadSales() {
      try {
        const pending = await getPendingSales();
        const pendingMapped: MobileSaleSummary[] = pending.map((p) => ({
          id: p.offlineId,
          receiptNumber: "OFFLINE",
          saleDate: p.saleDate,
          totalAmount: p.totalAmount,
          amountPaid: p.amountPaid,
          paymentStatus: p.paymentStatus,
          paymentMethod: p.paymentMethod,
          customer: p.customerId ? { id: p.customerId, name: p.customerName || "Customer" } : null,
          items: p.items.map((it) => ({
            id: it.productId,
            product: { name: it.productName },
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            subtotal: it.quantity * it.unitPrice,
          })),
        }));

        const res = await fetch("/api/sales");
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            // Put pending items first
            setSales([...pendingMapped, ...json.data]);
          } else {
            setSales(pendingMapped);
          }
        } else {
          setSales(pendingMapped);
        }
      } catch (e) {
        console.warn("Failed to load sales history:", e);
      } finally {
        setLoading(false);
      }
    }
    loadSales();
  }, []);

  const filteredSales = sales.filter((s) => {
    if (filterStatus !== "ALL" && s.paymentStatus !== filterStatus) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchCustomer = s.customer?.name?.toLowerCase().includes(q);
      const matchReceipt = s.receiptNumber?.toLowerCase().includes(q) || s.id?.toLowerCase().includes(q);
      const matchItem = s.items?.some((i) => i.product?.name?.toLowerCase().includes(q));
      return matchCustomer || matchReceipt || matchItem;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* 1. Header */}
      <div>
        <h1 className="text-lg font-bold text-foreground tracking-tight">Sales History</h1>
        <p className="text-xs text-muted-foreground">All perfume transactions & receipts</p>
      </div>

      {/* 2. Filter Pills */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {["ALL", "PAID", "PARTIAL", "CREDIT"].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              filterStatus === status
                ? "bg-primary text-primary-foreground"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            }`}
          >
            {status === "ALL" ? "All Sales" : status}
          </button>
        ))}
      </div>

      {/* 3. Sales List */}
      {loading ? (
        <div className="p-8 text-center text-xs text-muted-foreground">
          Loading sales records...
        </div>
      ) : filteredSales.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-border text-center space-y-2">
          <Receipt className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-sm font-semibold text-foreground">No sales found</p>
          <p className="text-xs text-muted-foreground">
            No transactions match your current filter.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredSales.map((sale) => (
            <button
              key={sale.id}
              type="button"
              onClick={() => setSelectedSale(sale)}
              className="w-full p-3.5 rounded-2xl bg-card border border-border shadow-xs flex items-center justify-between text-left active:scale-[0.99] transition-transform"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">
                    {sale.customer?.name || "Walk-in Customer"}
                  </span>
                  {sale.receiptNumber === "OFFLINE" ? (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      Offline Sync Pending
                    </span>
                  ) : (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        sale.paymentStatus === "PAID"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : sale.paymentStatus === "PARTIAL"
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {sale.paymentStatus}
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-muted-foreground">
                  {sale.items?.length || 1} perfume(s) • {sale.paymentMethod} •{" "}
                  {new Date(sale.saleDate).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-sm font-black text-foreground">
                    GH₵{sale.totalAmount.toFixed(2)}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Sale Details Modal / Sheet */}
      <Sheet
        isOpen={!!selectedSale}
        onClose={() => setSelectedSale(null)}
        title="Sale Receipt Details"
        description={selectedSale ? `Receipt #${selectedSale.receiptNumber || selectedSale.id.substring(0, 8)}` : ""}
      >
        {selectedSale && (
          <div className="space-y-4 pt-1">
            {/* Summary */}
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 flex justify-between items-center">
              <div>
                <p className="text-xs text-muted-foreground">Customer</p>
                <p className="text-sm font-bold text-foreground">
                  {selectedSale.customer?.name || "Walk-in Customer"}
                </p>
                {selectedSale.customer?.phone && (
                  <p className="text-xs text-muted-foreground">{selectedSale.customer.phone}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="text-xs font-semibold text-foreground">
                  {new Date(selectedSale.saleDate).toLocaleDateString()}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {new Date(selectedSale.saleDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Items Sold</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {selectedSale.items?.map((it, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-card border border-border flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-foreground">{it.product?.name || "Perfume"}</p>
                      <p className="text-[11px] text-muted-foreground">Qty: {it.quantity} × GH₵{it.unitPrice.toFixed(2)}</p>
                    </div>
                    <span className="font-bold text-foreground">
                      GH₵{(it.quantity * it.unitPrice).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Financials */}
            <div className="p-3.5 rounded-xl bg-card border border-border space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Sale:</span>
                <span className="font-bold text-foreground">GH₵{selectedSale.totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount Paid:</span>
                <span className="font-bold text-emerald-400">GH₵{selectedSale.amountPaid.toFixed(2)}</span>
              </div>
              {selectedSale.totalAmount > selectedSale.amountPaid && (
                <div className="flex justify-between pt-1 border-t border-border text-destructive font-bold">
                  <span>Balance Due (Debt):</span>
                  <span>GH₵{(selectedSale.totalAmount - selectedSale.amountPaid).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 text-[11px] text-muted-foreground">
                <span>Payment Channel:</span>
                <span className="font-semibold text-foreground">{selectedSale.paymentMethod}</span>
              </div>
            </div>

            {/* WhatsApp Share Button */}
            <a
              href={getSaleReceiptWhatsAppUrl({
                receiptNo: selectedSale.receiptNumber || selectedSale.id.slice(-6),
                customerName: selectedSale.customer?.name,
                customerPhone: (selectedSale.customer as any)?.phone,
                items: (selectedSale.items || []).map((it) => ({
                  name: it.product?.name || "Perfume Item",
                  quantity: it.quantity,
                  unitPrice: it.unitPrice,
                })),
                totalAmount: selectedSale.totalAmount,
                amountPaid: selectedSale.amountPaid,
                balanceDue: Math.max(0, selectedSale.totalAmount - selectedSale.amountPaid),
                paymentMethod: selectedSale.paymentMethod,
              })}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm"
            >
              <MessageCircle className="w-4 h-4" />
              Send Receipt via WhatsApp
            </a>
          </div>
        )}
      </Sheet>
    </div>
  );
}
