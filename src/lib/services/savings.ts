import { prisma, ensureDefaultBusiness } from "@/lib/db/prisma";
import { SavingsTransactionType, Prisma } from "@prisma/client";

export interface RecordSavingsInput {
  businessId: string;
  type: SavingsTransactionType;
  amount: number;
  referenceId?: string | null;
  description?: string | null;
}

/**
 * Records a savings ledger transaction (DEPOSIT, WITHDRAWAL, ADJUSTMENT).
 */
export async function recordSavingsTransaction(input: RecordSavingsInput) {
  await ensureDefaultBusiness(input.businessId);

  if (input.amount <= 0 && input.type !== "ADJUSTMENT") {
    throw new Error("Savings transaction amount must be greater than zero");
  }

  const cleanAmount = Math.round(Math.abs(input.amount) * 100) / 100;

  if (input.type === "WITHDRAWAL") {
    const summary = await getSavingsSummary(input.businessId);
    if (cleanAmount > summary.totalSavingsBalance) {
      throw new Error(
        `Withdrawal amount (GH₵${cleanAmount.toFixed(
          2
        )}) exceeds available savings balance (GH₵${summary.totalSavingsBalance.toFixed(2)})`
      );
    }
  }

  return await prisma.savingsTransaction.create({
    data: {
      businessId: input.businessId,
      type: input.type,
      amount: new Prisma.Decimal(input.type === "WITHDRAWAL" ? cleanAmount : input.amount >= 0 ? cleanAmount : -cleanAmount),
      referenceId: input.referenceId?.trim() || null,
      description: input.description?.trim() || `${input.type} savings transaction`,
    },
  });
}

/**
 * Computes savings metrics: total deposits, withdrawals, adjustments, and current balance.
 */
export async function getSavingsSummary(businessId: string) {
  await ensureDefaultBusiness(businessId);

  const transactions = await prisma.savingsTransaction.findMany({
    where: { businessId },
  });

  let totalDeposits = 0;
  let totalWithdrawals = 0;
  let totalAdjustments = 0;

  for (const txn of transactions) {
    const amt = txn.amount.toNumber();
    if (txn.type === "DEPOSIT") {
      totalDeposits += amt;
    } else if (txn.type === "WITHDRAWAL") {
      totalWithdrawals += Math.abs(amt);
    } else if (txn.type === "ADJUSTMENT") {
      totalAdjustments += amt;
    }
  }

  totalDeposits = Math.round(totalDeposits * 100) / 100;
  totalWithdrawals = Math.round(totalWithdrawals * 100) / 100;
  totalAdjustments = Math.round(totalAdjustments * 100) / 100;

  const totalSavingsBalance = Math.round(
    (totalDeposits - totalWithdrawals + totalAdjustments) * 100
  ) / 100;

  return {
    totalDeposits,
    totalWithdrawals,
    totalAdjustments,
    totalSavingsBalance: Math.max(0, totalSavingsBalance),
    transactionCount: transactions.length,
  };
}

/**
 * Fetches savings transaction history.
 */
export async function getSavingsTransactions(businessId: string) {
  await ensureDefaultBusiness(businessId);

  return await prisma.savingsTransaction.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
  });
}
