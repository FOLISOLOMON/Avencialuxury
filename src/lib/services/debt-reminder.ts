import { prisma, DEFAULT_BUSINESS_ID, ensureDefaultBusiness } from "@/lib/db/prisma";
import { PaymentStatus, SaleStatus } from "@prisma/client";
import { sendPushNotification } from "./push";
import { createNotification } from "./notifications";

export interface DebtReminderScanResult {
  businessId: string;
  scannedDebtsCount: number;
  upcomingRemindersSent: number;
  dueTodayRemindersSent: number;
  overdueRemindersSent: number;
  skippedQuietHours: boolean;
  errors: string[];
}

/**
 * Helper to check if current time in business timezone falls within quiet hours.
 */
function isWithinQuietHours(now: Date, quietStart?: string | null, quietEnd?: string | null, timezone = "Africa/Accra"): boolean {
  if (!quietStart || !quietEnd) return false;

  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
    const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
    const currentMins = hour * 60 + minute;

    const [startH, startM] = quietStart.split(":").map(Number);
    const [endH, endM] = quietEnd.split(":").map(Number);
    const startMins = startH * 60 + (startM || 0);
    const endMins = endH * 60 + (endM || 0);

    if (startMins <= endMins) {
      return currentMins >= startMins && currentMins < endMins;
    } else {
      // Wraps around midnight (e.g., 21:00 to 08:00)
      return currentMins >= startMins || currentMins < endMins;
    }
  } catch (err) {
    console.warn("Timezone calculation error in isWithinQuietHours:", err);
    return false;
  }
}

/**
 * Format date in business timezone as YYYY-MM-DD
 */
function formatDateInTimezone(date: Date, timezone = "Africa/Accra"): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(date); // YYYY-MM-DD
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/**
 * Scan all debts approaching or past due dates and trigger external push notifications.
 * Strictly adheres to:
 * 1. Only sales with valid dueDate are evaluated (never invent due dates).
 * 2. Re-queries balanceDue right before dispatch (never reminds paid debts).
 * 3. Idempotent per day per reminder type via PushDeliveryLog.dedupeKey.
 */
