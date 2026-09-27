import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { DEFAULT_BUSINESS_ID } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { serializePlainObject } from "@/lib/utils";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: batchId } = await params;
    if (!batchId || !batchId.trim()) {
      return NextResponse.json({ success: false, error: "Batch ID is required" }, { status: 400 });
    }

    const body = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "Invalid JSON payload" }, { status: 400 });
    }

    const { productId, quantityPurchased, unitCost } = body;

    if (!productId || typeof productId !== "string" || !productId.trim()) {
      return NextResponse.json({ success: false, error: "Product ID is required" }, { status: 400 });
    }

    const qty = parseInt(quantityPurchased, 10);
    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json({ success: false, error: "Quantity purchased must be a positive integer (> 0)" }, { status: 400 });
    }

    const cost = parseFloat(unitCost);
    if (isNaN(cost) || cost < 0) {
      return NextResponse.json({ success: false, error: "Unit cost must be a non-negative number (>= 0)" }, { status: 400 });
    }

    // Verify batch belongs to this business and is ACTIVE
    const batch = await prisma.batch.findFirst({
      where: { id: batchId.trim(), businessId: DEFAULT_BUSINESS_ID },
    });

    if (!batch) {
      return NextResponse.json({ success: false, error: "Batch not found" }, { status: 404 });
    }

    if (batch.status !== "ACTIVE") {
      return NextResponse.json({ success: false, error: "Cannot add items to a completed or closed batch" }, { status: 400 });
    }

    const totalCost = Math.round(qty * cost * 100) / 100;

    // Check if this product already has a line in this batch
    const existingItem = await prisma.batchItem.findFirst({
      where: { batchId: batch.id, productId: productId.trim() },
    });

    let batchItem;
    if (existingItem) {
      // Increment the existing line
      const newQtyPurchased = existingItem.quantityPurchased + qty;
      const newQtyRemaining = existingItem.quantityRemaining + qty;
      const newTotalCost = Math.round((existingItem.totalCost.toNumber() + totalCost) * 100) / 100;

      batchItem = await prisma.$transaction(async (tx) => {
        const updated = await tx.batchItem.update({
          where: { id: existingItem.id },
          data: {
            quantityPurchased: newQtyPurchased,
            quantityRemaining: newQtyRemaining,
            unitCost: new Prisma.Decimal(cost),
            totalCost: new Prisma.Decimal(newTotalCost),
          },
          include: { product: true },
        });

        await tx.inventoryTransaction.create({
          data: {
            businessId: DEFAULT_BUSINESS_ID,
            productId: productId.trim(),
            batchId: batch.id,
            type: "PURCHASE",
            quantity: qty,
            referenceId: batch.id,
            note: `Added to batch ${batch.reference}`,
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

        return updated;
      });
    } else {
      batchItem = await prisma.$transaction(async (tx) => {
        const created = await tx.batchItem.create({
          data: {
            batchId: batch.id,
            productId: productId.trim(),
            quantityPurchased: qty,
            quantityRemaining: qty,
            unitCost: new Prisma.Decimal(cost),
            totalCost: new Prisma.Decimal(totalCost),
          },
          include: { product: true },
        });

        await tx.inventoryTransaction.create({
          data: {
            businessId: DEFAULT_BUSINESS_ID,
            productId: productId.trim(),
            batchId: batch.id,
            type: "PURCHASE",
            quantity: qty,
            referenceId: batch.id,
            note: `Added to batch ${batch.reference}`,
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

        return created;
      });
    }

    return NextResponse.json({ success: true, data: serializePlainObject(batchItem) });
  } catch (error: any) {
    console.error("POST /api/batches/[id]/items error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to add item to batch" }, { status: 400 });
  }
}
