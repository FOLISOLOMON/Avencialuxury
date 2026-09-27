import { prisma, ensureDefaultBusiness } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { createBatch } from "./batches";
import { generateProductSku } from "@/lib/utils";

export interface CreateProductInput {
  businessId: string;
  name: string;
  barcode?: string | null;
  sku?: string | null;
  description?: string | null;
  category?: string | null;
  brand?: string | null;
  size?: string | null;
  sellingPrice: number;
  defaultCostPrice: number;
  lowStockThreshold?: number | null;
  initialStock?: number | null;
  batchId?: string | null;
}

export interface UpdateProductInput {
  id: string;
  businessId: string;
  name?: string | null;
  barcode?: string | null;
  sku?: string | null;
  description?: string | null;
  category?: string | null;
  brand?: string | null;
  size?: string | null;
  sellingPrice?: number | null;
  defaultCostPrice?: number | null;
  lowStockThreshold?: number | null;
  isActive?: boolean | null;
}

export async function createProduct(input: CreateProductInput) {
  await ensureDefaultBusiness(input.businessId);

  if (!input.name || input.name.trim() === "") {
    throw new Error("Product name is required");
  }
  if (input.sellingPrice < 0 || input.defaultCostPrice < 0) {
    throw new Error("Prices cannot be negative");
  }

  const finalSku = input.sku?.trim() || generateProductSku(input.name, input.brand, input.size);

  const product = await prisma.product.create({
    data: {
      businessId: input.businessId,
      name: input.name.trim(),
      barcode: input.barcode?.trim() || null,
      sku: finalSku,
      description: input.description?.trim() || null,
      category: input.category?.trim() || null,
      brand: input.brand?.trim() || null,
      size: input.size?.trim() || null,
      sellingPrice: new Prisma.Decimal(input.sellingPrice),
      defaultCostPrice: new Prisma.Decimal(input.defaultCostPrice),
      lowStockThreshold: input.lowStockThreshold ?? 3,
    },
  });

  // If user selected an existing active batch and entered initial stock, attach item to that batch
  if (input.batchId && input.initialStock && input.initialStock > 0) {
    const batch = await prisma.batch.findFirst({
      where: { id: input.batchId, businessId: input.businessId, status: "ACTIVE" },
    });

    if (batch) {
      const qty = input.initialStock;
      const cost = input.defaultCostPrice;
      const totalCost = Math.round(qty * cost * 100) / 100;

      await prisma.$transaction(async (tx) => {
        const existingItem = await tx.batchItem.findFirst({
          where: { batchId: batch.id, productId: product.id },
        });

        if (existingItem) {
          const newQtyPurchased = existingItem.quantityPurchased + qty;
          const newQtyRemaining = existingItem.quantityRemaining + qty;
          const newTotalCost = Math.round((existingItem.totalCost.toNumber() + totalCost) * 100) / 100;

          await tx.batchItem.update({
            where: { id: existingItem.id },
            data: {
              quantityPurchased: newQtyPurchased,
              quantityRemaining: newQtyRemaining,
              unitCost: new Prisma.Decimal(cost),
              totalCost: new Prisma.Decimal(newTotalCost),
            },
          });
        } else {
          await tx.batchItem.create({
            data: {
              batchId: batch.id,
              productId: product.id,
              quantityPurchased: qty,
              quantityRemaining: qty,
              unitCost: new Prisma.Decimal(cost),
              totalCost: new Prisma.Decimal(totalCost),
            },
          });
        }

        await tx.inventoryTransaction.create({
          data: {
            businessId: input.businessId,
            productId: product.id,
            batchId: batch.id,
            type: "PURCHASE",
            quantity: qty,
            referenceId: batch.id,
            note: `Initial stock added to batch ${batch.reference}`,
          },
        });

        const allItems = await tx.batchItem.findMany({ where: { batchId: batch.id } });
        const newPurchaseCost = allItems.reduce((sum, i) => sum + i.totalCost.toNumber(), 0);
        const newTotalInvestment = Math.round((newPurchaseCost + batch.additionalCosts.toNumber()) * 100) / 100;

        await tx.batch.update({
          where: { id: batch.id },
          data: {
            purchaseCost: new Prisma.Decimal(Math.round(newPurchaseCost * 100) / 100),
            totalInvestment: new Prisma.Decimal(newTotalInvestment),
          },
        });
      });
    }
  }

  return product;
}


