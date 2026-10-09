import { prisma, ensureDefaultBusiness } from "@/lib/db/prisma";
import { Prisma, PaymentMethod, PaymentStatus } from "@prisma/client";
import { createNotification } from "./notifications";
import { automationEngine } from "@/lib/automation/engine";
import { BusinessEventType } from "@/lib/automation/events";

export interface RecordDebtPaymentInput {
  businessId: string;
  customerId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  notes?: string | null;
  saleId?: string | null;
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

export async function recordDebtPayment(input: RecordDebtPaymentInput) {
  await ensureDefaultBusiness(input.businessId);

  const { businessId, customerId, amount, paymentMethod, notes, saleId } = input;

  if (amount <= 0) {
    throw new Error("Payment amount must be greater than 0");
  }

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, businessId },
  });

  if (!customer) {
    throw new Error("Customer not found");
  }

  // Calculate customer previous balance
  const activeSalesBefore = await prisma.sale.findMany({
    where: { businessId, customerId, status: { notIn: ["VOIDED", "REFUNDED"] } },
    select: { balanceDue: true },
  });
  const previousBalance = Math.round(
    activeSalesBefore.reduce((sum, s) => sum + s.balanceDue.toNumber(), 0) * 100
  ) / 100;

  if (previousBalance <= 0) {
    throw new Error(`${customer.name} has no outstanding debt to settle.`);
  }

  if (amount > previousBalance) {
    throw new Error(`Payment amount (GH₵${amount.toFixed(2)}) cannot exceed the outstanding debt of GH₵${previousBalance.toFixed(2)}.`);
  }

  const result = await prisma.$transaction(async (tx) => {
    // Log DebtPayment transaction
    const debtPayment = await tx.debtPayment.create({
      data: {
        businessId,
        customerId,
        saleId: saleId || null,
        amount: new Prisma.Decimal(amount),
        paymentMethod,
        notes: notes || `Debt repayment from ${customer.name}`,
      },
    });

    // Fetch unpaid or partially paid sales for this customer (oldest first)
    const salesWhere: any = {
      businessId,
      customerId,
      status: { notIn: ["VOIDED", "REFUNDED"] },
      paymentStatus: { in: [PaymentStatus.PARTIAL, PaymentStatus.UNPAID] },
    };

    if (saleId) {
      salesWhere.id = saleId;
    }

    const unpaidSales = await tx.sale.findMany({
      where: salesWhere,
      orderBy: { saleDate: "asc" },
    });

    let remainingPaymentToApply = amount;

    for (const sale of unpaidSales) {
      if (remainingPaymentToApply <= 0) break;

      const currentBalance = sale.balanceDue.toNumber();
      const currentPaid = sale.amountPaid.toNumber();
      const totalAmount = sale.totalAmount.toNumber();

      if (currentBalance <= 0) continue;

      const applyAmount = Math.min(remainingPaymentToApply, currentBalance);
      const newPaid = Math.round((currentPaid + applyAmount) * 100) / 100;
      const newBalance = Math.max(0, Math.round((totalAmount - newPaid) * 100) / 100);
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

      remainingPaymentToApply = Math.round((remainingPaymentToApply - applyAmount) * 100) / 100;
    }

    return debtPayment;
  });

  // Calculate customer new balance
  const activeSalesAfter = await prisma.sale.findMany({
    where: { businessId, customerId, status: { notIn: ["VOIDED", "REFUNDED"] } },
    select: { balanceDue: true },
  });
  const newBalance = Math.round(
    activeSalesAfter.reduce((sum, s) => sum + s.balanceDue.toNumber(), 0) * 100
  ) / 100;

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
      dedupeKey: `CUSTOMER_PAYMENT_RECEIVED:${result.id}`,
      metadata: {
        paymentId: result.id,
        customerId: customer.id,
        customerName: customer.name,
        amount: input.amount,
        paymentMethod: input.paymentMethod,
        remainingBalance: newBalance,
      },
    });

    if (previousBalance > 0 && newBalance === 0) {
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
        dedupeKey: `DEBT_SETTLED:${customer.id}:${result.id}`,
      });

      await automationEngine.emit({
        eventType: BusinessEventType.DEBT_SETTLED,
        businessId: input.businessId,
        entityType: "CUSTOMER",
        entityId: customer.id,
        dedupeKey: `DEBT_SETTLED:${customer.id}:${result.id}`,
        metadata: {
          customerId: customer.id,
          customerName: customer.name,
          previousBalance,
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