export async function runDebtReminderScan(businessId = DEFAULT_BUSINESS_ID): Promise<DebtReminderScanResult> {
  await ensureDefaultBusiness(businessId);

  // 1. Fetch business notification settings
  const settings = await prisma.notificationSetting.findUnique({
    where: { businessId },
  });

  const timezone = settings?.timezone || "Africa/Accra";
  const now = new Date();
  const todayStr = formatDateInTimezone(now, timezone);

  const result: DebtReminderScanResult = {
    businessId,
    scannedDebtsCount: 0,
    upcomingRemindersSent: 0,
    dueTodayRemindersSent: 0,
    overdueRemindersSent: 0,
    skippedQuietHours: false,
    errors: [],
  };

  // Check if push notifications are enabled
  if (settings && settings.pushEnabled === false) {
    return result;
  }

  // Quiet hours check
  if (isWithinQuietHours(now, settings?.quietHoursStart, settings?.quietHoursEnd, timezone)) {
    result.skippedQuietHours = true;
    return result;
  }

  // 2. Query all unpaid or partially paid sales that have a recorded dueDate
  const creditSales = await prisma.sale.findMany({
    where: {
      businessId,
      status: { notIn: [SaleStatus.VOIDED, SaleStatus.REFUNDED] },
      paymentStatus: { in: [PaymentStatus.PARTIAL, PaymentStatus.UNPAID] },
      balanceDue: { gt: 0 },
      dueDate: { not: null }, // Strictly require real dueDate recorded in database
    },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
    },
    orderBy: { dueDate: "asc" },
  });

  result.scannedDebtsCount = creditSales.length;

  const upcomingEnabled = settings?.upcomingRemindersEnabled ?? true;
  const advanceDays = settings?.upcomingDaysAdvance ?? 1;
  const dueTodayEnabled = settings?.dueTodayEnabled ?? true;
  const overdueEnabled = settings?.overdueEnabled ?? true;
  const overdueInterval = settings?.overdueIntervalDays ?? 3;
  const showDetails = settings?.showCustomerDetailsInPush ?? false;

  for (const sale of creditSales) {
    if (!sale.dueDate) continue;

    // Authoritative check: re-verify current balance is strictly > 0
    const currentBalance = sale.balanceDue.toNumber();
    if (currentBalance <= 0) continue;

    const dueDateStr = formatDateInTimezone(sale.dueDate, timezone);

    // Calculate calendar days difference (DueDate - Today)
    const dueTime = new Date(`${dueDateStr}T00:00:00Z`).getTime();
    const todayTime = new Date(`${todayStr}T00:00:00Z`).getTime();
    const diffDays = Math.round((dueTime - todayTime) / (1000 * 60 * 60 * 24));

    const customerName = sale.customer?.name || "Customer";
    const amountStr = `GH₵ ${currentBalance.toFixed(2)}`;

    // A. UPCOMING PAYMENT (diffDays === advanceDays)
    if (upcomingEnabled && diffDays === advanceDays) {
      const dedupeKey = `PUSH_DEBT:${sale.id}:UPCOMING:${todayStr}`;

      const title = "Avencia — Payment Due Soon";
      const body = showDetails
        ? `Payment of ${amountStr} for ${customerName} is due tomorrow.`
        : "A customer payment is due tomorrow. Open Avencia to review the details.";

      try {
        const dispatch = await sendPushNotification({
          businessId,
          notificationType: "UPCOMING_PAYMENT",
          title,
          body,
          url: `/customers?id=${sale.customerId || ""}&saleId=${sale.id}`,
          entityType: "SALE",
          entityId: sale.id,
          customerId: sale.customerId || undefined,
          saleId: sale.id,
          dedupeKey,
          scheduledDate: sale.dueDate,
          extraData: {
            customerName,
            balanceDue: currentBalance,
            dueDate: sale.dueDate.toISOString(),
          },
        });

        if (dispatch.status === "SENT") {
          result.upcomingRemindersSent++;
          // Also record in-app notification
          await createNotification({
            businessId,
            type: "UPCOMING_PAYMENT",
            category: "CUSTOMERS",
            severity: "INFO",
            title,
            message: `Payment of ${amountStr} for ${customerName} is due tomorrow.`,
            actionLabel: "View Debtor",
            actionUrl: `/customers?id=${sale.customerId || ""}&saleId=${sale.id}`,
            entityType: "SALE",
            entityId: sale.id,
            dedupeKey: `INAPP_${dedupeKey}`,
          });
        }
      } catch (err: any) {
        result.errors.push(`Sale ${sale.id} UPCOMING error: ${err.message}`);
      }
    }

    // B. PAYMENT DUE TODAY (diffDays === 0)
    else if (dueTodayEnabled && diffDays === 0) {
      const dedupeKey = `PUSH_DEBT:${sale.id}:DUE_TODAY:${todayStr}`;

      const title = "Avencia — Payment Due Today";
      const body = showDetails
        ? `Payment of ${amountStr} for ${customerName} is due today.`
        : "A customer payment is due today. Open Avencia to review the account.";

      try {
        const dispatch = await sendPushNotification({
          businessId,
          notificationType: "PAYMENT_DUE_TODAY",
          title,
          body,
          url: `/customers?id=${sale.customerId || ""}&saleId=${sale.id}`,
          entityType: "SALE",
          entityId: sale.id,
          customerId: sale.customerId || undefined,
          saleId: sale.id,
          dedupeKey,
          scheduledDate: sale.dueDate,
          extraData: {
            customerName,
            balanceDue: currentBalance,
            dueDate: sale.dueDate.toISOString(),
          },
        });

        if (dispatch.status === "SENT") {
          result.dueTodayRemindersSent++;
          await createNotification({
            businessId,
            type: "PAYMENT_DUE_TODAY",
            category: "CUSTOMERS",
            severity: "WARNING",
            title,
            message: `Payment of ${amountStr} for ${customerName} is due today.`,
            actionLabel: "Remind Customer",
            actionUrl: `/customers?id=${sale.customerId || ""}&saleId=${sale.id}`,
            entityType: "SALE",
            entityId: sale.id,
            dedupeKey: `INAPP_${dedupeKey}`,
          });
        }
      } catch (err: any) {
        result.errors.push(`Sale ${sale.id} DUE_TODAY error: ${err.message}`);
      }
    }

    // C. OVERDUE PAYMENT (diffDays < 0)
    else if (overdueEnabled && diffDays < 0) {
      const daysOverdue = Math.abs(diffDays);

      // Determine recurrence eligibility: Day 1 overdue, or every `overdueInterval` days thereafter
      const isInitialOverdue = daysOverdue === 1;
      const isIntervalOccurrence = daysOverdue > 1 && daysOverdue % overdueInterval === 0;

      if (isInitialOverdue || isIntervalOccurrence) {
        const dedupeKey = `PUSH_DEBT:${sale.id}:OVERDUE:${todayStr}`;

        const title = "Avencia — Overdue Payment";
        const body = showDetails
          ? `Outstanding payment of ${amountStr} for ${customerName} is ${daysOverdue} day${daysOverdue > 1 ? "s" : ""} overdue.`
          : "An outstanding customer payment is past its due date. Open Avencia to review and follow up.";

        try {
          const dispatch = await sendPushNotification({
            businessId,
            notificationType: "OVERDUE_PAYMENT",
            title,
            body,
            url: `/customers?id=${sale.customerId || ""}&saleId=${sale.id}`,
            entityType: "SALE",
            entityId: sale.id,
            customerId: sale.customerId || undefined,
            saleId: sale.id,
            dedupeKey,
            scheduledDate: sale.dueDate,
            extraData: {
              customerName,
              balanceDue: currentBalance,
              daysOverdue,
            },
          });

          if (dispatch.status === "SENT") {
            result.overdueRemindersSent++;
            await createNotification({
              businessId,
              type: "OVERDUE_PAYMENT",
              category: "CUSTOMERS",
              severity: "CRITICAL",
              title,
              message: `Payment of ${amountStr} for ${customerName} is ${daysOverdue} day${daysOverdue > 1 ? "s" : ""} overdue.`,
              actionLabel: "Follow Up",
              actionUrl: `/customers?id=${sale.customerId || ""}&saleId=${sale.id}`,
              entityType: "SALE",
              entityId: sale.id,
              dedupeKey: `INAPP_${dedupeKey}`,
            });
          }
        } catch (err: any) {
          result.errors.push(`Sale ${sale.id} OVERDUE error: ${err.message}`);
        }
      }
    }
  }

  return result;
}

/**
 * Helper to update due date on a specific credit sale.
 */
export async function updateSaleDueDate(params: {
  saleId: string;
  dueDate: Date | null;
  businessId?: string;
}) {
  const businessId = params.businessId || DEFAULT_BUSINESS_ID;

  const sale = await prisma.sale.findFirst({
    where: { id: params.saleId, businessId },
  });

  if (!sale) {
    throw new Error("Sale not found");
  }

  return await prisma.sale.update({
    where: { id: params.saleId },
    data: {
      dueDate: params.dueDate,
    },
  });
}
