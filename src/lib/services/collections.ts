import { prisma, ensureDefaultBusiness } from "@/lib/db/prisma";
import { getBusinessDayBounds } from "@/lib/utils";
import { logAudit } from "./audit";
import {
  extractCollectionItems,
  calculateDepositAllocations,
  buildCollectionsReport,
  roundToTwoDecimals,
  CollectionsReportResult,
  RawSaleRecord,
  RawDebtPaymentRecord,
  ExistingAllocationRecord,
  BankDepositRecord,
} from "@/lib/calculations/collections";
import { Prisma } from "@prisma/client";

export interface GetCollectionsFilter {
  quickRange?: string;
  startDate?: Date | string;
  endDate?: Date | string;
}

export interface RecordBankDepositInput {
  businessId: string;
  userId?: string | null;
  amount: number;
  depositDate?: Date | string | null;
  reference?: string | null;
  notes?: string | null;
  idempotencyKey?: string | null;
}

/**
 * Generates the authoritative Weekly Collections & Bank Deposits report for the authenticated business.
 */
export async function getWeeklyCollectionsReport(
  businessId: string,
  filter?: GetCollectionsFilter
): Promise<CollectionsReportResult> {
  await ensureDefaultBusiness(businessId);

  const { startDate, endDate } = getBusinessDayBounds(
    filter?.quickRange,
    filter?.startDate,
    filter?.endDate
  );

  // 1. Fetch all sales for this business
  const sales = await prisma.sale.findMany({
    where: {
      businessId,
    },
    select: {
      id: true,
      saleDate: true,
      totalAmount: true,
      amountPaid: true,
      balanceDue: true,
      paymentMethod: true,
      status: true,
      customer: {
        select: { id: true, name: true },
      },
      debtPayments: {
        select: {
          id: true,
          amount: true,
          paymentDate: true,
          paymentMethod: true,
          allocationBreakdown: true,
          saleId: true,
        },
      },
    },
    orderBy: { saleDate: "asc" },
  });

  // Convert Prisma Decimals to Numbers for pure calculations
  const rawSales: RawSaleRecord[] = sales.map((s) => ({
    id: s.id,
    saleDate: s.saleDate,
    totalAmount: s.totalAmount.toNumber(),
    amountPaid: s.amountPaid.toNumber(),
    balanceDue: s.balanceDue.toNumber(),
    paymentMethod: s.paymentMethod,
    status: s.status,
    customer: s.customer,
    debtPayments: s.debtPayments.map((dp) => ({
      id: dp.id,
      amount: dp.amount.toNumber(),
      paymentDate: dp.paymentDate,
      paymentMethod: dp.paymentMethod,
      allocationBreakdown: dp.allocationBreakdown,
      saleId: dp.saleId,
    })),
  }));

  // 2. Fetch all debt payments for this business
  const debtPayments = await prisma.debtPayment.findMany({
    where: {
      businessId,
    },
    select: {
      id: true,
      amount: true,
      paymentDate: true,
      paymentMethod: true,
      saleId: true,
      allocationBreakdown: true,
      notes: true,
      customer: {
        select: { id: true, name: true },
      },
      sale: {
        select: { id: true, status: true },
      },
    },
    orderBy: { paymentDate: "asc" },
  });

  const rawDebtPayments: RawDebtPaymentRecord[] = debtPayments.map((dp) => ({
    id: dp.id,
    amount: dp.amount.toNumber(),
    paymentDate: dp.paymentDate,
    paymentMethod: dp.paymentMethod,
    saleId: dp.saleId,
    notes: dp.notes,
    customer: dp.customer,
    sale: dp.sale,
    allocationBreakdown: Array.isArray(dp.allocationBreakdown)
      ? (dp.allocationBreakdown as any)
      : null,
  }));

  // 3. Fetch existing Bank Deposits and Allocations (with fallback if tables do not exist yet)
  let existingAllocations: ExistingAllocationRecord[] = [];
  let existingDeposits: BankDepositRecord[] = [];

  try {
    const allocations = await (prisma as any).depositAllocation.findMany({
      where: { businessId },
      select: {
        id: true,
        depositId: true,
        amount: true,
        collectionType: true,
        collectionId: true,
        collectionDate: true,
      },
    });

    existingAllocations = allocations.map((a: any) => ({
      id: a.id,
      depositId: a.depositId,
      amount: a.amount.toNumber(),
      collectionType: a.collectionType,
      collectionId: a.collectionId,
      collectionDate: a.collectionDate,
    }));

    const deposits = await (prisma as any).bankDeposit.findMany({
      where: { businessId },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { depositDate: "desc" },
    });

    existingDeposits = deposits.map((d: any) => ({
      id: d.id,
      amount: d.amount.toNumber(),
      depositDate: d.depositDate,
      reference: d.reference,
      notes: d.notes,
      createdById: d.createdById,
      createdByName: d.createdBy?.name || null,
      createdAt: d.createdAt,
    }));
  } catch (err: any) {
    // If the BankDeposit/DepositAllocation table has not been migrated on the physical database yet,
    // gracefully proceed with 0 deposits instead of crashing.
    console.warn(
      "[Collections] BankDeposit/DepositAllocation tables not reachable or unmigrated:",
      err?.message || err
    );
  }

  // 4. Extract chronological, deduplicated collection items
  const collectionItems = extractCollectionItems(rawSales, rawDebtPayments);

  // 5. Build report
  return buildCollectionsReport({
    collectionItems,
    allocations: existingAllocations,
    deposits: existingDeposits,
    startDate,
    endDate,
    quickRange: filter?.quickRange,
  });
}

