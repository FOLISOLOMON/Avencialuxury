import { prisma, ensureDefaultBusiness } from "@/lib/db/prisma";
import { Prisma, PaymentMethod, PaymentStatus } from "@prisma/client";
import { createNotification } from "./notifications";
import { automationEngine } from "@/lib/automation/engine";
import { BusinessEventType } from "@/lib/automation/events";
import { logAudit } from "./audit";

export interface RecordDebtPaymentInput {
  businessId: string;
  collectorId?: string | null;
  customerId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  notes?: string | null;
  saleId?: string | null;
  idempotencyKey?: string | null;
}

export async function emitCustomerDebtCreated(params: {
  businessId: string;
  customerId: string;
  saleId: string;
  amount: number;
}) {
  try {
    await automationEngine.emit({
      eventType: BusinessEventType.CUSTOMER_DEBT_CREATED,
      businessId: params.businessId,
      entityType: "CUSTOMER",
      entityId: params.customerId,
      dedupeKey: `CUSTOMER_DEBT_CREATED:${params.saleId}`,
      metadata: {
        saleId: params.saleId,
        customerId: params.customerId,
        amount: params.amount,
      },
    });
  } catch (err) {
    console.error("Failed to emit CUSTOMER_DEBT_CREATED event:", err);
  }
}

/**
 * Previews payment allocation across a customer's outstanding debts.
 * Used to show an allocation breakdown before finalizing payment.
 */
export async function previewDebtPaymentAllocation(params: {
  businessId: string;
  customerId: string;
  amount: number;
  saleId?: string | null;
}) {
  await ensureDefaultBusiness(params.businessId);

  const unpaidSales = await prisma.sale.findMany({
    where: {
      businessId: params.businessId,
      customerId: params.customerId,
      status: { notIn: ["VOIDED", "REFUNDED"] },
      paymentStatus: { in: [PaymentStatus.PARTIAL, PaymentStatus.UNPAID] },
      balanceDue: { gt: 0 },
    },
    orderBy: { saleDate: "asc" },
  });

  // Sort: specified sale first, then oldest first
  const sortedSales = [...unpaidSales].sort((a, b) => {
    if (params.saleId) {
      if (a.id === params.saleId) return -1;
      if (b.id === params.saleId) return 1;
    }
    return new Date(a.saleDate).getTime() - new Date(b.saleDate).getTime();
  });

  const totalOutstanding = Math.round(
    unpaidSales.reduce((sum, s) => sum + s.balanceDue.toNumber(), 0) * 100
  ) / 100;

  let remaining = Math.round(params.amount * 100) / 100;
  const allocations: Array<{
    saleId: string;
    saleDate: Date;
    previousBalance: number;
    allocatedAmount: number;
    remainingBalance: number;
  }> = [];

  for (const sale of sortedSales) {
    if (remaining <= 0) break;
    const balance = sale.balanceDue.toNumber();
    const applyAmount = Math.min(remaining, balance);
    const newBalance = Math.max(0, Math.round((balance - applyAmount) * 100) / 100);

    allocations.push({
      saleId: sale.id,
      saleDate: sale.saleDate,
      previousBalance: balance,
      allocatedAmount: applyAmount,
      remainingBalance: newBalance,
    });

    remaining = Math.round((remaining - applyAmount) * 100) / 100;
  }

  return {
    totalOutstanding,
    paymentAmount: params.amount,
    allocations,
    remainingUnallocated: remaining,
  };
}

