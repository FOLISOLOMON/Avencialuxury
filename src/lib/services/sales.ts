import { prisma, ensureDefaultBusiness } from "@/lib/db/prisma";
import { allocateStockFIFO, AvailableBatchStock } from "@/lib/inventory/fifo";
import { syncBatchStatus } from "./batches";
import { PaymentMethod, Prisma, CancellationStatus, Role } from "@prisma/client";
import { createNotification, evaluateInventoryTransitions } from "./notifications";
import { automationEngine } from "@/lib/automation/engine";
import { BusinessEventType } from "@/lib/automation/events";
import { logAudit } from "./audit";

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
  creatorId?: string | null;
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
              status: { not: "ARCHIVED" },
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
          creatorId: input.creatorId || null,
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
          creator: {
            select: { id: true, name: true, email: true },
          },
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

    // 6. Record Audit Log Entry
    await logAudit({
      businessId: input.businessId,
      userId: input.creatorId,
      action: "SALE_CREATED",
      entityType: "SALE",
      entityId: createdSale.id,
      details: {
        totalAmount: Number(createdSale.totalAmount),
        amountPaid: Number(createdSale.amountPaid),
        balanceDue: Number(createdSale.balanceDue),
        itemsCount: input.items.length,
        paymentStatus: createdSale.paymentStatus,
      },
    });
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

export async function getSales(businessId: string, filter?: { creatorId?: string }) {
  await ensureDefaultBusiness(businessId);

  const where: any = { businessId };
  if (filter?.creatorId) {
    where.creatorId = filter.creatorId;
  }

  return await prisma.sale.findMany({
    where,
    orderBy: { saleDate: "desc" },
    include: {
      customer: true,
      creator: {
        select: { id: true, name: true, email: true },
      },
      lastEditor: {
        select: { id: true, name: true, email: true },
      },
      cancellationRequest: true,
      saleItems: {
        include: {
          product: true,
          batch: true,
        },
      },
    },
  });
}

/**
 * 30-Minute Safe Sale Editing Engine.
 * Workers may edit their own sales strictly within 30 minutes of creation.
 * Server timestamp authoritative deadline: now - createdAt <= 30 mins.
 */
export async function editSale(params: {
  saleId: string;
  editor: { id: string; role: Role };
  notes?: string | null;
  dueDate?: Date | string | null;
  customerId?: string | null;
}) {
  const sale = await prisma.sale.findUnique({
    where: { id: params.saleId },
    include: {
      debtPayments: true,
      cancellationRequest: true,
    },
  });

  if (!sale) {
    throw new Error("Sale record not found");
  }
  if (sale.status === "VOIDED") {
    throw new Error("Voided sales cannot be edited");
  }
  if (sale.cancellationRequest?.status === "PENDING") {
    throw new Error("Cannot edit a sale with a pending cancellation request");
  }

  // Worker role restrictions
  if (params.editor.role === "WORKER") {
    // 1. Worker can only edit their own sale
    if (sale.creatorId !== params.editor.id) {
      throw new Error("Unauthorized: You can only edit sales that you created.");
    }

    // 2. Server-side authoritative 30-minute window
    const now = Date.now();
    const createdAtMs = new Date(sale.createdAt).getTime();
    const elapsedMinutes = (now - createdAtMs) / (1000 * 60);

    if (elapsedMinutes > 30) {
      throw new Error(
        `Editing window expired. Sales can only be edited within 30 minutes of creation (${Math.round(elapsedMinutes)} minutes elapsed). Submit a cancellation request if corrections are required.`
      );
    }

    // 3. Reject edits if customer payments have already been collected
    if (sale.debtPayments.length > 0) {
      throw new Error(
        "This sale cannot be edited directly because payment transactions have already been recorded against it. Submit a cancellation request instead."
      );
    }
  }

  // Preserve edit history snapshot
  const previousValues = {
    notes: sale.notes,
    dueDate: sale.dueDate,
    customerId: sale.customerId,
    editedAt: new Date().toISOString(),
    editorId: params.editor.id,
    editorRole: params.editor.role,
  };

  const existingHistory = Array.isArray(sale.editHistory) ? (sale.editHistory as any[]) : [];
  const updatedHistory = [...existingHistory, previousValues];

  const updateData: Prisma.SaleUpdateInput = {
    lastEditor: { connect: { id: params.editor.id } },
    lastEditedAt: new Date(),
    editHistory: updatedHistory,
  };

  if (params.notes !== undefined) updateData.notes = params.notes?.trim() || null;
  if (params.dueDate !== undefined) updateData.dueDate = params.dueDate ? new Date(params.dueDate) : null;
  if (params.customerId !== undefined) {
    updateData.customer = params.customerId ? { connect: { id: params.customerId } } : { disconnect: true };
  }

  const updatedSale = await prisma.sale.update({
    where: { id: params.saleId },
    data: updateData,
    include: {
      customer: true,
      creator: { select: { id: true, name: true, email: true } },
      lastEditor: { select: { id: true, name: true, email: true } },
      saleItems: { include: { product: true } },
    },
  });

  await logAudit({
    businessId: sale.businessId,
    userId: params.editor.id,
    action: "SALE_EDITED",
    entityType: "SALE",
    entityId: sale.id,
    details: {
      editorRole: params.editor.role,
      changes: {
        notes: params.notes,
        dueDate: params.dueDate,
        customerId: params.customerId,
      },
    },
  });

  return updatedSale;
}

