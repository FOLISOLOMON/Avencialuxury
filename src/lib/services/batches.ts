import { prisma, ensureDefaultBusiness } from "@/lib/db/prisma";
import { BatchStatus, Prisma } from "@prisma/client";

export interface BatchItemInput {
  productId: string;
  quantityPurchased: number;
  unitCost: number;
}

export interface CreateBatchInput {
  businessId: string;
  reference: string;
  purchaseDate: Date;
  additionalCosts?: number | null;
  notes?: string | null;
  supplierId?: string | null;
  items?: BatchItemInput[];
}

export async function createBatch(input: CreateBatchInput) {
  await ensureDefaultBusiness(input.businessId);

  if (!input.reference || input.reference.trim() === "") {
    throw new Error("Batch reference is required");
  }

  // Items can be empty — products are added one by one on the batch detail page
  const items = input.items || [];

  let totalPurchaseCost = 0;
  const processedItems = items.map((item) => {
    if (item.quantityPurchased <= 0) {
      throw new Error("Quantity purchased must be greater than zero");
    }
    if (item.unitCost < 0) {
      throw new Error("Unit cost cannot be negative");
    }
    const itemTotal = Math.round(item.quantityPurchased * item.unitCost * 100) / 100;
    totalPurchaseCost += itemTotal;
    return {
      productId: item.productId,
      quantityPurchased: item.quantityPurchased,
      quantityRemaining: item.quantityPurchased,
      unitCost: new Prisma.Decimal(item.unitCost),
      totalCost: new Prisma.Decimal(itemTotal),
    };
  });

  totalPurchaseCost = Math.round(totalPurchaseCost * 100) / 100;
  const additionalCosts = Math.round((input.additionalCosts || 0) * 100) / 100;
  const totalInvestment = Math.round((totalPurchaseCost + additionalCosts) * 100) / 100;

  return await prisma.$transaction(async (tx) => {
    const batch = await tx.batch.create({
      data: {
        businessId: input.businessId,
        supplierId: input.supplierId || null,
        reference: input.reference.trim(),
        purchaseDate: input.purchaseDate,
        purchaseCost: new Prisma.Decimal(totalPurchaseCost),
        additionalCosts: new Prisma.Decimal(additionalCosts),
        totalInvestment: new Prisma.Decimal(totalInvestment),
        notes: input.notes?.trim() || null,
        batchItems: {
          create: processedItems,
        },
      },

      include: {
        batchItems: {
          include: {
            product: true,
          },
        },
      },
    });

    for (const item of processedItems) {
      await tx.inventoryTransaction.create({
        data: {
          businessId: input.businessId,
          productId: item.productId,
          batchId: batch.id,
          type: "PURCHASE",
          quantity: item.quantityPurchased,
          referenceId: batch.id,
          note: `Batch ${batch.reference} purchase`,
        },
      });
    }

    return batch;
  });
}

export async function getActiveBatches(businessId: string) {
  await ensureDefaultBusiness(businessId);
  return await prisma.batch.findMany({
    where: {
      businessId,
      status: "ACTIVE",
    },
    orderBy: { purchaseDate: "asc" },
    include: {
      batchItems: {
        include: {
          product: true,
        },
      },
    },
  });
}

export async function getBatches(businessId: string, statusFilter?: "ALL" | BatchStatus) {
  await ensureDefaultBusiness(businessId);

  const where: Prisma.BatchWhereInput = { businessId };
  if (statusFilter && statusFilter !== "ALL") {
    where.status = statusFilter;
  }

  const batches = await prisma.batch.findMany({
    where,
    orderBy: { purchaseDate: "desc" },
    include: {
      batchItems: {
        include: {
          product: true,
        },
      },
      expenses: true,
    },
  });

  return batches.map((b) => {
    const totalPurchased = b.batchItems.reduce((acc, item) => acc + item.quantityPurchased, 0);
    const totalRemaining = b.batchItems.reduce((acc, item) => acc + item.quantityRemaining, 0);
    const totalSold = Math.max(0, totalPurchased - totalRemaining);
    const sellThroughRate = totalPurchased > 0 ? Math.round((totalSold / totalPurchased) * 100) : 0;

    return {
      ...b,
      totalPurchased,
      totalRemaining,
      totalSold,
      sellThroughRate,
      isHighSellThrough: sellThroughRate >= 80,
    };
  });
}

export async function toggleBatchStatus(batchId: string, newStatus: BatchStatus) {
  return await prisma.batch.update({
    where: { id: batchId },
    data: { status: newStatus },
  });
}

export async function closeBatch(batchId: string) {
  return await prisma.batch.update({
    where: { id: batchId },
    data: { status: "COMPLETED" },
  });
}

/**
 * Synchronizes batch status automatically.
 * Transitions to COMPLETED if total quantityRemaining === 0.
 * Transitions to ACTIVE if total quantityRemaining > 0 and batch is currently COMPLETED.
 */
export async function syncBatchStatus(
  tx: Prisma.TransactionClient | typeof prisma,
  batchId: string
) {
  const batch = await tx.batch.findUnique({
    where: { id: batchId },
    include: { batchItems: true },
  });

  if (!batch || batch.status === "ARCHIVED") return batch;

  const totalRemaining = batch.batchItems.reduce((sum, item) => sum + item.quantityRemaining, 0);

  if (totalRemaining === 0 && batch.status === "ACTIVE") {
    return await tx.batch.update({
      where: { id: batchId },
      data: { status: "COMPLETED" },
    });
  } else if (totalRemaining > 0 && batch.status === "COMPLETED") {
    return await tx.batch.update({
      where: { id: batchId },
      data: { status: "ACTIVE" },
    });
  }

  return batch;
}

/**
 * Updates additional costs (transport, customs, fees) for a batch and recalculates totalInvestment.
 */
export async function updateBatchAdditionalCosts(
  batchId: string,
  businessId: string,
  additionalCosts: number
) {
  await ensureDefaultBusiness(businessId);

  if (additionalCosts < 0) {
    throw new Error("Additional costs cannot be negative");
  }

  const cleanAdditional = Math.round(additionalCosts * 100) / 100;

  return await prisma.$transaction(async (tx) => {
    const batch = await tx.batch.findFirst({
      where: { id: batchId, businessId },
      include: { batchItems: true },
    });

    if (!batch) {
      throw new Error("Batch not found");
    }

    const purchaseCost = batch.batchItems.reduce(
      (sum, item) => sum + item.totalCost.toNumber(),
      0
    );

    const roundedPurchaseCost = Math.round(purchaseCost * 100) / 100;
    const totalInvestment = Math.round((roundedPurchaseCost + cleanAdditional) * 100) / 100;

    return await tx.batch.update({
      where: { id: batchId },
      data: {
        purchaseCost: new Prisma.Decimal(roundedPurchaseCost),
        additionalCosts: new Prisma.Decimal(cleanAdditional),
        totalInvestment: new Prisma.Decimal(totalInvestment),
      },
    });
  });
}