export async function recordDebtPayment(input: RecordDebtPaymentInput) {
  await ensureDefaultBusiness(input.businessId);

  const { businessId, collectorId, customerId, amount, paymentMethod, notes, saleId, idempotencyKey } = input;

  if (amount <= 0) {
    throw new Error("Payment amount must be greater than 0");
  }

  // 1. Idempotency Check: Return existing payment if idempotencyKey was already processed
  if (idempotencyKey) {
    const existingPayment = await prisma.debtPayment.findUnique({
      where: { idempotencyKey },
    });
    if (existingPayment) {
      return existingPayment;
    }
  }

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, businessId },
  });

  if (!customer) {
    throw new Error("Customer not found");
  }

  const cleanAmount = Math.round(amount * 100) / 100;

  // 2. Interactive Database Transaction with Concurrency Control
  const result = await prisma.$transaction(
    async (tx) => {
      // Re-fetch all unpaid/partial sales inside the transaction
      const unpaidSales = await tx.sale.findMany({
        where: {
          businessId,
          customerId,
          status: { notIn: ["VOIDED", "REFUNDED"] },
          paymentStatus: { in: [PaymentStatus.PARTIAL, PaymentStatus.UNPAID] },
          balanceDue: { gt: 0 },
        },
        orderBy: { saleDate: "asc" },
      });

      const totalOutstanding = Math.round(
        unpaidSales.reduce((sum, s) => sum + s.balanceDue.toNumber(), 0) * 100
      ) / 100;

      if (totalOutstanding <= 0) {
        throw new Error(`${customer.name} has no outstanding debt to settle.`);
      }

      if (cleanAmount > totalOutstanding) {
        throw new Error(
          `Payment amount (GH₵${cleanAmount.toFixed(2)}) cannot exceed the outstanding debt of GH₵${totalOutstanding.toFixed(2)}.`
        );
      }

      // Sort: specified sale first, then oldest first
      const sortedSales = [...unpaidSales].sort((a, b) => {
        if (saleId) {
          if (a.id === saleId) return -1;
          if (b.id === saleId) return 1;
        }
        return new Date(a.saleDate).getTime() - new Date(b.saleDate).getTime();
      });

      let remainingPaymentToApply = cleanAmount;
      const allocationBreakdown: Array<{
        saleId: string;
        amountApplied: number;
        previousBalance: number;
        newBalance: number;
      }> = [];

      for (const sale of sortedSales) {
        if (remainingPaymentToApply <= 0) break;

        const currentBalance = sale.balanceDue.toNumber();
        const currentPaid = sale.amountPaid.toNumber();
        const totalSaleAmount = sale.totalAmount.toNumber();

        if (currentBalance <= 0) continue;

        const applyAmount = Math.min(remainingPaymentToApply, currentBalance);
        const newPaid = Math.round((currentPaid + applyAmount) * 100) / 100;
        const newBalance = Math.max(0, Math.round((totalSaleAmount - newPaid) * 100) / 100);
        const newPaymentStatus = newBalance === 0 ? PaymentStatus.PAID : PaymentStatus.PARTIAL;
        const newSaleStatus = newBalance === 0 ? "COMPLETED" : "PARTIAL";

        await tx.sale.update({
          where: { id: sale.id },
          data: {
            amountPaid: new Prisma.Decimal(newPaid),
            balanceDue: new Prisma.Decimal(newBalance),
            paymentStatus: newPaymentStatus,
            status: newSaleStatus,
          },
        });

        allocationBreakdown.push({
          saleId: sale.id,
          amountApplied: applyAmount,
          previousBalance: currentBalance,
          newBalance,
        });

        remainingPaymentToApply = Math.round((remainingPaymentToApply - applyAmount) * 100) / 100;
      }

      // Record DebtPayment transaction
      const debtPayment = await tx.debtPayment.create({
        data: {
          businessId,
          customerId,
          collectorId: collectorId || null,
          saleId: saleId || null,
          amount: new Prisma.Decimal(cleanAmount),
          paymentMethod,
          idempotencyKey: idempotencyKey || null,
          allocationBreakdown: allocationBreakdown as any,
          notes: notes || `Debt repayment from ${customer.name}`,
        },
        include: {
          customer: true,
          collector: { select: { id: true, name: true, email: true } },
        },
      });

      return { debtPayment, allocationBreakdown, previousBalance: totalOutstanding };
    },
    { maxWait: 10000, timeout: 20000 }
  );

  const activeSalesAfter = await prisma.sale.findMany({
    where: { businessId, customerId, status: { notIn: ["VOIDED", "REFUNDED"] } },
    select: { balanceDue: true },
  });
  const newBalance = Math.round(
    activeSalesAfter.reduce((sum, s) => sum + s.balanceDue.toNumber(), 0) * 100
  ) / 100;

  // Log Audit Entry
  await logAudit({
    businessId,
    userId: collectorId,
    action: "PAYMENT_RECORDED",
    entityType: "DEBT_PAYMENT",
    entityId: result.debtPayment.id,
    details: {
      customerId,
      amount: cleanAmount,
      previousBalance: result.previousBalance,
      newBalance,
      allocationsCount: result.allocationBreakdown.length,
      idempotencyKey,
    },
  });

  try {
    await createNotification({
      businessId: input.businessId,
      type: "DEBT_PAYMENT_RECEIVED",
      category: "CUSTOMERS",
      severity: "SUCCESS",
      title: "Debt Payment Received",
      message: `Received GH₵${amount.toFixed(2)} debt payment from ${customer.name}.`,
      actionLabel: "View Debtors",
      actionUrl: "/customers",
      entityType: "CUSTOMER",
      entityId: customer.id,
    });

    await automationEngine.emit({
      eventType: BusinessEventType.CUSTOMER_PAYMENT_RECEIVED,
      businessId: input.businessId,
      entityType: "CUSTOMER",
      entityId: customer.id,
      dedupeKey: `CUSTOMER_PAYMENT_RECEIVED:${result.debtPayment.id}`,
      metadata: {
        paymentId: result.debtPayment.id,
        customerId: customer.id,
        customerName: customer.name,
        amount: input.amount,
        paymentMethod: input.paymentMethod,
        remainingBalance: newBalance,
      },
    });

    if (result.previousBalance > 0 && newBalance === 0) {
      await createNotification({
        businessId: input.businessId,
        type: "DEBT_SETTLED",
        category: "CUSTOMERS",
        severity: "SUCCESS",
        title: "Debt Fully Settled",
        message: `${customer.name} has fully settled their outstanding balance.`,
        actionLabel: "View Customer",
        actionUrl: `/customers?id=${customer.id}`,
        entityType: "CUSTOMER",
        entityId: customer.id,
        dedupeKey: `DEBT_SETTLED:${customer.id}:${result.debtPayment.id}`,
      });

      await automationEngine.emit({
        eventType: BusinessEventType.DEBT_SETTLED,
        businessId: input.businessId,
        entityType: "CUSTOMER",
        entityId: customer.id,
        dedupeKey: `DEBT_SETTLED:${customer.id}:${result.debtPayment.id}`,
        metadata: {
          customerId: customer.id,
          customerName: customer.name,
          previousBalance: result.previousBalance,
          newBalance: 0,
        },
      });
    }
  } catch (err) {
    console.error("Failed to trigger debt payment notification/event:", err);
  }

  return result;
}