/**
 * Worker submits cancellation request.
 * Sale remains active until reviewed by Owner.
 */
export async function requestSaleCancellation(params: {
  saleId: string;
  requester: { id: string; role: Role };
  reason: string;
}) {
  if (!params.reason || !params.reason.trim()) {
    throw new Error("A clear cancellation reason is required.");
  }

  const sale = await prisma.sale.findUnique({
    where: { id: params.saleId },
    include: {
      cancellationRequest: true,
    },
  });

  if (!sale) {
    throw new Error("Sale record not found.");
  }
  if (sale.status === "VOIDED") {
    throw new Error("This sale is already voided.");
  }

  // Worker can request cancellation for their own sales or sales where creatorId was not explicitly set
  if (params.requester.role === "WORKER" && sale.creatorId && sale.creatorId !== params.requester.id) {
    throw new Error("Unauthorized: You can only request cancellation for sales you created.");
  }

  // If creatorId was unassigned, attribute this sale to the requesting worker
  if (!sale.creatorId && params.requester.role === "WORKER") {
    await prisma.sale.update({
      where: { id: sale.id },
      data: { creatorId: params.requester.id },
    });
  }

  // Check if a request already exists
  if (sale.cancellationRequest) {
    if (sale.cancellationRequest.status === "PENDING") {
      throw new Error("A cancellation request is already pending review by the owner for this sale.");
    }
    if (sale.cancellationRequest.status === "APPROVED") {
      throw new Error("This sale has already been approved for cancellation.");
    }
  }

  const cancellationRequest = await prisma.saleCancellationRequest.upsert({
    where: { saleId: params.saleId },
    create: {
      businessId: sale.businessId,
      saleId: sale.id,
      requesterId: params.requester.id,
      reason: params.reason.trim(),
      status: "PENDING",
    },
    update: {
      reason: params.reason.trim(),
      status: "PENDING",
      reviewerId: null,
      reviewedAt: null,
      rejectionReason: null,
    },
    include: {
      requester: { select: { id: true, name: true, email: true } },
      sale: true,
    },
  });

  // Notify the owner
  const requesterName = cancellationRequest.requester?.name || "Worker";
  await createNotification({
    businessId: sale.businessId,
    type: "CANCELLATION_REQUESTED",
    category: "SALES",
    severity: "WARNING",
    title: "Sale Cancellation Requested",
    message: `${requesterName} requested cancellation of Sale #${sale.id.slice(-6)}: "${params.reason.trim()}".`,
    actionLabel: "Review Queue",
    actionUrl: "/sales",
    entityType: "SALE",
    entityId: sale.id,
    dedupeKey: `CANCELLATION_REQ:${sale.id}`,
  });

  await logAudit({
    businessId: sale.businessId,
    userId: params.requester.id,
    action: "CANCELLATION_REQUESTED",
    entityType: "SALE",
    entityId: sale.id,
    details: { reason: params.reason.trim() },
  });

  return cancellationRequest;
}

