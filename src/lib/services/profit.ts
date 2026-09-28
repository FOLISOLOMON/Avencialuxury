import { prisma, ensureDefaultBusiness } from "@/lib/db/prisma";
import { validateProfitAllocation } from "@/lib/calculations/financial";
import { recordSavingsTransaction, getSavingsSummary } from "./savings";
import { AllocationType, Prisma } from "@prisma/client";
import { createNotification } from "./notifications";
import { automationEngine } from "@/lib/automation/engine";
import { BusinessEventType } from "@/lib/automation/events";

export interface CreateAllocationInput {
  businessId: string;
  amount: number;
  type: AllocationType;
  source?: string | null;
  notes?: string | null;
}

export async function getFinancialSummary(businessId: string) {
  await ensureDefaultBusiness(businessId);

  const salesAggregate = await prisma.sale.aggregate({
    where: { businessId, status: { notIn: ["VOIDED", "REFUNDED"] } },
    _sum: {
      totalAmount: true,
      totalCost: true,
      grossProfit: true,
    },
  });

  const expensesAggregate = await prisma.expense.aggregate({
    where: { businessId },
    _sum: {
      amount: true,
    },
  });

  const totalRevenue = salesAggregate._sum.totalAmount?.toNumber() || 0;
  const totalCostOfGoods = salesAggregate._sum.totalCost?.toNumber() || 0;
  const totalGrossProfit = salesAggregate._sum.grossProfit?.toNumber() || 0;
  const totalExpenses = expensesAggregate._sum.amount?.toNumber() || 0;

  const totalNetProfit = Math.round((totalGrossProfit - totalExpenses) * 100) / 100;

  const allocationsAggregate = await prisma.profitAllocation.groupBy({
    by: ["type"],
    where: { businessId },
    _sum: { amount: true },
  });

  let totalSavingsAllocated = 0;
  let totalNeedsAllocated = 0;
  let totalWantsAllocated = 0;

  for (const item of allocationsAggregate) {
    const amt = item._sum.amount?.toNumber() || 0;
    if (item.type === "SAVINGS") totalSavingsAllocated = amt;
    if (item.type === "NEEDS") totalNeedsAllocated = amt;
    if (item.type === "WANTS") totalWantsAllocated = amt;
  }

  const totalAllocated = Math.round(
    (totalSavingsAllocated + totalNeedsAllocated + totalWantsAllocated) * 100
  ) / 100;

  const remainingAllocatableProfit = Math.max(0, Math.round((totalNetProfit - totalAllocated) * 100) / 100);

  if (remainingAllocatableProfit > 0) {
    try {
      automationEngine.emit({
        eventType: BusinessEventType.PROFIT_AVAILABLE,
        businessId,
        entityType: "PROFIT_SUMMARY",
        entityId: businessId,
        dedupeKey: `PROFIT_AVAILABLE:${businessId}:${Math.floor(remainingAllocatableProfit)}`,
        metadata: {
          totalNetProfit,
          totalAllocated,
          remainingAllocatableProfit,
        },
      });
    } catch (err) {
      console.error("Failed to emit PROFIT_AVAILABLE event:", err);
    }
  }

  const savingsSummary = await getSavingsSummary(businessId);

  return {
    totalRevenue,
    totalCostOfGoods,
    totalGrossProfit,
    totalExpenses,
    totalNetProfit,
    allocations: {
      savings: totalSavingsAllocated,
      needs: totalNeedsAllocated,
      wants: totalWantsAllocated,
      totalAllocated,
      remainingAllocatableProfit,
    },
    savingsLedger: savingsSummary,
  };
}

export async function allocateProfit(input: CreateAllocationInput) {
  await ensureDefaultBusiness(input.businessId);

  if (input.amount <= 0) {
    throw new Error("Allocation amount must be greater than zero");
  }

  const cleanAmount = Math.round(input.amount * 100) / 100;
  const summary = await getFinancialSummary(input.businessId);

  const validation = validateProfitAllocation(
    summary.totalNetProfit,
    summary.allocations.totalAllocated,
    cleanAmount
  );

  if (!validation.isValid) {
    throw new Error(
      `Allocation exceeds available allocatable profit. Requested: GH₵${cleanAmount.toFixed(
        2
      )}, Remaining Available: GH₵${validation.remainingAllocatable.toFixed(2)}`
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const allocation = await tx.profitAllocation.create({
      data: {
        businessId: input.businessId,
        amount: new Prisma.Decimal(cleanAmount),
        type: input.type,
        source: input.source?.trim() || null,
        notes: input.notes?.trim() || null,
      },
    });

    if (input.type === "SAVINGS") {
      await tx.savingsTransaction.create({
        data: {
          businessId: input.businessId,
          type: "DEPOSIT",
          amount: new Prisma.Decimal(cleanAmount),
          referenceId: allocation.id,
          description: `Profit Allocation (Savings): ${input.notes || "Deposit from profit allocation"}`,
        },
      });
    }

    return allocation;
  });

  try {
    await createNotification({
      businessId: input.businessId,
      type: "PROFIT_ALLOCATED",
      category: "FINANCE",
      severity: "SUCCESS",
      title: "Profit Allocated",
      message: `Allocated GH₵${cleanAmount.toFixed(2)} to ${input.type}.`,
      actionLabel: "View Profit",
      actionUrl: "/profit",
      entityType: "PROFIT_ALLOCATION",
      entityId: result.id,
    });

    automationEngine.emit({
      eventType: BusinessEventType.PROFIT_ALLOCATED,
      businessId: input.businessId,
      entityType: "PROFIT_ALLOCATION",
      entityId: result.id,
      dedupeKey: `PROFIT_ALLOCATED:${result.id}`,
      metadata: {
        allocationId: result.id,
        amount: cleanAmount,
        type: input.type,
      },
    });
  } catch (err) {
    console.error("Failed to trigger profit allocation notification/event:", err);
  }

  return result;
}

export async function getAllocations(businessId: string) {
  await ensureDefaultBusiness(businessId);

  return await prisma.profitAllocation.findMany({
    where: { businessId },
    orderBy: { allocationDate: "desc" },
  });
}
