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

interface CancellationRequest {
  id: string;
  saleId: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  requestedBy: {
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
    };
    items: Array<{
      quantity: number;
      unitPrice: number;
      product: {
        name: string;
      };
    }>;
  };
}

export function CancellationQueueCard() {
  const [requests, setRequests] = useState<CancellationRequest[]>([]);
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
  }, []);

  const handleReview = async (requestId: string, action: "APPROVE" | "REJECT") => {
    setProcessingId(requestId);
    setError(null);

    try {
      const res = await fetch("/api/sales/cancellations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          action,
          reviewNotes: rejectNotes[requestId] || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to process review");
      }

      fetchQueue();
    } catch (err: any) {
      setError(err.message || "Error processing cancellation review");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-amber-500" />
            Sale Cancellation Requests Queue
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Owner-only authorization queue for worker-requested transaction cancellations with automated inventory reversal
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
        <div className="p-4 rounded-md border border-dashed border-border text-center text-xs text-muted-foreground">
          No pending worker cancellation requests. All sales are clear.
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div
              key={req.id}
              className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-3 text-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-2">
                <div>
                  <span className="font-bold text-foreground">
                    Receipt #{req.sale.receiptNumber || req.saleId.slice(0, 8)}
                  </span>
                  <span className="text-muted-foreground ml-2">
                    Customer: {req.sale.customer?.name || "Walk-in"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
                  <User className="w-3 h-3 text-amber-500" />
                  <span>Requested by: {req.requestedBy.name}</span>
                  <span>•</span>
                  <Clock className="w-3 h-3" />
                  <span>{new Date(req.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>

              {/* Items in sale */}
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase">Items in Sale:</p>
                <div className="flex flex-wrap gap-2">
                  {req.sale.items.map((it, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-muted/60 text-[11px] text-foreground font-medium"
                    >
                      {it.quantity}x {it.product.name} (GH₵{(it.quantity * it.unitPrice).toFixed(2)})
                    </span>
                  ))}
                </div>
              </div>

              {/* Reason */}
              <div className="p-2.5 rounded bg-black/40 border border-border">
                <p className="text-[11px] text-neutral-400 font-semibold">Worker Reason:</p>
                <p className="text-xs text-neutral-200 mt-0.5 italic">&quot;{req.reason}&quot;</p>
              </div>

              {/* Financial summary */}
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span>Total Sale: GH₵{req.sale.totalAmount.toFixed(2)}</span>
                <span className="text-emerald-400">Paid: GH₵{req.sale.amountPaid.toFixed(2)}</span>
                {req.sale.totalAmount > req.sale.amountPaid && (
                  <span className="text-destructive">
                    Debt: GH₵{(req.sale.totalAmount - req.sale.amountPaid).toFixed(2)}
                  </span>
                )}
              </div>

              {/* Rejection input toggle */}
              {showRejectInput[req.id] && (
                <div className="space-y-1.5 pt-1">
                  <input
                    type="text"
                    placeholder="Enter reason for rejection..."
                    value={rejectNotes[req.id] || ""}
                    onChange={(e) =>
                      setRejectNotes({ ...rejectNotes, [req.id]: e.target.value })
                    }
                    className="w-full text-xs p-2 rounded bg-card border border-border text-foreground"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-1">
                {!showRejectInput[req.id] ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setShowRejectInput({ ...showRejectInput, [req.id]: true })
                    }
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    Reject...
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    size="sm"
                    isLoading={processingId === req.id}
                    onClick={() => handleReview(req.id, "REJECT")}
                    className="text-xs"
                  >
                    Confirm Rejection
                  </Button>
                )}

                <Button
                  variant="primary"
                  size="sm"
                  isLoading={processingId === req.id}
                  onClick={() => handleReview(req.id, "APPROVE")}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Approve & Reverse Inventory
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
