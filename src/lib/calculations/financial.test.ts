import { calculateSaleTotals, calculateNetProfit, validateProfitAllocation } from "./financial";

function testFinancialCalculations() {
  console.log("Running Financial Calculations Tests...");

  // Test 1: Sale Totals
  const saleItems = [
    { quantity: 2, unitPrice: 50, unitCost: 30 },
    { quantity: 1, unitPrice: 100, unitCost: 60 },
  ];
  const saleTotals = calculateSaleTotals(saleItems, 10);

  console.assert(saleTotals.subtotal === 200, "Subtotal should be 200");
  console.assert(saleTotals.totalAmount === 190, "Total amount should be 190 (200 - 10 discount)");
  console.assert(saleTotals.totalCost === 120, "Total cost should be 120 (2*30 + 1*60)");
  console.assert(saleTotals.grossProfit === 70, "Gross profit should be 70 (190 - 120)");

  // Test 2: Net Profit
  const netProfit = calculateNetProfit(saleTotals.grossProfit, 20);
  console.assert(netProfit === 50, "Net profit should be 50 (70 gross profit - 20 expenses)");

  // Test 3: Profit Allocation Validation
  const validAlloc = validateProfitAllocation(1000, 700, 300);
  console.assert(validAlloc.isValid === true, "300 out of 300 remaining should be valid");

  const invalidAlloc = validateProfitAllocation(1000, 700, 400);
  console.assert(invalidAlloc.isValid === false, "400 out of 300 remaining should be invalid");

  console.log("✅ Financial Calculation Tests Passed!");
}

testFinancialCalculations();
