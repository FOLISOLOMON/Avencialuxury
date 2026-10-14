import { prisma, ensureDefaultBusiness } from "@/lib/db/prisma";
import {
  validateProfitAllocation,
  calculate50_30_20Allocation,
  calculateCashBackedSummary,
  CashBackedSummaryResult,
} from "@/lib/calculations/financial";
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

export interface Allocate503020Input {
  businessId: string;
  amount: number;
  confirmedEligibleAmount?: number | null;
  idempotencyKey?: string | null;
  source?: string | null;
  notes?: string | null;
}

export async function getFinancialSummary(businessId: string) {
  await ensureDefaultBusiness(businessId);

  // 1. Fetch active sales with amounts, costs, and paid receipts
  const activeSales = await prisma.sale.findMany({
    where: { businessId, status: { notIn: ["VOIDED", "REFUNDED"] } },
    select: {
      id: true,
      totalAmount: true,
      totalCost: true,
      grossProfit: true,
      amountPaid: true,
      balanceDue: true,
    },
  });

  // 2. Fetch expenses
  const expensesAggregate = await prisma.expense.aggregate({
    where: { businessId },
    _sum: {
      amount: true,
    },
  });

  const totalExpenses = expensesAggregate._sum.amount?.toNumber() || 0;

  // 3. Fetch historical allocations by bucket
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

  // 4. Calculate Cash-Backed Profitability
  const cashSummary = calculateCashBackedSummary({
    sales: activeSales.map((s) => ({
      amountPaid: s.amountPaid.toNumber(),
      totalCost: s.totalCost.toNumber(),
      totalAmount: s.totalAmount.toNumber(),
    })),
    totalExpenses,
    totalAllocated,
  });

  // Top-line accrual figures for reference
  let totalRevenue = 0;
  let totalOutstandingDebt = 0;
  let totalAccrualGrossProfit = 0;

  for (const s of activeSales) {
    totalRevenue += s.totalAmount.toNumber();
    totalOutstandingDebt += s.balanceDue.toNumber();
    totalAccrualGrossProfit += s.grossProfit.toNumber();
  }

  totalRevenue = Math.round(totalRevenue * 100) / 100;
  totalOutstandingDebt = Math.round(totalOutstandingDebt * 100) / 100;
  totalAccrualGrossProfit = Math.round(totalAccrualGrossProfit * 100) / 100;
  const totalAccrualNetProfit = Math.round((totalAccrualGrossProfit - totalExpenses) * 100) / 100;

  if (cashSummary.eligibleCashProfit > 0) {
    try {
      automationEngine.emit({
        eventType: BusinessEventType.PROFIT_AVAILABLE,
        businessId,
        entityType: "PROFIT_SUMMARY",
        entityId: businessId,
        dedupeKey: `PROFIT_AVAILABLE:${businessId}:${Math.floor(cashSummary.eligibleCashProfit)}`,
        metadata: {
          realizedNetProfit: cashSummary.realizedNetProfit,
          totalAllocated,
          eligibleCashProfit: cashSummary.eligibleCashProfit,
        },
      });
    } catch (err) {
      console.error("Failed to emit PROFIT_AVAILABLE event:", err);
    }
  }

  const savingsSummary = await getSavingsSummary(businessId);

  return {
    totalRevenue,
    totalAmountCollected: cashSummary.verifiedCollectedCash,
    totalOutstandingDebt,
    totalCostOfGoods: cashSummary.costOfGoodsSold,
    totalGrossProfit: cashSummary.realizedGrossProfit,
    totalAccrualGrossProfit,
    totalExpenses: cashSummary.totalExpenses,
    totalNetProfit: cashSummary.realizedNetProfit,
    totalAccrualNetProfit,
    allocations: {
      savings: totalSavingsAllocated,
      needs: totalNeedsAllocated,
      wants: totalWantsAllocated,
      totalAllocated,
      remainingAllocatableProfit: cashSummary.eligibleCashProfit,
      eligibleCashProfit: cashSummary.eligibleCashProfit,
      isOverAllocated: cashSummary.isOverAllocated,
      overAllocatedAmount: cashSummary.overAllocatedAmount,
    },
    cashBreakdown: cashSummary,
    savingsLedger: savingsSummary,
    warnings: cashSummary.warnings,
  };
}

