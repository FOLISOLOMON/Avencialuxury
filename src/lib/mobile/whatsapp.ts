/**
 * Mobile WhatsApp Integration Utilities
 * Generates properly formatted, UTF-8 encoded WhatsApp URLs with professional business text
 */

export function cleanPhoneForWhatsApp(phone?: string | null): string {
  if (!phone) return "";
  const digits = phone.replace(/[^0-9]/g, "");
  if (!digits) return "";

  // Ghana number format conversions:
  // "0554663443" -> "233554663443"
  if (digits.startsWith("0") && digits.length === 10) {
    return "233" + digits.slice(1);
  }
  // "554663443" (9 digits without leading zero) -> "233554663443"
  if (digits.length === 9) {
    return "233" + digits;
  }
  // Already starting with 233
  return digits;
}

/**
 * Builds a friendly payment reminder message for a customer with debt
 */
export function getDebtReminderWhatsAppUrl(customer: {
  name: string;
  phone?: string | null;
  totalDebt?: number;
}): string {
  const phone = cleanPhoneForWhatsApp(customer.phone);
  const debt = (customer.totalDebt || 0).toFixed(2);
  const name = customer.name.trim();

  const message =
    `Hello ${name}! 👋\n\n` +
    `This is a gentle payment reminder from *Avencia Luxury Perfumes* regarding your account balance.\n\n` +
    `📌 *Account Summary*:\n` +
    `• Customer: ${name}\n` +
    `• Outstanding Balance: GH₵ ${debt}\n\n` +
    `Kindly let us know when you would like to settle or make a partial payment. Thank you for choosing Avencia! 🙏✨`;

  return phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/**
 * Builds a warm appreciation message for a customer without debt
 */
export function getCustomerGreetingWhatsAppUrl(customer: {
  name: string;
  phone?: string | null;
}): string {
  const phone = cleanPhoneForWhatsApp(customer.phone);
  const name = customer.name.trim();

  const message =
    `Hello ${name}! 👋\n\n` +
    `Thank you for choosing *Avencia Luxury Perfumes*. We truly appreciate your support and hope you are enjoying your signature scents! ✨\n\n` +
    `Please reach out anytime if you need recommendations, new releases, or refills. Have a wonderful day! 🛍️`;

  return phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/**
 * Builds an itemized sale receipt message for WhatsApp sharing
 */
export function getSaleReceiptWhatsAppUrl(params: {
  receiptNo?: string;
  customerName?: string;
  customerPhone?: string | null;
  items: Array<{ name: string; quantity: number; unitPrice: number }>;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  paymentMethod?: string;
}): string {
  const phone = cleanPhoneForWhatsApp(params.customerPhone);
  const name = params.customerName?.trim() || "Valued Client";
  const receiptNo = params.receiptNo || "MOBILE";
  const dateStr = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  let text = `*AVENCIA LUXURY PERFUMES RECEIPT*\n`;
  text += `Receipt No: #${receiptNo}\n`;
  text += `Date: ${dateStr}\n`;
  text += `Customer: ${name}\n`;
  text += `----------------------------------------\n`;

  if (params.items && params.items.length > 0) {
    params.items.forEach((item) => {
      const lineTotal = (item.quantity * item.unitPrice).toFixed(2);
      text += `• ${item.name}\n  ${item.quantity} x GH₵${item.unitPrice.toFixed(2)} = GH₵${lineTotal}\n`;
    });
  }

  text += `----------------------------------------\n`;
  text += `*Total Amount:* GH₵ ${params.totalAmount.toFixed(2)}\n`;
  text += `*Amount Paid:* GH₵ ${params.amountPaid.toFixed(2)}\n`;

  if (params.balanceDue > 0) {
    text += `*BALANCE DUE:* GH₵ ${params.balanceDue.toFixed(2)}\n`;
    text += `*Status:* PARTIAL CREDIT\n`;
  } else {
    text += `*Status:* FULLY PAID\n`;
  }

  text += `*Payment Channel:* ${params.paymentMethod || "CASH"}\n\n`;
  text += `Thank you for shopping with *Avencia Luxury Perfumes*! 🛍️✨\n`;
  text += `_Authentic scents & luxury oils._`;

  return phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/**
 * Builds a payment receipt message for recorded debt settlements
 */
export function getPaymentReceiptWhatsAppUrl(params: {
  customerName: string;
  customerPhone?: string | null;
  amountPaid: number;
  remainingDebt: number;
  paymentMethod?: string;
}): string {
  const phone = cleanPhoneForWhatsApp(params.customerPhone);
  const name = params.customerName.trim();
  const dateStr = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  let text = `*AVENCIA LUXURY PERFUMES PAYMENT RECEIPT*\n`;
  text += `Date: ${dateStr}\n`;
  text += `Customer: ${name}\n`;
  text += `----------------------------------------\n`;
  text += `*Payment Received:* GH₵ ${params.amountPaid.toFixed(2)}\n`;
  text += `*Payment Method:* ${params.paymentMethod || "CASH"}\n`;

  if (params.remainingDebt > 0) {
    text += `*Remaining Balance:* GH₵ ${params.remainingDebt.toFixed(2)}\n`;
    text += `*Status:* PARTIAL SETTLEMENT\n`;
  } else {
    text += `*Remaining Balance:* GH₵ 0.00\n`;
    text += `*Status:* DEBT FULLY SETTLED 🎉\n`;
  }

  text += `----------------------------------------\n`;
  text += `Thank you for your prompt payment! 🙏✨\n`;
  text += `*Avencia Luxury Perfumes*`;

  return phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/**
 * Builds an invoice-specific payment reminder message
 */
export function getInvoiceDebtReminderWhatsAppUrl(params: {
  customerName: string;
  customerPhone?: string | null;
  saleId: string;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  dueDate?: string | null;
}): string {
  const phone = cleanPhoneForWhatsApp(params.customerPhone);
  const name = params.customerName.trim();
  const dueStr = params.dueDate
    ? new Date(params.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "as agreed";

  let text = `Hello ${name}! 👋\n\n`;
  text += `This is a friendly payment reminder from *Avencia Luxury Perfumes* regarding your purchase.\n\n`;
  text += `📌 *Invoice Details*:\n`;
  text += `• Invoice Ref: #${params.saleId.slice(0, 8).toUpperCase()}\n`;
  text += `• Total Amount: GH₵ ${params.totalAmount.toFixed(2)}\n`;
  text += `• Amount Paid: GH₵ ${params.amountPaid.toFixed(2)}\n`;
  text += `• *Remaining Balance*: *GH₵ ${params.balanceDue.toFixed(2)}*\n`;
  text += `• *Payment Due Date*: *${dueStr}*\n\n`;
  text += `Kindly arrange payment or let us know if you need our MoMo details. Thank you! 🙏✨`;

  return phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;
}