/**
 * Owner reviews pending cancellation request.
 * Approves (atomically reverses stock & reconciles debt) or Rejects.
 */
export async function reviewSaleCancellation(params: {
  requestId: string;
  reviewerId: string;
  decision: "APPROVE" | "REJECT";
  rejectionReason?: string | null;
}) {
  const request = await prisma.saleCancellationRequest.findUnique({
    where: { id: params.requestId },
    include: {
      sale: {
        include: {
          saleItems: true,
          debtPayments: true,
        },
      },
      requester: { select: { id: true, name: true, email: true } },
    },
  });

  if (!request) {
    throw new Error("Cancellation request not found.");
  }
  if (request.status !== "PENDING") {
    throw new Error(`This request has already been ${request.status.toLowerCase()}.`);
  }

  if (params.decision === "REJECT") {
    const updatedRequest = await prisma.saleCancellationRequest.update({
      where: { id: params.requestId },
      data: {
        status: "REJECTED",
        reviewerId: params.reviewerId,
        reviewedAt: new Date(),
        rejectionReason: params.rejectionReason?.trim() || "Rejected by owner",
      },
    });

    await logAudit({
      businessId: request.businessId,
      userId: params.reviewerId,
      action: "CANCELLATION_REJECTED",
      entityType: "SALE_CANCELLATION_REQUEST",
      entityId: request.id,
      details: {
        saleId: request.saleId,
        rejectionReason: params.rejectionReason,
      },
    });

    return { request: updatedRequest, sale: request.sale };
  }

  // APPROVE: Atomically mark sale VOIDED, restore inventory exactly once, update request
  const sale = request.sale;
  if (sale.status === "VOIDED") {
    throw new Error("The associated sale is already voided.");
  }

  const result = await prisma.$transaction(
    async (tx) => {
      // 1. Mark cancellation request as APPROVED
      const approvedRequest = await tx.saleCancellationRequest.update({
        where: { id: params.requestId },
        data: {
          status: "APPROVED",
          reviewerId: params.reviewerId,
          reviewedAt: new Date(),
        },
      });

      // 2. Mark Sale as VOIDED with note
      const voidedSale = await tx.sale.update({
        where: { id: sale.id },
        data: {
          status: "VOIDED",
          notes: `[CANCELLED by Owner: ${request.reason}] ${sale.notes || ""}`.trim(),
        },
      });

      // 3. Restore BatchItem stock & log RETURN inventory transactions exactly once
      const restoredBatchIds = new Set<string>();

      for (const item of sale.saleItems) {
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
            note: `Approved Cancellation: Sale #${sale.id.slice(-6)} (${request.reason})`,
          },
        });
      }

      // 4. Reactivate batches if stock restored
      for (const bId of restoredBatchIds) {
        await syncBatchStatus(tx, bId);
      }

      return { request: approvedRequest, sale: voidedSale };
    },
    { maxWait: 10000, timeout: 20000 }
  );

  await logAudit({
    businessId: request.businessId,
    userId: params.reviewerId,
    action: "CANCELLATION_APPROVED",
    entityType: "SALE",
    entityId: sale.id,
    details: {
      requesterId: request.requesterId,
      reason: request.reason,
      totalAmount: Number(sale.totalAmount),
    },
  });

  return result;
}

export async function getCancellationRequests(businessId: string, status?: CancellationStatus) {
  await ensureDefaultBusiness(businessId);

  const where: any = { businessId };
  if (status) where.status = status;

  return await prisma.saleCancellationRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      requester: { select: { id: true, name: true, email: true } },
      reviewer: { select: { id: true, name: true, email: true } },
      sale: {
        include: {
          customer: true,
          saleItems: { include: { product: true } },
        },
      },
    },
  });
}