export async function getProducts(businessId: string, search?: string) {
  await ensureDefaultBusiness(businessId);

  const where: Prisma.ProductWhereInput = {
    businessId,
    isActive: true,
  };

  if (search && search.trim() !== "") {
    const q = search.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { barcode: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
      { brand: { contains: q, mode: "insensitive" } },
      { category: { contains: q, mode: "insensitive" } },
    ];
  }

  const products = await prisma.product.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      batchItems: {
        select: {
          quantityRemaining: true,
          unitCost: true,
          batch: {
            select: {
              status: true,
            },
          },
        },
      },
    },
  });

  return products.map((p) => {
    const remainingStock = p.batchItems
      .filter((bi) => bi.batch.status === "ACTIVE")
      .reduce((sum, bi) => sum + bi.quantityRemaining, 0);

    const sellingPriceNum = p.sellingPrice.toNumber();
    const defaultCostPriceNum = p.defaultCostPrice.toNumber();
    const isLowStock = remainingStock <= p.lowStockThreshold;

    return {
      ...p,
      sellingPriceNum,
      defaultCostPriceNum,
      remainingStock,
      isLowStock,
    };
  });
}

export async function getProductById(id: string, businessId: string) {
  await ensureDefaultBusiness(businessId);

  const p = await prisma.product.findFirst({
    where: { id, businessId },
    include: {
      batchItems: {
        select: {
          quantityRemaining: true,
          unitCost: true,
          batch: { select: { status: true } },
        },
      },
    },
  });

  if (!p) return null;

  const remainingStock = p.batchItems
    .filter((bi) => bi.batch.status === "ACTIVE")
    .reduce((sum, bi) => sum + bi.quantityRemaining, 0);

  return {
    ...p,
    sellingPriceNum: p.sellingPrice.toNumber(),
    defaultCostPriceNum: p.defaultCostPrice.toNumber(),
    remainingStock,
    isLowStock: remainingStock <= p.lowStockThreshold,
  };
}

export async function getProductByBarcode(barcode: string, businessId: string) {
  await ensureDefaultBusiness(businessId);

  const cleanBarcode = barcode.trim();
  if (!cleanBarcode) return null;

  const p = await prisma.product.findFirst({
    where: {
      businessId,
      barcode: cleanBarcode,
      isActive: true,
    },
    include: {
      batchItems: {
        select: {
          quantityRemaining: true,
          unitCost: true,
          batch: { select: { status: true } },
        },
      },
    },
  });

  if (!p) return null;

  const remainingStock = p.batchItems
    .filter((bi) => bi.batch.status === "ACTIVE")
    .reduce((sum, bi) => sum + bi.quantityRemaining, 0);

  return {
    ...p,
    sellingPriceNum: p.sellingPrice.toNumber(),
    defaultCostPriceNum: p.defaultCostPrice.toNumber(),
    remainingStock,
    isLowStock: remainingStock <= p.lowStockThreshold,
  };
}

export async function updateProduct(input: UpdateProductInput) {
  await ensureDefaultBusiness(input.businessId);

  const data: Prisma.ProductUpdateInput = {};
  if (input.name) data.name = input.name.trim();
  if (input.barcode !== undefined) data.barcode = input.barcode?.trim() || null;
  if (input.sku !== undefined) data.sku = input.sku?.trim() || null;
  if (input.description !== undefined) data.description = input.description?.trim() || null;
  if (input.category !== undefined) data.category = input.category?.trim() || null;
  if (input.brand !== undefined) data.brand = input.brand?.trim() || null;
  if (input.size !== undefined) data.size = input.size?.trim() || null;
  if (input.sellingPrice !== undefined && input.sellingPrice !== null) {
    data.sellingPrice = new Prisma.Decimal(input.sellingPrice);
  }
  if (input.defaultCostPrice !== undefined && input.defaultCostPrice !== null) {
    data.defaultCostPrice = new Prisma.Decimal(input.defaultCostPrice);
  }
  if (input.lowStockThreshold !== undefined && input.lowStockThreshold !== null) {
    data.lowStockThreshold = input.lowStockThreshold;
  }
  if (input.isActive !== undefined && input.isActive !== null) {
    data.isActive = input.isActive;
  }

  return await prisma.product.update({
    where: { id: input.id },
    data,
  });
}

export async function deleteProduct(id: string, businessId: string) {
  await ensureDefaultBusiness(businessId);

  return await prisma.product.update({
    where: { id },
    data: { isActive: false },
  });
}