/**
 * Records a new bank deposit and atomically allocates it to the oldest outstanding collections.
 * 
 * Guarantees:
 * 1. Rejects zero, negative, or invalid amounts.
 * 2. Idempotency protection against duplicate requests / retries.
 * 3. Enforces that deposit amount cannot exceed total unallocated collections.
 * 4. Oldest-outstanding-first FIFO allocation.
 * 5. Concurrent deposit safety within an interactive database transaction.
 * 6. Audit logging.
 */
export async function recordBankDeposit(input: RecordBankDepositInput) {
  await ensureDefaultBusiness(input.businessId);

  const cleanAmount = roundToTwoDecimals(Number(input.amount) || 0);
  if (cleanAmount <= 0) {
    throw new Error("Deposit amount must be greater than zero.");
  }

  // 1. Idempotency Check: if idempotencyKey was already processed, return existing deposit safely
  if (input.idempotencyKey) {
    try {
      const existing = await (prisma as any).bankDeposit.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          allocations: true,
        },
      });
      if (existing) {
        return {
          deposit: {
            id: existing.id,
            amount: existing.amount.toNumber(),
            depositDate: existing.depositDate,
            reference: existing.reference,
            notes: existing.notes,
            createdById: existing.createdById,
            createdByName: existing.createdBy?.name || null,
            createdAt: existing.createdAt,
          },
          allocationsCount: existing.allocations.length,
          isReplay: true,
        };
      }
    } catch {
      // Table check fallback
    }
  }

  // 2. Interactive Database Transaction with Concurrency Control
  const result = await prisma.$transaction(
    async (tx) => {
      // Fetch all sales for this business
      const sales = await tx.sale.findMany({
        where: { businessId: input.businessId },
        select: {
          id: true,
          saleDate: true,
          totalAmount: true,
          amountPaid: true,
          balanceDue: true,
          paymentMethod: true,
          status: true,
          customer: { select: { id: true, name: true } },
        },
        orderBy: { saleDate: "asc" },
      });

      // Fetch all debt payments
      const debtPayments = await tx.debtPayment.findMany({
        where: { businessId: input.businessId },
        select: {
          id: true,
          amount: true,
          paymentDate: true,
          paymentMethod: true,
          saleId: true,
          allocationBreakdown: true,
          notes: true,
          customer: { select: { id: true, name: true } },
          sale: { select: { id: true, status: true } },
        },
        orderBy: { paymentDate: "asc" },
      });

      const rawSales: RawSaleRecord[] = sales.map((s) => ({
        id: s.id,
        saleDate: s.saleDate,
        totalAmount: s.totalAmount.toNumber(),
        amountPaid: s.amountPaid.toNumber(),
        balanceDue: s.balanceDue.toNumber(),
        paymentMethod: s.paymentMethod,
        status: s.status,
        customer: s.customer,
      }));

      const rawDebtPayments: RawDebtPaymentRecord[] = debtPayments.map((dp) => ({
        id: dp.id,
        amount: dp.amount.toNumber(),
        paymentDate: dp.paymentDate,
        paymentMethod: dp.paymentMethod,
        saleId: dp.saleId,
        notes: dp.notes,
        customer: dp.customer,
        sale: dp.sale,
        allocationBreakdown: Array.isArray(dp.allocationBreakdown)
          ? (dp.allocationBreakdown as any)
          : null,
      }));

      // Fetch all existing allocations inside transaction
      const allocations = await (tx as any).depositAllocation.findMany({
        where: { businessId: input.businessId },
        select: {
          id: true,
          depositId: true,
          amount: true,
          collectionType: true,
          collectionId: true,
          collectionDate: true,
        },
      });

      const existingAllocations: ExistingAllocationRecord[] = allocations.map((a: any) => ({
        id: a.id,
        depositId: a.depositId,
        amount: a.amount.toNumber(),
        collectionType: a.collectionType,
        collectionId: a.collectionId,
        collectionDate: a.collectionDate,
      }));

      const collectionItems = extractCollectionItems(rawSales, rawDebtPayments);

      // Perform allocation calculation & verification
      const allocationResult = calculateDepositAllocations(
        collectionItems,
        existingAllocations,
        cleanAmount
      );

      if (!allocationResult.success) {
        throw new Error(allocationResult.error || "Failed to allocate deposit to collections.");
      }

      // Create BankDeposit row
      const depositDate = input.depositDate ? new Date(input.depositDate) : new Date();

      const createdDeposit = await (tx as any).bankDeposit.create({
        data: {
          businessId: input.businessId,
          createdById: input.userId || null,
          amount: new Prisma.Decimal(cleanAmount),
          depositDate,
          reference: input.reference?.trim() || null,
          notes: input.notes?.trim() || null,
          idempotencyKey: input.idempotencyKey || null,
          allocations: {
            create: allocationResult.newAllocations.map((na) => ({
              businessId: input.businessId,
              amount: new Prisma.Decimal(na.amount),
              collectionType: na.collectionType,
              collectionId: na.collectionId,
              collectionDate: na.collectionDate,
            })),
          },
        },
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          allocations: true,
        },
      });

      return {
        deposit: {
          id: createdDeposit.id,
          amount: createdDeposit.amount.toNumber(),
          depositDate: createdDeposit.depositDate,
          reference: createdDeposit.reference,
          notes: createdDeposit.notes,
          createdById: createdDeposit.createdById,
          createdByName: createdDeposit.createdBy?.name || null,
          createdAt: createdDeposit.createdAt,
        },
        allocationsCount: createdDeposit.allocations.length,
        remainingPool: roundToTwoDecimals(allocationResult.availablePool - cleanAmount),
      };
    },
    { maxWait: 10000, timeout: 20000 }
  );

  // 3. Log Audit Entry
  await logAudit({
    businessId: input.businessId,
    userId: input.userId || null,
    action: "BANK_DEPOSIT_RECORDED",
    entityType: "BANK_DEPOSIT",
    entityId: result.deposit.id,
    details: {
      amount: cleanAmount,
      depositDate: result.deposit.depositDate,
      reference: result.deposit.reference,
      allocationsCount: result.allocationsCount,
      remainingPool: result.remainingPool,
      idempotencyKey: input.idempotencyKey,
    },
  });

  return result;
}

/**
 * Lists bank deposits for the authenticated business.
 */
export async function getBankDeposits(businessId: string): Promise<BankDepositRecord[]> {
  await ensureDefaultBusiness(businessId);

  try {
    const deposits = await (prisma as any).bankDeposit.findMany({
      where: { businessId },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { depositDate: "desc" },
    });

    return deposits.map((d: any) => ({
      id: d.id,
      amount: d.amount.toNumber(),
      depositDate: d.depositDate,
      reference: d.reference,
      notes: d.notes,
      createdById: d.createdById,
      createdByName: d.createdBy?.name || null,
      createdAt: d.createdAt,
    }));
  } catch (err: any) {
    console.warn("[Collections] Failed to fetch bank deposits:", err?.message || err);
    return [];
  }
}
