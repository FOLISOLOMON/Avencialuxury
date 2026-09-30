import { prisma, DEFAULT_BUSINESS_ID } from "@/lib/db/prisma";
import { formatGhanaPhoneNumber } from "@/lib/utils";
import { WhatsAppDeliveryStatus, WhatsAppMessageType } from "@prisma/client";

export interface SendWhatsAppParams {
  businessId?: string;
  customerId?: string | null;
  messageType: WhatsAppMessageType;
  phone?: string | null;
  customMessage?: string;
  saleId?: string;
  paymentId?: string;
  dedupeKey?: string;
  forceSend?: boolean;
}

export interface WhatsAppResult {
  success: boolean;
  status: WhatsAppDeliveryStatus;
  message: string;
  url?: string;
  phone?: string;
  reason?: string;
  logId?: string;
}

/**
 * Builds UTF-8 clean WhatsApp text messages for various business events.
 */
export function buildWhatsAppMessage(
  type: WhatsAppMessageType,
  data: {
    customerName?: string;
    totalOrders?: number;
    outstandingBalance?: number;
    saleRef?: string;
    totalAmount?: number;
    amountPaid?: number;
    balanceDue?: number;
    paymentMethod?: string;
    businessName?: string;
    paymentAmount?: number;
  }
): string {
  const bizName = data.businessName || "Avencia Perfumes";
  const name = data.customerName || "Valued Client";

  switch (type) {
    case "PAYMENT_REMINDER": {
      const debt = data.outstandingBalance ? data.outstandingBalance.toFixed(2) : "0.00";
      return (
        `Hello ${name}! 👋\n\n` +
        `This is a gentle payment reminder from *${bizName}* regarding your account balance.\n\n` +
        `📌 *Account Summary*:\n` +
        `• Customer: ${name}\n` +
        `• Outstanding Balance: GH₵ ${debt}\n\n` +
        `Please contact us or reply to this message to arrange payment or make a partial settlement. Thank you for your continued business! 🙏✨`
      );
    }

    case "DEBT_SETTLED": {
      return (
        `Hello ${name}! 🎉\n\n` +
        `We are pleased to confirm that your outstanding balance with *${bizName}* has been *fully settled* (GH₵ 0.00 balance).\n\n` +
        `Thank you so much for your prompt payment and support! We look forward to serving you again soon. ✨`
      );
    }

    case "SALE_RECEIPT": {
      const ref = data.saleRef ? `#${data.saleRef.slice(-6)}` : "Receipt";
      const total = data.totalAmount ? data.totalAmount.toFixed(2) : "0.00";
      const paid = data.amountPaid ? data.amountPaid.toFixed(2) : "0.00";
      const due = data.balanceDue ? data.balanceDue.toFixed(2) : "0.00";

      let receiptText =
        `*${bizName.toUpperCase()} RECEIPT*\n` +
        `Invoice Ref: ${ref}\n` +
        `Customer: ${name}\n` +
        `----------------------------------------\n` +
        `Total Invoice Amount: GH₵ ${total}\n` +
        `Amount Paid: GH₵ ${paid}\n`;

      if (data.balanceDue && data.balanceDue > 0) {
        receiptText += `*BALANCE DUE: GH₵ ${due}*\nStatus: PARTIAL CREDIT\n`;
      } else {
        receiptText += `*STATUS: FULLY PAID*\n`;
      }

      receiptText += `Payment Method: ${data.paymentMethod || "CASH"}\n\nThank you for shopping with *${bizName}*! 🛍️✨`;
      return receiptText;
    }

    case "PAYMENT_RECEIPT": {
      const amt = data.paymentAmount ? data.paymentAmount.toFixed(2) : "0.00";
      const remaining = data.outstandingBalance ? data.outstandingBalance.toFixed(2) : "0.00";

      return (
        `*${bizName.toUpperCase()} PAYMENT RECEIPT*\n` +
        `Customer: ${name}\n` +
        `Payment Received: GH₵ ${amt}\n` +
        `Remaining Balance: GH₵ ${remaining}\n` +
        `----------------------------------------\n` +
        `Thank you for your payment to *${bizName}*! 🙏`
      );
    }

    default:
      return `Hello ${name}, thank you for choosing *${bizName}*!`;
  }
}

/**
 * Server-Side Authoritative WhatsApp Message Handler with Guard & Logging
 */
