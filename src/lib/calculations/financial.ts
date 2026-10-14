/**
 * Financial Calculation Module for Avencia 2.0
 * Pure, side-effect free financial math functions with precise numeric handling.
 */

export interface SaleItemCalcInput {
  quantity: number;
  unitPrice: number;
  unitCost: number;
}

export interface SaleItemCalcResult {
  revenue: number;
  cost: number;
  profit: number;
}

/**
 * Calculates revenue, cost, and gross profit for an individual sale item.
 */
export function calculateSaleItemProfit(input: SaleItemCalcInput): SaleItemCalcResult {
  const { quantity, unitPrice, unitCost } = input;
  
  if (quantity <= 0) {
    throw new Error("Quantity must be greater than zero");
  }
  if (unitPrice < 0 || unitCost < 0) {
    throw new Error("Unit price and unit cost cannot be negative");
  }

  const revenue = Math.round(quantity * unitPrice * 100) / 100;
  const cost = Math.round(quantity * unitCost * 100) / 100;
  const profit = Math.round((revenue - cost) * 100) / 100;

  return { revenue, cost, profit };
}

/**
 * Calculates totals for a multi-item sale.
 */
export function calculateSaleTotals(items: SaleItemCalcInput[], discount = 0) {
  let subtotal = 0;
  let totalCost = 0;
  let grossProfit = 0;

  for (const item of items) {
    const itemResult = calculateSaleItemProfit(item);
    subtotal += itemResult.revenue;
    totalCost += itemResult.cost;
    grossProfit += itemResult.profit;
  }

  subtotal = Math.round(subtotal * 100) / 100;
  totalCost = Math.round(totalCost * 100) / 100;
  discount = Math.round(discount * 100) / 100;

  if (discount > subtotal) {
    throw new Error("Discount cannot exceed subtotal");
  }

  const totalAmount = Math.max(0, Math.round((subtotal - discount) * 100) / 100);
  const netGrossProfit = Math.round((totalAmount - totalCost) * 100) / 100;

  return {
    subtotal,
    discount,
    totalAmount,
    totalCost,
    grossProfit: netGrossProfit,
  };
}

/**
 * Calculates Net Profit from Gross Profit and Total Operational Expenses.
 */
export function calculateNetProfit(grossProfit: number, totalExpenses: number): number {
  return Math.round((grossProfit - totalExpenses) * 100) / 100;
}

/**
 * Calculates 50% Savings, 30% Needs, and 20% Wants profit allocation.
 */
export function calculate50_30_20Allocation(totalProfitToAllocate: number): {
  savings: number;
  needs: number;
  wants: number;
} {
  const amount = Math.max(0, Math.round(totalProfitToAllocate * 100) / 100);
  const savings = Math.round(amount * 0.50 * 100) / 100;
  const needs = Math.round(amount * 0.30 * 100) / 100;
  const rawWants = Math.round((amount - savings - needs) * 100) / 100;
  const wants = Object.is(rawWants, -0) || Math.abs(rawWants) < 0.0001 ? 0 : rawWants;

  return { savings, needs, wants };
}

/**
 * Validates whether a proposed profit allocation is within available allocatable profit.
 */
export function validateProfitAllocation(
  availableNetProfit: number,
  totalCurrentlyAllocated: number,
  newAllocationAmount: number
): { isValid: boolean; remainingAllocatable: number; maxAllowed: number } {
  const remainingAllocatable = Math.max(
    0,
    Math.round((availableNetProfit - totalCurrentlyAllocated) * 100) / 100
  );

  const isValid = newAllocationAmount > 0 && newAllocationAmount <= remainingAllocatable;

  return {
    isValid,
    remainingAllocatable,
    maxAllowed: remainingAllocatable,
  };
}

export interface SaleCashRealizationInput {
  amountPaid: number;
  totalCost: number;
  totalAmount?: number;
}

export interface SaleCashRealizationResult {
  costRecovered: number;
  unrecoveredCost: number;
  realizedGrossProfit: number;
  isCostRecovered: boolean;
}

/**
 * Calculates cash cost recovery and realized gross profit for a sale.
 * Collected cash first recovers inventory cost up to totalCost.
 * Profit is realized only on cash received in excess of totalCost.
 */
