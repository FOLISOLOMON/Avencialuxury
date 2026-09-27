/**
 * FIFO (First-In, First-Out) Inventory Allocation Engine for Avencia 2.0
 */

export interface AvailableBatchStock {
  batchId: string;
  batchReference: string;
  unitCost: number;
  quantityRemaining: number;
  purchaseDate: Date;
}

export interface FIFOAllocationResult {
  batchId: string;
  batchReference: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface FIFODeductionOutput {
  allocations: FIFOAllocationResult[];
  totalQuantityAllocated: number;
  totalCost: number;
  isFullyAllocated: boolean;
  unfulfilledQuantity: number;
}

/**
 * Deducts requested stock from available active batches using First-In, First-Out (FIFO) ordering.
 */
export function allocateStockFIFO(
  availableBatches: AvailableBatchStock[],
  quantityRequested: number
): FIFODeductionOutput {
  if (quantityRequested <= 0) {
    throw new Error("Requested quantity must be greater than zero");
  }

  // Sort batches by purchase date ascending (oldest first)
  const sortedBatches = [...availableBatches].sort(
    (a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime()
  );

  let remainingToAllocate = quantityRequested;
  let totalCost = 0;
  const allocations: FIFOAllocationResult[] = [];

  for (const batch of sortedBatches) {
    if (remainingToAllocate <= 0) break;
    if (batch.quantityRemaining <= 0) continue;

    const deductAmount = Math.min(remainingToAllocate, batch.quantityRemaining);
    const itemTotalCost = Math.round(deductAmount * batch.unitCost * 100) / 100;

    allocations.push({
      batchId: batch.batchId,
      batchReference: batch.batchReference,
      quantity: deductAmount,
      unitCost: batch.unitCost,
      totalCost: itemTotalCost,
    });

    remainingToAllocate -= deductAmount;
    totalCost += itemTotalCost;
  }

  totalCost = Math.round(totalCost * 100) / 100;
  const totalQuantityAllocated = quantityRequested - remainingToAllocate;

  return {
    allocations,
    totalQuantityAllocated,
    totalCost,
    isFullyAllocated: remainingToAllocate === 0,
    unfulfilledQuantity: remainingToAllocate,
  };
}
