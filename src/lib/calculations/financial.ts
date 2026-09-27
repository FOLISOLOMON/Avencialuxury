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
  const wants = Math.round((amount - savings - needs) * 100) / 100;

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
