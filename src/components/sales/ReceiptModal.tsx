"use client";

import { X, Share2, Printer } from "lucide-react";
import Image from "next/image";
import { formatCurrency } from "@/lib/utils";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0D0D]/80 backdrop-blur-sm animate-in fade-in duration-200 font-sans" role="dialog" aria-modal="true" aria-label="Customer Sales Receipt">
      <div className="bg-white dark:bg-[#151515] rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-[#E5E2D8] dark:border-[#2A2A2A] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-[#0D0D0D] text-white flex items-center justify-between border-b border-gold-500/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#151515] p-1 flex items-center justify-center border border-gold-500/30 overflow-hidden">
              <Image
                src="/logo/Avencia gold icon logo.png"
                alt="Logo"
                width={28}
                height={28}
                className="w-full h-full object-contain"
              />
            </div>
            <h3 className="font-extrabold text-base tracking-tight text-white">Customer Sales Receipt</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#A3A3A3] hover:text-white hover:bg-gold-500/15 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
            aria-label="Close receipt"
          >
            <X className="w-5 h-5 text-gold-600 dark:text-gold-400" />
          </button>
        </div>

        {/* Printable Receipt Body */}
        <div className="p-6 overflow-y-auto space-y-4 bg-[#F8F7F3] dark:bg-[#181818] font-mono text-xs text-[#171717] dark:text-[#F5F5F5] border-b border-[#E5E2D8] dark:border-[#2A2A2A]">
          <div className="text-center space-y-1">
            <div className="w-36 h-10 mx-auto flex items-center justify-center mb-1 bg-white dark:bg-white rounded-xl p-1 shadow-xs border border-gold-500/20">
              <Image
                src="/logo/Avencia black logo.png"
                alt="Avencia Perfumes Logo"
                width={140}
                height={40}
                className="h-full w-auto object-contain"
              />
            </div>
            <p className="text-[11px] text-[#737373] dark:text-[#A3A3A3] font-sans font-semibold">Business Receipt • {saleRef}</p>
            <p className="text-[10px] text-[#737373] dark:text-[#A3A3A3] font-sans">{dateStr}</p>
          </div>

          <div className="border-t border-b border-[#E5E2D8] dark:border-[#2A2A2A] py-2 space-y-1 font-sans">
            <p className="text-[#525252] dark:text-[#D4D4D4]">
              <span className="font-semibold text-[#171717] dark:text-[#F5F5F5]">Customer:</span>{" "}
              {sale.customer?.name || "Walk-in Customer"}
            </p>
            {sale.customer?.phone && (
              <p className="text-[#737373] dark:text-[#A3A3A3] text-[11px]">Phone: {sale.customer.phone}</p>
            )}
          </div>

          {/* Line Items */}
          <div className="space-y-2">
            {sale.saleItems?.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-[#171717] dark:text-[#F5F5F5] font-sans">{item.product?.name || "Perfume Item"}</p>
                  <p className="text-[#737373] dark:text-[#A3A3A3] text-[11px]">
                    {item.quantity} × {formatCurrency(Number(item.unitPrice))}
                  </p>
                </div>
                <div className="font-bold text-[#171717] dark:text-[#F5F5F5] font-sans">
                  {formatCurrency(Number(item.revenue))}
                </div>
              </div>
            ))}
          </div>

          {/* Calculations Summary */}
          <div className="border-t border-[#E5E2D8] dark:border-[#2A2A2A] pt-3 space-y-1 font-sans text-xs">
            <div className="flex justify-between text-[#525252] dark:text-[#D4D4D4]">
              <span>Subtotal</span>
              <span>{formatCurrency(Number(sale.subtotal))}</span>
            </div>
            {Number(sale.discount) > 0 && (
              <div className="flex justify-between text-rose-600 dark:text-rose-400">
                <span>Discount</span>
                <span>-{formatCurrency(Number(sale.discount))}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-black text-[#171717] dark:text-[#F5F5F5] pt-1 border-t border-[#E5E2D8] dark:border-[#2A2A2A]">
              <span>Total Invoice Amount</span>
              <span>{formatCurrency(Number(sale.totalAmount))}</span>
            </div>
            {balDue > 0 ? (
              <>
                <div className="flex justify-between text-xs text-[#525252] dark:text-[#D4D4D4] pt-0.5">
                  <span>Amount Paid So Far</span>
                  <span className="font-bold text-[#171717] dark:text-[#F5F5F5]">{formatCurrency(amtPaid)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-rose-600 dark:text-rose-400 pt-0.5 border-t border-dashed border-[#E5E2D8] dark:border-[#2A2A2A]">
                  <span>Balance Due</span>
                  <span>{formatCurrency(balDue)}</span>
                </div>
                <div className="flex justify-between text-[11px] pt-1">
                  <span>Status</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                    PARTIAL CREDIT
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between text-xs text-emerald-700 dark:text-emerald-400 font-bold pt-0.5">
                  <span>Total Paid</span>
                  <span>{formatCurrency(amtPaid)}</span>
                </div>
                <div className="flex justify-between text-[11px] pt-1">
                  <span>Status</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    COMPLETED
                  </span>
                </div>
              </>
            )}
            <div className="flex justify-between text-[11px] text-[#737373] dark:text-[#A3A3A3] pt-1">
              <span>Payment Method</span>
              <span className="font-bold text-[#171717] dark:text-[#F5F5F5]">{sale.paymentMethod || "CASH"}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-white dark:bg-[#151515] border-t border-[#E5E2D8] dark:border-[#2A2A2A] flex items-center justify-between gap-3">
          <button
            onClick={() => window.print()}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-[#E5E2D8] dark:border-[#2A2A2A] text-[#171717] dark:text-[#F5F5F5] font-bold text-xs hover:bg-[#F8F7F3] dark:hover:bg-[#181818] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 active:scale-95"
          >
            <Printer className="w-4 h-4 text-gold-600 dark:text-gold-400" />
            Print
          </button>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-md shadow-emerald-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 active:scale-95"
          >
            <Share2 className="w-4 h-4" />
            Share WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
