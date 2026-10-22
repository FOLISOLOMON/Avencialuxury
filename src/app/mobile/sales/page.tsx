"use client";

import React, { useState, useEffect } from "react";
import {
  Receipt,
  Search,
  Filter,
  Calendar,
  Clock,
  CheckCircle2,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  MessageCircle,
  AlertOctagon,
  Edit3,
} from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/ToastProvider";
import { MobileSaleSummary } from "@/lib/mobile/types";
import { getSaleReceiptWhatsAppUrl } from "@/lib/mobile/whatsapp";
import { triggerClientSync } from "@/lib/sync/client-sync";

export default function MobileSalesPage() {
  const toast = useToast();
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSale, setSelectedSale] = useState<any | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  // Cancellation request modal state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [submittingCancel, setSubmittingCancel] = useState(false);
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);

  // Edit sale modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editMessage, setEditMessage] = useState<string | null>(null);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sales");
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setSales(json.data);
        }
      }
    } catch (e) {
      console.warn("Failed to load sales history:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();

    const handleSync = () => {
      fetchSales();
    };
    window.addEventListener("avencia:sync:sales", handleSync);
    window.addEventListener("avencia:sync:cancellations", handleSync);
    return () => {
      window.removeEventListener("avencia:sync:sales", handleSync);
      window.removeEventListener("avencia:sync:cancellations", handleSync);
    };
  }, []);

  const handleRequestCancellation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale || !cancelReason.trim()) return;

    setSubmittingCancel(true);
    setCancelMessage(null);

    const reasonText = cancelReason.trim();

    try {
      const res = await fetch(`/api/sales/${selectedSale.id}/cancel-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reasonText }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to submit cancellation request");
      }

      setCancelMessage("✓ Cancellation request sent to the Owner! Awaiting review.");
      toast.success(
        `Cancellation request sent to owner for review: "${reasonText}"`,
        "Request Sent"
      );

      // Optimistically update local selected sale state immediately
      const newCancelReq = {
        id: json.data?.id || `req_${Date.now()}`,
        status: "PENDING",
        reason: reasonText,
        createdAt: new Date().toISOString(),
        requester: json.data?.requester || {
          id: "worker",
          name: "You (Worker)",
          email: "",
        },
      };

      setSelectedSale((prev: any) =>
        prev && prev.id === selectedSale.id
          ? {
              ...prev,
              cancellationRequest: newCancelReq,
            }
          : prev
      );

      // Optimistically update sales list state so the card immediately displays the pending status
      setSales((prev) =>
        prev.map((s) => (s.id === selectedSale.id ? { ...s, cancellationRequest: newCancelReq } : s))
      );

      // Broadcast instant live sync to owner OP dashboard & cancellation queue across all tabs & devices
      triggerClientSync("cancellations");
      triggerClientSync("sales");

      setTimeout(() => {
        setCancelModalOpen(false);
        setCancelReason("");
        setCancelMessage(null);
        fetchSales();
      }, 1200);
    } catch (err: any) {
      const errMsg = err.message || "Error submitting request";
      setCancelMessage(errMsg);
      toast.error(errMsg, "Submission Failed");
    } finally {
      setSubmittingCancel(false);
    }
  };

  const handleEditSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale) return;

    setSubmittingEdit(true);
    setEditMessage(null);

    try {
      const res = await fetch(`/api/sales/${selectedSale.id}/edit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: editNotes.trim() || undefined,
          dueDate: editDueDate || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to edit sale");
      }

      setEditMessage("Sale successfully updated!");
      setTimeout(() => {
        setEditModalOpen(false);
        setEditMessage(null);
        fetchSales();
        setSelectedSale(null);
      }, 1500);
    } catch (err: any) {
      setEditMessage(err.message || "Error editing sale");
    } finally {
      setSubmittingEdit(false);
    }
  };

  const filteredSales = sales.filter((s) => {
    if (filterStatus !== "ALL" && s.paymentStatus !== filterStatus) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchCustomer = s.customer?.name?.toLowerCase().includes(q);
      const matchReceipt = s.receiptNumber?.toLowerCase().includes(q) || s.id?.toLowerCase().includes(q);
      const matchItem = s.items?.some((i: any) => i.product?.name?.toLowerCase().includes(q));
      return matchCustomer || matchReceipt || matchItem;
    }
    return true;
  });

  const isWithin30Mins = selectedSale
    ? Date.now() - new Date(selectedSale.saleDate).getTime() < 30 * 60 * 1000
    : false;

  return (
    <div className="space-y-4">
      {/* 1. Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground tracking-tight">Sales History</h1>
          <p className="text-xs text-muted-foreground">Authorized perfume sales & receipts</p>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchSales} className="text-xs">
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* 2. Filter Pills */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {["ALL", "PAID", "PARTIAL", "CREDIT"].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`h-8 px-3 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/40 ${
              filterStatus === status
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
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
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      sale.paymentStatus === "PAID"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : sale.paymentStatus === "PARTIAL"
                        ? "bg-amber-500/10 text-amber-400"
                        : sale.paymentStatus === "CANCELLED"
                        ? "bg-neutral-500/15 text-neutral-400 line-through"
                        : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    {sale.paymentStatus}
                  </span>
                  {sale.cancellationRequest?.status === "PENDING" && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5 shrink-0" />
                      <span>Pending Cancellation: &quot;{sale.cancellationRequest.reason}&quot;</span>
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
            {/* Status alerts */}
            {selectedSale.cancellationRequest?.status === "PENDING" && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs space-y-2">
                <div className="flex items-center justify-between font-bold">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>Cancellation Request Sent</span>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40">
                    Awaiting Owner Review
                  </span>
                </div>
                <div className="text-foreground text-[11px]">
                  <span className="text-muted-foreground">Requested By: </span>
                  <span className="font-semibold">{selectedSale.cancellationRequest.requester?.name || "You (Worker)"}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-card border border-border/80 text-foreground text-[11px]">
                  <span className="text-muted-foreground text-[10px] block mb-0.5">Your Sent Message / Reason:</span>
                  <p className="italic font-medium">&quot;{selectedSale.cancellationRequest.reason}&quot;</p>
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  The owner has been notified on the main OP portal. When approved, this sale will be voided and inventory returned to stock automatically.
                </p>
              </div>
            )}

            {selectedSale.cancellationRequest?.status === "REJECTED" && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 shrink-0" />
                <span>
                  Previous cancellation rejected: {selectedSale.cancellationRequest.rejectionReason || "Owner declined request"}. You may re-submit with clarification if needed.
                </span>
              </div>
            )}

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
                {selectedSale.items?.map((it: any, idx: number) => (
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
              {Number(selectedSale.discount) > 0 && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium text-foreground">
                      GH₵{(selectedSale.totalAmount + Number(selectedSale.discount)).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-emerald-400 font-semibold">
                    <span>Discount:</span>
                    <span>-GH₵{Number(selectedSale.discount).toFixed(2)}</span>
                  </div>
                </>
              )}
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
            <Button
              size="lg"
              variant="primary"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
              onClick={() => {
                const url = getSaleReceiptWhatsAppUrl({
                  receiptNo: selectedSale.receiptNumber || selectedSale.id.slice(-6),
                  customerName: selectedSale.customer?.name,
                  customerPhone: (selectedSale.customer as any)?.phone,
                  items: (selectedSale.items || []).map((it: any) => ({
                    name: it.product?.name || "Perfume Item",
                    quantity: it.quantity,
                    unitPrice: it.unitPrice,
                  })),
                  discount: Number(selectedSale.discount) || 0,
                  totalAmount: selectedSale.totalAmount,
                  amountPaid: selectedSale.amountPaid,
                  balanceDue: Math.max(0, selectedSale.totalAmount - selectedSale.amountPaid),
                  paymentMethod: selectedSale.paymentMethod,
                });
                window.open(url, "_blank", "noopener,noreferrer");
              }}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Send Receipt via WhatsApp
            </Button>

            {/* Worker Actions: 30m Edit & Cancellation Request */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
              {isWithin30Mins && selectedSale.paymentStatus !== "CANCELLED" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditNotes(selectedSale.notes || "");
                    setEditDueDate(selectedSale.dueDate || "");
                    setEditModalOpen(true);
                  }}
                  className="text-xs"
                >
                  <Edit3 className="w-3.5 h-3.5 mr-1 text-primary" />
                  Edit Sale (30m)
                </Button>
              )}

              {selectedSale.status !== "VOIDED" &&
                selectedSale.status !== "REFUNDED" &&
                selectedSale.cancellationRequest?.status !== "PENDING" &&
                selectedSale.cancellationRequest?.status !== "APPROVED" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCancelReason("");
                    setCancelMessage(null);
                    setCancelModalOpen(true);
                  }}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  <AlertOctagon className="w-3.5 h-3.5 mr-1" />
                  Request Cancel
                </Button>
              )}
            </div>
          </div>
        )}
      </Sheet>

      {/* Cancellation Request Modal */}
      {cancelModalOpen && selectedSale && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl p-5 max-w-sm w-full space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-amber-500" />
              Request Sale Cancellation
            </h3>
            <p className="text-xs text-muted-foreground">
              Submit a cancellation request for Receipt #{selectedSale.receiptNumber || selectedSale.id.slice(0, 8)}. The owner will review and reverse inventory.
            </p>

            {cancelMessage && (
              <div
                className={`p-2.5 rounded text-xs font-medium ${
                  cancelMessage.includes("Error") ||
                  cancelMessage.includes("Failed") ||
                  cancelMessage.includes("Unauthorized")
                    ? "bg-destructive/15 text-destructive border border-destructive/20"
                    : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                }`}
              >
                {cancelMessage}
              </div>
            )}

            <form onSubmit={handleRequestCancellation} className="space-y-3">
              <textarea
                required
                rows={3}
                placeholder="Reason for cancellation (e.g. Customer changed mind, accidental double scan)..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full text-xs p-2.5 rounded bg-muted/40 border border-border text-foreground focus:outline-hidden"
              />

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCancelModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  size="sm"
                  isLoading={submittingCancel}
                >
                  Submit Request
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 30-Minute Edit Modal */}
      {editModalOpen && selectedSale && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl p-5 max-w-sm w-full space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-primary" />
              Edit Sale Information
            </h3>
            <p className="text-xs text-muted-foreground">
              Allowed within 30 minutes of sale creation. Authoritative server timestamp is enforced.
            </p>

            {editMessage && (
              <div className="p-2.5 rounded bg-muted/40 text-xs font-medium text-foreground">
                {editMessage}
              </div>
            )}

            <form onSubmit={handleEditSale} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Sale Notes</label>
                <Input
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Notes about delivery or transaction..."
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Agreed Due Date</label>
                <Input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div className="flex gap-2 justify-end pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={submittingEdit}
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