export async function sendOrQueueWhatsAppMessage(params: SendWhatsAppParams): Promise<WhatsAppResult> {
  const businessId = params.businessId || DEFAULT_BUSINESS_ID;

  // 1. Fetch Business Profile
  const business = await prisma.business.findUnique({
    where: { id: businessId },
  });
  const businessName = business?.name || "Avencia Perfumes";

  let customer = null;
  if (params.customerId) {
    customer = await prisma.customer.findFirst({
      where: { id: params.customerId, businessId },
      include: {
        sales: {
          where: { status: { notIn: ["VOIDED", "REFUNDED"] } },
        },
      },
    });
  }

  const rawPhone = params.phone || customer?.phone || null;
  const formattedPhone = rawPhone ? formatGhanaPhoneNumber(rawPhone) : null;
  const cleanPhone = formattedPhone ? formattedPhone.replace(/[^0-9]/g, "") : null;

  // 2. Phone Validation Guard
  if (!cleanPhone || cleanPhone.length < 9) {
    const log = await prisma.whatsAppLog.create({
      data: {
        businessId,
        customerId: params.customerId || null,
        messageType: params.messageType,
        phone: rawPhone || "UNKNOWN",
        message: params.customMessage || "Invalid Phone Number",
        status: "FAILED",
        error: "INVALID_PHONE: Phone number missing or malformed",
        dedupeKey: params.dedupeKey,
      },
    });

    return {
      success: false,
      status: "FAILED",
      message: "Customer phone number is invalid or missing.",
      reason: "INVALID_PHONE",
      logId: log.id,
    };
  }

  // 3. Authoritative Current Outstanding Balance Calculation
  let currentBalance = 0;
  let totalOrdersCount = 0;
  if (customer) {
    totalOrdersCount = customer.sales.length;
    currentBalance = Math.max(
      0,
      Math.round(customer.sales.reduce((sum, s) => sum + Number(s.balanceDue || 0), 0) * 100) / 100
    );
  }

  // 4. Zero-Balance Protection Guard for PAYMENT_REMINDER
  if (params.messageType === "PAYMENT_REMINDER" && currentBalance <= 0 && !params.forceSend) {
    const log = await prisma.whatsAppLog.create({
      data: {
        businessId,
        customerId: params.customerId || null,
        messageType: params.messageType,
        phone: cleanPhone,
        message: "Blocked payment reminder: Outstanding balance is GH₵0.00",
        status: "CANCELLED",
        error: "ZERO_BALANCE_GUARD: Customer balance is 0.00",
        dedupeKey: params.dedupeKey,
      },
    });

    return {
      success: false,
      status: "CANCELLED",
      message: "Payment reminder blocked: Customer outstanding balance is GH₵0.00.",
      reason: "ZERO_BALANCE_GUARD",
      logId: log.id,
    };
  }

  // 5. Deduplication & 24-Hour Cooldown Check for Payment Reminders
  if (params.messageType === "PAYMENT_REMINDER" && !params.forceSend) {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const existingLog = await prisma.whatsAppLog.findFirst({
      where: {
        businessId,
        customerId: params.customerId || undefined,
        messageType: "PAYMENT_REMINDER",
        status: { in: ["SENT", "DELIVERED", "QUEUED"] },
        createdAt: { gte: twentyFourHoursAgo },
      },
    });

    if (existingLog) {
      const log = await prisma.whatsAppLog.create({
        data: {
          businessId,
          customerId: params.customerId || null,
          messageType: params.messageType,
          phone: cleanPhone,
          message: "Blocked duplicate reminder due to 24h cooldown",
          status: "CANCELLED",
          error: "COOLDOWN_ACTIVE: Payment reminder already sent within last 24 hours",
          dedupeKey: params.dedupeKey,
        },
      });

      return {
        success: false,
        status: "CANCELLED",
        message: "Payment reminder skipped: A reminder was already sent to this customer in the last 24 hours.",
        reason: "COOLDOWN_ACTIVE",
        logId: log.id,
      };
    }
  }

  // 6. Generate Message Content
  const messageText =
    params.customMessage ||
    buildWhatsAppMessage(params.messageType, {
      customerName: customer?.name || "Customer",
      totalOrders: totalOrdersCount,
      outstandingBalance: currentBalance,
      businessName,
    });

  // 7. Create Deep Link URL
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;

  // 8. Log Execution
  const log = await prisma.whatsAppLog.create({
    data: {
      businessId,
      customerId: params.customerId || null,
      messageType: params.messageType,
      phone: cleanPhone,
      message: messageText,
      status: "SENT",
      dedupeKey: params.dedupeKey,
      sentAt: new Date(),
    },
  });

  return {
    success: true,
    status: "SENT",
    message: "WhatsApp message generated and logged successfully.",
    url: whatsappUrl,
    phone: cleanPhone,
    logId: log.id,
  };
}

/**
 * Retrieves WhatsApp message log history for audit and automation tracking.
 */
export async function getWhatsAppLogs(businessId: string = DEFAULT_BUSINESS_ID, limit = 50) {
  return await prisma.whatsAppLog.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      customer: { select: { id: true, name: true, phone: true } },
    },
  });
}