export async function getDebtorsList(businessId: string) {
  await ensureDefaultBusiness(businessId);

  const debtors = await prisma.customer.findMany({
    where: {
      businessId,
      sales: {
        some: {
          status: { notIn: ["VOIDED", "REFUNDED"] },
          paymentStatus: { in: [PaymentStatus.PARTIAL, PaymentStatus.UNPAID] },
        },
      },
    },
    include: {
      sales: {
        where: {
          status: { notIn: ["VOIDED", "REFUNDED"] },
          paymentStatus: { in: [PaymentStatus.PARTIAL, PaymentStatus.UNPAID] },
        },
        orderBy: { saleDate: "desc" },
      },
      debtPayments: {
        orderBy: { paymentDate: "desc" },
      },
    },
  });

  return debtors.map((d) => {
    const totalOutstandingDebt = d.sales.reduce((sum, s) => sum + s.balanceDue.toNumber(), 0);
    const unpaidSalesCount = d.sales.length;

    return {
      ...d,
      totalOutstandingDebt,
      unpaidSalesCount,
    };
  });
}

export interface DebtDashboardSummary {
  totalOutstandingDebt: number;
  debtorsCount: number;
  totalUnpaidSalesCount: number;
  dueToday: {
    count: number;
    amount: number;
  };
  upcoming: {
    count: number;
    amount: number;
  };
  overdue: {
    count: number;
    amount: number;
    customerCount: number;
  };
  noDueDate: {
    count: number;
    amount: number;
  };
  items: Array<{
    saleId: string;
    saleDate: string;
    dueDate: string | null;
    totalAmount: number;
    amountPaid: number;
    balanceDue: number;
    customerId: string | null;
    customerName: string;
    customerPhone: string | null;
    status: "OVERDUE" | "DUE_TODAY" | "UPCOMING" | "NO_DUE_DATE";
    daysDifference: number | null;
  }>;
}

