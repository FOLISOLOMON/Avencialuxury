import { prisma, ensureDefaultBusiness } from "@/lib/db/prisma";
import { Prisma, PaymentMethod, PaymentStatus } from "@prisma/client";

export interface RecordDebtPaymentInput {
  businessId: string;
  customerId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  notes?: string | null;
  saleId?: string | null;
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

  return await prisma.$transaction(async (tx) => {
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