export function calculateSaleCashRealization(input: SaleCashRealizationInput): SaleCashRealizationResult {
  const amountPaid = Math.max(0, Math.round((input.amountPaid || 0) * 100) / 100);
  const totalCost = Math.max(0, Math.round((input.totalCost || 0) * 100) / 100);

  const costRecovered = Math.min(amountPaid, totalCost);
  const unrecoveredCost = Math.max(0, Math.round((totalCost - costRecovered) * 100) / 100);
  const realizedGrossProfit = Math.max(0, Math.round((amountPaid - totalCost) * 100) / 100);
  const isCostRecovered = amountPaid >= totalCost;

  return {
    costRecovered,
    unrecoveredCost,
    realizedGrossProfit,
    isCostRecovered,
  };
}

export interface CashBackedSummaryInput {
  sales: Array<{
    amountPaid: number;
    totalCost: number;
    totalAmount?: number;
  }>;
  totalExpenses: number;
  totalAllocated: number;
}

export interface CashBackedSummaryResult {
  verifiedCollectedCash: number;
  costOfGoodsSold: number;
  costRecovered: number;
  unrecoveredCost: number;
  realizedGrossProfit: number;
  totalExpenses: number;
  realizedNetProfit: number;
  totalAllocated: number;
  eligibleCashProfit: number;
  isOverAllocated: boolean;
  overAllocatedAmount: number;
  warnings: string[];
}

/**
 * Computes authoritative cash-backed profitability across verified sales and expenses.
 */
export function calculateCashBackedSummary(input: CashBackedSummaryInput): CashBackedSummaryResult {
  let verifiedCollectedCash = 0;
  let costOfGoodsSold = 0;
  let totalCostRecovered = 0;
  let totalRealizedGrossProfit = 0;

  for (const s of input.sales) {
    const paid = Math.max(0, Math.round((s.amountPaid || 0) * 100) / 100);
    const cost = Math.max(0, Math.round((s.totalCost || 0) * 100) / 100);
    verifiedCollectedCash += paid;
    costOfGoodsSold += cost;

    const realization = calculateSaleCashRealization({ amountPaid: paid, totalCost: cost });
    totalCostRecovered += realization.costRecovered;
    totalRealizedGrossProfit += realization.realizedGrossProfit;
  }

  verifiedCollectedCash = Math.round(verifiedCollectedCash * 100) / 100;
  costOfGoodsSold = Math.round(costOfGoodsSold * 100) / 100;
  const costRecovered = Math.round(totalCostRecovered * 100) / 100;
  const unrecoveredCost = Math.max(0, Math.round((costOfGoodsSold - costRecovered) * 100) / 100);
  const realizedGrossProfit = Math.round(totalRealizedGrossProfit * 100) / 100;
  const totalExpenses = Math.max(0, Math.round((input.totalExpenses || 0) * 100) / 100);

  // Conservative Cash-Backed Net Surplus:
  // Protects the inventory replacement cost of ALL sold goods across the business.
  // VerifiedCollectedCash - CostOfGoodsSold - TotalExpenses
  // Identical to: RealizedGrossProfit - UnrecoveredCost - TotalExpenses
  const realizedNetProfit = Math.round((verifiedCollectedCash - costOfGoodsSold - totalExpenses) * 100) / 100;
  const totalAllocated = Math.max(0, Math.round((input.totalAllocated || 0) * 100) / 100);

  const eligibleCashProfit = Math.max(0, Math.round((realizedNetProfit - totalAllocated) * 100) / 100);
  const isOverAllocated = totalAllocated > 0 && totalAllocated > realizedNetProfit;
  const overAllocatedAmount = isOverAllocated ? Math.round((totalAllocated - Math.max(0, realizedNetProfit)) * 100) / 100 : 0;

  const warnings: string[] = [];
  if (isOverAllocated) {
    warnings.push(
      `Historical allocations (GH₵${totalAllocated.toFixed(2)}) exceed conservative cash surplus (GH₵${Math.max(0, realizedNetProfit).toFixed(2)}) by GH₵${overAllocatedAmount.toFixed(2)}. No funds available for new allocation.`
    );
  }
  if (unrecoveredCost > 0) {
    warnings.push(
      `GH₵${unrecoveredCost.toFixed(2)} of sold inventory costs remain unrecovered due to unpaid customer debt. Distributable profit is restricted by GH₵${unrecoveredCost.toFixed(2)} to protect restocking capital.`
    );
  }

  return {
    verifiedCollectedCash,
    costOfGoodsSold,
    costRecovered,
    unrecoveredCost,
    realizedGrossProfit,
    totalExpenses,
    realizedNetProfit,
    totalAllocated,
    eligibleCashProfit,
    isOverAllocated,
    overAllocatedAmount,
    warnings,
  };
}