export async function getDebtDashboardSummary(businessId: string): Promise<DebtDashboardSummary> {
  await ensureDefaultBusiness(businessId);

  const activeUnpaidSales = await prisma.sale.findMany({
    where: {
      businessId,
      status: { notIn: ["VOIDED", "REFUNDED"] },
      paymentStatus: { in: [PaymentStatus.PARTIAL, PaymentStatus.UNPAID] },
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
    orderBy: [{ dueDate: "asc" }, { saleDate: "desc" }],
  });

  const now = new Date();
  const todayYMD = now.toISOString().slice(0, 10);
  const nowMs = new Date(todayYMD).getTime();

  let totalOutstandingDebt = 0;
  const debtorIds = new Set<string>();
  const overdueDebtorIds = new Set<string>();

  let dueTodayCount = 0;
  let dueTodayAmount = 0;

  let upcomingCount = 0;
  let upcomingAmount = 0;

  let overdueCount = 0;
  let overdueAmount = 0;

  let noDueDateCount = 0;
  let noDueDateAmount = 0;

  const items: DebtDashboardSummary["items"] = [];

  for (const s of activeUnpaidSales) {
    const balance = s.balanceDue.toNumber();
    if (balance <= 0) continue;

    totalOutstandingDebt += balance;
    if (s.customerId) debtorIds.add(s.customerId);

    let status: "OVERDUE" | "DUE_TODAY" | "UPCOMING" | "NO_DUE_DATE" = "NO_DUE_DATE";
    let daysDiff: number | null = null;

    if (s.dueDate) {
      const dueYMD = s.dueDate.toISOString().slice(0, 10);
      const dueMs = new Date(dueYMD).getTime();
      daysDiff = Math.round((dueMs - nowMs) / (1000 * 60 * 60 * 24));

      if (daysDiff < 0) {
        status = "OVERDUE";
        overdueCount++;
        overdueAmount += balance;
        if (s.customerId) overdueDebtorIds.add(s.customerId);
      } else if (daysDiff === 0) {
        status = "DUE_TODAY";
        dueTodayCount++;
        dueTodayAmount += balance;
      } else {
        status = "UPCOMING";
        upcomingCount++;
        upcomingAmount += balance;
      }
    } else {
      status = "NO_DUE_DATE";
      noDueDateCount++;
      noDueDateAmount += balance;
    }

    items.push({
      saleId: s.id,
      saleDate: s.saleDate.toISOString(),
      dueDate: s.dueDate ? s.dueDate.toISOString() : null,
      totalAmount: s.totalAmount.toNumber(),
      amountPaid: s.amountPaid.toNumber(),
      balanceDue: balance,
      customerId: s.customerId,
      customerName: s.customer?.name || "Walk-in Client",
      customerPhone: s.customer?.phone || null,
      status,
      daysDifference: daysDiff,
    });
  }

  return {
    totalOutstandingDebt: Math.round(totalOutstandingDebt * 100) / 100,
    debtorsCount: debtorIds.size,
    totalUnpaidSalesCount: items.length,
    dueToday: {
      count: dueTodayCount,
      amount: Math.round(dueTodayAmount * 100) / 100,
    },
    upcoming: {
      count: upcomingCount,
      amount: Math.round(upcomingAmount * 100) / 100,
    },
    overdue: {
      count: overdueCount,
      amount: Math.round(overdueAmount * 100) / 100,
      customerCount: overdueDebtorIds.size,
    },
    noDueDate: {
      count: noDueDateCount,
      amount: Math.round(noDueDateAmount * 100) / 100,
    },
    items,
  };
}
