"use client";

import { X, Share2, Printer } from "lucide-react";
import Image from "next/image";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";

interface ReceiptModalProps {
  sale: any;
  isOpen: boolean;
  onClose: () => void;
}

export function ReceiptModal({ sale, isOpen, onClose }: ReceiptModalProps) {
  if (!isOpen || !sale) return null;

  const saleRef = sale.id ? `#${sale.id.slice(-6).toUpperCase()}` : "#SALE";
  const dateStr = sale.saleDate ? new Date(sale.saleDate).toLocaleString() : new Date().toLocaleString();

  const amtPaid = sale.amountPaid !== undefined && sale.amountPaid !== null ? Number(sale.amountPaid) : Number(sale.totalAmount);
  const balDue = sale.balanceDue !== undefined && sale.balanceDue !== null ? Number(sale.balanceDue) : (sale.status === "PARTIAL" ? Number(sale.totalAmount) - amtPaid : 0);

  // Build clean plain-text receipt for WhatsApp sharing
  let whatsappText = `*AVENCIA PERFUMES RECEIPT*\n`;
  whatsappText += `Receipt No: ${saleRef}\n`;
  whatsappText += `Date: ${dateStr}\n`;
  whatsappText += `Customer: ${sale.customer?.name || "Walk-in Customer"}\n`;
  whatsappText += `----------------------------------------\n`;

  if (sale.saleItems && sale.saleItems.length > 0) {
    sale.saleItems.forEach((item: any) => {
      const pName = item.product?.name || "Perfume Item";
      whatsappText += `${pName}\n  ${item.quantity} x ${formatCurrency(Number(item.unitPrice))} = ${formatCurrency(Number(item.revenue))}\n`;
    });
  }

  whatsappText += `----------------------------------------\n`;
  whatsappText += `Subtotal: ${formatCurrency(Number(sale.subtotal))}\n`;
  if (Number(sale.discount) > 0) {
    whatsappText += `Discount: -${formatCurrency(Number(sale.discount))}\n`;
  }
  whatsappText += `Total Invoice Amount: ${formatCurrency(Number(sale.totalAmount))}\n`;
  if (balDue > 0) {
    whatsappText += `Amount Paid So Far: ${formatCurrency(amtPaid)}\n`;
    whatsappText += `*BALANCE DUE: ${formatCurrency(balDue)}*\n`;
    whatsappText += `Status: PARTIAL CREDIT\n`;
  } else {
    whatsappText += `*TOTAL PAID: ${formatCurrency(amtPaid)}*\n`;
    whatsappText += `Status: COMPLETED\n`;
  }
  whatsappText += `Payment Method: ${sale.paymentMethod || "CASH"}\n\n`;
  const phoneClean = sale.customer?.phone ? sale.customer.phone.replace(/[^0-9]/g, "") : "";
  const whatsappUrl = phoneClean
    ? `https://wa.me/${phoneClean}?text=${encodeURIComponent(whatsappText)}`
    : `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 font-sans" role="dialog" aria-modal="true" aria-label="Customer Sales Receipt">
      <div className="bg-card text-foreground rounded-lg max-w-md w-full overflow-hidden shadow-xl border border-border flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-muted/30 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded border border-border p-1 flex items-center justify-center bg-card">
              <Image
                src="/logo/Avencia gold icon logo.png"
                alt="Logo"
                width={20}
                height={20}
                className="w-full h-full object-contain"
              />
            </div>
            <h3 className="font-semibold text-sm tracking-tight text-foreground">Customer Sales Receipt</h3>
          </div>
          <IconButton
            icon={X}
            size="sm"
            variant="ghost"
            onClick={onClose}
            aria-label="Close receipt"
          />
        </div>

        {/* Printable Receipt Body */}
        <div className="p-5 overflow-y-auto space-y-4 bg-card font-mono text-xs text-foreground border-b border-border">
          <div className="text-center space-y-1">
            <div className="w-28 h-8 mx-auto flex items-center justify-center mb-1 bg-white rounded p-1 border border-border">
              <Image
                src="/logo/Avencia black logo.png"
                alt="Avencia Perfumes Logo"
                width={110}
                height={32}
                className="h-full w-auto object-contain"
              />
            </div>
            <p className="text-[11px] text-muted-foreground font-sans font-medium">Receipt {saleRef}</p>
            <p className="text-[10px] text-muted-foreground font-sans">{dateStr}</p>
          </div>

          <div className="border-t border-b border-border py-2 space-y-1 font-sans">
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Customer:</span>{" "}
              {sale.customer?.name || "Walk-in Customer"}
            </p>
            {sale.customer?.phone && (
              <p className="text-muted-foreground text-[11px]">Phone: {sale.customer.phone}</p>
            )}
          </div>

          {/* Line Items */}
          <div className="space-y-2">
            {sale.saleItems?.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-foreground font-sans">{item.product?.name || "Perfume Item"}</p>
                  <p className="text-muted-foreground text-[11px]">
                    {item.quantity} × {formatCurrency(Number(item.unitPrice))}
                  </p>
                </div>
                <div className="font-semibold text-foreground font-sans tabular-nums">
                  {formatCurrency(Number(item.revenue))}
                </div>
              </div>
            ))}
          </div>

          {/* Calculations Summary */}
          <div className="border-t border-border pt-3 space-y-1 font-sans text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatCurrency(Number(sale.subtotal))}</span>
            </div>
            {Number(sale.discount) > 0 && (
              <div className="flex justify-between text-destructive">
                <span>Discount</span>
                <span className="tabular-nums">-{formatCurrency(Number(sale.discount))}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-foreground pt-1 border-t border-border">
              <span>Total Invoice Amount</span>
              <span className="tabular-nums">{formatCurrency(Number(sale.totalAmount))}</span>
            </div>
            {balDue > 0 ? (
              <>
                <div className="flex justify-between text-xs text-muted-foreground pt-0.5">
                  <span>Amount Paid</span>
                  <span className="font-medium text-foreground tabular-nums">{formatCurrency(amtPaid)}</span>
                </div>
                <div className="flex justify-between text-xs font-semibold text-destructive pt-0.5 border-t border-dashed border-border">
                  <span>Balance Due</span>
                  <span className="tabular-nums">{formatCurrency(balDue)}</span>
                </div>
                <div className="flex justify-between text-[11px] pt-1 items-center">
                  <span className="text-muted-foreground">Status</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-amber-500/10 text-warning border border-warning/20">
                    Partial Credit
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between text-xs text-foreground font-medium pt-0.5">
                  <span>Total Paid</span>
                  <span className="tabular-nums">{formatCurrency(amtPaid)}</span>
                </div>
                <div className="flex justify-between text-[11px] pt-1 items-center">
                  <span className="text-muted-foreground">Status</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-emerald-500/10 text-success border border-success/20">
                    Completed
                  </span>
                </div>
              </>
            )}
            <div className="flex justify-between text-[11px] text-muted-foreground pt-1">
              <span>Payment Method</span>
              <span className="font-medium text-foreground">{sale.paymentMethod || "CASH"}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-3 bg-muted/20 border-t border-border flex items-center justify-between gap-3">
          <Button
            size="md"
            variant="outline"
            onClick={() => window.print()}
            className="flex-1"
          >
            <Printer className="w-4 h-4 mr-1.5" />
            Print Receipt
          </Button>
          <Button
            size="md"
            variant="primary"
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
            onClick={() => window.open(whatsappUrl, "_blank", "noopener,noreferrer")}
          >
            <Share2 className="w-4 h-4 mr-1.5" />
            WhatsApp
          </Button>
        </div>
      </div>
    </div>
  );
}
