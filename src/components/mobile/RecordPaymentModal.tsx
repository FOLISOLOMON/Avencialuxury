"use client";

import React, { useState } from "react";
import { X, DollarSign, CreditCard, Banknote, Smartphone, CheckCircle2, Loader2, AlertCircle, MessageCircle } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { MobileCustomer } from "@/lib/mobile/types";
import { putCachedCustomer, addPendingDebtPayment } from "@/lib/mobile/db";
import { syncManager } from "@/lib/mobile/sync";
import { getPaymentReceiptWhatsAppUrl } from "@/lib/mobile/whatsapp";

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: MobileCustomer | null;
  onPaymentRecorded: () => void;
}

export function RecordPaymentModal({
  isOpen,
  onClose,
  customer,
  onPaymentRecorded,
}: RecordPaymentModalProps) {
  const toast = useToast();
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{ amount: number; remaining: number } | null>(null);

  if (!customer) return null;

  const currentDebt = customer.totalDebt || 0;

  const handleQuickAmount = (val: number) => {
    setAmount(val.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (currentDebt <= 0) {
      toast.info(`${customer.name} has no outstanding debt to settle.`, "Account Cleared");
      return;
    }

    const parsedAmount = parseFloat(amount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Please enter a valid payment amount greater than zero", "Invalid amount");
      return;
    }

    if (parsedAmount > currentDebt) {
      toast.error(
        `Payment amount (GH₵${parsedAmount.toFixed(2)}) cannot exceed the outstanding debt of GH₵${currentDebt.toFixed(2)}`,
        "Exceeds Outstanding Debt"
      );
      return;
    }

    setSubmitting(true);

    try {
      if (navigator.onLine) {
        // Online: call /api/debt
        const res = await fetch("/api/debt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId: customer.id,
            amount: parsedAmount,
            paymentMethod,
            notes: notes.trim() || undefined,
          }),
        });

        const json = await res.json();
        if (json.success) {
          const newDebt = Math.max(0, currentDebt - parsedAmount);
          await putCachedCustomer({
            ...customer,
            totalDebt: newDebt,
          });

          toast.success(
            `Recorded GH₵${parsedAmount.toFixed(2)} payment for ${customer.name}. New balance: GH₵${newDebt.toFixed(2)}`,
            "Payment Recorded"
          );

          syncManager.refreshCacheFromServer();
          onPaymentRecorded();
          setSuccessData({ amount: parsedAmount, remaining: newDebt });
          return;
        } else {
          throw new Error(json.error || "Server rejected payment");
        }
      } else {
        // Offline: save to pending queue & update local customer cache
        const offlineId = "debt_off_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
        await addPendingDebtPayment({
          offlineId,
          customerId: customer.id,
          customerName: customer.name,
          amount: parsedAmount,
          paymentMethod,
          notes: notes.trim() || undefined,
        });

        const newDebt = Math.max(0, currentDebt - parsedAmount);
        await putCachedCustomer({
          ...customer,
          totalDebt: newDebt,
        });

        toast.warning(
          `Payment of GH₵${parsedAmount.toFixed(2)} saved offline. It will sync automatically when connected.`,
          "Payment Saved Locally"
        );

        onPaymentRecorded();
        setSuccessData({ amount: parsedAmount, remaining: newDebt });
      }
    } catch (err: any) {
      console.warn("Online payment failed, falling back to offline queue:", err);

      const offlineId = "debt_off_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
      await addPendingDebtPayment({
        offlineId,
        customerId: customer.id,
        customerName: customer.name,
        amount: parsedAmount,
        paymentMethod,
        notes: notes.trim() || undefined,
      });

      const newDebt = Math.max(0, currentDebt - parsedAmount);
      await putCachedCustomer({
        ...customer,
        totalDebt: newDebt,
      });

      toast.warning(
        `Network issue. Payment of GH₵${parsedAmount.toFixed(2)} saved locally and queued for auto-sync.`,
        "Saved Locally"
      );

      onPaymentRecorded();
      setSuccessData({ amount: parsedAmount, remaining: newDebt });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSuccessData(null);
    setAmount("");
    setNotes("");
    setPaymentMethod("CASH");
    onClose();
  };

  return (
    <Sheet
      isOpen={isOpen}
      onClose={handleClose}
      title={successData ? "Payment Complete" : "Record Debt Payment"}
      description={successData ? undefined : `Add payment received from ${customer.name}`}
    >
      {successData ? (
        <div className="py-6 px-2 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Payment Recorded!</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Received GH₵{successData.amount.toFixed(2)} from {customer.name}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-card border border-border text-left space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount Paid:</span>
              <span className="font-bold text-emerald-500">GH₵{successData.amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Remaining Debt:</span>
              <span className="font-bold text-foreground">GH₵{successData.remaining.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment Method:</span>
              <span className="font-semibold text-foreground">{paymentMethod}</span>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <a
              href={getPaymentReceiptWhatsAppUrl({
                customerName: customer.name,
                customerPhone: customer.phone,
                amountPaid: successData.amount,
                remainingDebt: successData.remaining,
                paymentMethod,
              })}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm"
            >
              <MessageCircle className="w-4 h-4" />
              Send Receipt on WhatsApp
            </a>

            <Button
              type="button"
              onClick={handleClose}
              className="w-full h-10 bg-muted hover:bg-muted/80 text-foreground text-xs font-bold rounded-xl active:scale-95"
            >
              Done
            </Button>
          </div>
        </div>
      ) : currentDebt <= 0 ? (
        <div className="py-8 px-4 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">No Outstanding Debt</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              {customer.name} has settled all purchases and does not owe any balance.
            </p>
          </div>
          <Button
            type="button"
            onClick={handleClose}
            className="w-full h-11 bg-muted hover:bg-muted/80 text-foreground text-xs font-bold rounded-xl mt-3 active:scale-95"
          >
            Close
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Outstanding Debt Info Box */}
          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-destructive block">
                Current Outstanding Debt
              </span>
              <span className="text-xl font-black text-destructive">
                GH₵{currentDebt.toFixed(2)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleQuickAmount(currentDebt)}
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground active:scale-95 transition-transform"
            >
              Pay Full Debt
            </button>
          </div>

          {/* Amount Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Amount Received (GH₵) <span className="text-destructive">*</span>
            </label>
            <Input
              type="number"
              step="any"
              min="0.01"
              max={currentDebt}
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="text-lg font-bold h-12"
              autoFocus
            />

            {/* Quick preset chips (capped to current debt) */}
            <div className="flex gap-1.5 pt-1 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => handleQuickAmount(currentDebt)}
                className="text-xs font-semibold px-2.5 py-1 rounded-md bg-muted hover:bg-muted/80 text-foreground border border-border whitespace-nowrap active:scale-95"
              >
                Pay Full (GH₵{currentDebt.toFixed(2)})
              </button>
              {[50, 100, 200, 500]
                .filter((preset) => preset < currentDebt)
                .map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleQuickAmount(preset)}
                    className="text-xs font-semibold px-2.5 py-1 rounded-md bg-muted hover:bg-muted/80 text-foreground border border-border whitespace-nowrap active:scale-95"
                  >
                    GH₵{preset}
                  </button>
                ))}
            </div>
          </div>

        {/* Payment Method Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Payment Method</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "CASH", label: "Cash", icon: Banknote },
              { id: "MOBILE_MONEY", label: "MoMo", icon: Smartphone },
              { id: "BANK_TRANSFER", label: "Bank", icon: CreditCard },
            ].map((m) => {
              const Icon = m.icon;
              const isSelected = paymentMethod === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id)}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all active:scale-95 text-xs font-semibold ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-card border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Notes (Optional)</label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Paid via MTN MoMo to Kwesi"
            className="text-xs h-10"
          />
        </div>

        {/* Submit Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="flex-1 h-11 text-xs font-bold"
            disabled={submitting}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            className="flex-1 h-11 text-xs font-bold bg-primary text-primary-foreground"
            disabled={submitting || !amount}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Recording...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Confirm Payment
              </>
            )}
          </Button>
        </div>
      </form>
      )}
    </Sheet>
  );
}