export async function allocateProfit50_30_20(input: Allocate503020Input) {
  await ensureDefaultBusiness(input.businessId);

  if (input.amount <= 0) {
    throw new Error("Allocation amount must be greater than zero");
  }

  const cleanAmount = Math.round(input.amount * 100) / 100;

  // 1. Idempotency Check: if idempotencyKey was provided, check if already recorded
  if (input.idempotencyKey && input.idempotencyKey.trim()) {
    const key = input.idempotencyKey.trim();
    const existing = await prisma.profitAllocation.findMany({
      where: {
        businessId: input.businessId,
        notes: { contains: `[idemp:${key}]` },
      },
      orderBy: { allocationDate: "desc" },
    });

    if (existing.length === 3) {
      return {
        isIdempotentReplay: true,
        allocations: existing,
        totalAllocated: existing.reduce((sum, a) => sum + a.amount.toNumber(), 0),
      };
    }
  }

  // 2. Interactive database transaction with eligibility verification INSIDE
  const result = await prisma.$transaction(
    async (tx) => {
      // Re-fetch sales, expenses, allocations inside transaction
      const activeSales = await tx.sale.findMany({
        where: { businessId: input.businessId, status: { notIn: ["VOIDED", "REFUNDED"] } },
        select: { amountPaid: true, totalCost: true, totalAmount: true },
      });

      const expensesAgg = await tx.expense.aggregate({
        where: { businessId: input.businessId },
        _sum: { amount: true },
      });

      const allocationsAgg = await tx.profitAllocation.groupBy({
        by: ["type"],
        where: { businessId: input.businessId },
        _sum: { amount: true },
      });

      let totalAllocated = 0;
      for (const item of allocationsAgg) {
        totalAllocated += item._sum.amount?.toNumber() || 0;
      }
      totalAllocated = Math.round(totalAllocated * 100) / 100;

      const totalExpenses = expensesAgg._sum.amount?.toNumber() || 0;

      const cashSummary = calculateCashBackedSummary({
        sales: activeSales.map((s) => ({
          amountPaid: s.amountPaid.toNumber(),
          totalCost: s.totalCost.toNumber(),
          totalAmount: s.totalAmount.toNumber(),
        })),
        totalExpenses,
        totalAllocated,
      });

      // Reject stale confirmation if owner reviewed a specific eligible amount
      if (
        input.confirmedEligibleAmount !== undefined &&
        input.confirmedEligibleAmount !== null &&
        !isNaN(input.confirmedEligibleAmount)
      ) {
        const confirmed = Math.round(input.confirmedEligibleAmount * 100) / 100;
        if (Math.abs(cashSummary.eligibleCashProfit - confirmed) > 0.01) {
          throw new Error(
            `Stale confirmation: Available eligible profit has changed from GH₵${confirmed.toFixed(
              2
            )} to GH₵${cashSummary.eligibleCashProfit.toFixed(
              2
            )}. Please review the refreshed breakdown and confirm again.`
          );
        }
      }

      if (cleanAmount > cashSummary.eligibleCashProfit) {
        throw new Error(
          `Allocation exceeds available cash-backed profit. Requested: GH₵${cleanAmount.toFixed(
            2
          )}, Available: GH₵${cashSummary.eligibleCashProfit.toFixed(2)}`
        );
      }

      // Exact 50/30/20 split without penny loss
      const split = calculate50_30_20Allocation(cleanAmount);

      const idempTag = input.idempotencyKey ? ` [idemp:${input.idempotencyKey.trim()}]` : "";
      const baseNotes = (input.notes || "50/30/20 Cash Allocation").trim();
      const fullNotes = `${baseNotes}${idempTag}`;
      const defaultSource = input.source?.trim() || "50/30/20 Cash Distribution";

      const savingsAllocation = await tx.profitAllocation.create({
        data: {
          businessId: input.businessId,
          amount: new Prisma.Decimal(split.savings),
          type: "SAVINGS",
          source: defaultSource,
          notes: fullNotes,
        },
      });

      const needsAllocation = await tx.profitAllocation.create({
        data: {
          businessId: input.businessId,
          amount: new Prisma.Decimal(split.needs),
          type: "NEEDS",
          source: defaultSource,
          notes: fullNotes,
        },
      });

      const wantsAllocation = await tx.profitAllocation.create({
        data: {
          businessId: input.businessId,
          amount: new Prisma.Decimal(split.wants),
          type: "WANTS",
          source: defaultSource,
          notes: fullNotes,
        },
      });

      const savingsDeposit = await tx.savingsTransaction.create({
        data: {
          businessId: input.businessId,
          type: "DEPOSIT",
          amount: new Prisma.Decimal(split.savings),
          referenceId: savingsAllocation.id,
          description: `50% Profit Allocation: ${baseNotes}`,
        },
      });

      return {
        savings: savingsAllocation,
        needs: needsAllocation,
        wants: wantsAllocation,
        savingsDeposit,
        totalAllocated: cleanAmount,
        split,
      };
    },
    { maxWait: 10000, timeout: 20000 }
  );

  try {
    await createNotification({
      businessId: input.businessId,
      type: "PROFIT_ALLOCATED",
      category: "FINANCE",
      severity: "SUCCESS",
      title: "50/30/20 Profit Allocated",
      message: `Allocated GH₵${cleanAmount.toFixed(2)} across Savings (GH₵${result.split.savings.toFixed(
        2
      )}), Needs (GH₵${result.split.needs.toFixed(2)}), and Wants (GH₵${result.split.wants.toFixed(2)}).`,
      actionLabel: "View Profit",
      actionUrl: "/profit",
      entityType: "PROFIT_ALLOCATION",
      entityId: result.savings.id,
    });

    automationEngine.emit({
      eventType: BusinessEventType.PROFIT_ALLOCATED,
      businessId: input.businessId,
      entityType: "PROFIT_ALLOCATION",
      entityId: result.savings.id,
      dedupeKey: `PROFIT_ALLOCATED_503020:${result.savings.id}`,
      metadata: {
        totalAllocated: cleanAmount,
        split: result.split,
      },
    });
  } catch (err) {
    console.error("Failed to trigger profit allocation notification/event:", err);
  }

  return result;
}

export async function allocateProfit(input: CreateAllocationInput) {
  await ensureDefaultBusiness(input.businessId);

  if (input.amount <= 0) {
    throw new Error("Allocation amount must be greater than zero");
  }

  const cleanAmount = Math.round(input.amount * 100) / 100;
  const summary = await getFinancialSummary(input.businessId);

  const availableEligible = summary.allocations.eligibleCashProfit;
  if (cleanAmount > availableEligible) {
    throw new Error(
      `Allocation exceeds available cash-backed profit. Requested: GH₵${cleanAmount.toFixed(
        2
      )}, Remaining Available: GH₵${availableEligible.toFixed(2)}`
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

