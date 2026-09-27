import { prisma, ensureDefaultBusiness } from "@/lib/db/prisma";
import { Prisma, InventoryTransactionType, ExpenseCategory } from "@prisma/client";

export interface AdjustStockInput {
  businessId: string;
  productId: string;
  batchId?: string | null;
  type: InventoryTransactionType; // DAMAGE | TESTER | LOSS | ADJUSTMENT_IN | ADJUSTMENT_OUT
  quantity: number;
  note?: string | null;
}

export async function adjustStock(input: AdjustStockInput) {
  await ensureDefaultBusiness(input.businessId);

  const { businessId, productId, batchId, type, quantity, note } = input;

  if (quantity <= 0) {
    throw new Error("Adjustment quantity must be greater than 0");
  }

  const batchItem = batchId
    ? await prisma.batchItem.findFirst({
        where: { batchId, productId },
        include: { product: true, batch: true },
      })
    : await prisma.batchItem.findFirst({
        where: { productId, quantityRemaining: { gt: 0 } },
        include: { product: true, batch: true },
        orderBy: { batch: { purchaseDate: "asc" } },
      });

  if (!batchItem) {
    throw new Error("Product is not present in the specified batch");
  }

  const isDeduction = ["DAMAGE", "TESTER", "LOSS", "ADJUSTMENT_OUT"].includes(type);

  if (isDeduction && batchItem.quantityRemaining < quantity) {
    throw new Error(`Cannot adjust ${quantity} units. Only ${batchItem.quantityRemaining} units remaining in this batch.`);
  }

  const newQtyRemaining = isDeduction
    ? batchItem.quantityRemaining - quantity
    : batchItem.quantityRemaining + quantity;

  return await prisma.$transaction(async (tx) => {
    // 1. Update BatchItem quantityRemaining
    const updatedBatchItem = await tx.batchItem.update({
      where: { id: batchItem.id },
      data: { quantityRemaining: newQtyRemaining },
      include: { product: true, batch: true },
    });

    // 2. Log InventoryTransaction
    const txn = await tx.inventoryTransaction.create({
      data: {
        businessId,
        productId,
        batchId,
        type,
        quantity,
        note: note || `Manual stock adjustment: ${type}`,
      },
    });

    // 3. User Decision: Automatically log operational expense equal to cost price for DAMAGE or TESTER
    if (type === "DAMAGE" || type === "TESTER") {
      const unitCost = batchItem.unitCost.toNumber();
      const totalExpenseAmount = Math.round(quantity * unitCost * 100) / 100;

      if (totalExpenseAmount > 0) {
        await tx.expense.create({
          data: {
            businessId,
            batchId,
            category: ExpenseCategory.OPERATIONS,
            description: `${type === "DAMAGE" ? "Damaged/Broken Bottle" : "Store Display Tester"}: ${batchItem.product.name} (${quantity} unit(s))`,
            amount: new Prisma.Decimal(totalExpenseAmount),
            notes: note || `Auto-logged operational expense from stock adjustment (${type})`,
          },
        });
      }
    }

    return {
      batchItem: updatedBatchItem,
      transaction: txn,
    };
  });
}

export async function getInventorySummary(businessId: string) {
  await ensureDefaultBusiness(businessId);

  const products = await prisma.product.findMany({
    where: { businessId, isActive: true },
    include: {
      batchItems: {
        where: {
          batch: { status: "ACTIVE" },
          quantityRemaining: { gt: 0 },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  let totalUnitsInStock = 0;
  let totalStockCostValue = 0;
  let totalStockPotentialRevenue = 0;
  let lowStockCount = 0;

  const productSummaries = products.map((p) => {
    const stockUnits = p.batchItems.reduce((sum, bi) => sum + bi.quantityRemaining, 0);
    const stockCostValue = p.batchItems.reduce(
      (sum, bi) => sum + bi.quantityRemaining * bi.unitCost.toNumber(),
      0
    );
    const potentialRevenue = stockUnits * p.sellingPrice.toNumber();
    const isLowStock = stockUnits <= p.lowStockThreshold;

    totalUnitsInStock += stockUnits;
    totalStockCostValue += stockCostValue;
    totalStockPotentialRevenue += potentialRevenue;
    if (isLowStock) lowStockCount++;

    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category,
      lowStockThreshold: p.lowStockThreshold,
      stockUnits,
      stockCostValue: Math.round(stockCostValue * 100) / 100,
      potentialRevenue: Math.round(potentialRevenue * 100) / 100,
      isLowStock,
      activeBatchesCount: p.batchItems.length,
    };
  });

  return {
    totalUnitsInStock,
    totalStockCostValue: Math.round(totalStockCostValue * 100) / 100,
    totalStockPotentialRevenue: Math.round(totalStockPotentialRevenue * 100) / 100,
    lowStockCount,
    products: productSummaries,
  };
}

export async function getInventoryLedger(
  businessId: string,
  typeFilter?: InventoryTransactionType,
  search?: string
) {
  await ensureDefaultBusiness(businessId);

  const where: any = { businessId };
  if (typeFilter) {
    where.type = typeFilter;
  }
  if (search && search.trim()) {
    where.product = {
      name: { contains: search.trim(), mode: "insensitive" },
    };
  }

  return await prisma.inventoryTransaction.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      product: { select: { name: true, sku: true } },
      batch: { select: { reference: true } },
    },
  });
}
