import { prisma, ensureDefaultBusiness } from "@/lib/db/prisma";
import { allocateStockFIFO, AvailableBatchStock } from "@/lib/inventory/fifo";
import { syncBatchStatus } from "./batches";
import { PaymentMethod, Prisma } from "@prisma/client";
import { createNotification, evaluateInventoryTransitions } from "./notifications";
import { automationEngine } from "@/lib/automation/engine";
import { BusinessEventType } from "@/lib/automation/events";

export interface SaleProductInput {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export function normalizePaymentMethod(method?: string | null): PaymentMethod {
  if (!method) return PaymentMethod.CASH;
  const upper = String(method).toUpperCase().trim();
  if (upper === "MOBILE_MONEY" || upper === "MOMO" || upper === "MTN" || upper === "VODAFONE" || upper === "AIRTELTIGO") {
    return PaymentMethod.MOBILE_MONEY;
  }
  if (upper === "BANK_TRANSFER" || upper === "BANK" || upper === "TRANSFER") {
    return PaymentMethod.BANK_TRANSFER;
  }
  if (upper === "CARD" || upper === "POS" || upper === "VISA" || upper === "MASTERCARD") {
    return PaymentMethod.CARD;
  }
  if (upper === "OTHER") {
    return PaymentMethod.OTHER;
  }
  return PaymentMethod.CASH;
}

export interface CreateSaleInput {
  businessId: string;
  customerId?: string | null;
  saleDate?: Date | null;
  dueDate?: Date | string | null;
  discount?: number | null;
  paymentMethod?: PaymentMethod | string | null;
  amountPaid?: number | null;
  notes?: string | null;
  items: SaleProductInput[];
}

export async function createSale(input: CreateSaleInput) {
  await ensureDefaultBusiness(input.businessId);

  if (!input.items || input.items.length === 0) {
    throw new Error("A sale must contain at least one item");
  }

  // Interactive transaction with extended 20-second timeout for cloud database resilience
  const createdSale = await prisma.$transaction(
    async (tx) => {
      const saleItemAllocations: Array<{
        productId: string;
        batchId: string;
        quantity: number;
        unitPrice: number;
        unitCost: number;
        revenue: number;
        cost: number;
        profit: number;
      }> = [];

      const batchDeductions: Array<{ batchItemId: string; deductQuantity: number; batchId: string }> = [];
      const inventoryTxns: Array<{ productId: string; batchId: string; quantity: number }> = [];

      let grandTotalRevenue = 0;
      let grandTotalCost = 0;

      for (const item of input.items) {
        if (item.quantity <= 0) {
          throw new Error("Sale item quantity must be greater than zero");
        }
        if (item.unitPrice < 0) {
          throw new Error("Unit price cannot be negative");
        }

        const activeBatchItems = await tx.batchItem.findMany({
          where: {
            productId: item.productId,
            quantityRemaining: { gt: 0 },
            batch: {
              businessId: input.businessId,
              status: "ACTIVE",
            },
          },
          include: {
            batch: {
              select: {
                reference: true,
                purchaseDate: true,
              },
            },
          },
          orderBy: {
            batch: {
              purchaseDate: "asc",
            },
          },
        });

        const fifoBatches: AvailableBatchStock[] = activeBatchItems.map((bi) => ({
          batchId: bi.batchId,
          batchReference: bi.batch.reference,
          unitCost: bi.unitCost.toNumber(),
          quantityRemaining: bi.quantityRemaining,
          purchaseDate: bi.batch.purchaseDate,
        }));

        const fifoResult = allocateStockFIFO(fifoBatches, item.quantity);

        for (const alloc of fifoResult.allocations) {
          const matchingBatchItem = activeBatchItems.find((bi) => bi.batchId === alloc.batchId);
          if (matchingBatchItem) {
            const revenue = Math.round(alloc.quantity * item.unitPrice * 100) / 100;
            const cost = Math.round(alloc.quantity * alloc.unitCost * 100) / 100;
            const profit = Math.round((revenue - cost) * 100) / 100;

            grandTotalRevenue += revenue;
            grandTotalCost += cost;

            saleItemAllocations.push({
              productId: item.productId,
              batchId: alloc.batchId,
              quantity: alloc.quantity,
              unitPrice: item.unitPrice,
              unitCost: alloc.unitCost,
              revenue,
              cost,
              profit,
            });

            batchDeductions.push({
              batchItemId: matchingBatchItem.id,
              deductQuantity: alloc.quantity,
              batchId: alloc.batchId,
            });

            inventoryTxns.push({
              productId: item.productId,
              batchId: alloc.batchId,
              quantity: alloc.quantity,
            });
          }
        }

        // If FIFO was not fully allocated (e.g. newly added product or extra store inventory),
        // gracefully allocate remainder using an auto-inventory batch so POS / mobile sales never fail:
        if (!fifoResult.isFullyAllocated) {
          const shortage = item.quantity - fifoResult.totalQuantityAllocated;
          if (shortage > 0) {
            let autoBatch = await tx.batch.findFirst({
              where: { businessId: input.businessId, status: "ACTIVE" },
              orderBy: { createdAt: "desc" },
            });

            if (!autoBatch) {
              autoBatch = await tx.batch.create({
                data: {
                  businessId: input.businessId,
                  reference: `BATCH-DIRECT-${new Date().getFullYear()}`,
                  purchaseDate: new Date(),
                  status: "ACTIVE",
                  purchaseCost: new Prisma.Decimal(0),
                  additionalCosts: new Prisma.Decimal(0),
                  totalInvestment: new Prisma.Decimal(0),
                  notes: "Auto-generated batch for direct perfume inventory",
                },
              });
            }

            const product = await tx.product.findUnique({ where: { id: item.productId } });
            const unitCost = product ? product.defaultCostPrice.toNumber() : 0;

            let autoBatchItem = await tx.batchItem.findFirst({
              where: { batchId: autoBatch.id, productId: item.productId },
            });

            if (!autoBatchItem) {
              autoBatchItem = await tx.batchItem.create({
                data: {
                  batchId: autoBatch.id,
                  productId: item.productId,
                  quantityPurchased: shortage,
                  quantityRemaining: 0,
                  unitCost: new Prisma.Decimal(unitCost),
                  totalCost: new Prisma.Decimal(shortage * unitCost),
                },
              });
            }

            const revenue = Math.round(shortage * item.unitPrice * 100) / 100;
            const cost = Math.round(shortage * unitCost * 100) / 100;
            const profit = Math.round((revenue - cost) * 100) / 100;

            grandTotalRevenue += revenue;
            grandTotalCost += cost;

            saleItemAllocations.push({
              productId: item.productId,
              batchId: autoBatch.id,
              quantity: shortage,
              unitPrice: item.unitPrice,
              unitCost,
              revenue,
              cost,
              profit,
            });

            inventoryTxns.push({
              productId: item.productId,
              batchId: autoBatch.id,
              quantity: shortage,
            });
          }
        }
      }

      const discount = Math.round((input.discount || 0) * 100) / 100;
      const subtotal = Math.round(grandTotalRevenue * 100) / 100;

      if (discount > subtotal) {
        throw new Error("Discount cannot exceed subtotal");
      }

      const totalAmount = Math.max(0, Math.round((subtotal - discount) * 100) / 100);
      const totalCost = Math.round(grandTotalCost * 100) / 100;
      const grossProfit = Math.round((totalAmount - totalCost) * 100) / 100;

      // Calculate Payment Status & Balance Due
      const amountPaid = input.amountPaid !== undefined && input.amountPaid !== null
        ? Math.min(totalAmount, Math.max(0, Math.round(input.amountPaid * 100) / 100))
        : totalAmount;

      const balanceDue = Math.max(0, Math.round((totalAmount - amountPaid) * 100) / 100);

      if (balanceDue > 0 && !input.customerId) {
        throw new Error("A Customer must be selected when selling on credit or partial payment.");
      }

      let paymentStatus: "PAID" | "PARTIAL" | "UNPAID" = "PAID";
      let saleStatus: "COMPLETED" | "PARTIAL" | "UNPAID" = "COMPLETED";
      if (balanceDue > 0) {
        paymentStatus = amountPaid > 0 ? "PARTIAL" : "UNPAID";
        saleStatus = amountPaid > 0 ? "PARTIAL" : "UNPAID";
      }

      // 1. Create Sale Record
      const sale = await tx.sale.create({
        data: {
          businessId: input.businessId,
          customerId: input.customerId || null,
          saleDate: input.saleDate || new Date(),
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          subtotal: new Prisma.Decimal(subtotal),
          discount: new Prisma.Decimal(discount),
          totalAmount: new Prisma.Decimal(totalAmount),
          totalCost: new Prisma.Decimal(totalCost),
          grossProfit: new Prisma.Decimal(grossProfit),
          paymentMethod: normalizePaymentMethod(input.paymentMethod),
          paymentStatus,
          status: saleStatus,
          amountPaid: new Prisma.Decimal(amountPaid),
          balanceDue: new Prisma.Decimal(balanceDue),
          notes: input.notes?.trim() || null,
          saleItems: {
            create: saleItemAllocations.map((sa) => ({
              productId: sa.productId,
              batchId: sa.batchId,
              quantity: sa.quantity,
              unitPrice: new Prisma.Decimal(sa.unitPrice),
              unitCost: new Prisma.Decimal(sa.unitCost),
              revenue: new Prisma.Decimal(sa.revenue),
              cost: new Prisma.Decimal(sa.cost),
              profit: new Prisma.Decimal(sa.profit),
            })),
          },
        },
        include: {
          customer: true,
          saleItems: {
            include: {
              product: true,
              batch: true,
            },
          },
        },
      });

      // 2. Perform Batch Deductions Concurrently
      await Promise.all(
        batchDeductions.map((d) =>
          tx.batchItem.update({
            where: { id: d.batchItemId },
            data: {
              quantityRemaining: {
                decrement: d.deductQuantity,
              },
            },
          })
        )
      );

      // 3. Log Inventory Transactions Concurrently
      await Promise.all(
        inventoryTxns.map((txn) =>
          tx.inventoryTransaction.create({
            data: {
              businessId: input.businessId,
              productId: txn.productId,
              batchId: txn.batchId,
              type: "SALE",
              quantity: txn.quantity,
              referenceId: sale.id,
              note: `Sale #${sale.id.slice(-6)}`,
            },
          })
        )
      );

      // 4. Sync batch status (mark COMPLETED if batch items ran out of stock)
      const uniqueBatchIds = Array.from(new Set(batchDeductions.map((b) => b.batchId)));
      await Promise.all(uniqueBatchIds.map((bId) => syncBatchStatus(tx, bId)));

      return sale;
    },
    { maxWait: 10000, timeout: 20000 }
  );

  // 5. Trigger Notifications & Inventory Transition Checks & Automation Events
  try {
    const isPartial = createdSale.paymentStatus === "PARTIAL";
    const isUnpaid = createdSale.paymentStatus === "UNPAID";

    let eventType = BusinessEventType.SALE_COMPLETED;
    if (isPartial) {
      eventType = BusinessEventType.SALE_PARTIAL_PAYMENT;
      await createNotification({
        businessId: input.businessId,
        type: "PARTIAL_PAYMENT",
        category: "SALES",
        severity: "WARNING",
        title: "Partial Payment Received",
        message: `Sale #${createdSale.id.slice(-6)} received GH₵${Number(createdSale.amountPaid).toFixed(2)}. GH₵${Number(createdSale.balanceDue).toFixed(2)} remains outstanding.`,
        actionLabel: "View Sales",
        actionUrl: "/sales",
        entityType: "SALE",
        entityId: createdSale.id,
        dedupeKey: `SALE:${createdSale.id}`,
      });
    } else if (isUnpaid) {
      eventType = BusinessEventType.SALE_UNPAID;
      await createNotification({
        businessId: input.businessId,
        type: "UNPAID_SALE",
        category: "SALES",
        severity: "WARNING",
        title: "Unpaid Sale Recorded",
        message: `Sale #${createdSale.id.slice(-6)} has an outstanding balance of GH₵${Number(createdSale.totalAmount).toFixed(2)}.`,
        actionLabel: "View Sales",
        actionUrl: "/sales",
        entityType: "SALE",
        entityId: createdSale.id,
        dedupeKey: `SALE:${createdSale.id}`,
      });
    } else {
      await createNotification({
        businessId: input.businessId,
        type: "SALE_COMPLETED",
        category: "SALES",
        severity: "SUCCESS",
        title: "Sale Completed",
        message: `Sale #${createdSale.id.slice(-6)} for GH₵${Number(createdSale.totalAmount).toFixed(2)} was completed successfully.`,
        actionLabel: "View Sales",
        actionUrl: "/sales",
        entityType: "SALE",
        entityId: createdSale.id,
        dedupeKey: `SALE:${createdSale.id}`,
      });
    }

    automationEngine.emit({
      eventType,
      businessId: input.businessId,
      entityType: "SALE",
      entityId: createdSale.id,
      dedupeKey: `SALE:${createdSale.id}:${eventType}`,
      metadata: {
        saleId: createdSale.id,
        totalAmount: Number(createdSale.totalAmount),
        amountPaid: Number(createdSale.amountPaid),
        balanceDue: Number(createdSale.balanceDue),
        paymentStatus: createdSale.paymentStatus,
        customerId: createdSale.customerId,
      },
    });

    if (createdSale.customerId && Number(createdSale.balanceDue) > 0) {
      automationEngine.emit({
        eventType: BusinessEventType.CUSTOMER_DEBT_CREATED,
        businessId: input.businessId,
        entityType: "CUSTOMER",
        entityId: createdSale.customerId,
        dedupeKey: `CUSTOMER_DEBT_CREATED:${createdSale.id}`,
        metadata: {
          saleId: createdSale.id,
          customerId: createdSale.customerId,
          balanceDue: Number(createdSale.balanceDue),
          totalAmount: Number(createdSale.totalAmount),
        },
      });
    }

    const soldProductIds = Array.from(new Set(input.items.map((i) => i.productId)));
    await Promise.all(
      soldProductIds.map((pId) => evaluateInventoryTransitions(pId, input.businessId))
    );
  } catch (err) {
    console.error("Failed to trigger sale notification/automation event:", err);
  }

  return createdSale;
}

export async function voidSale(saleId: string, reason?: string) {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: {
      saleItems: true,
    },
  });

  if (!sale) {
    throw new Error("Sale record not found");
  }
  if (sale.status === "VOIDED") {
    throw new Error("This sale is already voided");
  }

  const updatedSale = await prisma.$transaction(
    async (tx) => {
      // 1. Mark Sale as VOIDED
      const updatedSale = await tx.sale.update({
        where: { id: saleId },
        data: {
          status: "VOIDED",
          notes: reason ? `[VOIDED: ${reason}] ${sale.notes || ""}`.trim() : sale.notes,
        },
      });

      // 2. Restore BatchItem quantities & log RETURN inventory transactions concurrently
      const restoredBatchIds = new Set<string>();

      await Promise.all(
        sale.saleItems.map(async (item) => {
          restoredBatchIds.add(item.batchId);

          const batchItem = await tx.batchItem.findFirst({
            where: {
              batchId: item.batchId,
              productId: item.productId,
            },
          });

          if (batchItem) {
            await tx.batchItem.update({
              where: { id: batchItem.id },
              data: {
                quantityRemaining: {
                  increment: item.quantity,
                },
              },
            });
          }

          await tx.inventoryTransaction.create({
            data: {
              businessId: sale.businessId,
              productId: item.productId,
              batchId: item.batchId,
              type: "RETURN",
              quantity: item.quantity,
              referenceId: sale.id,
              note: `Voided Sale #${sale.id.slice(-6)}${reason ? `: ${reason}` : ""}`,
            },
          });
        })
      );

      // 3. Sync batch status (reactivate batch if stock restored)
      await Promise.all(Array.from(restoredBatchIds).map((bId) => syncBatchStatus(tx, bId)));

      return updatedSale;
    },
    { maxWait: 10000, timeout: 20000 }
  );

  try {
    automationEngine.emit({
      eventType: BusinessEventType.SALE_VOIDED,
      businessId: updatedSale.businessId,
      entityType: "SALE",
      entityId: updatedSale.id,
      dedupeKey: `SALE_VOIDED:${updatedSale.id}`,
      metadata: {
        saleId: updatedSale.id,
        reason,
        totalAmount: Number(updatedSale.totalAmount),
      },
    });
  } catch (err) {
    console.error("Failed to emit sale voided automation event:", err);
  }

  return updatedSale;
}

export async function getSales(businessId: string) {
  await ensureDefaultBusiness(businessId);

  return await prisma.sale.findMany({
    where: { businessId },
    orderBy: { saleDate: "desc" },
    include: {
      customer: true,
      saleItems: {
        include: {
          product: true,
          batch: true,
        },
      },
    },
  });
}
