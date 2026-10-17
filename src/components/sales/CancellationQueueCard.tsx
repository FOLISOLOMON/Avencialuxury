"use client";

import React, { useState, useEffect } from "react";
import {
  AlertOctagon,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Package,
  Receipt,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { triggerClientSync } from "@/lib/sync/client-sync";
import { formatCurrency } from "@/lib/utils";

export interface CancellationRequestItem {
  id: string;
  saleId: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  requester?: {
    id: string;
    name: string;
    email: string;
  };
  requestedBy?: {
    id: string;
    name: string;
    email: string;
  };
  sale: {
    id: string;
    receiptNumber?: string;
    totalAmount: number;
    amountPaid: number;
    customer?: {
      name: string;
    } | null;
    items?: Array<{
      quantity: number;
      unitPrice: number;
      product: {
        name: string;
      };
    }>;
    saleItems?: Array<{
      quantity: number;
      unitPrice: number;
      product: {
        name: string;
      };
    }>;
  };
}

interface CancellationQueueCardProps {
  onProcessed?: () => void;
  compact?: boolean;
}

export function CancellationQueueCard({ onProcessed, compact = false }: CancellationQueueCardProps) {
  const [requests, setRequests] = useState<CancellationRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});
  const [showRejectInput, setShowRejectInput] = useState<Record<string, boolean>>({});

  const fetchQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sales/cancellations?status=PENDING");
      const json = await res.json();
      if (json.success) {
        setRequests(json.data || []);
      } else {
        setError(json.error || "Failed to load cancellation requests");
      }
    } catch (err: any) {
      setError(err.message || "Error fetching queue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();

    const handleSync = () => {
      fetchQueue();
    };
    window.addEventListener("avencia:sync:cancellations", handleSync);
    window.addEventListener("avencia:sync:sales", handleSync);
    return () => {
      window.removeEventListener("avencia:sync:cancellations", handleSync);
      window.removeEventListener("avencia:sync:sales", handleSync);
    };
  }, []);

  const handleReview = async (requestId: string, action: "APPROVE" | "REJECT") => {
    setProcessingId(requestId);
    setError(null);

    try {
      const reasonText = rejectNotes[requestId]?.trim() || undefined;
      const res = await fetch("/api/sales/cancellations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          decision: action,
          action,
          rejectionReason: reasonText,
          reviewNotes: reasonText,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to process review");
      }

      // Broadcast instant live update to worker mobile devices and OP tabs
      triggerClientSync("cancellations");
      triggerClientSync("sales");
      triggerClientSync("inventory");

      await fetchQueue();
      if (onProcessed) onProcessed();
    } catch (err: any) {
      setError(err.message || "Error processing cancellation review");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className={compact ? "p-3 space-y-3" : "p-5 space-y-4"}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-amber-500 animate-pulse" />
            Worker Sale Cancellation Requests
            {requests.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black text-[11px] font-black">
                {requests.length} pending
              </span>
            )}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Authorize or reject cancellations. Approving voids the transaction and immediately restores all items back into batch stock.
          </p>
        </div>

        <Button variant="ghost" size="sm" onClick={fetchQueue} className="text-xs">
          <RotateCcw className="w-3.5 h-3.5 mr-1" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-xs font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="p-4 text-center text-xs text-muted-foreground">Loading queue...</div>
      ) : requests.length === 0 ? (
        <div className="p-5 rounded-xl border border-dashed border-border bg-card/50 text-center text-xs text-muted-foreground">
          No pending worker cancellation requests. All sales are clear.
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const items = req.sale.saleItems || req.sale.items || [];
            const requesterName = req.requester?.name || req.requestedBy?.name || "Worker";
            const receiptIdentifier = req.sale.receiptNumber || req.saleId.slice(-6).toUpperCase();
            const total = Number(req.sale.totalAmount || 0);
            const paid = Number(req.sale.amountPaid || 0);
            const debt = total - paid;

            return (
              <div
                key={req.id}
                className="p-4 rounded-xl border-2 border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-card to-card space-y-3 text-xs shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-500 font-mono font-bold text-xs">
                      #{receiptIdentifier}
                    </span>
                    <span className="text-foreground font-semibold">
                      Client: {req.sale.customer?.name || "Walk-in Customer"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
                    <User className="w-3.5 h-3.5 text-amber-500" />
                    <span className="font-medium text-foreground">Requested by: {requesterName}</span>
                    <span>•</span>
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(req.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </div>

                {/* Items in sale to restore */}
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                    Items To Be Returned To Stock:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {items.map((it, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-md bg-secondary border border-border text-xs text-foreground font-semibold flex items-center gap-1.5"
                      >
                        <Package className="w-3.5 h-3.5 text-primary" />
                        <span>{it.quantity}x {it.product?.name || "Product"}</span>
                        <span className="text-muted-foreground text-[11px]">
                          ({formatCurrency(Number(it.quantity) * Number(it.unitPrice || 0))})
                        </span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Worker's Reason */}
                <div className="p-3 rounded-lg bg-card/90 border border-amber-500/30">
                  <p className="text-[11px] text-amber-400 font-bold uppercase tracking-wider">
                    Worker&apos;s Stated Reason:
                  </p>
                  <p className="text-sm text-foreground mt-1 font-medium italic">
                    &ldquo;{req.reason}&rdquo;
                  </p>
                </div>

                {/* Financial summary */}
                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold pt-1">
                  <span className="text-foreground">Total Sale: {formatCurrency(total)}</span>
                  <span className="text-emerald-500">Paid: {formatCurrency(paid)}</span>
                  {debt > 0 && (
                    <span className="text-rose-500">
                      Unpaid Debt to Reconcile: {formatCurrency(debt)}
                    </span>
                  )}
                </div>

                {/* Rejection input toggle */}
                {showRejectInput[req.id] && (
                  <div className="space-y-1.5 pt-1">
                    <input
                      type="text"
                      placeholder="Optional notes explaining rejection to worker..."
                      value={rejectNotes[req.id] || ""}
                      onChange={(e) =>
                        setRejectNotes({ ...rejectNotes, [req.id]: e.target.value })
                      }
                      className="w-full text-xs p-2.5 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/60">
                  {!showRejectInput[req.id] ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setShowRejectInput({ ...showRejectInput, [req.id]: true })
                      }
                      className="text-xs text-muted-foreground hover:text-destructive"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                      Reject Request...
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setShowRejectInput({ ...showRejectInput, [req.id]: false })
                        }
                        className="text-xs"
                      >
                        Back
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        isLoading={processingId === req.id}
                        onClick={() => handleReview(req.id, "REJECT")}
                        className="text-xs"
                      >
                        Confirm Rejection
                      </Button>
                    </div>
                  )}

                  <Button
                    variant="primary"
                    size="sm"
                    isLoading={processingId === req.id}
                    onClick={() => handleReview(req.id, "APPROVE")}
                    className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white border-0 shadow-md hover:shadow-emerald-900/30"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    Accept & Restore Stock
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
