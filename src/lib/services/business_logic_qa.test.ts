import {
  calculateSaleItemProfit,
  calculateSaleTotals,
  calculateNetProfit,
  calculate50_30_20Allocation,
  validateProfitAllocation,
} from "../calculations/financial";
import { allocateStockFIFO, AvailableBatchStock } from "../inventory/fifo";

function runQAAuditSuite() {
  console.log("=================================================");
  console.log("AVENCIA 2.0 EXHAUSTIVE BUSINESS LOGIC & QA AUDIT");
  console.log("=================================================");

  let passCount = 0;
  let testCount = 0;

  function assert(condition: boolean, message: string) {
    testCount++;
    if (condition) {
      passCount++;
      console.log(`  ✅ [PASS] ${message}`);
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      throw new Error(`Test failed: ${message}`);
    }
  }

  // -------------------------------------------------------------
  // 1. Sales & Profit Calculations
  // -------------------------------------------------------------
  console.log("\n1. Testing Sales & Profit Math:");

  const item1 = calculateSaleItemProfit({ quantity: 3, unitPrice: 150.50, unitCost: 90.25 });
  assert(item1.revenue === 451.50, "Item 1 revenue = 3 * 150.50 = 451.50");
  assert(item1.cost === 270.75, "Item 1 cost = 3 * 90.25 = 270.75");
  assert(item1.profit === 180.75, "Item 1 gross profit = 451.50 - 270.75 = 180.75");

  const saleTotals = calculateSaleTotals(
    [
      { quantity: 2, unitPrice: 100, unitCost: 60 }, // Subtotal: 200, Cost: 120
      { quantity: 5, unitPrice: 20, unitCost: 12 },  // Subtotal: 100, Cost: 60
    ],
    25 // Discount: 25
  );

  assert(saleTotals.subtotal === 300, "Subtotal = 200 + 100 = 300");
  assert(saleTotals.discount === 25, "Discount = 25");
  assert(saleTotals.totalAmount === 275, "totalAmount = 300 - 25 = 275");
  assert(saleTotals.totalCost === 180, "totalCost = 120 + 60 = 180");
  assert(saleTotals.grossProfit === 95, "grossProfit = 275 - 180 = 95");

  // Discount exceeding subtotal check
  let discountErrorCaught = false;
  try {
    calculateSaleTotals([{ quantity: 1, unitPrice: 50, unitCost: 30 }], 60);
  } catch (err: any) {
    discountErrorCaught = err?.message === "Discount cannot exceed subtotal";
  }
  assert(discountErrorCaught, "Discount > subtotal correctly throws error");

  // -------------------------------------------------------------
  // 2. FIFO Inventory Allocation & Batch Costing
  // -------------------------------------------------------------
  console.log("\n2. Testing FIFO Inventory Allocation Engine:");

  const fifoBatches: AvailableBatchStock[] = [
    {
      batchId: "batch-old",
      batchReference: "REF-001",
      unitCost: 40.00,
      quantityRemaining: 5,
      purchaseDate: new Date("2026-01-01"),
    },
    {
      batchId: "batch-new",
      batchReference: "REF-002",
      unitCost: 45.00,
      quantityRemaining: 10,
      purchaseDate: new Date("2026-02-01"),
    },
  ];

  const fifoAlloc = allocateStockFIFO(fifoBatches, 8);
  assert(fifoAlloc.isFullyAllocated === true, "8 units fully allocated across batches");
  assert(fifoAlloc.allocations.length === 2, "Spans 2 active batches FIFO order");
  assert(fifoAlloc.allocations[0].batchId === "batch-old" && fifoAlloc.allocations[0].quantity === 5, "Oldest batch drained first (5 units @ GH₵40)");
  assert(fifoAlloc.allocations[1].batchId === "batch-new" && fifoAlloc.allocations[1].quantity === 3, "Newer batch provides remaining (3 units @ GH₵45)");
  assert(fifoAlloc.totalCost === 335.00, "Total cost = 5*40 + 3*45 = GH₵335.00");

  const fifoInsufficient = allocateStockFIFO(fifoBatches, 20);
  assert(fifoInsufficient.isFullyAllocated === false, "20 units exceeds total stock of 15");
  assert(fifoInsufficient.unfulfilledQuantity === 5, "Unfulfilled quantity = 5");

  // -------------------------------------------------------------
  // 3. Expenses & Net Profit Calculations
  // -------------------------------------------------------------
  console.log("\n3. Testing Operational Expenses & Net Profit:");

  const grossProfit = 1500.00;
  const operationalExpenses = 450.50;
  const netProfit = calculateNetProfit(grossProfit, operationalExpenses);
  assert(netProfit === 1049.50, "Net Profit = GH₵1500.00 - GH₵450.50 = GH₵1049.50");

  // -------------------------------------------------------------
  // 4. Profit Allocation & 50/30/20 Calculator
  // -------------------------------------------------------------
  console.log("\n4. Testing Profit Allocation & 50/30/20 Rule:");

  const allocation503020 = calculate50_30_20Allocation(100.00);
  assert(allocation503020.savings === 50.00, "50% Savings of 100 = GH₵50.00");
  assert(allocation503020.needs === 30.00, "30% Needs of 100 = GH₵30.00");
  assert(allocation503020.wants === 20.00, "20% Wants of 100 = GH₵20.00");
  assert(
    allocation503020.savings + allocation503020.needs + allocation503020.wants === 100.00,
    "Sum of 50/30/20 components equals total allocated amount exactly"
  );

  const fractionalAlloc = calculate50_30_20Allocation(123.45);
  assert(
    Math.round((fractionalAlloc.savings + fractionalAlloc.needs + fractionalAlloc.wants) * 100) / 100 === 123.45,
    "Fractional GH₵123.45 50/30/20 split conserves total sum perfectly"
  );

  const validationValid = validateProfitAllocation(1000, 400, 500);
  assert(validationValid.isValid === true, "Allocating GH₵500 from GH₵600 remaining is valid");

  const validationInvalid = validateProfitAllocation(1000, 400, 700);
  assert(validationInvalid.isValid === false, "Allocating GH₵700 from GH₵600 remaining is invalid");

  console.log(`\n=================================================`);
  console.log(`🎉 ALL ${passCount} / ${testCount} QA AUDIT TESTS PASSED!`);
  console.log(`=================================================\n`);
}

runQAAuditSuite();
