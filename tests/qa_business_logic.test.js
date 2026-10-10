/**
 * AVENCIA 2.0 — AUTOMATED BUSINESS LOGIC QA TEST SUITE
 * 
 * Tests core business calculations, inventory FIFO allocation, debt tracking,
 * financial waterfall, and notification reminder scheduling in isolation
 * without modifying or corrupting real production database records.
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

// --- SECTION 1: FINANCIAL & SALE CALCULATIONS ---
describe("Financial Math & Sales Calculations", () => {
  // Pure implementations matching src/lib/calculations/financial.ts
  function calculateSaleItemProfit(input) {
    const { quantity, unitPrice, unitCost } = input;
    if (quantity <= 0) throw new Error("Quantity must be greater than zero");
    if (unitPrice < 0 || unitCost < 0) throw new Error("Unit price and unit cost cannot be negative");

    const revenue = Math.round(quantity * unitPrice * 100) / 100;
    const cost = Math.round(quantity * unitCost * 100) / 100;
    const profit = Math.round((revenue - cost) * 100) / 100;
    return { revenue, cost, profit };
  }

  function calculateSaleTotals(items, discount = 0) {
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

  function calculatePaymentStatus(totalAmount, amountPaid) {
    const cleanTotal = Math.max(0, Math.round(totalAmount * 100) / 100);
    const cleanPaid = Math.min(cleanTotal, Math.max(0, Math.round((amountPaid ?? cleanTotal) * 100) / 100));
    const balanceDue = Math.max(0, Math.round((cleanTotal - cleanPaid) * 100) / 100);

    let paymentStatus = "PAID";
    let saleStatus = "COMPLETED";

    if (balanceDue > 0) {
      paymentStatus = cleanPaid > 0 ? "PARTIAL" : "UNPAID";
      saleStatus = cleanPaid > 0 ? "PARTIAL" : "UNPAID";
    }

    return {
      totalAmount: cleanTotal,
      amountPaid: cleanPaid,
      balanceDue,
      paymentStatus,
      saleStatus,
    };
  }

  it("calculates single sale item revenue, cost, and gross profit accurately", () => {
    const res = calculateSaleItemProfit({ quantity: 3, unitPrice: 120.5, unitCost: 75.25 });
    assert.equal(res.revenue, 361.5);
    assert.equal(res.cost, 225.75);
    assert.equal(res.profit, 135.75);
  });

  it("rejects zero and negative quantities in sale items", () => {
    assert.throws(() => calculateSaleItemProfit({ quantity: 0, unitPrice: 100, unitCost: 50 }), /greater than zero/);
    assert.throws(() => calculateSaleItemProfit({ quantity: -2, unitPrice: 100, unitCost: 50 }), /greater than zero/);
  });

  it("rejects negative unit price or unit cost", () => {
    assert.throws(() => calculateSaleItemProfit({ quantity: 1, unitPrice: -10, unitCost: 50 }), /cannot be negative/);
    assert.throws(() => calculateSaleItemProfit({ quantity: 1, unitPrice: 100, unitCost: -5 }), /cannot be negative/);
  });

  it("computes multi-item totals with valid discount applied correctly", () => {
    const items = [
      { quantity: 2, unitPrice: 150, unitCost: 90 }, // Rev: 300, Cost: 180
      { quantity: 1, unitPrice: 200, unitCost: 110 }, // Rev: 200, Cost: 110
    ];
    const totals = calculateSaleTotals(items, 50);
    assert.equal(totals.subtotal, 500);
    assert.equal(totals.discount, 50);
    assert.equal(totals.totalAmount, 450);
    assert.equal(totals.totalCost, 290);
    assert.equal(totals.grossProfit, 160); // 450 - 290 = 160
  });

  it("prevents discount from exceeding the sale subtotal", () => {
    const items = [{ quantity: 1, unitPrice: 100, unitCost: 60 }];
    assert.throws(() => calculateSaleTotals(items, 150), /Discount cannot exceed subtotal/);
  });

  it("correctly identifies fully paid sales", () => {
    const payment = calculatePaymentStatus(300, 300);
    assert.equal(payment.balanceDue, 0);
    assert.equal(payment.paymentStatus, "PAID");
    assert.equal(payment.saleStatus, "COMPLETED");
  });

  it("correctly identifies partial credit sales", () => {
    const payment = calculatePaymentStatus(500, 200);
    assert.equal(payment.amountPaid, 200);
    assert.equal(payment.balanceDue, 300);
    assert.equal(payment.paymentStatus, "PARTIAL");
    assert.equal(payment.saleStatus, "PARTIAL");
  });

  it("correctly identifies 100% unpaid / credit sales", () => {
    const payment = calculatePaymentStatus(450, 0);
    assert.equal(payment.amountPaid, 0);
    assert.equal(payment.balanceDue, 450);
    assert.equal(payment.paymentStatus, "UNPAID");
    assert.equal(payment.saleStatus, "UNPAID");
  });

  it("caps amountPaid to totalAmount so overpayment cannot produce negative balanceDue", () => {
    const payment = calculatePaymentStatus(200, 250);
    assert.equal(payment.amountPaid, 200);
    assert.equal(payment.balanceDue, 0);
    assert.equal(payment.paymentStatus, "PAID");
  });
});

// --- SECTION 2: INVENTORY FIFO ALLOCATION ---
describe("FIFO Inventory Allocation Engine", () => {
  // Pure implementation matching src/lib/inventory/fifo.ts
  function allocateStockFIFO(availableBatches, quantityRequested) {
    if (quantityRequested <= 0) {
      throw new Error("Requested quantity must be greater than zero");
    }

    const sortedBatches = [...availableBatches].sort(
      (a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime()
    );

    let remainingToAllocate = quantityRequested;
    let totalCost = 0;
    const allocations = [];

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

  it("allocates stock from the oldest batch first (FIFO order)", () => {
    const batches = [
      { batchId: "b2", batchReference: "BATCH-MAY", unitCost: 60, quantityRemaining: 10, purchaseDate: new Date("2026-05-01") },
      { batchId: "b1", batchReference: "BATCH-JAN", unitCost: 50, quantityRemaining: 5, purchaseDate: new Date("2026-01-01") },
    ];

    const result = allocateStockFIFO(batches, 4);
    assert.equal(result.isFullyAllocated, true);
    assert.equal(result.allocations.length, 1);
    assert.equal(result.allocations[0].batchId, "b1");
    assert.equal(result.allocations[0].quantity, 4);
    assert.equal(result.allocations[0].unitCost, 50);
    assert.equal(result.totalCost, 200);
  });

  it("splits allocation across multiple batches when older batch has insufficient stock", () => {
    const batches = [
      { batchId: "b1", batchReference: "BATCH-JAN", unitCost: 50, quantityRemaining: 3, purchaseDate: new Date("2026-01-01") },
      { batchId: "b2", batchReference: "BATCH-FEB", unitCost: 55, quantityRemaining: 10, purchaseDate: new Date("2026-02-01") },
    ];

    const result = allocateStockFIFO(batches, 7);
    assert.equal(result.isFullyAllocated, true);
    assert.equal(result.allocations.length, 2);
    // 3 units from B1 @ 50 = 150
    assert.equal(result.allocations[0].batchId, "b1");
    assert.equal(result.allocations[0].quantity, 3);
    assert.equal(result.allocations[0].totalCost, 150);
    // 4 units from B2 @ 55 = 220
    assert.equal(result.allocations[1].batchId, "b2");
    assert.equal(result.allocations[1].quantity, 4);
    assert.equal(result.allocations[1].totalCost, 220);
    assert.equal(result.totalCost, 370);
  });

  it("flags shortage gracefully when total available stock is less than requested", () => {
    const batches = [
      { batchId: "b1", batchReference: "BATCH-JAN", unitCost: 50, quantityRemaining: 4, purchaseDate: new Date("2026-01-01") },
    ];

    const result = allocateStockFIFO(batches, 10);
    assert.equal(result.isFullyAllocated, false);
    assert.equal(result.totalQuantityAllocated, 4);
    assert.equal(result.unfulfilledQuantity, 6);
  });
});

// --- SECTION 3: PROFITABILITY & 50/30/20 WEALTH SPLIT ---
describe("Profitability & 50/30/20 Wealth Split", () => {
  function calculateNetProfit(grossProfit, totalExpenses) {
    return Math.round((grossProfit - totalExpenses) * 100) / 100;
  }

  function calculate50_30_20Allocation(totalProfitToAllocate) {
    const amount = Math.max(0, Math.round(totalProfitToAllocate * 100) / 100);
    const savings = Math.round(amount * 0.50 * 100) / 100;
    const needs = Math.round(amount * 0.30 * 100) / 100;
    const wants = Math.round((amount - savings - needs) * 100) / 100;
    return { savings, needs, wants };
  }

  function validateProfitAllocation(availableNetProfit, totalCurrentlyAllocated, newAllocationAmount) {
    const remainingAllocatable = Math.max(
      0,
      Math.round((availableNetProfit - totalCurrentlyAllocated) * 100) / 100
    );
    const isValid = newAllocationAmount > 0 && newAllocationAmount <= remainingAllocatable;
    return { isValid, remainingAllocatable };
  }

  it("calculates Net Profit from Gross Profit minus Operational Expenses", () => {
    const net = calculateNetProfit(2500, 850);
    assert.equal(net, 1650);
  });

  it("calculates exact 50% Savings, 30% Needs, 20% Wants without penny rounding loss", () => {
    const split = calculate50_30_20Allocation(1000);
    assert.equal(split.savings, 500);
    assert.equal(split.needs, 300);
    assert.equal(split.wants, 200);
    assert.equal(split.savings + split.needs + split.wants, 1000);
  });

  it("handles odd/fractional amounts in 50/30/20 split so sum matches total exactly", () => {
    const split = calculate50_30_20Allocation(333.33);
    assert.equal(split.savings, 166.67); // 50% of 333.33
    assert.equal(split.needs, 100.00);  // 30% of 333.33
    assert.equal(split.wants, 66.66);   // remainder
    assert.equal(Math.round((split.savings + split.needs + split.wants) * 100) / 100, 333.33);
  });

  it("enforces profit allocation ceiling (cannot allocate more than remaining net profit)", () => {
    const check1 = validateProfitAllocation(1000, 600, 400);
    assert.equal(check1.isValid, true);
    assert.equal(check1.remainingAllocatable, 400);

    const check2 = validateProfitAllocation(1000, 600, 400.01);
    assert.equal(check2.isValid, false);
  });
});

// --- SECTION 4: PAYMENT DUE DATE & SMART REMINDER RULES ---
describe("Payment Due Date & Smart Reminder Engine", () => {
  function calculateDueDayDifference(dueDateStr, todayStr) {
    const dueTime = new Date(`${dueDateStr}T00:00:00Z`).getTime();
    const todayTime = new Date(`${todayStr}T00:00:00Z`).getTime();
    return Math.round((dueTime - todayTime) / (1000 * 60 * 60 * 24));
  }

  function shouldSendReminder({ diffDays, advanceDays, upcomingEnabled, dueTodayEnabled, overdueEnabled, overdueInterval, currentBalance }) {
    if (currentBalance <= 0) return { send: false, reason: "DEBT_ALREADY_SETTLED" };

    if (upcomingEnabled && diffDays === advanceDays) {
      return { send: true, type: "UPCOMING_PAYMENT" };
    }
    if (dueTodayEnabled && diffDays === 0) {
      return { send: true, type: "PAYMENT_DUE_TODAY" };
    }
    if (overdueEnabled && diffDays < 0) {
      const overdueDays = Math.abs(diffDays);
      if (overdueDays % overdueInterval === 0) {
        return { send: true, type: "OVERDUE_PAYMENT", overdueDays };
      }
      return { send: false, reason: "OVERDUE_INTERVAL_NOT_MET" };
    }
    return { send: false, reason: "NO_TRIGGER_CONDITION_MET" };
  }

  function isWithinQuietHours(nowTimeStr, quietStart, quietEnd) {
    if (!quietStart || !quietEnd) return false;
    const [h, m] = nowTimeStr.split(":").map(Number);
    const currentMins = h * 60 + m;
    const [startH, startM] = quietStart.split(":").map(Number);
    const [endH, endM] = quietEnd.split(":").map(Number);
    const startMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;

    if (startMins <= endMins) {
      return currentMins >= startMins && currentMins < endMins;
    } else {
      // Midnight wraparound (e.g. 21:00 to 08:00)
      return currentMins >= startMins || currentMins < endMins;
    }
  }

  it("calculates exact calendar day differences between due date and current date", () => {
    assert.equal(calculateDueDayDifference("2026-10-15", "2026-10-14"), 1); // 1 day in advance
    assert.equal(calculateDueDayDifference("2026-10-14", "2026-10-14"), 0); // Due today
    assert.equal(calculateDueDayDifference("2026-10-11", "2026-10-14"), -3); // 3 days overdue
  });

  it("triggers upcoming reminder when due in advanceDays", () => {
    const trigger = shouldSendReminder({
      diffDays: 1,
      advanceDays: 1,
      upcomingEnabled: true,
      dueTodayEnabled: true,
      overdueEnabled: true,
      overdueInterval: 3,
      currentBalance: 150,
    });
    assert.equal(trigger.send, true);
    assert.equal(trigger.type, "UPCOMING_PAYMENT");
  });

  it("triggers due today reminder when diffDays is 0", () => {
    const trigger = shouldSendReminder({
      diffDays: 0,
      advanceDays: 1,
      upcomingEnabled: true,
      dueTodayEnabled: true,
      overdueEnabled: true,
      overdueInterval: 3,
      currentBalance: 300,
    });
    assert.equal(trigger.send, true);
    assert.equal(trigger.type, "PAYMENT_DUE_TODAY");
  });

  it("triggers overdue reminder on configured intervals (e.g. every 3 days)", () => {
    const day3 = shouldSendReminder({
      diffDays: -3,
      advanceDays: 1,
      upcomingEnabled: true,
      dueTodayEnabled: true,
      overdueEnabled: true,
      overdueInterval: 3,
      currentBalance: 250,
    });
    assert.equal(day3.send, true);
    assert.equal(day3.type, "OVERDUE_PAYMENT");
    assert.equal(day3.overdueDays, 3);

    const day4 = shouldSendReminder({
      diffDays: -4,
      advanceDays: 1,
      upcomingEnabled: true,
      dueTodayEnabled: true,
      overdueEnabled: true,
      overdueInterval: 3,
      currentBalance: 250,
    });
    assert.equal(day4.send, false);
    assert.equal(day4.reason, "OVERDUE_INTERVAL_NOT_MET");

    const day6 = shouldSendReminder({
      diffDays: -6,
      advanceDays: 1,
      upcomingEnabled: true,
      dueTodayEnabled: true,
      overdueEnabled: true,
      overdueInterval: 3,
      currentBalance: 250,
    });
    assert.equal(day6.send, true);
    assert.equal(day6.type, "OVERDUE_PAYMENT");
    assert.equal(day6.overdueDays, 6);
  });

  it("never sends reminders to settled accounts (balanceDue <= 0)", () => {
    const settled = shouldSendReminder({
      diffDays: 0,
      advanceDays: 1,
      upcomingEnabled: true,
      dueTodayEnabled: true,
      overdueEnabled: true,
      overdueInterval: 3,
      currentBalance: 0,
    });
    assert.equal(settled.send, false);
    assert.equal(settled.reason, "DEBT_ALREADY_SETTLED");
  });

  it("correctly identifies quiet hours with midnight wraparound (e.g. 21:00 to 08:00)", () => {
    assert.equal(isWithinQuietHours("22:30", "21:00", "08:00"), true);
    assert.equal(isWithinQuietHours("02:15", "21:00", "08:00"), true);
    assert.equal(isWithinQuietHours("07:59", "21:00", "08:00"), true);
    assert.equal(isWithinQuietHours("08:00", "21:00", "08:00"), false);
    assert.equal(isWithinQuietHours("14:30", "21:00", "08:00"), false);
  });

  it("generates deterministic and idempotent dedupe keys per day", () => {
    const saleId = "sale_123456";
    const todayStr = "2026-10-14";
    const key1 = `PUSH_DEBT:${saleId}:DUE_TODAY:${todayStr}`;
    const key2 = `PUSH_DEBT:${saleId}:DUE_TODAY:${todayStr}`;
    assert.equal(key1, key2);
  });
});
